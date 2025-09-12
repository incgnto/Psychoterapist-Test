export interface ImageContent {
  type: 'image'
  data: string  // base64 encoded image
  mimeType: string
  name: string
}

export interface DocumentContent {
  type: 'document'
  name: string
  mimeType: string
  text: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  images?: ImageContent[]
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface UserContactInfo {
  name?: string
  email?: string
  country?: string
  hasGivenConsent: boolean
}

export interface ChatState {
  hasAskedForContact: boolean
  hasCollectedContact: boolean
  hasAskedForQuiz: boolean
  hasAskedForPhotos: boolean
  contactInfo?: UserContactInfo
}

export interface ChatRequest {
  message: string
  sessionId?: string
  chatState?: ChatState
  type?: 'voice' | 'text'
  firstUserText?: string
  images?: ImageContent[]
  documents?: DocumentContent[]
}

export interface ChatResponse {
  message: string
  sessionId: string
  chatState: ChatState
}