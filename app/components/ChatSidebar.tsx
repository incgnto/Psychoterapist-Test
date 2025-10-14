'use client';

import { Plus, MessageSquare, ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat?: (session: any) => void;
}

export default function ChatSidebar({
  isOpen,
  onToggle,
  onNewChat,
  onSelectChat,
}: ChatSidebarProps) {
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch chat history
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email') || 'guest@pj.com';
        const res = await fetch(`/api/chat-history?email=${email}`);
        const data = await res.json();
        if (mounted) setChatHistory(data.sessions || []);
      } catch (e) {
        if (mounted) setChatHistory([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onToggle]);

  // Body scroll lock on mobile when open
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches; // < lg
    if (isOpen && isMobile) {
      document.body.classList.add('overflow-hidden');
      return () => document.body.classList.remove('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }, [isOpen]);

  // Floating opener (visible when closed)
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        aria-label="Open previous chats"
        className="
          fixed top-4 left-4 z-[80]
          h-11 w-11 rounded-full
          bg-white/90 backdrop-blur
          border border-black/5 shadow-lg
          flex items-center justify-center
          hover:bg-white transition
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          active:scale-[0.98]
        "
      >
        <MessageSquare className="w-5 h-5 text-slate-600" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop (mobile/tablet only) */}
      <button
        onClick={onToggle}
        aria-label="Close sidebar"
        className="
          fixed inset-0 z-[70] lg:hidden
          bg-black/30 backdrop-blur-[1px]
          motion-safe:transition-opacity
        "
      />

      {/* Sidebar panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Previous chats"
        className={`
          fixed inset-y-0 left-0 z-[80]
          w-80 bg-white border-r border-gray-200
          flex flex-col
          transform
          motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          shadow-lg
        `}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">Sessions</h2>

            {/* Mobile/tablet close */}
            <button
              onClick={onToggle}
              aria-label="Close previous chats"
              className="
                lg:hidden h-9 w-9
                rounded-full bg-white
                border border-black/5 shadow-sm
                flex items-center justify-center
                hover:bg-slate-50 transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              "
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="
              w-full inline-flex items-center justify-center gap-2
              px-4 py-2 rounded-lg
              bg-sky-600 text-white
              hover:bg-sky-700 transition
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Loading…
            </div>
          ) : chatHistory.length > 0 ? (
            chatHistory.map((chat) => (
              <button
                key={chat.threadId}
                onClick={() => onSelectChat && onSelectChat(chat)}
                className="
                  w-full text-left
                  p-3 border-b border-gray-100
                  hover:bg-slate-50
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300
                "
              >
                <div className="text-sm font-medium text-slate-800 mb-1 truncate">
                  {chat.title || 'Untitled session'}
                </div>
                <div className="text-xs text-slate-500">
                  {chat.updatedAt ? new Date(chat.updatedAt).toLocaleString() : ''}
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">No conversations yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                Your chat history will appear here once you start a conversation.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
