'use client';

import { Menu, X } from 'lucide-react';

type Props = {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
};

export default function ChatHeader({ onToggleSidebar, isSidebarOpen }: Props) {
  return (
    <div className="sticky top-0 z-[50] bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 h-14 sm:h-16 flex items-center">
        {/* Left: mobile toggle */}
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            aria-controls="chat-sidebar"
            aria-expanded={!!isSidebarOpen}
            className="
              lg:hidden inline-flex items-center justify-center
              h-10 w-10 rounded-lg bg-white border border-black/5 shadow-sm
              text-slate-700 hover:bg-slate-50 transition
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            "
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Center: tagline */}
        <div className="flex-1 flex flex-wrap items-center justify-center text-center px-2">
          <div className="block sm:hidden text-[13px] text-gray-700 leading-relaxed">
            <div>Safe space for your thoughts 💭</div>
            <div className="text-gray-500 text-[12px]">Not a medical or psychiatric advice.</div>
          </div>
          <span className="hidden sm:flex text-xs text-gray-600 items-center gap-1">
            Safe space for your thoughts 💭 | Not a medical or psychiatric advice.
          </span>
        </div>

        {/* Right spacer to balance the left button on mobile */}
        <div className="w-10 lg:w-0" />
      </div>
    </div>
  );
}
