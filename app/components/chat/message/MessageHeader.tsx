'use client';

import {
  User,
  Volume2,
  VolumeX,
  Loader2,
  Copy,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { useState } from 'react';
import type { Message } from '@/app/types/chat';

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
  return Promise.resolve();
}

export function MessageHeader({
  message,
  isAssistant,
  isUser,
  isPlaying,
  isLoading,
  onToggleTTS,
  isBookmarked,
  onToggleBookmark,
}: {
  message: Message;
  isAssistant: boolean;
  isUser: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onToggleTTS: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (m: Message) => void;
}) {
  const [copied, setCopied] = useState(false);

  const ts = (() => {
    let d: any = message.timestamp;
    if (typeof d === 'string') d = new Date(d);
    return d && typeof d.toLocaleTimeString === 'function'
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  })();

  const handleCopy = async () => {
    try {
      await copyToClipboard(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    // Align the whole row by center
    <div className="flex items-center gap-2 mb-2">
      {/* Left: name + time aligned by baseline */}
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] sm:text-sm font-medium text-slate-900 leading-tight">
          {isUser ? 'You' : 'The Therapist'}
        </span>
        <span className="text-[12px] text-slate-500 leading-tight">
          {ts}
        </span>
      </div>

      {/* Right: action buttons with fixed, identical heights */}
      <div className="ml-auto inline-flex items-center gap-1.5">
        {isAssistant && (
          <button
            onClick={onToggleTTS}
            disabled={isLoading}
            title={isPlaying ? 'Stop reading' : 'Listen'}
            aria-label={isPlaying ? 'Stop reading' : 'Listen'}
            className="
              inline-flex items-center justify-center
              h-7 px-2 rounded-full text-[12px] leading-none
              text-slate-600 hover:text-slate-800 hover:bg-slate-100
              disabled:opacity-60 transition-colors
            "
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline ml-1">{isPlaying ? 'Stop' : 'Listen'}</span>
          </button>
        )}

        <button
          onClick={handleCopy}
          title={copied ? 'Copied' : 'Copy'}
          aria-label={copied ? 'Message copied' : 'Copy message'}
          className="
            inline-flex items-center justify-center
            h-7 w-7 rounded-full leading-none
            text-slate-600 hover:text-slate-800 hover:bg-slate-100
            transition-colors
          "
        >
          {copied ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="rgb(5 150 105)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => onToggleBookmark?.(message)}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          // inline-flex instead of hidden to show the bookmark icon on the chat header
          className="
            hidden items-center justify-center
            h-7 w-7 rounded-full leading-none
            text-slate-600 hover:text-slate-800 hover:bg-slate-100
            transition-colors
          "
        >
          {isBookmarked ? (
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export function MessageAvatar({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={[
        'mt-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0',
        isUser ? 'bg-sky-600' : 'bg-emerald-100',
      ].join(' ')}
    >
      {isUser ? (
        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      ) : (
        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-inner">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
}
