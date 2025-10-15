'use client';

import { useEffect, useState } from 'react';
import { useEmail } from './hooks/useEmail';
import { useSidebarData } from './hooks/useSidebarData';

import NavBar from './components/NavBar';
import NewSessionCTA from './components/NewSessionCTA';
import SessionsList from './components/SessionsList';
import BookmarksList from './components/BookmarksList';

type ChatSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat?: (session: unknown) => void;
};

type TabKey = 'sessions' | 'bookmarks';

export default function ChatSidebar({
  isOpen,
  onToggle,
  onNewChat,
  onSelectChat,
}: ChatSidebarProps) {
  const [tab, setTab] = useState<TabKey>('sessions');
  const email = useEmail();
  const { loading, sessions, bookmarks } = useSidebarData(tab, email, isOpen);

  // ESC to close (when open)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onToggle();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onToggle]);

  // Body scroll lock on mobile when open
  useEffect(() => {
    const isMobile =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
    if (isOpen && isMobile) {
      document.body.classList.add('overflow-hidden');
      return () => document.body.classList.remove('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <button
          onClick={onToggle}
          aria-label="Close sidebar"
          className="fixed inset-0 z-[40] lg:hidden bg-black/30 backdrop-blur-[1px] motion-safe:transition-opacity"
        />
      )}

      <aside
        id="chat-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-[60] w-80
                    bg-white/95 backdrop-blur-sm border-r border-slate-200/70
                    flex flex-col shadow-[0_8px_24px_-12px_rgb(2_6_23_/0.15)]
                    transform motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavBar tab={tab} setTab={setTab} onToggle={onToggle} />
        <NewSessionCTA visible={tab === 'sessions'} onNewChat={onNewChat} />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">Loading…</div>
          ) : tab === 'sessions' ? (
            <SessionsList items={sessions} onSelect={onSelectChat} />
          ) : (
            <BookmarksList items={bookmarks} />
          )}
        </div>
      </aside>
    </>
  );
}
