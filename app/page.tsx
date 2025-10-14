'use client'


import { useState, useEffect } from 'react'
// Removed next-auth session and router imports
import { MessageSquare } from 'lucide-react'
import ChatSidebar from './components/ChatSidebar'
import ChatMain from './components/chat/ChatMain'
import ErrorBoundary from './components/ErrorBoundary'

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [newChatTrigger, setNewChatTrigger] = useState(0)
  const [selectedSession, setSelectedSession] = useState<any>(null)

  const handleNewChat = () => {
    setNewChatTrigger(prev => prev + 1)
    setSelectedSession(null)
  }

  const handleSelectChat = (session: any) => {
    setSelectedSession(session)
  }

  // Open sidebar by default on large screens, keep closed on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      setIsSidebarOpen(isDesktop)
    }
  }, [])

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50 relative">
        {/* Sidebar - Mobile responsive */}
        <ErrorBoundary>
          <div className={`
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            fixed inset-y-0 left-0 z-50 w-80 transition-transform duration-300 ease-in-out
          `}>
            <ChatSidebar 
              isOpen={true} 
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
              onNewChat={handleNewChat}
              onSelectChat={handleSelectChat}
            />
          </div>
        </ErrorBoundary>
        
        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar toggle button for mobile */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow lg:hidden"
          >
            <MessageSquare className="w-5 h-5 text-gray-600" />
          </button>
        )}
        
        {/* Main Chat Area */}
  <div className="flex-1 flex flex-col lg:ml-80">
          <ErrorBoundary>
            <ChatMain newChatTrigger={newChatTrigger} selectedSession={selectedSession} />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  )
}