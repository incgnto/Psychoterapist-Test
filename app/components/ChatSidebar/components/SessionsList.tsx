'use client';
import EmptyState from './EmptyState';

export default function SessionsList({
  items,
  onSelect,
}: {
  items: any[];
  onSelect?: (s: unknown) => void;
}) {
  if (!items || items.length === 0) return <EmptyState icon="sessions" />;
  return (
    <>
      {items.map((chat) => (
        <button
          key={chat.threadId}
          onClick={() => onSelect && onSelect(chat)}
          className="w-full text-left px-3 py-2.5 border-b border-slate-100
                     hover:bg-slate-50/60 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        >
          <div className="text-[13px] font-medium text-slate-800 mb-0.5 truncate">
            {chat.title || 'Untitled session'}
          </div>
          <div className="text-[11px] text-slate-500">
            {chat.updatedAt ? new Date(chat.updatedAt).toLocaleString() : ''}
          </div>
        </button>
      ))}
    </>
  );
}
