'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, X, Square } from 'lucide-react'
import VoiceOrb from './VoiceOrb'
import { initializeSafariAudioContext, unlockSafariAudio } from '@/lib/safari-audio-fix'

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'
type VoiceTier = 'basic' | 'advanced'

interface VoiceModeProps {
  isOpen: boolean
  onClose: () => void
}

export default function VoiceModeSafe({ isOpen, onClose }: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [tier] = useState<VoiceTier>('advanced')
  const [isMuted, setIsMuted] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isConversationActive, setIsConversationActive] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [suppressErrorAfterInterrupt, setSuppressErrorAfterInterrupt] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')

  // Generate a sessionId when the assistant opens
  useEffect(() => {
    if (isOpen) {
      // Only generate if not already set
      setSessionId(prev => prev || `${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`)
    } else {
      setSessionId('')
    }
  }, [isOpen])

  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<any>(null)
  const currentUtteranceRef = useRef<any>(null)
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize speech APIs with comprehensive error handling
  const initializeSpeechAPIs = useCallback(() => {
    if (isInitializedRef.current) return

    console.log('Initializing speech APIs...')

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('Not in browser environment')
        setIsSupported(false)
        return
      }

      // Detect browser and platform
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition()
          recognition.continuous = false
          recognition.interimResults = false
          recognition.lang = 'en-US'

          // Platform-specific settings
          if (isSafari || isIOS) {
            recognition.maxAlternatives = 1
            // Shorter timeouts for mobile
            if (isMobile) {
              recognition.continuous = false
            }
          }

          recognitionRef.current = recognition
          console.log('Speech recognition initialized successfully')
        } catch (err) {
          console.error('Failed to create speech recognition:', err)
          setIsSupported(false)
          setHasError(true)
          setErrorMessage('Speech recognition initialization failed. Try refreshing the page.')
          return
        }
      } else {
        console.log('Speech recognition not supported')
        setIsSupported(false)
        if (isSafari || isIOS) {
          setErrorMessage('Voice mode requires Safari 14.1+ or iOS 14.5+')
        } else {
          setErrorMessage('Speech recognition not supported in this browser')
        }
        return
      }

      // Initialize Speech Synthesis
      if ('speechSynthesis' in window) {
        synthesisRef.current = window.speechSynthesis
        console.log('Speech synthesis initialized successfully')
      } else {
        console.log('Speech synthesis not supported')
        setIsSupported(false)
        setErrorMessage('Speech synthesis not supported in this browser')
        return
      }

      isInitializedRef.current = true
      setIsSupported(true)
      setHasError(false)

    } catch (error) {
      console.error('Error during speech API initialization:', error)
      setIsSupported(false)
      setHasError(true)
      setErrorMessage('Failed to initialize speech APIs. Please refresh the page.')
    }
  }, [])

  // Set up event handlers after initialization
  const setupEventHandlers = useCallback(() => {
    if (!recognitionRef.current) return

    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started')
      setVoiceState('listening')
      setHasError(false)
    }

    recognitionRef.current.onresult = async (event: any) => {
      try {
        const transcript = event.results[0][0].transcript
        console.log('Speech recognized:', transcript)
        setVoiceState('thinking')

        // Send to API with persistent sessionId - handle streaming response
        // Extract user info from URL query params
        let email = 'guest@pj.com', username = 'guest', fullname = 'Guest User';
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          email = params.get('email') || email
          username = params.get('username') || username
          fullname = params.get('fullname') || fullname
        }
        const queryString = `?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&fullname=${encodeURIComponent(fullname)}`
        const response = await fetch(`/api/chat${queryString}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: transcript, sessionId }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          if (response.status === 500 && errorData?.error?.includes('OpenAI API key')) {
            speakText("Voice mode is not working because the OpenAI API key is not configured. Please check the setup instructions.")
            setHasError(true)
            setErrorMessage('OpenAI API key not configured')
            return
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Handle streaming response
        let fullMessage = ''
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value)
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') break
                  
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.content) {
                      fullMessage += parsed.content
                    }
                    if (parsed.isComplete && parsed.fullMessage) {
                      fullMessage = parsed.fullMessage
                    }
                  } catch (e) {
                    // Ignore parsing errors for streaming chunks
                  }
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        }

        if (fullMessage) {
          console.log('AI response received:', fullMessage)
          setHasError(false)

          if (!isMuted) {
            speakText(fullMessage)
          } else {
            setTimeout(() => {
              if (isConversationActive) {
                startListening()
              }
            }, 1000)
          }
        } else {
          console.error('No valid response received from API')
          setTimeout(() => {
            if (isConversationActive) {
              startListening()
            }
          }, 1000)
        }
      } catch (error) {
        console.error('Error processing speech result:', error)
        setHasError(true)
        setErrorMessage('Error processing speech')
        if (isConversationActive) {
          setTimeout(() => startListening(), 1000)
        }
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setHasError(true)
      setErrorMessage(`Speech recognition error: ${event.error}`)

      if (isConversationActive && event.error !== 'not-allowed') {
        setTimeout(() => startListening(), 1000)
      } else {
        setVoiceState('idle')
      }
    }

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended')
    }
  }, [isConversationActive, isMuted])

  const speakText = useCallback(async (text: string) => {
    if (isMuted) return

    try {
      // Stop any current audio
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current.pause()
        currentUtteranceRef.current = null
      }

      console.log('Starting ElevenLabs speech synthesis')
      setVoiceState('speaking')

      // Call ElevenLabs API
      console.log('Calling ElevenLabs API on mobile...')
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        console.error('ElevenLabs API failed:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error details:', errorText)
        throw new Error(`Failed to generate speech: ${response.status} ${errorText}`)
      }

      const audioBlob = await response.blob()
      console.log('Audio blob size:', audioBlob.size, 'bytes')
      console.log('Audio blob type:', audioBlob.type)
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Safari-specific audio handling
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
      
      if (isSafari || isIOS) {
        console.log('Using Safari/iOS specific audio handling')
        
        // Create audio with Safari-friendly settings
        const audio = new Audio()
        audio.src = audioUrl
        audio.volume = 1.0
        audio.playbackRate = 1.0
        audio.preload = 'auto'
        
        // Force load the audio
        audio.load()
        
        currentUtteranceRef.current = audio
      } else {
        // Standard audio handling for other browsers
        const audio = new Audio(audioUrl)
        audio.volume = 1.0
        audio.playbackRate = 1.0
        audio.preload = 'auto'
        
        currentUtteranceRef.current = audio
      }

      const audio = currentUtteranceRef.current
      
      audio.onloadstart = () => {
        console.log('ElevenLabs audio loading')
      }

      audio.onplay = () => {
        console.log('ElevenLabs audio started playing')
        setVoiceState('speaking')
      }

      audio.onended = () => {
        console.log('ElevenLabs audio ended')
        currentUtteranceRef.current = null
        URL.revokeObjectURL(audioUrl) // Clean up blob URL

        setTimeout(() => {
          if (isConversationActive) {
            // Call startListening function directly
            if (recognitionRef.current && voiceState !== 'listening') {
              try {
                setHasError(false)
                recognitionRef.current.start()
              } catch (error) {
                console.log('Error restarting after audio end')
              }
            }
          } else {
            setVoiceState('idle')
          }
        }, 800)
      }

      audio.onerror = (event: any) => {
        console.error('ElevenLabs audio error:', event)
        currentUtteranceRef.current = null
        URL.revokeObjectURL(audioUrl) // Clean up blob URL
        
        if (isConversationActive) {
          setTimeout(() => {
            if (recognitionRef.current && voiceState !== 'listening') {
              try {
                setHasError(false)
                recognitionRef.current.start()
              } catch (error) {
                console.log('Error restarting after audio error')
              }
            }
          }, 1000)
        } else {
          setVoiceState('idle')
        }
      }

      // Start playing the audio with platform-specific handling
      try {
        console.log('Attempting to play ElevenLabs audio...')
        
        // For Safari/iOS, ensure audio context is unlocked first
        if (isSafari || isIOS) {
          await unlockSafariAudio()
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Wait for audio to be ready
        if (audio.readyState < 2) { // HAVE_CURRENT_DATA
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000)
            audio.oncanplay = () => {
              clearTimeout(timeout)
              resolve(true)
            }
            audio.onerror = () => {
              clearTimeout(timeout)
              reject(new Error('Audio load error'))
            }
          })
        }
        
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          await playPromise
          console.log('ElevenLabs audio playing successfully')
        }
      } catch (playError) {
        console.error('Audio play error:', playError)
        
        // Fallback: Try again with user gesture for Safari/iOS
        if (isSafari || isIOS) {
          console.log('Retrying audio playback for Safari/iOS...')
          try {
            // Force user interaction context
            await new Promise(resolve => setTimeout(resolve, 100))
            // Create a new audio element as fallback
            const fallbackAudio = new Audio(audioUrl)
            fallbackAudio.volume = 1.0
            await fallbackAudio.play()
            console.log('Safari/iOS audio retry successful')
            // Update reference to the working audio element
            currentUtteranceRef.current = fallbackAudio
          } catch (retryError) {
            console.error('Safari/iOS audio retry failed:', retryError)
            throw retryError
          }
        } else {
          throw playError
        }
      }

    } catch (error) {
      console.error('Error in ElevenLabs speech synthesis:', error)
      setHasError(true)
      setErrorMessage('Speech synthesis failed')
      
      // Only fallback to native speech synthesis if it's an API configuration issue
      const shouldFallback = error instanceof Error && (
        error.message.includes('API key') || error.message.includes('not configured')
      )
      
      if (shouldFallback) {
        console.log('Falling back to native speech synthesis due to API configuration issue')
        try {
          if (synthesisRef.current) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 0.9
            utterance.pitch = 1.0
            utterance.volume = 1.0

            utterance.onstart = () => {
              setVoiceState('speaking')
            }

            utterance.onend = () => {
              currentUtteranceRef.current = null
              setTimeout(() => {
                if (isConversationActive) {
                  if (recognitionRef.current && voiceState !== 'listening') {
                    try {
                      setHasError(false)
                      recognitionRef.current.start()
                    } catch (error) {
                      console.log('Error restarting after fallback audio end')
                    }
                  }
                } else {
                  setVoiceState('idle')
                }
              }, 800)
            }

            currentUtteranceRef.current = utterance
            synthesisRef.current.speak(utterance)
          }
        } catch (fallbackError) {
          console.error('Fallback speech synthesis also failed:', fallbackError)
        }
      } else {
        console.log('ElevenLabs failed on mobile - not falling back to preserve voice quality')
        setVoiceState('idle')
        setHasError(true)
        setErrorMessage('Custom voice unavailable - please try again')
      }
    }
  }, [isMuted, isConversationActive])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.log('Speech recognition not available')
      setHasError(true)
      setErrorMessage('Speech recognition not available. Please refresh the page and try again.')
      return
    }

    if (voiceState === 'listening') {
      console.log('Already listening')
      return
    }

    try {
      console.log('Starting speech recognition')
      setIsConversationActive(true)
      setHasError(false)
      setErrorMessage('')
      
      // Ensure we're not already in a listening state
      if (recognitionRef.current.state !== undefined && recognitionRef.current.state === 'listening') {
        console.log('Recognition already active, stopping first')
        recognitionRef.current.stop()
        // Wait a moment before starting again
        setTimeout(() => {
          if (recognitionRef.current && isConversationActive) {
            recognitionRef.current.start()
          }
        }, 100)
      } else {
        recognitionRef.current.start()
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      // Don't show error if we're suppressing it after interrupt
      if (!suppressErrorAfterInterrupt) {
        setHasError(true)
        setErrorMessage('Could not start voice recognition. Please try again.')
      } else {
        console.log('Error suppressed after interrupt')
      }
      
      // Retry once after a delay
      setTimeout(() => {
        if (isConversationActive && !suppressErrorAfterInterrupt) {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start()
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError)
          }
        }
      }, 1000)
    }
  }, [voiceState, suppressErrorAfterInterrupt, isConversationActive])

  const handleInterruptClick = useCallback(() => {
    console.log('Interrupt button clicked - stopping speech')
    // Stop current speech immediately
    if (currentUtteranceRef.current) {
      if (currentUtteranceRef.current.pause) {
        // ElevenLabs Audio object
        currentUtteranceRef.current.pause()
        currentUtteranceRef.current.currentTime = 0
      } else if (synthesisRef.current) {
        // Native speech synthesis
        synthesisRef.current.cancel()
      }
      currentUtteranceRef.current = null
    }
    
    // Set state back to listening
    setVoiceState('idle')
    
    // Suppress errors for the next few seconds after interrupt
    setSuppressErrorAfterInterrupt(true)
    setTimeout(() => {
      setSuppressErrorAfterInterrupt(false)
    }, 3000) // Clear suppression after 3 seconds
    
    // Start listening again after a short delay
    setTimeout(() => {
      if (isConversationActive) {
        console.log('Restarting listening after manual interrupt')
        startListening()
      }
    }, 500)
  }, [isConversationActive, startListening])

  // Initialize when component mounts
  useEffect(() => {
    if (isOpen) {
      // Initialize Safari audio context immediately
      initializeSafariAudioContext()
      
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeSpeechAPIs()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initializeSpeechAPIs])

  // Setup event handlers after initialization
  useEffect(() => {
    if (isInitializedRef.current && recognitionRef.current) {
      setupEventHandlers()
    }
  }, [setupEventHandlers])

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.log('Error stopping recognition:', e)
        }
      }
      if (synthesisRef.current) {
        try {
          synthesisRef.current.cancel()
        } catch (e) {
          console.log('Error canceling synthesis:', e)
        }
      }
    }
  }, [])

  const startConversation = async () => {
    if (!isConversationActive && isSupported && !hasError) {
      // Unlock Safari audio on user interaction
      await unlockSafariAudio()
      startListening()
    }
  }

  const stopConversation = () => {
    setIsConversationActive(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.log('Error stopping recognition:', e)
      }
    }
    if (synthesisRef.current) {
      try {
        synthesisRef.current.cancel()
      } catch (e) {
        console.log('Error canceling synthesis:', e)
      }
    }
    setVoiceState('idle')
    setSessionId('') // Reset sessionId when conversation ends
  }

  const handleClose = () => {
    stopConversation()
    onClose()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted && currentUtteranceRef.current) {
      try {
        if (currentUtteranceRef.current.pause) {
          // ElevenLabs Audio object
          currentUtteranceRef.current.pause()
          currentUtteranceRef.current.currentTime = 0
        } else if (synthesisRef.current) {
          // Native speech synthesis
          synthesisRef.current.cancel()
        }
        currentUtteranceRef.current = null
      } catch (e) {
        console.log('Error stopping audio:', e)
      }
      if (isConversationActive) {
        setTimeout(() => startListening(), 300)
      }
    }
  }

  if (!isOpen) return null

  // No Support Mode
  if (!isSupported) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Voice Mode Not Supported</h3>
            <p className="text-gray-400 max-w-md">
              Your browser doesn&apos;t support voice features. Please use Chrome, Edge, or Safari for voice mode.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center pb-8">
          <button
            onClick={handleClose}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Voice Orb */}
        <div className="mb-12">
          <VoiceOrb 
            state={voiceState}
            tier={tier}
            onClick={isConversationActive ? undefined : startConversation}
            size="large"
          />
        </div>

        {/* State Indicator */}
        <div className="text-center mb-8">
          {hasError ? (
            <div>
              <div className="text-xl font-medium text-red-400 mb-2">
                Voice Mode Not Working
              </div>
              <div className="text-sm text-gray-400 max-w-md mx-auto">
                {errorMessage || 'Please configure your OpenAI API key in the .env.local file. Check the SETUP.md file for instructions.'}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xl font-medium text-white mb-2">
                {voiceState === 'idle' && !isConversationActive && 'Tap to start conversation'}
                {voiceState === 'idle' && isConversationActive && 'Ready for your next question'}
                {voiceState === 'listening' && 'Listening...'}
                {voiceState === 'thinking' && 'Processing your question...'}
                {voiceState === 'speaking' && 'Speaking...'}
              </div>
              <div className="text-sm text-gray-400">
                {voiceState === 'idle' && !isConversationActive && 'Start a real-time voice conversation'}
                {voiceState === 'idle' && isConversationActive && 'Just start speaking - I\'ll listen automatically'}
                {voiceState === 'listening' && 'Listening — how are you feeling?'}
                {voiceState === 'thinking' && 'Reflecting through a CBT lens...'}
                {voiceState === 'speaking' && (isMuted ? 'Response ready (muted) - Will listen after' : 'Tap stop button to interrupt')}
              </div>
            </div>
          )}
          
          {/* Interrupt Button - Only show when speaking */}
          {voiceState === 'speaking' && (
            <div className="flex justify-center mt-6 mb-4">
              <button
                onClick={handleInterruptClick}
                className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Stop speaking"
              >
                <Square className="w-6 h-6 fill-current" />
              </button>
            </div>
          )}
          
          {/* Restart button if conversation seems stuck */}
          {isConversationActive && voiceState === 'idle' && !hasError && (
            <button
              onClick={startListening}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Tap here if I&apos;m not listening
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-8 pb-8">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          onClick={handleClose}
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  )
}