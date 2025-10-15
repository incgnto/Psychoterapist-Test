'use client';

import { Bookmark as BookmarkIcon } from 'lucide-react';
import EmptyState from './EmptyState';

export default function BookmarksList({ items }) {
  if (!items || items.length === 0) return <EmptyState icon="bookmarks" />;
  return (
    <>
      {items.map((b) => (
        <div
          key={b.id}
          className="px-3 py-2.5 border-b border-slate-100 flex items-start gap-3
                     hover:bg-slate-50/60 transition-colors"
        >
          <BookmarkIcon className="w-5 h-5 text-slate-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-slate-800 truncate">
              {b.title || 'Saved item'}
            </div>
            {b.note && <div className="text-[12px] text-slate-600 line-clamp-2">{b.note}</div>}
            {b.updatedAt && (
              <div className="text-[11px] text-slate-400 mt-1">
                {new Date(b.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
