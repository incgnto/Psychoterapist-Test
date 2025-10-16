'use client';

import { useState, useCallback } from 'react';
import { Message, ChatState } from '@/app/types/chat';

// Simple UUID generator for client-side use
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(''); // aka threadId
  const [chatState, setChatState] = useState<ChatState>({
    hasAskedForContact: false,
    hasCollectedContact: false,
    hasAskedForQuiz: false,
    hasAskedForPhotos: false,
  });

  const sendMessage = useCallback(
    async (
      content: string,
      images?: any[],
      documents?: { type: 'document'; name: string; mimeType: string; text: string }[]
    ) => {
      if (!content?.trim() && (!images || images.length === 0)) return;

      // Extract user info for query string
      let email = 'guest@pj.com',
        username = 'guest',
        fullname = 'Guest User';
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        email = params.get('email') || email;
        username = params.get('username') || username;
        fullname = params.get('fullname') || fullname;
      }
      const queryString = `?email=${encodeURIComponent(email)}&username=${encodeURIComponent(
        username
      )}&fullname=${encodeURIComponent(fullname)}`;

      // Create local messages + IDs
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        images,
      };
      const assistantMessageId = generateId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      // Push to UI
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      try {
        const response = await fetch(`/api/chat${queryString}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            sessionId: sessionId || undefined,
            chatState: chatState || {
              hasAskedForContact: false,
              hasCollectedContact: false,
              hasAskedForQuiz: false,
              hasAskedForPhotos: false,
            },
            images,
            documents,

            // ✨ Tell the server to reuse these exact IDs (so bookmarks persist)
            clientUserMessageId: userMessage.id,
            clientAssistantMessageId: assistantMessageId,
            clientUserTimestamp: userMessage.timestamp,
            clientAssistantTimestamp: assistantMessage.timestamp,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response body available for streaming');

        let accumulatedContent = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const raw of lines) {
              const line = raw.trim();
              if (!line || !line.startsWith('data:')) continue;

              const data = line.slice(5).trim();
              if (!data) continue;
              if (data === '[DONE]') break;

              let parsed: any = null;
              try {
                parsed = JSON.parse(data);
              } catch {
                continue;
              }

              if (parsed.content) {
                accumulatedContent += parsed.content;
                // Update the assistant placeholder
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMessageId ? { ...m, content: accumulatedContent } : m))
                );
              }

              if (parsed.isComplete) {
                if (typeof parsed.sessionId === 'string') {
                  setSessionId(parsed.sessionId);
                  try {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('lastThreadId', parsed.sessionId);
                    }
                  } catch {}
                }
                if (parsed.chatState) setChatState(parsed.chatState);
              }
            }
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {}
        }
      } catch (error) {
        console.error('Error sending message:', error);

        // Remove the empty assistant placeholder
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));

        const errorContent =
          error instanceof Error
            ? error.message.includes('OpenAI API key')
              ? 'The chat service is not properly configured. Please contact support.'
              : error.message.includes('Failed to fetch')
              ? 'Unable to connect to the server. Please check your internet connection and try again.'
              : "I apologize, but I'm having trouble processing your request. Please try again."
            : 'An unexpected error occurred. Please try again.';

        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, chatState]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId('');
    setChatState({
      hasAskedForContact: false,
      hasCollectedContact: false,
      hasAskedForQuiz: false,
      hasAskedForPhotos: false,
    });
    try {
      if (typeof window !== 'undefined') localStorage.removeItem('lastThreadId');
    } catch {}
  }, []);

  const startNewChat = useCallback(() => {
    try {
      clearChat();
    } catch (error) {
      console.error('Error starting new chat:', error);
      setMessages([]);
    }
  }, [clearChat]);

  const loadSession = useCallback((session: any) => {
    setMessages(session?.messages || []);
    const tid = session?.threadId || '';
    setSessionId(tid);
    try {
      if (tid && typeof window !== 'undefined') localStorage.setItem('lastThreadId', tid);
    } catch {}
    // Optionally hydrate chatState from session if you store it
  }, []);

  // Alias (handy in props): threadId === sessionId
  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    startNewChat,
    chatState,
    loadSession,
    threadId: sessionId,
  };
}
