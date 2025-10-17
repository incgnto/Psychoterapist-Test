'use client';

import { Menu, X } from 'lucide-react';
import { SignedIn, UserButton } from '@clerk/nextjs';

type Props = {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
};

export default function ChatHeader({ onToggleSidebar, isSidebarOpen }: Props) {
  return (
    <header className="sticky top-0 z-[50] bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: mobile menu */}
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            aria-controls="chat-sidebar"
            aria-expanded={!!isSidebarOpen}
            className="lg:hidden inline-flex items-center justify-center
                       h-10 w-10 rounded-lg bg-white border border-black/5 shadow-sm
                       text-slate-700 hover:bg-slate-50 transition
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Center: tagline */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center px-2">
          {/* mobile */}
          <div className="block sm:hidden text-[11px] text-gray-700 leading-relaxed">
            <div>Safe space for your thoughts 💭</div>
            <div className="text-gray-500 text-[10px]">
              Not a medical or psychiatric advice.
            </div>
          </div>

          {/* desktop */}
          <span className="hidden sm:flex text-xs text-gray-600 items-center gap-1">
            Safe space for your thoughts 💭 | Not a medical or psychiatric advice.
          </span>
        </div>

        {/* Right: auth area */}
        <div className="flex items-center gap-2 ml-auto">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
