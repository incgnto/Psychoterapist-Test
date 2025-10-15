'use client';
import { ChevronLeft } from 'lucide-react';
import TabPill from './TabPill';
import BackHomeLink from './BackHomeLink';

export default function NavBar({
  tab,
  setTab,
  onToggle,
}: {
  tab: 'sessions' | 'bookmarks';
  setTab: (t: 'sessions' | 'bookmarks') => void;
  onToggle: () => void;
}) {
  return (
    <div className="">
      <nav className="px-3 pt-3 pb-2 flex items-center gap-2">
        <TabPill label="Sessions" active={tab === 'sessions'} onClick={() => setTab('sessions')} />
        <TabPill label="Bookmarks" active={tab === 'bookmarks'} onClick={() => setTab('bookmarks')} />
        <BackHomeLink href="https://surgery-abroad.com" />

        {/* Close (mobile/tablet) */}
        <button
          onClick={onToggle}
          aria-label="Close sidebar"
          className="lg:hidden h-9 w-9 ml-1 rounded-full bg-white border border-black/5 shadow-sm
                     flex items-center justify-center hover:bg-slate-50 transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
      </nav>
    </div>
  );
}
