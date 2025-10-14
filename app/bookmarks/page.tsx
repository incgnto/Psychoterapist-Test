'use client';

import { useMemo, useState } from 'react';
import { useBookmarks } from '@/app/hooks/useBookmarks';
import { BookmarkX, Search, Filter, Loader2 } from 'lucide-react';
import { BookmarkCard } from '@/app/components/bookmarks/BookmarkCard';

export default function BookmarksPage() {
  const { list, clear } = useBookmarks();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'assistant' | 'user'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(b => {
      const roleOk = roleFilter === 'all' ? true : b.role === roleFilter;
      const textOk = !q || b.content.toLowerCase().includes(q) ||
        (b.sessionTitle?.toLowerCase().includes(q) ?? false);
      return roleOk && textOk;
    });
  }, [list, query, roleFilter]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Bookmarks</h1>
          <p className="text-sm text-slate-500">Save helpful reflections and revisit them anytime.</p>
        </div>
        {list.length > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700"
            title="Clear all bookmarks"
          >
            <BookmarkX className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Tools */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarked messages…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="h-[38px] rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <option value="all">All</option>
            <option value="assistant">Therapist only</option>
            <option value="user">Your notes only</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filtered.map(b => (
            <BookmarkCard key={`${b.id}-${b.savedAt}`} record={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <p className="text-slate-700 font-medium mb-1">No bookmarks yet</p>
      <p className="text-slate-500 text-sm">Tap the bookmark icon on any therapist message to save it here.</p>
    </div>
  );
}
