'use client';

import { useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import ChatMessage from './message/ChatMessage';
import { useBookmarks } from '@/app/hooks/useBookmarks';
import type { Message } from '@/app/types/chat';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN:  [number, number, number, number] = [0.12, 0, 0.39, 0];

const bubbleVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,     // ← slower fade
      ease: EASE_OUT,
      delay: 0.05,       // ← small entrance delay
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: {
      duration: 0.25,
      ease: EASE_IN,
    },
  },
};


export function MessagesList({
  messages,
  isLoading,
}: {
  messages: Message[];
  isLoading: boolean;
}) {
  const { isBookmarked, toggleMessage } = useBookmarks();
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
        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((m, idx) => {
            const isLastAssistant =
              isLoading && idx === messages.length - 1 && m.role === 'assistant';

            return (
              <motion.div
                key={m.id}
                variants={bubbleVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                <ChatMessage
                  message={m}
                  isStreaming={isLastAssistant}
                  isBookmarked={m.id ? isBookmarked(m.id) : false}
                  onToggleBookmark={toggleMessage}
                />
              </motion.div>
            );
          })}

          {showThinking && (
  <motion.div
    key="assistant-thinking"
    initial={{ opacity: 0, y: 8 }}
    animate={{
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.15 }, // ← slower + delayed
    }}
    exit={{ opacity: 0, y: 8, transition: { duration: 0.25 } }}
    layout
    className="mb-2 sm:mb-3 flex justify-start"
  >
    <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-white border border-slate-200 text-slate-500">
      <span className="inline-flex items-center gap-2">
        <span>Thinking</span>
        <ThinkingDots />
      </span>
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
