'use client';

import {
  User,
  Volume2,
  VolumeX,
  Loader2,
  Copy,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
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
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
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
  onToggleBookmark, // will only be used to ADD a bookmark (no unbookmark here)
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

  // local UI states for the bookmark UX
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // Header bookmark behavior:
  // - If already bookmarked -> button disabled (shows check icon)
  // - If not bookmarked -> click once to add; show quick "Saved" confirmation; then disable
  const handleBookmarkOnce = async () => {
    if (!onToggleBookmark || isBookmarked || saving || justSaved) return;
    try {
      setSaving(true);
      // fire and forget; parent handles persistence
      await Promise.resolve(onToggleBookmark(message));
      setJustSaved(true); // show confirmation chip
      // keep it disabled after save; no auto-hide needed, but we can fade message out later if desired
      setTimeout(() => setJustSaved(false), 1400); // optional: short-lived visual feedback
    } finally {
      setSaving(false);
    }
  };

  const bookmarkDisabled = Boolean(isBookmarked || saving || justSaved);

  return (
    // Align the whole row by center
    <div className="flex items-center gap-2 mb-2">
      {/* Left: name + time aligned by baseline */}
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] sm:text-sm font-medium text-slate-900 leading-tight">
          {isUser ? 'You' : 'The Therapist'}
        </span>
        <span className="text-[12px] text-slate-500 leading-tight">{ts}</span>
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
              <path
                d="M20 6L9 17l-5-5"
                stroke="rgb(5 150 105)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>

        {/* Bookmark (one-way add from header) */}
        <div className="relative">
          <button
            onClick={handleBookmarkOnce}
            disabled={bookmarkDisabled}
            title={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
            aria-label={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
            className={`
              inline-flex items-center justify-center
              h-7 w-7 rounded-full leading-none
              transition-colors
              ${bookmarkDisabled
                ? 'text-slate-300 cursor-default'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'}
            `}
          >
            {isBookmarked || justSaved ? (
              <BookmarkCheck className="w-4 h-4" />
            ) : saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          {/* quick confirmation chip */}
          {justSaved && (
            <span
              role="status"
              aria-live="polite"
              className="
                absolute -right-1 top-8 select-none
                inline-flex items-center gap-1 rounded-full px-2 py-1
                text-[11px] font-medium
                bg-emerald-50 text-emerald-700 border border-emerald-200
                shadow-sm
              "
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>
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
