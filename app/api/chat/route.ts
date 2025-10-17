// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ChatRequest, ChatState, ImageContent } from "@/app/types/chat";
import { saveChatSession } from "@/lib/saveChatSession";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set in environment variables");
}

const SURGERY_ABROAD_SYSTEM_PROMPT = `... your long CBT prompt (unchanged) ...`;

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

type VisionContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "high" | "low" | "auto" } };

type NormalizedUser = {
  email: string;
  username: string;
  fullname: string;
  isGuest: boolean;
};

async function getNormalizedUser(req: NextRequest): Promise<NormalizedUser> {
  const { userId } = await auth();  

  if (userId) {
    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "unknown@user";
    const fullname =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      email;
    const username = user?.username || email.split("@")[0];
    return { email: email.toLowerCase(), username, fullname, isGuest: false };
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "guest@pj.com").toLowerCase();
  const username = url.searchParams.get("username") || "guest";
  const fullname = url.searchParams.get("fullname") || "Guest User";
  const isGuest =
    !url.searchParams.get("email") &&
    !url.searchParams.get("username") &&
    !url.searchParams.get("fullname");

  return { email, username, fullname, isGuest };
}

function buildUserContent(
  message: string,
  images?: ImageContent[],
  documents?: ChatRequest["documents"]
) {
  let content: string | VisionContent[] = message;

  if (images?.length) {
    content = [
      { type: "text", text: message || "Please analyze the uploaded image(s)." },
      ...images.map<VisionContent>((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.data}`, detail: "high" },
      })),
    ];
  }

  if (documents?.length) {
    const header = documents.map((d) => `• ${d.name} (${d.mimeType})`).join("\n");
    const bodies = documents.map((d) => `\n[Document: ${d.name}]\n${d.text}`).join("\n");
    const summary = `The user attached the following documents:\n${header}\n${bodies}`;

    if (Array.isArray(content)) {
      content = [{ type: "text", text: `${summary}\n\n${message}` }, ...content.filter((p) => p.type !== "text")];
    } else {
      content = `${summary}\n\n${message}`;
    }
  }

  return content;
}

async function loadRecentHistory(threadId: string, ownerEmail?: string) {
  try {
    const client = await import("@/lib/mongodb").then((m) => m.default);
    const db = await client;
    const col = db.db().collection("chat_sessions");

    const query: any = { threadId };
    if (ownerEmail) query["user.email"] = ownerEmail;

    const existing = await col.findOne(query);
    if (!existing || !Array.isArray(existing.messages)) return [];

    const flat = (existing.messages as Array<{ role: string; content: string }>)
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");

    return flat.slice(-4).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  } catch {
    return [];
  }
}

async function getAssistantInstructions() {
  const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || "asst_ecxNblS8s4XiQP6Ibcu5AnSb";
  if (!ASSISTANT_ID) return { instructions: SURGERY_ABROAD_SYSTEM_PROMPT, model: undefined as string | undefined };

  try {
    const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
    const instructions =
      typeof assistant.instructions === "string" && assistant.instructions.trim()
        ? assistant.instructions.trim()
        : SURGERY_ABROAD_SYSTEM_PROMPT;
    const model = typeof assistant.model === "string" ? assistant.model : undefined;
    return { instructions, model };
  } catch {
    return { instructions: SURGERY_ABROAD_SYSTEM_PROMPT, model: undefined };
  }
}

function chooseModels(hasImages: boolean, assistantPreferredModel?: string) {
  const TEXT_MODEL = assistantPreferredModel || process.env.OPENAI_TEXT_MODEL || "gpt-5o";
  const VISION_MODEL = assistantPreferredModel || process.env.OPENAI_VISION_MODEL || "gpt-5o";
  const FALLBACK_TEXT = process.env.OPENAI_TEXT_FALLBACK_MODEL || "gpt-4o";
  const FALLBACK_VISION = process.env.OPENAI_VISION_FALLBACK_MODEL || "gpt-4o";
  const primary = hasImages ? VISION_MODEL : TEXT_MODEL;
  const fallback = hasImages ? FALLBACK_VISION : FALLBACK_TEXT;
  return { primary, fallback };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    const body: any = await request.json();
    const {
      message,
      sessionId,
      chatState,
      images,
      documents,
      clientUserMessageId,
      clientAssistantMessageId,
      clientUserTimestamp,
      clientAssistantTimestamp,
    } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required and must be a non-empty string" }, { status: 400 });
    }

    const user = await getNormalizedUser(request);

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
    const recentHistory = await loadRecentHistory(threadId, user.email);

    const hasImages = !!images?.length;
    const { primary: modelToUse, fallback: fallbackModel } = chooseModels(hasImages, assistantPreferredModel);

    const requestOptions: any = {
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...recentHistory.map((h) => ({ role: h.role, content: h.content })),
        { role: "user" as const, content: userContent as any },
      ],
      temperature: 0.7,
      max_tokens: hasImages ? 1500 : 1000,
      stream: true as const,
    };

    let stream: AsyncIterable<any>;
    try {
      stream = (await openai.chat.completions.create({
        model: modelToUse,
        ...requestOptions,
      })) as unknown as AsyncIterable<any>;
    } catch {
      stream = (await openai.chat.completions.create({
        model: fallbackModel,
        ...requestOptions,
      })) as unknown as AsyncIterable<any>;
    }

    const encoder = new TextEncoder();
    let capturedText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream as AsyncIterable<any>) {
            const delta = chunk?.choices?.[0]?.delta;
            const content = typeof delta?.content === "string" ? delta.content : "";
            if (content) {
              capturedText += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                content,
                sessionId: currentSessionId,
                chatState: currentChatState,
              })}\n\n`));
            }
          }

          const updatedChatState: ChatState = { ...currentChatState };
          if (!updatedChatState.hasAskedForContact && capturedText.includes("**Before we continue**")) {
            updatedChatState.hasAskedForContact = true;
          }
          if (!updatedChatState.hasAskedForQuiz && capturedText.includes("surgery-quiz")) {
            updatedChatState.hasAskedForQuiz = true;
          }
          if (message.includes("@") && !updatedChatState.hasCollectedContact) {
            updatedChatState.hasCollectedContact = true;
          }

          const chatType = body.type || "text";
          let firstUserText = body.firstUserText;
          if (!firstUserText) {
            try {
              const client = await import("@/lib/mongodb").then((m) => m.default);
              const db = await client;
              const col = db.db().collection("chat_sessions");
              const existing = await col.findOne({ threadId, "user.email": user.email });
              if (existing?.messages?.length) {
                const firstUserMsg = existing.messages.find((m: any) => m.role === "user");
                firstUserText = firstUserMsg ? firstUserMsg.content : message;
              } else {
                firstUserText = message;
              }
            } catch {
              firstUserText = message;
            }
          }

          const userTs = clientUserTimestamp ? new Date(clientUserTimestamp) : new Date();
          const asstTs = clientAssistantTimestamp ? new Date(clientAssistantTimestamp) : new Date();

          await saveChatSession({
            threadId,
            user,
            ownerEmail: user.email, // allowed by our upgraded helper (or ignored if typed narrowly)
            messages: [
              { id: clientUserMessageId || generateId(), role: "user", content: message, timestamp: userTs },
              { id: clientAssistantMessageId || generateId(), role: "assistant", content: capturedText, timestamp: asstTs },
            ],
            title: firstUserText || "",
            type: chatType,
          } as any);

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            content: "",
            sessionId: currentSessionId,
            chatState: updatedChatState,
            isComplete: true,
            fullMessage: capturedText,
          })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error?.message || error?.message || "Failed to process chat message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
