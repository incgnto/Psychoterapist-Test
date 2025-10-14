'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Message } from '@/app/types/chat';

export type BookmarkRecord = {
  id: string;
  role: Message['role'];
  content: string;
  timestamp?: string | number | Date | null;
  sessionId?: string | null;
  sessionTitle?: string | null;
  images?: { name: string; mimeType: string; data: string }[];
  savedAt: number;
};

type StorageShapeV2 = {
  ids: string[];
  records: Record<string, BookmarkRecord>;
};

const STORAGE_KEY = 'bookmarks:v2';
const LEGACY_KEY = 'bookmarks:v1'; // old ids-only version, if you had it

export function useBookmarks() {
  const [ids, setIds] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, BookmarkRecord>>({});

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StorageShapeV2 = JSON.parse(raw);
        setIds(parsed.ids || []);
        setRecords(parsed.records || {});
        return;
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) setIds(JSON.parse(legacy) || []);
    } catch (e) {
      console.warn('Bookmarks hydrate failed', e);
    }
  }, []);

  // persist
  useEffect(() => {
    try {
      const payload: StorageShapeV2 = { ids, records };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Bookmarks persist failed', e);
    }
  }, [ids, records]);

  const isBookmarked = useCallback(
    (id?: string) => !!(id && ids.includes(String(id))),
    [ids]
  );

  const remove = useCallback((id: string) => {
    id = String(id);
    setIds(prev => prev.filter(x => x !== id));
    setRecords(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const toggleMessage = useCallback(
    (m: Message, ctx?: { sessionId?: string; sessionTitle?: string }) => {
      if (!m?.id) return;                // <<< if this fires, your Message needs an id
      const id = String(m.id);

      setIds(prev => {
        if (prev.includes(id)) {
          // remove
          setRecords(r => {
            const n = { ...r };
            delete n[id];
            return n;
          });
          return prev.filter(x => x !== id);
        } else {
          // add
          const rec: BookmarkRecord = {
            id,
            role: m.role,
            content: m.content,
            timestamp: (m as any).timestamp ?? Date.now(),
            images: (m as any).images,
            sessionId: ctx?.sessionId ?? null,
            sessionTitle: ctx?.sessionTitle ?? null,
            savedAt: Date.now(),
          };
          setRecords(r => ({ ...r, [id]: rec }));
          return [id, ...prev]; // newest first
        }
      });
    },
    []
  );

  const clear = useCallback(() => {
    setIds([]);
    setRecords({});
  }, []);

  const list = useMemo<BookmarkRecord[]>(
    () => ids.map(id => records[id]).filter(Boolean),
    [ids, records]
  );

  return { ids, records, list, isBookmarked, toggleMessage, remove, clear };
}
