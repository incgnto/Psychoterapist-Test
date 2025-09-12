'use client'


import { Plus, MessageSquare, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
// Removed next-auth and router imports

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onNewChat: () => void
}

// Fetch chat history from API


export default function ChatSidebar({ isOpen, onToggle, onNewChat, onSelectChat }: ChatSidebarProps & { onSelectChat?: (session: any) => void }) {
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      // Get user email from query param or use guest
      const params = new URLSearchParams(window.location.search)
      const email = params.get('email') || 'guest@surgery.com'
      const res = await fetch(`/api/chat-history?email=${email}`)
      const data = await res.json()
      setChatHistory(data.sessions || [])
      setLoading(false)
    }
    fetchHistory()
  }, [])
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
      >
        <MessageSquare className="w-5 h-5 text-gray-600" />
      </button>
    )
  }

  return (
  <div className="w-80 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Chat History</h2>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 rounded transition-colors lg:hidden"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <button 
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
  {/* Removed login/logout buttons */}
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">Loading...</div>
        ) : chatHistory.length > 0 ? (
          chatHistory.map((chat) => (
            <div
              key={chat.threadId}
              className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelectChat && onSelectChat(chat)}
            >
              <div className="text-sm font-medium text-gray-800 mb-1 truncate">
                {chat.title}
              </div>
              <div className="text-xs text-gray-500">
                {chat.updatedAt ? new Date(chat.updatedAt).toLocaleString() : ''}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">No conversations yet</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your chat history will appear here once you start a conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}