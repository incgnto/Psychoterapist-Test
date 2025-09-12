'use client'

import { useState, useCallback } from 'react'
import { Message, ChatState } from '@/app/types/chat'
// Simple UUID generator for client-side use
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [chatState, setChatState] = useState<ChatState>({
    hasAskedForContact: false,
    hasCollectedContact: false,
    hasAskedForQuiz: false,
    hasAskedForPhotos: false,
  })

  const sendMessage = useCallback(async (content: string, images?: any[], documents?: { type: 'document'; name: string; mimeType: string; text: string }[]) => {
    if (!content?.trim() && (!images || images.length === 0)) return

    // Track the assistant message we create so we can clean it up on error
    let assistantMessageId: string | null = null

    try {
      // Add user message immediately
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        images: images,
      }

      setMessages(prev => Array.isArray(prev) ? [...prev, userMessage] : [userMessage])
      setIsLoading(true)

      // Extract user info from URL query params
      let email = 'guest@surgery.com', username = 'guest', fullname = 'Guest User';
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        email = params.get('email') || email
        username = params.get('username') || username
        fullname = params.get('fullname') || fullname
      }

      // Build query string
      const queryString = `?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&fullname=${encodeURIComponent(fullname)}`

      // Add assistant message immediately with empty content
      assistantMessageId = generateId()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
      setMessages(prev => Array.isArray(prev) ? [...prev, assistantMessage] : [assistantMessage])

      const response = await fetch(`/api/chat${queryString}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          sessionId: sessionId || undefined,
          chatState: chatState || {
            hasAskedForContact: false,
            hasCollectedContact: false,
            hasAskedForQuiz: false,
            hasAskedForPhotos: false,
          },
          images: images,
          documents: documents,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  break
                }

                try {
                  const parsed = JSON.parse(data)
                  
                  if (parsed.content) {
                    accumulatedContent += parsed.content
                    
                    // Update the assistant message with accumulated content
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ))
                  }
                  
                  if (parsed.isComplete) {
                    setSessionId(parsed.sessionId)
                    setChatState(parsed.chatState || chatState)
                  }
                } catch (e) {
                  console.error('Error parsing streaming data:', e)
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      } else {
        throw new Error('No response body available for streaming')
      }

    } catch (error) {
      console.error('Error sending message:', error)
      
      // Remove the empty assistant message if streaming failed
      if (assistantMessageId) {
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
      }
      
      // Add error message with more specific information
      const errorContent = error instanceof Error 
        ? error.message.includes('OpenAI API key')
          ? 'The chat service is not properly configured. Please contact support.'
          : error.message.includes('Failed to fetch')
          ? 'Unable to connect to the server. Please check your internet connection and try again.'
          : 'I apologize, but I\'m having trouble processing your request. Please try again.'
        : 'An unexpected error occurred. Please try again.'

      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      }

      setMessages(prev => Array.isArray(prev) ? [...prev, errorMessage] : [errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, chatState])

  const clearChat = useCallback(() => {
    setMessages([])
    setSessionId('')
    setChatState({
      hasAskedForContact: false,
      hasCollectedContact: false,
      hasAskedForQuiz: false,
      hasAskedForPhotos: false,
    })
  }, [])

  const startNewChat = useCallback(() => {
    try {
      clearChat()
    } catch (error) {
      console.error('Error starting new chat:', error)
      // Fallback to empty messages array
      setMessages([])
    }
  }, [clearChat])

  const loadSession = useCallback((session: any) => {
    setMessages(session.messages || [])
    setSessionId(session.threadId || '')
    // Optionally set chatState if stored
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    startNewChat,
    chatState,
    loadSession,
  }
}