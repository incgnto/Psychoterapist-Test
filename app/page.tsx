// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import ChatSidebar from './components/ChatSidebar/Index';
import ChatMain from './components/chat/ChatMain';
import ErrorBoundary from './components/ErrorBoundary';
import WelcomeLanding from './components/WelcomeLanding';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newChatTrigger, setNewChatTrigger] = useState(0);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    setIsSidebarOpen(isDesktop);
  }, []);

  const handleNewChat = () => {
    setNewChatTrigger((prev) => prev + 1);
    setSelectedSession(null);
  };

  return (
    <>
      {/* LOGGED IN: full app */}
      <SignedIn>
        <ErrorBoundary>
          <div className="flex h-screen bg-gray-50 relative">
            <ChatSidebar
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen((v) => !v)}
              onNewChat={handleNewChat}
              onSelectChat={setSelectedSession}
            />
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
      </SignedIn>

      {/* LOGGED OUT: soft welcome */}
      <SignedOut>
        <WelcomeLanding />
      </SignedOut>
    </>
  );
}