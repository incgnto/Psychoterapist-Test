// app/hooks/useBookmarks.ts
'use client';

import { useCallback, useState } from 'react';

type TogglePayload = {
  id: string;                 // messageId
  content: string;
  threadId?: string;
  // new optional fields we want to allow:
  role?: string;
  timestamp?: string | Date;
  isUser?: boolean;
  messageTimestamp?: string | Date;
  contentPreview?: string;
};

type Meta = {
  title?: string;
  note?: string;
};

export function useBookmarks() {
  const [byMessageId, setByMessageId] = useState<Map<string, { id: string }>>(new Map());

  const isBookmarked = useCallback(
    (messageId: string) => byMessageId.has(messageId),
    [byMessageId]
  );

  const toggleBookmark = useCallback(
    async (msg: TogglePayload, meta?: Meta) => {
      const messageId = msg.id;
      if (!messageId) return;

      // who is the user
      let email = 'guest@pj.com', username = 'guest', fullname = 'Guest User';
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        email = params.get('email') || email;
        username = params.get('username') || username;
        fullname = params.get('fullname') || fullname;
      }

      const existing = byMessageId.get(messageId);
      if (existing) {
        // remove bookmark
        await fetch(
          `/api/bookmarks?id=${encodeURIComponent(existing.id)}&email=${encodeURIComponent(email)}`,
          { method: 'DELETE' }
        ).catch(() => {});
        setByMessageId(prev => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
        return;
      }

      // create / upsert
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          user: { email, username, fullname, isGuest: !email || email === 'guest@pj.com' },
          messageId,
          threadId: msg.threadId || '',
          title: meta?.title || '',
          note: meta?.note || '',
          contentPreview: msg.contentPreview ?? String(msg.content || '').slice(0, 1000),

          // NEW: pass who sent + original timestamp (backend also infers if missing)
          isUser: typeof msg.isUser === 'boolean'
            ? msg.isUser
            : String(msg.role || '').toLowerCase() === 'user',
          messageTimestamp: msg.messageTimestamp ?? msg.timestamp ?? undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const id = data?.bookmark?.id;
        if (id) {
          setByMessageId(prev => {
            const next = new Map(prev);
            next.set(messageId, { id });
            return next;
          });
        }
      }
    },
    [byMessageId]
  );

  return { isBookmarked, toggleBookmark };
}
