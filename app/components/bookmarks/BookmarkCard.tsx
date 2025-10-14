'use client';

import { useBookmarks } from '@/app/hooks/useBookmarks';
import { useTextToSpeech } from '@/app/hooks/useTextToSpeech';
import { Volume2, VolumeX, Loader2, Copy, BookmarkMinus } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Message } from '@/app/types/chat';

type BookmarkRecord = {
  id: string;
  role: Message['role'];
  content: string;
  timestamp?: string | Date | number | null;
  sessionId?: string | null;   // optional if you have sessions
  sessionTitle?: string | null; // optional
  images?: { name: string; mimeType: string; data: string }[]; // optional
  savedAt: number;             // when it was bookmarked
};

export function BookmarkCard({ record }: { record: BookmarkRecord }) {
  const { remove } = useBookmarks();
  const { isPlaying, isLoading, toggle } = useTextToSpeech();
  const [copied, setCopied] = useState(false);

  const humanTime = useMemo(() => {
    const t = record.timestamp ? new Date(record.timestamp as any) : new Date(record.savedAt);
    try {
      return t.toLocaleString([], { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return '';
    }
  }, [record.timestamp, record.savedAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(record.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <article className="rounded-2xl p-4 sm:p-5 ring-1 ring-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[13px] sm:text-sm font-medium text-slate-900">
          {record.role === 'assistant' ? 'The Therapist' : 'You'}
        </span>
        <span className="text-[12px] text-slate-500">• {humanTime}</span>
        {record.sessionTitle && (
          <span className="ml-1 text-[12px] text-slate-500 truncate">• {record.sessionTitle}</span>
        )}

        <div className="ml-auto inline-flex items-center gap-1.5">
          {/* Listen */}
          <button
            onClick={() => toggle(record.content)}
            disabled={isLoading}
            className="rounded-full px-2 py-1 text-[12px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-60 transition-colors inline-flex items-center gap-1"
            title={isPlaying ? 'Stop reading' : 'Listen'}
            aria-label={isPlaying ? 'Stop reading' : 'Listen'}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlaying ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Listen'}</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="rounded-full p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title={copied ? 'Copied' : 'Copy'}
            aria-label={copied ? 'Message copied' : 'Copy message'}
          >
            {copied ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="rgb(5 150 105)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Remove bookmark */}
          <button
            onClick={() => remove(record.id)}
            className="rounded-full p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Remove bookmark"
            aria-label="Remove bookmark"
          >
            <BookmarkMinus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Images (optional) */}
      {record.images?.length ? (
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {record.images.map((img, i) => (
            <figure key={`${img.name}-${i}`} className="relative group">
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={img.name}
                className="w-full h-auto max-h-64 object-cover rounded-xl ring-1 ring-slate-200 transition-shadow group-hover:shadow-md"
              />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[11px] sm:text-xs px-2 py-1 rounded-b-xl truncate">
                {img.name}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {/* Content */}
      <p className="text-[15px] sm:text-base leading-relaxed text-slate-800 whitespace-pre-wrap">
        {record.content}
      </p>
    </article>
  );
}
