'use client';

import { useEffect, useState } from 'react';
import ChatSidebar from './components/ChatSidebar/Index';
import ChatMain from './components/chat/ChatMain';
import ErrorBoundary from './components/ErrorBoundary';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newChatTrigger, setNewChatTrigger] = useState(0);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const handleNewChat = () => {
    setNewChatTrigger((prev) => prev + 1);
    setSelectedSession(null);
  };

  const handleSelectChat = (session: any) => {
    setSelectedSession(session);
  };

  // Open sidebar by default on large screens, keep closed on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    setIsSidebarOpen(isDesktop);
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50 relative">
        {/* Sidebar (self-positioned: fixed inset-y-0 left-0) */}
        <ChatSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((v) => !v)}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
        />

        {/* Main Chat Area (shift right when sidebar is open on desktop) */}
        <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
          <ErrorBoundary>
            <ChatMain
              newChatTrigger={newChatTrigger}
              selectedSession={selectedSession}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
            />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}
