'use client'

import { Message } from '@/app/types/chat'
import { User, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { initializeSafariAudioContext, unlockSafariAudio } from '@/lib/safari-audio-fix'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

// Custom hook for text-to-speech
function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentUrlRef = useRef<string | null>(null)

  useEffect(() => {
    initializeSafariAudioContext()
  }, [])

  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/[📍💶🇱🇹]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
  }

  const stop = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      } catch {}
    }
    if (currentUrlRef.current) {
      try { URL.revokeObjectURL(currentUrlRef.current) } catch {}
    }
    currentAudioRef.current = null
    currentUrlRef.current = null
    setIsPlaying(false)
    setIsLoading(false)
  }

  const speak = async (text: string) => {
    try {
      // Stop any current audio
      stop()

      await unlockSafariAudio()

      setIsLoading(true)
      const cleanText = cleanTextForSpeech(text)
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio()
      audio.src = audioUrl
      audio.volume = 1.0
      audio.playbackRate = 1.0
      audio.preload = 'auto'

      currentAudioRef.current = audio
      currentUrlRef.current = audioUrl

      audio.onplay = () => { setIsPlaying(true); setIsLoading(false) }
      audio.onended = () => stop()
      audio.onerror = () => stop()

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        await playPromise
      }
    } catch (e) {
      // On failure, ensure state is reset
      stop()
      // Silently fail; read-aloud is a convenience feature
      console.error('Read aloud failed:', e)
    }
  }

  const toggle = (text: string) => {
    if (isPlaying) {
      stop()
    } else {
      void speak(text)
    }
  }

  return { isPlaying, isLoading, toggle, stop }
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const { isPlaying, isLoading, toggle } = useTextToSpeech()

  return (
    <div className={`flex gap-2 sm:gap-3 p-3 sm:p-4 ${isUser ? 'bg-transparent' : 'bg-gray-50'}`}>
      {/* Avatar */}
      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-blue-600' 
          : 'bg-green-100'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
        ) : (
          <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs sm:text-sm font-medium text-gray-900">
            {isUser ? 'You' : 'PJ – Psychotherapist'}
          </span>
          <span className="text-xs text-gray-500">
            {(() => {
              let dateObj = message.timestamp
              if (typeof dateObj === 'string') {
                dateObj = new Date(dateObj)
              }
              return dateObj && typeof dateObj.toLocaleTimeString === 'function'
                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''
            })()}
          </span>
          {/* Read Aloud Button - Only for assistant messages */}
          {isAssistant && (
            <button
              onClick={() => toggle(message.content)}
              className="ml-auto p-1 rounded-full hover:bg-gray-200 transition-colors group disabled:opacity-60"
              disabled={isLoading}
              title={isPlaying ? 'Stop reading' : 'Read aloud'}
              aria-label={isPlaying ? 'Stop reading' : 'Read aloud'}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 animate-spin" />
              ) : isPlaying ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 group-hover:text-gray-800" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 group-hover:text-gray-800" />
              )}
            </button>
          )}
        </div>
        
        {/* Display images if present */}
        {message.images && message.images.length > 0 && (
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {message.images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={`data:${image.mimeType};base64,${image.data}`}
                  alt={image.name}
                  className="w-full h-auto max-h-64 object-cover rounded-lg border border-gray-200"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                  {image.name}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="prose prose-sm max-w-none">
          <MessageContent content={message.content} />
          {isStreaming && isAssistant && (
            <span className="inline-block w-1 h-4 bg-gray-600 ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  // Split content by paragraphs and format special sections
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => {
        // Check for special formatting
        if (paragraph.includes('**Before we continue**')) {
          return (
            <div key={index} className="p-2 sm:p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r">
              <FormattedText text={paragraph} />
            </div>
          )
        }
        
        if (paragraph.includes('**Next step:**')) {
          return (
            <div key={index} className="p-2 sm:p-3 bg-green-50 border-l-4 border-green-400 rounded-r">
              <FormattedText text={paragraph} />
            </div>
          )
        }
        
        if (paragraph.includes('🧠') || paragraph.includes('📝') || paragraph.includes('💭')) {
          return (
            <div key={index} className="p-2 sm:p-3 bg-gray-50 rounded border">
              <FormattedText text={paragraph} />
            </div>
          )
        }
        
        return (
          <div key={index}>
            <FormattedText text={paragraph} />
          </div>
        )
      })}
    </div>
  )
}

function FormattedText({ text }: { text: string }) {
  // Handle bold text and links
  const parts = text.split(/(\*\*.*?\*\*|https?:\/\/[^\s]+)/g)
  
  return (
    <p className="text-sm sm:text-base text-gray-800 leading-relaxed">
      {parts.map((part, index) => {
        // Bold text
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          )
        }
        
        // Links
        if (part.startsWith('http')) {
          return (
            <a 
              key={index} 
              href={part} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline break-all"
            >
              {part}
            </a>
          )
        }
        
        return part
      })}
    </p>
  )
}