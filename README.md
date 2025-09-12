# Environment Variables for Google Auth

Add the following to your `.env.local` file:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
```

Replace `your-google-client-id` and `your-google-client-secret` with values from your Google Cloud Console.
# PJ – Psychotherapist (CBT) Assistant

An AI psychotherapist assistant focused on Cognitive Behavioral Therapy (CBT). It offers warm, empathetic conversation, reflective questions, and structured CBT tools (thought records, distortions, behavioral activation, habit tracking). Includes voice mode, responsive UI, and safe boundaries.

## Features

- 🤖 **AI-Powered Chat**: Intelligent responses using OpenAI's GPT-4
- 🎤 **Voice Mode**: Full speech-to-speech conversation support
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 🧠 **CBT Focus**: Thought records, cognitive distortions, behavioral activation, SMART goals
- 💬 **Supportive Flow**: Gentle check-ins, reflective summaries, and optional structured exercises
- 🔒 **GDPR Compliant**: Proper consent handling for data collection

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd pj-psychotherapist
npm install
```

### 2. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your OpenAI API key
# Get one from: https://platform.openai.com/api-keys
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: OpenAI API key for chat functionality
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional but recommended: Use Assistant instructions from your OpenAI Assistant
OPENAI_ASSISTANT_ID=asst_ecxNblS8s4XiQP6Ibcu5AnSb

# MongoDB (optional). If unset, the app builds and runs, but chat history
# persistence will be disabled at runtime where DB calls happen.
MONGODB_URI=mongodb+srv://user:pass@cluster/dbname

# ElevenLabs (optional for premium voice)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_NAME=rachel
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Optional: App URL for production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **OpenAI API** - GPT-4 for intelligent responses
- **Web Speech API** - Browser-native speech recognition and synthesis
- **Lucide React** - Beautiful icons

## Project Structure

```
app/
├── api/chat/          # OpenAI API integration
├── components/        # React components
│   ├── ChatMain.tsx   # Main chat interface
│   ├── ChatMessage.tsx # Message display
│   ├── ChatSidebar.tsx # Sidebar navigation
│   ├── VoiceMode.tsx  # Voice interaction modal
│   └── VoiceOrb.tsx   # Voice visualization
├── hooks/
│   └── useChat.ts     # Chat state management
├── types/
│   ├── chat.ts        # Chat type definitions
│   └── speech.d.ts    # Speech API types
├── globals.css        # Global styles and animations
├── layout.tsx         # Root layout
└── page.tsx          # Main page component
```

## Voice Mode

The application includes a sophisticated voice mode that supports:

- **Speech Recognition**: Browser-native speech-to-text
- **Text-to-Speech**: Natural voice responses
- **Cross-Platform**: Works on desktop, iOS Safari, and Android Chrome
- **Smart Conversation Flow**: Automatic listening after responses
- **Visual Feedback**: Animated orb with state indicators

### Voice Mode Browser Support

- ✅ **Desktop Chrome/Edge**: Full support
- ✅ **iOS Safari**: Full support with permission prompts
- ✅ **Android Chrome**: Full support
- ⚠️ **Firefox**: Speech synthesis only
- ❌ **Desktop Safari**: Limited support

## Development

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Next.js recommended configuration
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Responsive Design**: Mobile-first approach

## Deployment

- Vercel: Push to a Git repository and import in Vercel. Set the following Environment Variables in the Vercel dashboard (Production and Preview):
  - `OPENAI_API_KEY`
  - `OPENAI_ASSISTANT_ID` (optional)
  - `MONGODB_URI` (optional, enables chat history persistence)
  - `ELEVENLABS_API_KEY` (optional for premium voice)
  - `ELEVENLABS_VOICE_NAME` and `ELEVENLABS_VOICE_ID` (optional)

- Self-host (Node):
```bash
npm ci
npm run build
OPENAI_API_KEY=sk-... npm run start
```

Notes:
- If `MONGODB_URI` is not set, the app still runs; history saving will no-op at runtime.
- If `ELEVENLABS_API_KEY` is not set, voice playback falls back to browser TTS where available.
- For remote images in assistant messages, `next.config.mjs` allows any host by default. Restrict `images.remotePatterns` for production hardening.

## Safety Disclaimer

This assistant provides emotional support and CBT-oriented guidance only. It does not:

- Provide diagnosis or medical/psychiatric treatment
- Replace licensed mental health care
- Advise on medication changes

If you are in crisis or considering self-harm, please contact local emergency services or a licensed mental health professional immediately.

## Support

For technical support or questions about the application, please create an issue in the repository.