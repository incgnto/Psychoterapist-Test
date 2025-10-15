'use client';

import { useEffect, useState } from 'react';

export function useSidebarData(tab, email, enabled) {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        if (tab === 'sessions') {
          const res = await fetch(`/api/chat-history?email=${email}`);
          const data = await res.json();
          if (mounted) setSessions(data.sessions || []);
        } else {
          const res = await fetch(`/api/bookmarks?email=${email}`);
          const data = await res.json();
          if (mounted) setBookmarks(data.bookmarks || []);
        }
      } catch {
        if (mounted) {
          if (tab === 'sessions') {
            setSessions([]);
          } else {
            setBookmarks([]);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [tab, email, enabled]);

  return { loading, sessions, bookmarks };
}
