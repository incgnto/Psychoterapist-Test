'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChatMessage from './message/ChatMessage';
import { useBookmarks } from '@/app/hooks/useBookmarks';
import type { Message } from '@/app/types/chat';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN: [number, number, number, number] = [0.12, 0, 0.39, 0];

const bubbleVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.25, ease: EASE_IN },
  },
};

export function MessagesList({
  messages,
  isLoading,
  threadId, // ⬅️ NEW: provide the active thread id
}: {
  messages: Message[];
  isLoading: boolean;
  threadId: string;
}) {
  // derive email from URL (same pattern you used in Sidebar)
  const email = useMemo(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      return params.get('email') || 'guest@pj.com';
    } catch {
      return 'guest@pj.com';
    }
  }, []);
  // useBookmarks hook with threadId
const { isBookmarked, toggleBookmark } = useBookmarks(threadId);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const last = messages[messages.length - 1];
  const showThinking = useMemo(
    () => Boolean(isLoading && last && last.role === 'user'),
    [isLoading, last]
  );

  return (
    <div className="flex-1 overflow-y-auto relative z-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => {
            const isLastAssistant = isLoading && idx === messages.length - 1 && m.role === 'assistant';

            return (
              <motion.div
                key={m.id}
                variants={bubbleVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout="position" // position-only to avoid squish during streaming
              >
                <ChatMessage
  message={m}
  isStreaming={isLastAssistant}
  isBookmarked={m.id ? isBookmarked(m.id) : false}
  onToggleBookmark={() => {
    if (!m.id) return;

    const role = String((m as any).role || '').toLowerCase();
    const isUser = role === 'user';
    const messageTimestamp =
      (m as any).timestamp ? new Date((m as any).timestamp).toISOString() : undefined;

    toggleBookmark(
      {
        id: m.id,
        content: (m as any).content || '',
        threadId,
        role: (m as any).role,
        timestamp: (m as any).timestamp,
        isUser,
        messageTimestamp,
        contentPreview: ((m as any).content || '').slice(0, 1000),
      },
      { title: (m as any).title || '' }
    );
  }}
/>

              </motion.div>
            );
          })}

          {showThinking && (
            <motion.div
              key="assistant-thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.15 } }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.25 } }}
            >
              <div className="mb-2 sm:mb-3 flex justify-start">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-white border border-slate-200 text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <span>Thinking</span>
                    <ThinkingDots />
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={endRef} />
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400/80 animate-bounce [animation-delay:-0.24s] mr-1" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400/80 animate-bounce [animation-delay:-0.12s] mr-1" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400/80 animate-bounce" />
    </span>
  );
}
