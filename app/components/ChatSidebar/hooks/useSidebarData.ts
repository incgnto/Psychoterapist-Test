// app/components/ChatSidebar/hooks/useSidebarData.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

type Tab = 'sessions' | 'bookmarks';

export function useSidebarData(tab: Tab, _email: string, enabled: boolean) {
  const { isSignedIn } = useAuth(); // ← drives clearing/refetch
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const endpoint = useMemo(
    () => (tab === 'sessions' ? '/api/chat-history' : '/api/bookmarks'),
    [tab]
  );

  const clear = useCallback(() => {
    setSessions([]);
    setBookmarks([]);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    // If you want to show *guest* data when signed out, delete this guard.
    if (!isSignedIn) {
      clear();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const res = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();

      if (tab === 'sessions') setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      else setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        if (tab === 'sessions') setSessions([]);
        else setBookmarks([]);
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, [enabled, endpoint, tab, isSignedIn, clear]);

  // Fetch when tab/auth/enabled changes
  useEffect(() => {
    if (!enabled) return;
    refresh();
    return () => abortRef.current?.abort();
  }, [enabled, tab, isSignedIn, refresh]);

  // Immediately clear lists when signed out
  useEffect(() => {
    if (!isSignedIn) clear();
  }, [isSignedIn, clear]);

  return { loading, sessions, bookmarks, refresh, clear };
}
