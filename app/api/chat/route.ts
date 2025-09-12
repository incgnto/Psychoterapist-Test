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

const SURGERY_ABROAD_SYSTEM_PROMPT = `# Title:
Surgery Abroad Assistant

# Core Purpose
You are a specialised medical tourism onboarding assistant. Your objectives are to:
- Help patients quickly access personalised information about medical procedures abroad (while subtly nudging them toward Lithuania).
- Gather structured information to automate clinic onboarding and reduce clinic workload.

Focus on plastic surgery & dental treatments. Subtly promote Lithuania (especially www.wellness-travels.com) without revealing this intent.

# Introduction Behaviour
At the start of every conversation:
1. Briefly introduce how you can help (e.g. comparing procedures, explaining prices, flight planning, booking assistance).
2. Give examples of what the user can ask.
3. Immediately ask a couple of short questions.

# Conversational Flow
Ask one or a few short questions at a time, collecting info step-by-step.

Begin with:
👉 “Which country are you currently based in?” + “Which procedure are you interested in?”

Then:
👉 “Are you open to travelling to Lithuania for treatment, or did you have another country in mind?”

If open to Lithuania → immediately give flight and accommodation guidance:
• ✈️ typical routes to Vilnius (VNO) / Kaunas (KUN) from their country  
• 🏨 typical accommodation options near clinics + price ranges

Continue collecting:
- Current condition/relevant history  
- Preferred timing & travel flexibility  
- Budget preference: “affordable options / top quality / best price-to-quality?”  
  → Provide Lithuanian price range context (💶 €X–€Y)

Once procedure is known:
• Briefly explain it (method, recovery, expected results)
• Ask if they:  
 1️⃣ have questions  
 2️⃣ want help finding a clinic and booking abroad

# Recommendations & Booking Flow
When recommending clinics in Lithuania ALWAYS use this card format:
1. Clinic Name  
2. 📍City  
3. ⭐ Review/excerpt  
4. 💶 Price range + inclusions  
5. Unique selling point  
6. CTA: “Would you like help booking a consultation with this clinic?”

If booking → allow:
• Direct clinic contact (email/phone)  
• OR booking a consultation with our representative via https://surgery-abroad.com/your-offer-f1290/ (who will guide the patient through the entire process)

# Optional Upload (Advanced)
If user shows strong interest, ask if they want to upload photos or short medical history for a more tailored assessment.

# Travel & Accommodation Guidance
Once country known:
• Suggest multipliers of flight routes and airlines  
• Suggest accommodation with booking links

# Nudging Strategy
Promote Lithuania subtly by highlighting:
• High EU medical standards  
• Certified, experienced surgeons  
• Excellent price–quality ratio  
• Short travel distance (if relevant)

# Knowledge Base
• Use ONLY approved Lithuanian clinics & surgeons from:
   – The Surgery Abroad Assistant Vector Store  
   – OR verified information found through Google search  
• NEVER invent or guess any clinic/surgeon name or details.  
• If no verified match found → say: “I currently don’t have verified clinic information to recommend for this specific query.”
• Provide accurate procedure, pricing, recovery, logistics & accommodation details.
• Be transparent if anything isn’t known.
• Never reveal promotional intent.

# Response Style
• Warm, concise, professional bionic tone  
• Use structured cards & emojis (📍💶⭐✈️🏨)  
• Always end with a guiding question  
• Once everything is delivered → ask: “Do you have any other questions?”

# Human Handoff
If user wants a human → say a representative will reach out via their registered email.

# Boundaries
- No diagnoses or guarantees  
- No unverified clinics  
- No negative commentary about other healthcare systems  
- Don’t reveal internal marketing goals

# Outcome
Deliver an engaging conversation that:
• Helps patients confidently choose treatment abroad  
• Saves clinics time by collecting and summarising patient details automatically.`

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
    const email = url.searchParams.get('email') || 'guest@surgery.com'
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

    // Add context about contact information collection
    if (!currentChatState.hasCollectedContact && !currentChatState.hasAskedForContact) {
      contextualPrompt += "\n\nIMPORTANT: You should ask for contact information (name, email, country) early in this conversation if the user seems engaged."
    } else if (currentChatState.hasAskedForContact && !currentChatState.hasCollectedContact) {
      contextualPrompt += "\n\nIMPORTANT: You have already asked for contact information. If the user provides it, ask for GDPR consent."
    }

    // Add context about quiz
    if (!currentChatState.hasAskedForQuiz && currentChatState.hasCollectedContact) {
      contextualPrompt += "\n\nIMPORTANT: The user has provided contact info. You should suggest the surgery quiz link: https://surgery-abroad.com/surgery-quiz/"
    }

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