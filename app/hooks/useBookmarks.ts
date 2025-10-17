// app/hooks/useBookmarks.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type BookmarkItem = {
  id: string;
  messageId: string;
  threadId: string;
  isUser?: boolean;
  title?: string;
  note?: string;
  contentPreview?: string;
  createdAt?: string | Date; // original message time
  updatedAt?: string | Date; // bookmark last-modified time
};

type TogglePayload = {
  id: string;                  // messageId
  content: string;
  threadId?: string;
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

function getUserFromLocation() {
  let email = 'guest@pj.com',
    username = 'guest',
    fullname = 'Guest User';

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    email = params.get('email') || email;
    username = params.get('username') || username;
    fullname = params.get('fullname') || fullname;
  }
  return { email, username, fullname, isGuest: !email || email === 'guest@pj.com' };
}

export function useBookmarks() {
  const [list, setList] = useState<BookmarkItem[]>([]);
  const [byMessageId, setByMessageId] = useState<Map<string, { id: string }>>(new Map());
  const [loading, setLoading] = useState(false);

  const { email, username, fullname, isGuest } = useMemo(getUserFromLocation, []);

  // hydrate from server
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `?email=${encodeURIComponent(email)}`;
      const res = await fetch(`/api/bookmarks${qs}`, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load bookmarks');
      const data = await res.json();
      const bookmarks: BookmarkItem[] = Array.isArray(data?.bookmarks) ? data.bookmarks : [];
      setList(bookmarks);

      // rebuild map for quick “isBookmarked”
      const next = new Map<string, { id: string }>();
      for (const b of bookmarks) {
        if (b.messageId && b.id) next.set(b.messageId, { id: b.id });
      }
      setByMessageId(next);
    } catch (e) {
      // fail softly
      setList([]);
      setByMessageId(new Map());
      // console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isBookmarked = useCallback(
    (messageId: string) => byMessageId.has(messageId),
    [byMessageId]
  );

  const toggleBookmark = useCallback(
    async (msg: TogglePayload, meta?: Meta) => {
      const messageId = msg.id;
      if (!messageId) return;

      const existing = byMessageId.get(messageId);

      if (existing) {
        // remove bookmark
        try {
          await fetch(
            `/api/bookmarks?id=${encodeURIComponent(existing.id)}&email=${encodeURIComponent(email)}`,
            { method: 'DELETE' }
          );
        } catch {
          /* ignore */
        }
        setByMessageId((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
        setList((prev) => prev.filter((b) => b.id !== existing.id));
        return;
      }

      // create / upsert
      const body = {
        email,
        user: { email, username, fullname, isGuest },
        messageId,
        threadId: msg.threadId || '',
        title: meta?.title || '',
        note: meta?.note || '',
        contentPreview: msg.contentPreview ?? String(msg.content || '').slice(0, 1000),
        isUser:
          typeof msg.isUser === 'boolean'
            ? msg.isUser
            : String(msg.role || '').toLowerCase() === 'user',
        messageTimestamp: msg.messageTimestamp ?? msg.timestamp ?? undefined,
      };

      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to save bookmark');

        const data = await res.json();
        const saved: BookmarkItem | undefined = data?.bookmark
          ? {
              id: data.bookmark.id,
              messageId: data.bookmark.messageId ?? messageId,
              threadId: data.bookmark.threadId ?? (msg.threadId || ''),
              title: data.bookmark.title ?? body.title,
              note: data.bookmark.note ?? body.note,
              contentPreview: data.bookmark.contentPreview ?? body.contentPreview,
              createdAt: data.bookmark.createdAt,
              updatedAt: data.bookmark.updatedAt,
              isUser: data.bookmark.isUser,
            }
          : undefined;

        // Update map & list locally for instant UI feedback
        if (saved?.id) {
          setByMessageId((prev) => {
            const next = new Map(prev);
            next.set(messageId, { id: saved.id });
            return next;
          });
          setList((prev) => {
            // ensure uniqueness by id, then insert (newest-first by updatedAt)
            const filtered = prev.filter((b) => b.id !== saved.id);
            return [saved, ...filtered];
          });
        }
      } catch {
        // swallow errors for UX smoothness
      }
    },
    [byMessageId, email, username, fullname, isGuest]
  );

  const clear = useCallback(() => {
    setList([]);
    setByMessageId(new Map());
  }, []);

  return {
    // existing API
    isBookmarked,
    toggleBookmark,
    // new API to satisfy page.tsx
    list,
    refresh,
    clear,
    loading,
  };
}
