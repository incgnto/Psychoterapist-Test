'use client'

// import { useState, useRef, useEffect } from 'react'
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

export default function VoiceMode({ isOpen, onClose }: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [tier] = useState<VoiceTier>('advanced')
  const [isMuted, setIsMuted] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isConversationActive, setIsConversationActive] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const recognitionRef = useRef<any>(null)
  const interruptRecognitionRef = useRef<any>(null)
  const synthesisRef = useRef<any>(null)
  const currentUtteranceRef = useRef<any>(null)
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Define handleUserInterrupt function first so it can be referenced in event handlers
  const handleUserInterrupt = useCallback(async (transcript: string) => {
    console.log('Handling user interrupt with:', transcript)
    
    // Stop current speech immediately
    if (synthesisRef.current && currentUtteranceRef.current) {
      synthesisRef.current.cancel()
      currentUtteranceRef.current = null
    }
    
    // Clear speaking state
    setIsSpeaking(false)
    
    // Stop interrupt detection
    stopInterruptDetection()
    
    // Process the interrupt as a new user input
    setVoiceState('thinking')
    
    try {
      // Send to OpenAI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: transcript }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (response.status === 500 && errorData?.error?.includes('OpenAI API key')) {
          setTimeout(() => speakText("Voice mode is not working because the OpenAI API key is not configured. Please check the setup instructions."), 0)
          setHasError(true)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API response to interrupt:', data)
      
      // Check if we have a valid message in the response
      if (data.message) {
        console.log('AI response to interrupt received:', data.message)
        setHasError(false) // Clear any previous errors
        
        // Speak the response
        if (!isMuted) {
          // Need to use setTimeout to avoid potential circular dependency
          setTimeout(() => speakText(data.message), 0)
        } else {
          // If muted, still continue the conversation
          setTimeout(() => {
            if (isConversationActive) {
              startListening()
            }
          }, 1000)
        }
      } else if (data.error) {
        console.error('API returned error for interrupt:', data.error)
        if (data.error.includes('OpenAI API key')) {
          setTimeout(() => speakText("Voice mode is not working because the OpenAI API key is not configured. Please check the setup instructions."), 0)
          setHasError(true)
          return
        }
        // Handle other API errors but continue conversation
        setTimeout(() => {
          if (isConversationActive) {
            startListening()
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error processing interrupt:', error)
      // Restart listening even on error if conversation is active
      if (isConversationActive) {
        setTimeout(() => {
          startListening()
        }, 1000)
      } else {
        setVoiceState('idle')
      }
    }
  }, [isConversationActive, isMuted])

  // Helper functions for interrupt detection
  const startInterruptDetection = useCallback(() => {
    if (!interruptRecognitionRef.current) {
      console.log('Interrupt detection not available - no recognition instance')
      return
    }
    
    if (!isConversationActive) {
      console.log('Interrupt detection not starting - conversation not active')
      return
    }

    try {
      console.log('Starting interrupt detection while speaking...')
      // Add a small delay to ensure speech synthesis has started
      setTimeout(() => {
        if (interruptRecognitionRef.current && (voiceState === 'speaking' || isSpeaking)) {
          try {
            interruptRecognitionRef.current.start()
            console.log('Interrupt detection started successfully')
          } catch (startError) {
            console.log('Failed to start interrupt detection:', startError)
          }
        } else {
          console.log('Interrupt detection cancelled - no longer speaking')
        }
      }, 500)
    } catch (error) {
      console.log('Interrupt detection start error (non-critical):', error)
      // Don't treat this as a critical error - voice mode will work without interrupts
    }
  }, [isConversationActive, voiceState, isSpeaking])

  const stopInterruptDetection = useCallback(() => {
    if (interruptRecognitionRef.current) {
      try {
        console.log('Stopping interrupt detection')
        interruptRecognitionRef.current.stop()
      } catch (error) {
        console.log('Interrupt detection stop error (non-critical):', error)
      }
    }
  }, [])

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Add a delay to ensure all modules are loaded
    const initializeSpeech = async () => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return
      }

      try {
        // Wait for window to be fully loaded
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(true)
          } else {
            window.addEventListener('load', () => resolve(true), { once: true })
          }
        })

        // Check for speech recognition support with better error handling
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        
        if (SpeechRecognition && typeof SpeechRecognition === 'function') {
          console.log('Speech recognition available')
          
          try {
            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'
            
            recognitionRef.current = recognition
            console.log('Main speech recognition instance created successfully')
          } catch (error) {
            console.error('Failed to create main speech recognition instance:', error)
            setIsSupported(false)
            setHasError(true)
            return
          }

          // Create a separate recognition instance for interrupt detection
          // Only create if browser supports multiple instances
          try {
            const interruptRecognition = new SpeechRecognition()
            interruptRecognition.continuous = true
            interruptRecognition.interimResults = true
            interruptRecognition.lang = 'en-US'
            
            interruptRecognitionRef.current = interruptRecognition
            console.log('Interrupt recognition instance created successfully')
          } catch (error) {
            console.log('Could not create interrupt recognition instance:', error)
            // Interrupt detection will be disabled, but main voice mode will still work
            interruptRecognitionRef.current = null
          }

          recognitionRef.current.onstart = () => {
            console.log('Speech recognition started')
            clearWatchdog()
            setVoiceState('listening')
          }

          recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript
          console.log('Speech recognized:', transcript)
          setVoiceState('thinking')
          
          try {
            // Send to OpenAI
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: transcript }),
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => null)
              if (response.status === 500 && errorData?.error?.includes('OpenAI API key')) {
                speakText("Voice mode is not working because the OpenAI API key is not configured. Please check the setup instructions.")
                setHasError(true)
                return
              }
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const data = await response.json()
            console.log('API response:', data)
            
            // Check if we have a valid message in the response
            if (data.message) {
              console.log('AI response received:', data.message)
              setHasError(false) // Clear any previous errors
              
              // Speak the response
              if (!isMuted) {
                speakText(data.message)
              } else {
                // If muted, still continue the conversation
                setTimeout(() => {
                  if (isConversationActive) {
                    startListening()
                  }
                }, 1000)
              }
            } else if (data.error) {
              console.error('API returned error:', data.error)
              if (data.error.includes('OpenAI API key')) {
                speakText("Voice mode is not working because the OpenAI API key is not configured. Please check the setup instructions.")
                setHasError(true)
                return
              }
              // Handle other API errors but continue conversation
              setTimeout(() => {
                if (isConversationActive) {
                  startListening()
                }
              }, 1000)
            } else {
              console.error('Unexpected API response format:', data)
              setTimeout(() => {
                if (isConversationActive) {
                  startListening()
                }
              }, 1000)
            }
          } catch (error) {
            console.error('Error in speech processing:', error)
            // Restart listening even on error if conversation is active
            if (isConversationActive) {
              setTimeout(() => {
                startListening()
              }, 1000)
            } else {
              setVoiceState('idle')
            }
          }
          }

          recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            
            // Try to restart if conversation is active and it's not a fatal error
            if (isConversationActive && event.error !== 'not-allowed') {
              console.log('Attempting to restart speech recognition after error...')
              setTimeout(() => {
                startListening()
              }, 1000)
            } else {
              setVoiceState('idle')
            }
          }

          recognitionRef.current.onend = () => {
            console.log('Speech recognition ended')
            // Don't automatically restart here - let the result handler manage the flow
          }

          // Setup interrupt recognition handlers only if we successfully created the instance
          if (interruptRecognitionRef.current) {
            const interruptRecognition = interruptRecognitionRef.current

            interruptRecognition.onstart = () => {
              console.log('Interrupt detection started')
            }

            interruptRecognition.onresult = (event: any) => {
              // Check if there's any speech detected while AI is speaking
              console.log('Interrupt recognition result, voiceState:', voiceState)
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i]
                // Lower confidence threshold and also check interim results for faster response
                if (result.isFinal || result[0].confidence > 0.3) {
                  const transcript = result[0].transcript.trim()
                  console.log('Interrupt candidate:', transcript, 'confidence:', result[0].confidence, 'voiceState:', voiceState, 'isSpeaking:', isSpeaking)
                  if (transcript.length > 2 && (voiceState === 'speaking' || isSpeaking)) {
                    console.log('User interrupt detected:', transcript)
                    // Use a callback to handle the interrupt instead of direct function call
                    setTimeout(() => {
                      handleUserInterrupt(transcript)
                    }, 0)
                    break
                  }
                }
              }
            }

            interruptRecognition.onerror = (event: any) => {
              console.log('Interrupt recognition error (non-critical):', event.error)
              // Don't treat interrupt recognition errors as critical
            }

            interruptRecognition.onend = () => {
              console.log('Interrupt recognition ended, voiceState:', voiceState, 'conversationActive:', isConversationActive)
              // Restart interrupt detection if we're still speaking
              if ((voiceState === 'speaking' || isSpeaking) && isConversationActive) {
                console.log('Restarting interrupt detection since still speaking...')
                setTimeout(() => {
                  if ((voiceState === 'speaking' || isSpeaking) && isConversationActive && interruptRecognitionRef.current) {
                    try {
                      interruptRecognitionRef.current.start()
                      console.log('Interrupt detection restarted')
                    } catch (error) {
                      console.log('Failed to restart interrupt detection:', error)
                    }
                  }
                }, 200)
              } else {
                console.log('Not restarting interrupt detection - no longer speaking or conversation inactive')
              }
            }
          }
        } else {
          console.log('No speech recognition support')
          setIsSupported(false)
        }

        // Check for speech synthesis support
        if ('speechSynthesis' in window && typeof (window as any).speechSynthesis === 'object') {
          synthesisRef.current = (window as any).speechSynthesis
          console.log('Speech synthesis available')
        } else {
          console.log('Speech synthesis not available')
          setIsSupported(false)
        }
      } catch (error) {
        console.error('Error initializing speech APIs:', error)
        setIsSupported(false)
        setHasError(true)
      }
    }

    // Initialize Safari audio context
    initializeSafariAudioContext()
    
    // Call the async initialization function
    initializeSpeech()
  }, [])

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      clearWatchdog()
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (interruptRecognitionRef.current) {
        interruptRecognitionRef.current.stop()
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
    }
  }, [])

  // Cleanup when closing
  useEffect(() => {
    if (!isOpen) {
      clearWatchdog()
      setIsConversationActive(false)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (interruptRecognitionRef.current) {
        interruptRecognitionRef.current.stop()
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
      setVoiceState('idle')
    }
  }, [isOpen])

  const speakText = async (text: string) => {
    if (isMuted) return
    
    try {
      // Cancel any current speech
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
      
      // Use ElevenLabs for more natural voice
      console.log('Starting ElevenLabs speech synthesis on mobile...')
      
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

      audio.onplay = () => {
        console.log('Speech synthesis started')
        setVoiceState('speaking')
        setIsSpeaking(true)
        // Start interrupt detection when we begin speaking
        startInterruptDetection()
      }

      audio.onended = () => {
        console.log('ElevenLabs audio ended, conversation active:', isConversationActive)
        currentUtteranceRef.current = null
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl) // Clean up blob URL
        // Stop interrupt detection when speech ends
        stopInterruptDetection()
        
        // Automatically start listening again for continuous conversation
        setTimeout(() => {
          if (isConversationActive) {
            console.log('Restarting listening after speech')
            startListening()
            startWatchdog() // Start watchdog to monitor conversation flow
          } else {
            setVoiceState('idle')
          }
        }, 800)
      }

      audio.onerror = (event: any) => {
        console.error('ElevenLabs audio error:', event)
        currentUtteranceRef.current = null
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl) // Clean up blob URL
        // Stop interrupt detection on error
        stopInterruptDetection()
        
        // Try to continue conversation even after synthesis error
        if (isConversationActive) {
          console.log('Attempting to restart listening after speech synthesis error...')
          setTimeout(() => {
            startListening()
          }, 1000)
        } else {
          setVoiceState('idle')
        }
      }

      // Start playing the audio with Safari handling
      try {
        console.log('Attempting to play ElevenLabs audio...')
        
        // Safari often needs a small delay after loading
        if (isSafari || isIOS) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          await playPromise
          console.log('ElevenLabs audio playing successfully')
        }
      } catch (playError) {
        console.error('Audio play error:', playError)
        
        // Try one more time for Safari
        if (isSafari || isIOS) {
          console.log('Retrying audio playback for Safari...')
          try {
            await new Promise(resolve => setTimeout(resolve, 50))
            await audio.play()
            console.log('Safari audio retry successful')
          } catch (retryError) {
            console.error('Safari audio retry failed:', retryError)
            throw retryError
          }
        } else {
          throw playError
        }
      }
      
    } catch (error) {
      console.error('Error in ElevenLabs speech synthesis:', error)
      
      // Fallback to native speech synthesis
      if (synthesisRef.current && !isMuted) {
        console.log('Falling back to native speech synthesis')
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1.0
        utterance.volume = 1.0
        
        utterance.onstart = () => {
          setVoiceState('speaking')
          setIsSpeaking(true)
          startInterruptDetection()
        }
        
        utterance.onend = () => {
          currentUtteranceRef.current = null
          setIsSpeaking(false)
          stopInterruptDetection()
          
          setTimeout(() => {
            if (isConversationActive) {
              startListening()
              startWatchdog()
            } else {
              setVoiceState('idle')
            }
          }, 800)
        }
        
        currentUtteranceRef.current = utterance
        synthesisRef.current.speak(utterance)
      }
    }
  }



  const startListening = () => {
    if (!recognitionRef.current || typeof recognitionRef.current.start !== 'function') {
      console.log('Speech recognition not available or not properly initialized')
      setHasError(true)
      return
    }

    // Check if already listening to avoid "already started" error
    if (voiceState === 'listening') {
      console.log('Already listening, skipping start')
      return
    }

    try {
      console.log('Starting speech recognition')
      setIsConversationActive(true)
      setHasError(false) // Clear any previous errors
      recognitionRef.current.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setHasError(true)
      
      // Simple retry with better error handling
      setTimeout(() => {
        if (isConversationActive && (voiceState === 'idle' || voiceState === 'thinking' || voiceState === 'speaking')) {
          try {
            console.log('Retrying speech recognition...')
            if (recognitionRef.current && typeof recognitionRef.current.start === 'function') {
              recognitionRef.current.start()
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError)
            setVoiceState('idle')
            setHasError(true)
          }
        }
      }, 500)
    }
  }

  const startConversation = async () => {
    if (!isConversationActive) {
      // Unlock Safari audio on user interaction
      await unlockSafariAudio()
      startListening()
    }
  }

  const stopConversation = () => {
    clearWatchdog()
    setIsConversationActive(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    stopInterruptDetection()
    if (synthesisRef.current && currentUtteranceRef.current) {
      synthesisRef.current.cancel()
    }
    setIsSpeaking(false)
    setVoiceState('idle')
  }

  const handleInterruptClick = () => {
    console.log('Interrupt button clicked - stopping speech')
    // Stop current speech immediately
    if (synthesisRef.current && currentUtteranceRef.current) {
      synthesisRef.current.cancel()
      currentUtteranceRef.current = null
    }
    
    // Clear speaking state
    setIsSpeaking(false)
    setVoiceState('idle')
    
    // Stop interrupt detection
    stopInterruptDetection()
    
    // Start listening again after a short delay
    setTimeout(() => {
      if (isConversationActive) {
        console.log('Restarting listening after manual interrupt')
        startListening()
      }
    }, 500)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted && synthesisRef.current) {
      // If we're muting and currently speaking, stop speech
      synthesisRef.current.cancel()
      setIsSpeaking(false)
      stopInterruptDetection()
      // If conversation is active, continue listening
      if (isConversationActive) {
        setTimeout(() => {
          startListening()
        }, 300)
      } else {
        setVoiceState('idle')
      }
    }
  }

  const clearWatchdog = () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current)
      watchdogTimerRef.current = null
    }
  }

  const startWatchdog = () => {
    clearWatchdog()
    // Set a watchdog timer to detect if conversation gets stuck
    watchdogTimerRef.current = setTimeout(() => {
      if (isConversationActive && voiceState === 'idle') {
        console.log('Conversation appears stuck, auto-restarting...')
        resetSpeechRecognition()
      }
    }, 5000) // 5 seconds timeout
  }

  const resetSpeechRecognition = () => {
    console.log('Resetting speech recognition...')
    clearWatchdog()
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.log('Error stopping recognition:', error)
      }
    }
    
    stopInterruptDetection()
    
    setVoiceState('idle')
    setTimeout(() => {
      if (isConversationActive) {
        startListening()
      }
    }, 1000)
  }





  const handleClose = () => {
    stopConversation()
    onClose()
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
              Please configure your OpenAI API key in the .env.local file. Check the SETUP.md file for instructions.
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
              {voiceState === 'idle' && isConversationActive && "Just start speaking - I'll listen automatically"}
              {voiceState === 'listening' && 'Ask about medical tourism in Lithuania'}
              {voiceState === 'thinking' && 'Consulting Surgery Abroad Assistant...'}
              {voiceState === 'speaking' && (isMuted ? 'Response ready (muted) - Will listen after' : 'Tap stop to interrupt')}
            </div>
          </div>
        )}
      </div>

      {/* Interrupt Button - Only show when speaking */}
      {(voiceState === 'speaking' || isSpeaking) && (
        <div className="flex justify-center mb-8">
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
      {isConversationActive && voiceState === 'idle' && (
        <button
          onClick={resetSpeechRecognition}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          Tap here if I&apos;m not listening
        </button>
      )}
    </div> {/* ✅ closes flex-1 container */}

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