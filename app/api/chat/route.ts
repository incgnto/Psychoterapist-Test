import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ChatRequest, ChatState, ImageContent } from '@/app/types/chat'
import { saveChatSession } from '@/lib/saveChatSession'

// Simple UUID generator for server-side use
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY is not set in environment variables')
}

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
- Use reflective listening, validation, and gentle interpretations. Limited self‑disclosure only when therapeutically useful.

Memory & Continuity:
- When prior context is available, reference earlier discussions to show continuity and support long-term growth.

Safety & Crisis Boundaries:
- If user expresses suicidal thoughts, self-harm risk, or severe distress: acknowledge their pain with warmth and urgency and encourage contacting a licensed professional or emergency services. Do not attempt diagnosis or crisis treatment.

Ethics & Boundaries:
- Never diagnose, label, or suggest stopping clinical treatment or medication.
- Stay within emotional support, CBT guidance, and personal development coaching.

First-Time User Onboarding (when starting a new conversation):
1) Welcome: “Hi, I’m really glad you’re here. I’m your AI psychotherapist assistant — I use CBT, a practical approach that helps people notice and shift unhelpful thought patterns. I’m here to support your emotional well‑being through conversation, reflection, and tools.”
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
- Offer structured CBT micro‑exercises only if user agrees. Suggest simple reply options when helpful (e.g., [Anxious / Sad / Angry]).

Overall Aim:
- Build trust, promote insight, support healthier thinking patterns, and encourage behavior change at the user’s pace while maintaining strong ethical and crisis boundaries.`

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    const body: ChatRequest = await request.json()
    const { message, sessionId, chatState, images, documents } = body
    // Get user info from query params or fallback to guest
    const url = new URL(request.url)
    const email = url.searchParams.get('email') || 'guest@pj.com'
    const username = url.searchParams.get('username') || 'guest'
    const fullname = url.searchParams.get('fullname') || 'Guest User'
    const user = {
      email,
      username,
      fullname,
      isGuest: !url.searchParams.get('email') && !url.searchParams.get('username') && !url.searchParams.get('fullname')
    }

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Initialize chat state if not provided
    const currentChatState: ChatState = chatState || {
      hasAskedForContact: false,
      hasCollectedContact: false,
      hasAskedForQuiz: false,
      hasAskedForPhotos: false,
    }

  // Generate session ID if not provided
  const currentSessionId = sessionId || generateId()
  // Use threadId as sessionId
  const threadId = currentSessionId

    // Create context for the AI based on chat state
    let contextualPrompt = SURGERY_ABROAD_SYSTEM_PROMPT

    // If an Assistant ID is configured, prefer its instructions over the local prompt
    const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_ecxNblS8s4XiQP6Ibcu5AnSb'
    let assistantPreferredModel: string | undefined
    if (ASSISTANT_ID) {
      try {
        // Retrieve assistant to use its instructions as the system message
        // Note: This does not use the Assistants runs/threads API; it simply reuses the
        // assistant's instructions so we can keep our existing streaming flow intact.
        // For full Assistants features (tools/vector stores), migrate to threads/runs.
        const assistant = await (openai as any).beta.assistants.retrieve(ASSISTANT_ID)
        if (assistant && typeof assistant.instructions === 'string' && assistant.instructions.trim()) {
          contextualPrompt = assistant.instructions.trim()
        }
        if (assistant && typeof assistant.model === 'string') {
          assistantPreferredModel = assistant.model
        }
      } catch (e) {
        console.warn('Assistant retrieval failed; falling back to local system prompt:', e)
      }
    }

    // Remove domain-specific contact/quiz nudges from the old assistant

    // Prepare the user message content
    type VisionContent = {
      type: 'text'
      text: string
    } | {
      type: 'image_url'
      image_url: { url: string; detail: 'high' | 'low' | 'auto' }
    }
    let userContent: string | VisionContent[] = message

    // If images are provided, format for GPT-4 Vision
    if (images && images.length > 0) {
      userContent = [
        {
          type: 'text',
          text: message || 'Please analyze the uploaded image(s).',
        },
        ...images.map((image: ImageContent) => ({
          type: 'image_url' as const,
          image_url: {
            url: `data:${image.mimeType};base64,${image.data}`,
            detail: 'high' as const,
          },
        })),
      ]
    }

    // If documents are provided, prepend a summary block and include their content
    let documentSummary = ''
    if (documents && documents.length > 0) {
      const docHeaders = documents
        .map((d) => `• ${d.name} (${d.mimeType})`)
        .join('\n')
      const docBodies = documents
        .map((d) => `\n[Document: ${d.name}]\n${d.text}`)
        .join('\n')
      documentSummary = `The user attached the following documents:\n${docHeaders}\n${docBodies}`

      if (Array.isArray(userContent)) {
        userContent = [
          { type: 'text', text: `${documentSummary}\n\n${message}` },
          ...userContent.filter((p) => p.type !== 'text'),
        ]
      } else {
        userContent = `${documentSummary}\n\n${message}`
      }
    }

    // Log the request for debugging
    if (images && images.length > 0) {
      console.log('Processing request with images:', images.length, 'images')
      console.log('Using vision model for image analysis')
    }

    // Select model (env-overridable). Default to requested 5o, or assistant's model when available
    const TEXT_MODEL = assistantPreferredModel || process.env.OPENAI_TEXT_MODEL || 'gpt-5o'
    const VISION_MODEL = assistantPreferredModel || process.env.OPENAI_VISION_MODEL || 'gpt-5o'

    // Build request and attempt with primary model; fallback if unavailable
    const modelToUse = images && images.length > 0 ? VISION_MODEL : TEXT_MODEL
    const fallbackVision = process.env.OPENAI_VISION_FALLBACK_MODEL || 'gpt-4o'
    const fallbackText = process.env.OPENAI_TEXT_FALLBACK_MODEL || 'gpt-4o'
    const fallbackModel = images && images.length > 0 ? fallbackVision : fallbackText

    // Retrieve recent history for this thread to provide short-term memory
    let recentHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    try {
      const client = await import('@/lib/mongodb').then(m => m.default)
      const db = (await client)
      const collection = db.db().collection('chat_sessions')
      const existing = await collection.findOne({ threadId })
      if (existing && Array.isArray(existing.messages)) {
        const flatMessages = (existing.messages as Array<{ role: string; content: string }>)
          .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        // Take last 4 messages to keep context concise
        const lastFew = flatMessages.slice(-4)
        recentHistory = lastFew.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      }
    } catch (e) {
      console.warn('Unable to load recent history; proceeding without it:', e)
    }

    const requestOptions = {
      messages: [
        { role: 'system' as const, content: contextualPrompt },
        ...recentHistory.map(h => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: userContent as any },
      ],
      temperature: 0.7,
      max_tokens: images && images.length > 0 ? 1500 : 1000,
      stream: true,
    }

    let stream: any
    try {
      stream = await openai.chat.completions.create({
        model: modelToUse,
        ...requestOptions,
      })
    } catch (primaryError) {
      console.error('Primary model failed, falling back to a compatible model:', primaryError)
      stream = await openai.chat.completions.create({
        model: fallbackModel,
        ...requestOptions,
      })
    }

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    // Removed unused decoder
    
    let assistantMessage = ''
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              assistantMessage += content
              
              // Send the chunk to the client as Server-Sent Event
              const data = JSON.stringify({ 
                content,
                sessionId: currentSessionId,
                chatState: currentChatState
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          
          // Send final message with completion flag
          const updatedChatState: ChatState = { ...currentChatState }
          
          // Check if we should mark that we've asked for contact info
          if (!updatedChatState.hasAskedForContact && assistantMessage.includes("**Before we continue**")) {
            updatedChatState.hasAskedForContact = true
          }

          // Check if we should mark that we've asked for the quiz
          if (!updatedChatState.hasAskedForQuiz && assistantMessage.includes("surgery-quiz")) {
            updatedChatState.hasAskedForQuiz = true
          }

          // Simple detection for contact info in user message
          if (message.includes("@") && !updatedChatState.hasCollectedContact) {
            updatedChatState.hasCollectedContact = true
          }

          // Save chat session in MongoDB
          const chatType = body.type || 'text'
          let firstUserText = body.firstUserText
          if (!firstUserText) {
            const client = await import('@/lib/mongodb').then(m => m.default)
            const db = (await client)
            const collection = db.db().collection('chat_sessions')
            const existing = await collection.findOne({ threadId })
            if (existing && existing.messages && existing.messages.length > 0) {
              const firstUserMsg = (existing.messages as Array<{ role: string; content: string }>).find((m) => m.role === 'user')
              firstUserText = firstUserMsg ? firstUserMsg.content : message
            } else {
              firstUserText = message
            }
          }
          
          await saveChatSession({
            threadId,
            user,
            messages: [
              { id: generateId(), role: 'user', content: message, timestamp: new Date() },
              { id: generateId(), role: 'assistant', content: assistantMessage, timestamp: new Date() }
            ],
            title: firstUserText || '',
            type: chatType,
          })
          
          // Send completion message
          const finalData = JSON.stringify({
            content: '',
            sessionId: currentSessionId,
            chatState: updatedChatState,
            isComplete: true,
            fullMessage: assistantMessage
          })
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    console.error('Error details:', error?.response?.data || error?.message || error)
    
    // Return more specific error message
    let errorMessage = 'Failed to process chat message'
    if (error?.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}