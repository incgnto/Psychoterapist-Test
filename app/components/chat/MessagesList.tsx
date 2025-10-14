'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './message/ChatMessage';
import { useBookmarks } from '@/app/hooks/useBookmarks';
import type { Message } from '@/app/types/chat';

export function MessagesList({
  messages,
  isLoading,
}: {
  messages: Message[];
  isLoading: boolean;
}) {
  const { isBookmarked, toggleMessage } = useBookmarks();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto relative z-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        {messages.map((m, idx) => (
          <ChatMessage
            key={m.id}
            message={m}
            isStreaming={isLoading && idx === messages.length - 1 && m.role === 'assistant'}
            isBookmarked={m.id ? isBookmarked(m.id) : false}
            onToggleBookmark={toggleMessage}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
