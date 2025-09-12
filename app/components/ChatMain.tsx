'use client'


import { useState, useEffect, useRef } from 'react'
import { Send, Mic, Pause, Play, Radio, Paperclip, X, FileText, Image, Check } from 'lucide-react'
import VoiceMode from './VoiceModeSafe'
import ChatMessage from './ChatMessage'
import { useChat } from '@/app/hooks/useChat'
// Removed next-auth session import

const suggestedQuestions = [
  "What are the top-rated plastic surgery clinics in Lithuania and what makes them special?",
  "How much can I save by getting cosmetic procedures in Lithuania compared to other countries?",
  "What's the complete process from consultation to recovery when getting surgery abroad?",
  "Which procedures are Lithuania's specialty and what are the success rates?"
]

interface ChatMainProps {
  newChatTrigger?: number
  selectedSession?: any
}

export default function ChatMain({ newChatTrigger, selectedSession }: ChatMainProps) {
  // Removed session logic
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [speechSupported, setSpeechSupported] = useState(true)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [recordingMode, setRecordingMode] = useState<'inactive' | 'continuous'>('inactive')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const speechRecognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const [mediaSupported, setMediaSupported] = useState<boolean>(false)
  // Accumulate voice transcription and process once on end
  const recognitionFinalRef = useRef<string>('')
  const recognitionLastIndexRef = useRef<number>(0)
  const messageAtStartRef = useRef<string>('')

  const chatHook = useChat()
  const {
    messages = [],
    isLoading = false,
    sendMessage,
    startNewChat,
    loadSession
  } = chatHook || {}

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle new chat trigger from parent
  useEffect(() => {
    if (newChatTrigger && newChatTrigger > 0 && startNewChat) {
      startNewChat()
    }
  }, [newChatTrigger, startNewChat])

  // Load selected chat session when changed
  useEffect(() => {
    if (selectedSession && loadSession) {
      loadSession(selectedSession)
    }
  }, [selectedSession, loadSession])

  // Check microphone permissions and speech recognition support
  useEffect(() => {
    const checkPermissionsAndSupport = async () => {
      if (typeof window !== 'undefined') {
        // Detect iOS and Safari separately
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
        const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent)
        
        // Check MediaRecorder support (fallback path)
        const hasMedia = !!(navigator.mediaDevices && window.MediaRecorder)
        setMediaSupported(hasMedia)

        // Check speech recognition support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        
        if (!SpeechRecognition) {
          setSpeechSupported(false)
          console.log('Speech recognition not supported on this device')
          
          // Provide specific guidance based on platform
          if (isIOS) {
            setRecordingError('❌ Voice input not supported on this iOS device/browser. Please type your message instead.')
          } else if (isSafari && isMacOS) {
            setRecordingError('❌ Voice input not supported in this Safari version. Please try Chrome or Firefox, or type your message instead.')
          }
          // If speech recognition is not supported but MediaRecorder is, we'll rely on fallback
          return
        }

        // Test if speech recognition actually works on iOS and Safari
        if (isIOS || (isSafari && isMacOS)) {
          try {
            const testRecognition = new SpeechRecognition()
            testRecognition.onstart = () => {
              console.log('Safari speech recognition test: SUCCESS')
              testRecognition.stop()
            }
            testRecognition.onerror = (event: any) => {
              console.log('Safari speech recognition test: FAILED', event.error)
              if (event.error === 'not-allowed') {
                setSpeechSupported(false)
                if (isIOS) {
                  setRecordingError('🔒 Microphone blocked on iOS. Enable in Settings > Safari > Camera & Microphone > Allow')
                } else {
                  setRecordingError('🔒 Microphone blocked in Safari. Please allow microphone access when prompted.')
                }
              }
            }
            // Don't actually start it, just test if we can create it
          } catch (error) {
            console.log('Safari speech recognition creation failed:', error)
            setSpeechSupported(false)
            if (isIOS) {
              setRecordingError('❌ Voice input unavailable on this iOS device. Please type your message.')
            } else {
              setRecordingError('❌ Voice input unavailable in this Safari version. Please try Chrome or Firefox.')
            }
            return
          }
        }


        
        // iOS Safari doesn't support navigator.permissions.query for microphone
        if (isIOS || (isSafari && isMacOS)) {
          console.log('iOS/Safari detected - will check permissions on first use')
          setMicPermission('unknown')
        } else {
          // Check microphone permissions for other browsers
          try {
            if (navigator.permissions && navigator.permissions.query) {
              const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
              setMicPermission(permissionStatus.state as any)
              
              permissionStatus.addEventListener('change', () => {
                setMicPermission(permissionStatus.state as any)
              })
            }
          } catch (error) {
            console.log('Could not check microphone permissions:', error)
            setMicPermission('unknown')
          }
        }

        // Initialize speech recognition with iOS-specific settings
        const recognition = new SpeechRecognition()
        recognition.continuous = true  // Enable continuous recording
        recognition.interimResults = true  // Enable interim results for better UX
        recognition.lang = 'en-US'
        
        // iOS and Safari-specific configuration
        if (isIOS || (isSafari && isMacOS)) {
          recognition.maxAlternatives = 1
          recognition.serviceURI = undefined // Use default service
        }
        
        recognition.onstart = () => {
          console.log('Speech recognition started')
          setIsRecording(true)
          setRecordingMode('continuous')
          setRecordingError(null)
          // Reset accumulation for this session
          recognitionFinalRef.current = ''
          recognitionLastIndexRef.current = 0
          messageAtStartRef.current = message
          // No automatic timeout - let user control when to stop
        }
        
        recognition.onresult = (event: any) => {
          // Recompute final and interim text from all results to avoid duplication
          let finalText = ''
          let interimText = ''
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i]
            const transcript = result[0] && result[0].transcript ? String(result[0].transcript) : ''
            if (!transcript) continue
            if (result.isFinal) {
              finalText += finalText ? ` ${transcript.trim()}` : transcript.trim()
            } else {
              interimText += transcript
            }
          }
          recognitionFinalRef.current = finalText.trim()
          const base = (messageAtStartRef.current || '').trim()
          const live = [base, finalText.trim(), interimText.trim()].filter(Boolean).join(' ')
          setMessage(live)
          setRecordingError(null)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
          setIsTranscribing(false)
          
          let errorMessage = 'Speech recognition failed'
          
          if (isIOS) {
            switch (event.error) {
              case 'not-allowed':
                errorMessage = 'Microphone blocked. Please allow microphone access and refresh the page.'
                setMicPermission('denied')
                break
              case 'no-speech':
                errorMessage = 'No speech detected. Please speak clearly and try again.'
                break
              case 'audio-capture':
                errorMessage = 'Cannot access microphone. Check device settings.'
                break
              case 'network':
                errorMessage = 'Network error. Check your internet connection.'
                break
              case 'service-not-allowed':
                errorMessage = 'Speech service not available. Try refreshing the page.'
                break
              case 'aborted':
                // Don't show error for aborted - this is usually user cancellation
                return
              default:
                errorMessage = `Voice recognition unavailable on iOS. Error: ${event.error}`
            }
          } else if (isSafari && isMacOS) {
            switch (event.error) {
              case 'not-allowed':
                errorMessage = 'Microphone permission denied. Please allow microphone access in Safari settings.'
                setMicPermission('denied')
                break
              case 'no-speech':
                errorMessage = 'No speech detected. Please try again.'
                break
              case 'audio-capture':
                errorMessage = 'Cannot access microphone. Check Safari permissions.'
                break
              case 'network':
                errorMessage = 'Network error. Check your internet connection.'
                break
              case 'service-not-allowed':
                errorMessage = 'Speech service not available. Try refreshing the page.'
                break
              case 'aborted':
                // Don't show error for aborted - this is usually user cancellation
                return
              default:
                errorMessage = `Voice recognition error: ${event.error}`
            }
          } else {
            switch (event.error) {
              case 'not-allowed':
                errorMessage = 'Microphone permission denied. Please allow microphone access.'
                setMicPermission('denied')
                break
              case 'no-speech':
                errorMessage = 'No speech detected. Please try again.'
                break
              case 'audio-capture':
                errorMessage = 'Microphone not available. Please check your device.'
                break
              case 'network':
                errorMessage = 'Network error. Please check your connection.'
                break
              case 'aborted':
                // Don't show error for aborted - this is usually user cancellation
                return
              default:
                errorMessage = `Voice recognition error: ${event.error}`
            }
          }
          setRecordingError(errorMessage)
        }
        
        recognition.onend = () => {
          console.log('Speech recognition ended')
          // Commit only base + final (no interim, no double-append)
          const finalText = recognitionFinalRef.current.trim()
          const base = (messageAtStartRef.current || '').trim()
          const committed = [base, finalText].filter(Boolean).join(' ')
          setMessage(committed)
          // Reset accumulation
          recognitionFinalRef.current = ''
          recognitionLastIndexRef.current = 0
          messageAtStartRef.current = ''
          setIsRecording(false)
          setIsTranscribing(false)
          setRecordingMode('inactive')
        }
        
        speechRecognitionRef.current = recognition
      }
    }

    checkPermissionsAndSupport()
  }, [])

  // Start new chat on component mount
  useEffect(() => {
    if (isInitialized && messages.length === 0 && startNewChat) {
      try {
        startNewChat()
      } catch (error) {
        console.error('Failed to start new chat:', error)
      }
    }
  }, [isInitialized, messages.length, startNewChat])

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data:image/jpeg;base64, part
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const handleSendMessage = async () => {
    if ((message.trim() || attachedFiles.length > 0) && !isLoading && sendMessage) {
      const messageToSend = message.trim()
      const filesToSend = [...attachedFiles]
      setMessage('')
      setAttachedFiles([])
      
      try {
        // Process images
        const imageFiles = filesToSend.filter(file => file.type.startsWith('image/'))
        const images: any[] = []
        const documents: { type: 'document'; name: string; mimeType: string; text: string }[] = []
        
        for (const imageFile of imageFiles) {
          try {
            const base64Data = await fileToBase64(imageFile)
            images.push({
              type: 'image',
              data: base64Data,
              mimeType: imageFile.type,
              name: imageFile.name
            })
          } catch (error) {
            console.error('Failed to convert image to base64:', error)
          }
        }
        
        // Handle non-image files: extract text server-side (PDF, DOCX) or client-side (TXT)
        const nonImageFiles = filesToSend.filter(file => !file.type.startsWith('image/'))
        let finalMessage = messageToSend

        const extractTextForFile = async (file: File): Promise<string> => {
          try {
            if (file.type.startsWith('text/')) {
              return await file.text()
            }
            const form = new FormData()
            form.append('file', file)
            const res = await fetch('/api/extract-text', { method: 'POST', body: form })
            if (!res.ok) return ''
            const data = await res.json()
            return typeof data.text === 'string' ? data.text : ''
          } catch (e) {
            console.error('Failed to extract text for file', file.name, e)
            return ''
          }
        }

        if (nonImageFiles.length > 0) {
          const extracted = await Promise.all(nonImageFiles.map(extractTextForFile))
          nonImageFiles.forEach((file, idx) => {
            const text = (extracted[idx] || '').trim()
            if (text) {
              documents.push({ type: 'document', name: file.name, mimeType: file.type, text })
            } else {
              // If no text extracted, at least note the attachment in the message
              finalMessage += `\n\n[File attached: ${file.name}]`
            }
          })
        }
        
        // Send message with images and documents
        await sendMessage(finalMessage, images.length > 0 ? images : undefined, documents)
      } catch (error) {
        console.error('Failed to send message:', error)
        // Message will already be added via error handling in useChat
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuestionClick = async (question: string) => {
    if (!isLoading && sendMessage) {
      try {
        await sendMessage(question)
      } catch (error) {
        console.error('Failed to send suggested question:', error)
        // Message will already be added via error handling in useChat
      }
    }
  }

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the stream immediately as we just wanted to get permission
      stream.getTracks().forEach(track => track.stop())
      setMicPermission('granted')
      setRecordingError(null)
      return true
    } catch (error: any) {
      console.error('Microphone permission denied:', error)
      setMicPermission('denied')
      
      // Detect device for specific error message
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent)
      
      if (isIOS) {
        setRecordingError('To use voice messages on iPhone: Go to Settings > Safari > Camera & Microphone > Allow')
      } else if (isSafari && isMacOS) {
        setRecordingError('Please allow microphone access when Safari prompts you, then refresh the page')
      } else if (error.name === 'NotAllowedError') {
        setRecordingError('Please allow microphone access in your browser settings and refresh the page')
      } else {
        setRecordingError('Microphone permission is required for voice messages')
      }
      return false
    }
  }

  const toggleRecording = async () => {
    // If currently recording, do nothing - user should use cancel/end buttons
    if (isRecording) {
      return
    }

    // Add haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

    // If speech recognition not supported but MediaRecorder is, use fallback path
    if (!speechSupported && mediaSupported) {
      return await startMediaRecorderFlow()
    }

    if (!speechRecognitionRef.current) {
      // Try fallback
      if (mediaSupported) {
        return await startMediaRecorderFlow()
      }
      setRecordingError('Speech recognition not available')
      return
    }

    // iOS and Safari-specific: Always request permission first, regardless of stored state
    const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent)
    if (isIOS || (isSafari && isMacOS)) {
      try {
        // Force permission request on iOS every time
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
        setMicPermission('granted')
        console.log('iOS microphone permission granted')
      } catch (error: any) {
        console.error('iOS microphone permission failed:', error)
        setMicPermission('denied')
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setRecordingError('🔒 Microphone access denied. For iPhone: Settings > Safari > Camera & Microphone > Allow. Then refresh this page.')
        } else if (error.name === 'NotFoundError') {
          setRecordingError('🎤 No microphone found. Please check your device.')
        } else {
          setRecordingError('❌ Cannot access microphone. Please check your browser settings and refresh the page.')
        }
        return
      }
    } else {
      // For non-iOS devices, check permission if needed
      if (micPermission === 'denied') {
        setRecordingError('Microphone permission denied. Please enable it in your browser settings.')
        return
      }

      if (micPermission === 'prompt' || micPermission === 'unknown') {
        const granted = await requestMicPermission()
        if (!granted) return
      }
    }

    // Attempt to start speech recognition with iOS workarounds
    try {
      setRecordingError(null)
      
      // iOS and Safari workaround: Add a small delay before starting
      if (isIOS || (isSafari && isMacOS)) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Start speech recognition
      speechRecognitionRef.current.start()
      setIsRecording(true)
      
      if (navigator.vibrate) {
        navigator.vibrate(100)
      }
      
      console.log('Speech recognition started successfully')
      
    } catch (error: any) {
      console.error('Failed to start speech recognition:', error)
      setIsRecording(false)
      setIsTranscribing(false)
      
      // Fallback to MediaRecorder path if available
      if (mediaSupported) {
        console.log('Falling back to MediaRecorder-based transcription')
        return await startMediaRecorderFlow()
      }
      // Otherwise, show minimal message
      setRecordingError('Voice input not supported on this device')
    }
    setIsPaused(false)
  }

  // Cancel recording - discard audio and return to chat
  const cancelRecording = () => {
    try {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
      
      // Reset states without processing any audio
      setIsRecording(false)
      setIsTranscribing(false)
      setRecordingMode('inactive')
      recordedChunksRef.current = []
      mediaRecorderRef.current = null
      
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50])
      }
    } catch (e) {
      console.log('Cancel recording failed:', e)
    }
  }

  // End recording - transcribe and add to message
  const endRecording = async () => {
    try {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
      
      // For MediaRecorder, stop and let the onstop handler process the audio
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      
      if (navigator.vibrate) {
        navigator.vibrate([100])
      }
    } catch (e) {
      console.log('End recording failed:', e)
    }
  }

  // Fallback: Record audio via MediaRecorder and transcribe server-side
  const startMediaRecorderFlow = async () => {
    try {
      setRecordingError(null)
      setIsRecording(true)
      recordedChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        try {
          // Only transcribe if we're not in inactive mode (i.e., not cancelled)
          if (recordingMode !== 'inactive') {
            setIsTranscribing(true)
            const blob = new Blob(recordedChunksRef.current, { type: mimeType })
            const form = new FormData()
            const filename = mimeType.includes('webm') ? 'audio.webm' : 'audio.mp4'
            form.append('audio', blob, filename)

            const res = await fetch('/api/transcribe', { method: 'POST', body: form })
            if (!res.ok) {
              throw new Error('Transcription failed')
            }
            const data = await res.json()
            const text: string = data.text || ''
            if (text) {
              setMessage(prev => prev + (prev ? ' ' : '') + text)
            }
          }
        } catch (err) {
          console.error('Transcription error:', err)
          // Keep errors minimal for UX
        } finally {
          setIsRecording(false)
          setIsTranscribing(false)
          setRecordingMode('inactive')
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop())
            mediaStreamRef.current = null
          }
          mediaRecorderRef.current = null
          recordedChunksRef.current = []
        }
      }

      mediaRecorder.start()
      setRecordingMode('continuous')
      // No automatic timeout - let user control when to stop
    } catch (e) {
      console.error('MediaRecorder flow failed:', e)
      setIsRecording(false)
      setIsTranscribing(false)
    }
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || 
                         file.type === 'application/pdf' ||
                         file.type.startsWith('text/') ||
                         file.type === 'application/msword' ||
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      return isValidType && isValidSize
    })
    
    setAttachedFiles(prev => [...prev, ...validFiles])
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || 
                         file.type === 'application/pdf' ||
                         file.type.startsWith('text/') ||
                         file.type === 'application/msword' ||
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      return isValidType && isValidSize
    })
    
    setAttachedFiles(prev => [...prev, ...validFiles])
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }

  // Always show chat UI

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
              SURGERY<span className="text-green-500">ABROAD</span>
            </h1>
          </div>
        </div>
        
        {/* 24/7 Availability and features - Mobile responsive */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2">
          <span className="text-xs sm:text-sm text-purple-600 flex items-center gap-1">
            🟣 24/7 Availability
          </span>
          <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
            ⚡ Instant Replies
          </span>
          <span className="text-xs sm:text-sm text-gray-600 items-center gap-1 sm:flex">
            ✨ Beta Version
          </span>
          <button
            onClick={() => setIsVoiceModeOpen(true)}
            className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
          >
            🎤 Voice Mode
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {messages.length <= 1 ? (
          /* Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="max-w-4xl w-full">
              {/* Logo and Welcome Text */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                  SURGERY<span className="text-green-500">ABROAD</span>
                </h2>
                <p className="text-sm sm:text-base text-gray-600 px-4">Choose a question to start or type your own below.</p>
              </div>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(question)}
                    disabled={isLoading}
                    className="p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm sm:text-base text-gray-700 group-hover:text-blue-600 transition-colors leading-relaxed">
                        {question}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-0">
              {messages.map((message, index) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                />
              ))}
              

              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-white border-t border-gray-200 p-3 sm:p-4 sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto">
          {/* File Preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                    {getFileIcon(file)}
                    <span className="text-xs sm:text-sm text-gray-700 max-w-[100px] sm:max-w-[150px] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div 
            className={`flex items-end gap-2 sm:gap-3 ${isDragOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg p-2' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isDragOver ? "Drop files here..." : "Ask me about clinics, procedures, or medical tourism..."}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-24 sm:pr-32 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                {/* File Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                  title="Attach files"
                >
                  <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                {/* Voice Recording Controls */}
                {isRecording && (
                  <button
                    onClick={togglePause}
                    className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors hidden sm:block"
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                )}
                
                {/* Voice Mode Button */}
                <button
                  onClick={() => setIsVoiceModeOpen(true)}
                  className="p-1 sm:p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                  title="Voice Mode"
                >
                  <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>


                
                {/* Voice Recording Controls */}
                {!isRecording ? (
                  /* Start Recording Button */
                  <div className="relative">
                    <button
                      onClick={toggleRecording}
                      disabled={!speechSupported}
                      className={`p-2 sm:p-2.5 rounded-full transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${
                        !speechSupported
                          ? 'text-gray-300 cursor-not-allowed bg-gray-100'
                          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-md'
                      }`}
                      title={
                        !speechSupported 
                          ? 'Voice recognition not supported'
                          : micPermission === 'denied'
                            ? 'Microphone permission required'
                            : 'Start voice recording (continuous until you stop)'
                      }
                    >
                      <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        !speechSupported || micPermission === 'denied' ? '' : 'drop-shadow-sm'
                      }`} />
                    </button>
                  </div>
                ) : (
                  /* Cancel and End Recording Buttons */
                  <div className="flex items-center gap-1">
                    {/* Cancel Button */}
                    <button
                      onClick={cancelRecording}
                      className="p-2 sm:p-2.5 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
                      title="Cancel recording (discard)"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    {/* End Recording Button */}
                    <button
                      onClick={endRecording}
                      disabled={isTranscribing}
                      className={`p-2 sm:p-2.5 rounded-full transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${
                        isTranscribing
                          ? 'bg-blue-400 text-white cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      title={isTranscribing ? 'Processing...' : 'End recording (add to message)'}
                    >
                      {isTranscribing ? (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                    
                    {/* Recording indicator */}
                    <div className="ml-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
              className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
          
          {/* Voice Recording Error Message */}
          {recordingError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-600 font-medium">
                    {recordingError}
                  </p>
                  {(recordingError.includes('iPhone') || recordingError.includes('iOS') || recordingError.includes('Safari')) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="font-medium text-blue-800 text-sm mb-2">📱 iPhone Setup Required:</p>
                      <ol className="list-decimal list-inside text-xs text-blue-700 space-y-1 mb-3">
                        <li>Go to iPhone <strong>Settings</strong></li>
                        <li>Scroll down → <strong>Safari</strong></li>
                        <li>Tap <strong>Camera & Microphone</strong></li>
                        <li>Select <strong>Allow</strong> (not Ask)</li>
                        <li>Close Safari completely</li>
                        <li>Reopen Safari and refresh this page</li>
                      </ol>
                      <button
                        onClick={() => window.location.reload()}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        🔄 Refresh Page After Setup
                      </button>
                    </div>
                  )}
                  {micPermission === 'denied' && !recordingError.includes('iPhone') && (
                    <button
                      onClick={requestMicPermission}
                      className="mt-2 text-xs underline hover:no-underline font-medium"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Voice Recording Status */}
          {(isRecording || isTranscribing) && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  {isTranscribing ? 'Converting speech to text...' : 'Recording continuously... Keep speaking'}
                </p>
                {!isTranscribing && (
                  <p className="text-xs text-blue-500">
                    Use Cancel (✗) or End (✓) buttons to stop
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Mode Modal */}
      <VoiceMode 
        isOpen={isVoiceModeOpen} 
        onClose={() => setIsVoiceModeOpen(false)} 
      />
    </div>
  )
}
 