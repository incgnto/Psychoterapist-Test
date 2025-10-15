'use client';

import { Bookmark as BookmarkIcon, MessageSquare as MessageSquareIcon } from 'lucide-react';

export default function EmptyState({ icon }) {
  const Icon = icon === 'sessions' ? MessageSquareIcon : BookmarkIcon;
  const title = icon === 'sessions' ? 'No conversations yet' : 'No bookmarks yet';
  const descr =
    icon === 'sessions'
      ? 'Your chat history will appear here once you start a conversation.'
      : 'Save helpful replies or your own notes to revisit later.';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-sm font-medium text-slate-700 mb-1.5">{title}</h3>
      <p className="text-[12px] text-slate-500 leading-relaxed max-w-[240px]">{descr}</p>
    </div>
  );
}
