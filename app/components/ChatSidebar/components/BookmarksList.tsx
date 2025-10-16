'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import EmptyState from './EmptyState';

type BookmarkItem = {
  id: string;
  messageId: string;
  threadId: string;
  isUser?: boolean;
  title?: string;
  note?: string;
  contentPreview?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

const MAX_CHARS = 4000;

/* -------- helpers -------- */

function getEmailFromUrl() {
  try {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return params.get('email') || 'guest@pj.com';
  } catch {
    return 'guest@pj.com';
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeInlineMarkdownToHtml(src: string) {
  let text = escapeHtml(src);
  text = text.replace(/`([^`]+?)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100">$1</code>');
  text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline decoration-slate-300 hover:decoration-slate-500">$1</a>'
  );
  text = text.replace(/\n/g, '<br/>');
  return text;
}

/* -------- component -------- */

export default function BookmarksList({ items }: { items: BookmarkItem[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<BookmarkItem[]>(items || []);

  useEffect(() => {
    setLocalItems(items || []);
  }, [items]);

  const sorted = useMemo(() => {
    if (!localItems || localItems.length === 0) return [];
    return [...localItems].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
  }, [localItems]);

  if (!sorted || sorted.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Tip />
        <EmptyState icon="bookmarks" />
      </div>
    );
  }

  const email = getEmailFromUrl();

  return (
    <div className="flex flex-col h-full">
      <Tip />

      <div className="flex-1 overflow-y-auto">
        {sorted.map((b, idx) => {
          const rawText =
            (b.note && b.note.trim()) ||
            (b.contentPreview && b.contentPreview.trim()) ||
            (b.title && b.title.trim()) ||
            '';

          const displayText =
            rawText.length > MAX_CHARS ? rawText.slice(0, MAX_CHARS) + '…' : rawText;

          const showAuthor = typeof b.isUser === 'boolean';
          const author = b.isUser ? 'You' : 'Therapist';

          const originalTime = b.createdAt ? new Date(b.createdAt).toLocaleString() : '';
          const bookmarkedTime = b.updatedAt ? new Date(b.updatedAt).toLocaleString() : '';
          const copyText = rawText;

          const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

          const onRemove = async () => {
            if (!b.id) return;
            setRemovingId(b.id);
            try {
              await fetch(
                `/api/bookmarks?id=${encodeURIComponent(b.id)}&email=${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );
              setLocalItems((prev) => prev.filter((x) => x.id !== b.id));
            } catch {
              /* no-op */
            } finally {
              setRemovingId((id) => (id === b.id ? null : id));
            }
          };

          return (
            <div
              key={b.id}
              className={`${bgClass} px-3 py-2.5 border-b border-slate-200 transition-colors hover:bg-slate-100`}
            >
              {/* Author + text */}
              <div
                className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words overflow-visible"
              >
                {showAuthor && (
                  <>
                    <span className="font-semibold text-slate-800">{author}</span>
                    <span>: </span>
                  </>
                )}
                {displayText ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: safeInlineMarkdownToHtml(displayText),
                    }}
                  />
                ) : (
                  <span className="text-slate-400">(no text)</span>
                )}
              </div>

              {/* Meta row */} <div className="ml-auto flex items-center gap-2"> {originalTime && ( <span className="text-[11px] text-slate-400">{originalTime}</span> )} {copyText && ( <button onClick={async () => { try { await navigator.clipboard.writeText(copyText); setCopiedId(b.id); setTimeout(() => setCopiedId((id) => (id === b.id ? null : id)), 900); } catch {} }} className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" title="Copy note" aria-label="Copy note" > <Copy className="w-3.5 h-3.5" /> <span>{copiedId === b.id ? 'Copied' : 'Copy'}</span> </button> )} <button onClick={onRemove} disabled={removingId === b.id} className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-slate-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300" title="Remove bookmark" aria-label="Remove bookmark" > <Trash2 className="w-3.5 h-3.5" /> <span>{removingId === b.id ? 'Removing…' : 'Remove'}</span> </button> </div> 
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Small tip header ---------- */
function Tip() {
  return (
    <div className="px-3 py-2 border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-[1]">
      <p className="text-[12px] text-slate-500">
        Sorted by <span className="font-medium">bookmark time</span>. Alternating background colors for readability.
      </p>
    </div>
  );
}
