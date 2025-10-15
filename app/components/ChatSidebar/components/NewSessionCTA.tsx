'use client';
import { Plus } from 'lucide-react';

export default function NewSessionCTA({
  onNewChat,
  visible,
}: {
  onNewChat: () => void;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="px-3 pb-3">
      <button
        onClick={onNewChat}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                   bg-sky-100 text-sky-700 hover:bg-sky-200 active:bg-sky-100
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 transition"
      >
        <Plus className="w-4 h-4" />
        New Session
      </button>
    </div>
  );
}
