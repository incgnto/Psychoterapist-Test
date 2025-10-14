'use client';

import { Message } from '@/app/types/chat';
import { useTextToSpeech } from '@/app/hooks/useTextToSpeech';
import { MessageAvatar, MessageHeader } from './MessageHeader';
import { MessageImages } from './MessageImages';
import { MessageContent } from './MessageContent';
import { useEffect } from 'react';

export default function ChatMessage({
  message,
  isStreaming = false,
  isBookmarked,             // ← new
  onToggleBookmark,         // ← new
}: {
  message: Message;
  isStreaming?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: (m: Message) => void;
}) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const { isPlaying, isLoading, toggle, stop } = useTextToSpeech();
useEffect(() => stop, [stop]);

  return (
    <div className="px-3 sm:px-4 py-2">
      <div className="flex gap-3 sm:gap-4">
        <MessageAvatar isUser={isUser} />

        <div className={['flex-1 min-w-0 rounded-2xl p-3 sm:p-4','ring-1 shadow-sm transition-colors',isUser ? 'bg-white ring-slate-200' : 'bg-slate-50 ring-slate-200'].join(' ')}>
          <MessageHeader
            message={message}
            isAssistant={isAssistant}
            isUser={isUser}
            isPlaying={isPlaying}
            isLoading={isLoading}
            onToggleTTS={() => toggle(message.content)}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
          />

          <MessageImages images={message.images || []} />

          <div className="prose prose-sm max-w-none">
            <MessageContent content={message.content} />
            {isStreaming && isAssistant && (
              <span className="inline-block w-[6px] h-[18px] align-baseline bg-slate-500/80 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
