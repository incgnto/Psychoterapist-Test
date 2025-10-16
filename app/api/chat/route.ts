import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatRequest, ChatState, ImageContent } from '@/app/types/chat';
import { saveChatSession } from '@/lib/saveChatSession';

// -----------------------------
// Constants & Setup
// -----------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY is not set in environment variables');
}

// Local system prompt (fallback if no Assistant instructions)
const SURGERY_ABROAD_SYSTEM_PROMPT = `You are PJ — an AI psychotherapist assistant trained in Cognitive Behavioral Therapy (CBT).

Purpose & Role:
- Support adult users seeking emotional well-being and personal growth.
- Help users understand thoughts, emotions, and behaviors using CBT techniques (thought records, distortions, behavioral activation, belief tracking, SMART goals).
- Ask open-ended questions to explore the user’s inner world and guide toward insight and relief.
- Be supportive, curious, validating, and nonjudgmental.

Therapeutic Approach:
- Primarily use CBT. When appropriate, suggest mindfulness, journaling, somatic grounding.
- Offer actionable tools: daily thought records, breathing exercises, values clarification, habit tracking.

Tone & Personality:
- Warm, empathetic, calm, human-like. Mirror the user’s language and emotional tone.
- Use reflective listening, validation, and gentle interpretations. Limited self-disclosure only when therapeutically useful.

Memory & Continuity:
- When prior context is available, reference earlier discussions to show continuity and support long-term growth.

Safety & Crisis Boundaries:
- If user expresses suicidal thoughts, self-harm risk, or severe distress: acknowledge their pain with warmth and urgency and encourage contacting a licensed professional or emergency services. Do not attempt diagnosis or crisis treatment.

Ethics & Boundaries:
- Never diagnose, label, or suggest stopping clinical treatment or medication.
- Stay within emotional support, CBT guidance, and personal development coaching.

First-Time User Onboarding (when starting a new conversation):
1) Welcome: “Hi, I’m really glad you’re here. I’m your AI psychotherapist assistant — I use CBT, a practical approach that helps people notice and shift unhelpful thought patterns. I’m here to support your emotional well-being through conversation, reflection, and tools.”
2) Safety note: “I’m not a substitute for a licensed mental health professional — and if you’re in crisis, I’ll encourage you to get real human help for your safety.”
3) First question: “To start, how have you been feeling lately — emotionally or mentally?”
4) Then ask one at a time (waiting for replies):
   - “Is there something specific you’d like to focus on today — something bothering you, or a part of your life you want to understand better?”
   - “Would you prefer we mostly talk things through, or would you like me to also suggest tools like journals, worksheets, or grounding exercises?”
   - “Have you ever tried therapy or something like this before, or is this your first time?”
   - (Optional) “Some people like to build helpful little habits — like daily mood check-ins, journaling, or breathing exercises. Would that be interesting to you as we go?”
5) After gathering context: “Thank you for sharing — it really helps. From here, would you like to talk more, try a small exercise, or start by setting a tiny goal together?”
6) If unsure: “No rush at all — sometimes even showing up is already a first step. You can say anything, or even just: ‘I don’t know where to start.’ I’ll meet you wherever you are.”

Response Style:
- Brief, warm, organized. Use gentle bullet points, reflective summaries, and end with a guiding question.
- Offer structured CBT micro-exercises only if user agrees. Suggest simple reply options when helpful (e.g., [Anxious / Sad / Angry]).

Overall Aim:
- Build trust, promote insight, support healthier thinking patterns, and encourage behavior change at the user’s pace while maintaining strong ethical and crisis boundaries.`;

// -----------------------------
// Utilities
// -----------------------------

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function getUserFromUrl(urlStr: string) {
  const url = new URL(urlStr);
  const email = url.searchParams.get('email') || 'guest@pj.com';
  const username = url.searchParams.get('username') || 'guest';
  const fullname = url.searchParams.get('fullname') || 'Guest User';
  const isGuest =
    !url.searchParams.get('email') &&
    !url.searchParams.get('username') &&
    !url.searchParams.get('fullname');
  return { email, username, fullname, isGuest };
}

type VisionContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } };

function buildUserContent(
  message: string,
  images?: ImageContent[],
  documents?: ChatRequest['documents']
) {
  let content: string | VisionContent[] = message;

  if (images && images.length > 0) {
    content = [
      { type: 'text', text: message || 'Please analyze the uploaded image(s).' },
      ...images.map<VisionContent>((img) => ({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.data}`, detail: 'high' },
      })),
    ];
  }

  if (documents && documents.length > 0) {
    const header = documents.map((d) => `• ${d.name} (${d.mimeType})`).join('\n');
    const bodies = documents.map((d) => `\n[Document: ${d.name}]\n${d.text}`).join('\n');
    const summary = `The user attached the following documents:\n${header}\n${bodies}`;

    if (Array.isArray(content)) {
      content = [{ type: 'text', text: `${summary}\n\n${message}` }, ...content.filter((p) => p.type !== 'text')];
    } else {
      content = `${summary}\n\n${message}`;
    }
  }

  return content;
}

async function loadRecentHistory(threadId: string) {
  try {
    const client = await import('@/lib/mongodb').then((m) => m.default);
    const db = await client;
    const col = db.db().collection('chat_sessions');
    const existing = await col.findOne({ threadId });
    if (!existing || !Array.isArray(existing.messages)) return [];

    const flat = (existing.messages as Array<{ role: string; content: string }>)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');

    return flat.slice(-4).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  } catch (e) {
    console.warn('Unable to load recent history; proceeding without it:', e);
    return [];
  }
}

async function getAssistantInstructions() {
  const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_ecxNblS8s4XiQP6Ibcu5AnSb';
  if (!ASSISTANT_ID) return { instructions: SURGERY_ABROAD_SYSTEM_PROMPT, model: undefined as string | undefined };

  try {
    const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
    const instructions =
      typeof assistant.instructions === 'string' && assistant.instructions.trim()
        ? assistant.instructions.trim()
        : SURGERY_ABROAD_SYSTEM_PROMPT;
    const model = typeof assistant.model === 'string' ? assistant.model : undefined;
    return { instructions, model };
  } catch (e) {
    console.warn('Assistant retrieval failed; falling back to local system prompt:', e);
    return { instructions: SURGERY_ABROAD_SYSTEM_PROMPT, model: undefined };
  }
}

function chooseModels(hasImages: boolean, assistantPreferredModel?: string) {
  const TEXT_MODEL = assistantPreferredModel || process.env.OPENAI_TEXT_MODEL || 'gpt-5o';
  const VISION_MODEL = assistantPreferredModel || process.env.OPENAI_VISION_MODEL || 'gpt-5o';
  const FALLBACK_TEXT = process.env.OPENAI_TEXT_FALLBACK_MODEL || 'gpt-4o';
  const FALLBACK_VISION = process.env.OPENAI_VISION_FALLBACK_MODEL || 'gpt-4o';

  const primary = hasImages ? VISION_MODEL : TEXT_MODEL;
  const fallback = hasImages ? FALLBACK_VISION : FALLBACK_TEXT;
  return { primary, fallback };
}

// -----------------------------
// Route
// -----------------------------

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Accept extra client id fields without tightening ChatRequest
    const body: any = await request.json();
    const {
      message,
      sessionId,
      chatState,
      images,
      documents,

      // NEW: client-provided message ids/timestamps
      clientUserMessageId,
      clientAssistantMessageId,
      clientUserTimestamp,
      clientAssistantTimestamp,
    } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required and must be a non-empty string' }, { status: 400 });
    }

    const user = getUserFromUrl(request.url);

    const currentChatState: ChatState = chatState || {
      hasAskedForContact: false,
      hasCollectedContact: false,
      hasAskedForQuiz: false,
      hasAskedForPhotos: false,
    };

    const currentSessionId = sessionId || generateId();
    const threadId = currentSessionId;

    const { instructions: systemPrompt, model: assistantPreferredModel } = await getAssistantInstructions();
    const userContent = buildUserContent(message, images, documents);
    const recentHistory = await loadRecentHistory(threadId);

    const hasImages = !!(images && images.length > 0);
    const { primary: modelToUse, fallback: fallbackModel } = chooseModels(hasImages, assistantPreferredModel);

    const requestOptions: any = {
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...recentHistory.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: userContent as any },
      ],
      temperature: 0.7,
      max_tokens: hasImages ? 1500 : 1000,
      stream: true as const,
    };

    // Build stream (with fallback)
    let stream: AsyncIterable<any>;
    try {
      stream = (await openai.chat.completions.create({
        model: modelToUse,
        ...requestOptions,
      })) as unknown as AsyncIterable<any>;
    } catch (primaryError) {
      console.error('Primary model failed, failing over:', primaryError);
      stream = (await openai.chat.completions.create({
        model: fallbackModel,
        ...requestOptions,
      })) as unknown as AsyncIterable<any>;
    }

    const encoder = new TextEncoder();
    let capturedText = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Stream deltas
          for await (const chunk of stream as AsyncIterable<any>) {
            const delta = chunk?.choices?.[0]?.delta;
            const content = typeof delta?.content === 'string' ? delta.content : '';
            if (content) {
              capturedText += content;
              const data = JSON.stringify({ content, sessionId: currentSessionId, chatState: currentChatState });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Update chat state flags
          const updatedChatState: ChatState = { ...currentChatState };
          if (!updatedChatState.hasAskedForContact && capturedText.includes('**Before we continue**')) {
            updatedChatState.hasAskedForContact = true;
          }
          if (!updatedChatState.hasAskedForQuiz && capturedText.includes('surgery-quiz')) {
            updatedChatState.hasAskedForQuiz = true;
          }
          if (message.includes('@') && !updatedChatState.hasCollectedContact) {
            updatedChatState.hasCollectedContact = true;
          }

          // Determine session title (first user text)
          const chatType = body.type || 'text';
          let firstUserText = body.firstUserText;
          if (!firstUserText) {
            try {
              const client = await import('@/lib/mongodb').then((m) => m.default);
              const db = await client;
              const col = db.db().collection('chat_sessions');
              const existing = await col.findOne({ threadId });
              if (existing && Array.isArray(existing.messages) && existing.messages.length > 0) {
                const firstUserMsg = (existing.messages as Array<{ role: string; content: string }>).find(
                  (m) => m.role === 'user'
                );
                firstUserText = firstUserMsg ? firstUserMsg.content : message;
              } else {
                firstUserText = message;
              }
            } catch {
              firstUserText = message;
            }
          }

          // Persist using CLIENT message IDs (so bookmarks match after reload)
          const userTs = clientUserTimestamp ? new Date(clientUserTimestamp) : new Date();
          const asstTs = clientAssistantTimestamp ? new Date(clientAssistantTimestamp) : new Date();

          await saveChatSession({
            threadId,
            user,
            messages: [
              { id: clientUserMessageId || generateId(), role: 'user', content: message, timestamp: userTs },
              { id: clientAssistantMessageId || generateId(), role: 'assistant', content: capturedText, timestamp: asstTs },
            ],
            title: firstUserText || '',
            type: chatType,
          });

          // Completion envelope
          const finalData = JSON.stringify({
            content: '',
            sessionId: currentSessionId,
            chatState: updatedChatState,
            isComplete: true,
            fullMessage: capturedText,
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Streaming error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    console.error('Error details:', error?.response?.data || error?.message || error);

    let errorMessage = 'Failed to process chat message';
    if (error?.response?.data?.error?.message) errorMessage = error.response.data.error.message;
    else if (error?.message) errorMessage = error.message;

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
