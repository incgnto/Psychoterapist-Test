'use client'

import { Pause } from 'lucide-react'

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused'
type VoiceTier = 'basic' | 'advanced'

interface VoiceOrbProps {
  state: VoiceState
  tier: VoiceTier
  onClick?: () => void
  size?: 'small' | 'medium' | 'large'
}

export default function VoiceOrb({ state, tier, onClick, size = 'large' }: VoiceOrbProps) {
  const getOrbColor = () => {
    // ChatGPT-style gradient blue orb
    return 'bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700 shadow-blue-500/40'
  }



  const getSizeClasses = () => {
    switch (state) {
      case 'listening': 
        // User speaking - NO movement, exactly same as idle
        return size === 'large' ? 'w-32 h-32' : size === 'medium' ? 'w-24 h-24' : 'w-16 h-16'
      case 'thinking': 
        // Processing - very slight increase
        return size === 'large' ? 'w-36 h-36' : size === 'medium' ? 'w-28 h-28' : 'w-20 h-20'
      case 'speaking': 
        // AI speaking - DRAMATIC pop out exactly like ChatGPT
        return size === 'large' ? 'w-64 h-64' : size === 'medium' ? 'w-52 h-52' : 'w-40 h-40'
      case 'paused': 
        return size === 'large' ? 'w-32 h-32' : size === 'medium' ? 'w-24 h-24' : 'w-16 h-16'
      default: 
        // Idle state
        return size === 'large' ? 'w-32 h-32' : size === 'medium' ? 'w-24 h-24' : 'w-16 h-16'
    }
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Main Orb */}
      <button
        onClick={onClick}
        disabled={!onClick}
        className={`${getSizeClasses()} ${getOrbColor()} rounded-full transition-all duration-300 ease-out flex items-center justify-center shadow-2xl ${
          onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
        } ${state === 'speaking' ? 'animate-speaking-pulse' : ''}`}
      >
        {/* Listening state - Same dot as idle, no visual change like ChatGPT */}
        {state === 'listening' && (
          <div className={`${size === 'large' ? 'w-4 h-4' : size === 'medium' ? 'w-3 h-3' : 'w-2 h-2'} bg-white rounded-full`}></div>
        )}
        
        {/* Speaking visualization - Subtle waveform like ChatGPT */}
        {state === 'speaking' && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-white rounded-full animate-bounce-audio`}
                style={{
                  height: `${8 + Math.random() * 12}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.8 + Math.random() * 0.4}s`
                }}
              ></div>
            ))}
          </div>
        )}
        
        {/* Thinking state - Same dot as idle */}
        {state === 'thinking' && (
          <div className={`${size === 'large' ? 'w-4 h-4' : size === 'medium' ? 'w-3 h-3' : 'w-2 h-2'} bg-white rounded-full animate-pulse`}></div>
        )}
        
        {/* Idle state - Simple dot like ChatGPT */}
        {state === 'idle' && (
          <div className={`${size === 'large' ? 'w-4 h-4' : size === 'medium' ? 'w-3 h-3' : 'w-2 h-2'} bg-white rounded-full`}></div>
        )}
        
        {/* Paused state */}
        {state === 'paused' && (
          <Pause className={`${size === 'large' ? 'w-10 h-10' : size === 'medium' ? 'w-8 h-8' : 'w-6 h-6'} text-white`} />
        )}
      </button>

      {/* Outer glow effect - Only for speaking */}
      {state === 'speaking' && (
        <div className={`absolute inset-0 ${getSizeClasses()} ${getOrbColor().split(' ')[0]} rounded-full blur-2xl opacity-30 animate-pulse`}></div>
      )}
    </div>
  )
}