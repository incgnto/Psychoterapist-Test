# OpenAI Integration Setup

Your Surgery Abroad Assistant is now ready! Here's how to complete the setup:

## 🔑 **1. Get Your OpenAI API Key**

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-`)

## 🎤 **2. Get Your ElevenLabs API Key (Optional - for Premium Voice)**

1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up for a free account
3. Go to [Speech Synthesis](https://elevenlabs.io/app/speech-synthesis)
4. Click on your profile → "Profile" → Copy your API key
5. **Benefits**: Much higher quality, natural-sounding voice instead of browser speech

## 🛠️ **3. Configure Your Environment**

1. Open the `.env.local` file in your project root
2. Add your API keys:

```bash
# Required: OpenAI for chat functionality
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Optional: Prefer Assistant instructions over local prompt
OPENAI_ASSISTANT_ID=asst_ecxNblS8s4XiQP6Ibcu5AnSb

# Optional: ElevenLabs for premium voice (fallback to browser voice if not set)
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
# Optional: ElevenLabs voice selection
ELEVENLABS_VOICE_NAME=rachel
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Optional: MongoDB (for saving chat sessions)
MONGODB_URI=mongodb+srv://user:pass@cluster/dbname
```

3. Save the file

## 🚀 **4. Test Your Chatbot**

### **Text Chat:**
1. Go to `http://localhost:3000`
2. Try asking: "What plastic surgery procedures are available in Lithuania?"
3. The Surgery Abroad Assistant will respond with information about medical tourism

### **Voice Mode (Conversational Speech-to-Speech):**
1. Click the "🎤 Voice Mode" button
2. Click the blue orb **once** to start the conversation
3. **Say**: "I'm interested in plastic surgery in Lithuania"
4. **Listen**: The assistant will speak back with information
5. **Continue**: **Automatic listening** - just keep talking after each response!
6. **Troubleshooting**: If it stops listening, click "Tap here if I'm not listening"
7. **End**: Click the ❌ button to end the conversation

### **Voice Mode Features:**
- ✅ **Auto-restart**: Automatically listens after each AI response
- ✅ **Error recovery**: Automatically recovers from speech recognition errors  
- ✅ **Watchdog timer**: Detects stuck conversations and auto-restarts
- ✅ **Debug logging**: Check browser console for detailed voice activity
- ✅ **Manual restart**: Backup button if automatic restart fails

### **Browser Requirements for Voice Mode:**
- ✅ **Chrome** (recommended) - Full speech-to-speech
- ✅ **Edge** - Full speech-to-speech
- ✅ **Safari Desktop** - Full speech-to-speech  
- ⚠️ **iPhone Safari** - Full speech-to-speech attempted (reliability issues)
- ❌ Firefox (limited support)
- 🔒 **HTTPS required** for microphone access (localhost works for testing)

### **iPhone Safari Speech-to-Speech:**
iPhone users get **full speech-to-speech functionality** with enhanced support:
- ✅ **Voice Input** → Full speech recognition attempted with robust error handling
- ✅ **Voice Output** → AI responds with optimized speech synthesis for iOS
- ✅ **Enhanced Retry Logic** → Automatic recovery from iOS Safari speech API issues
- ✅ **Troubleshooting Guidance** → Built-in help for microphone permission setup
- ✅ **Same AI Assistant** → Full Surgery Abroad experience
- ⚠️ **Reliability Warning** → iOS Safari Web Speech API can be inconsistent

### **iOS Safari Troubleshooting:**
If voice input doesn't work on iPhone Safari:
1. **Grant Permission**: Allow microphone access when prompted
2. **Check Settings**: Settings > Safari > Camera & Microphone > Allow
3. **Reload Page**: Refresh and try again
4. **Console Logs**: Check browser console for detailed error messages
5. **Alternative**: Use desktop browser for most reliable experience

## ✨ **Features Implemented**

### **Surgery Abroad Assistant Behavior:**
- ✅ Specialized medical tourism focused on Lithuania
- ✅ Promotes www.wellness-travels.com clinic naturally
- ✅ Collects contact information (name, email, country) with GDPR consent
- ✅ Suggests surgery quiz: https://surgery-abroad.com/surgery-quiz/
- ✅ Asks for photo uploads when users show interest
- ✅ Professional, compassionate tone with medical disclaimers
- ✅ Price comparisons with user's home country (with flag emojis)
- ✅ Structured responses with emojis and clear formatting

### **Technical Features:**
- ✅ Real-time chat with OpenAI GPT-4
- ✅ **Real Speech-to-Speech Voice Mode** with Web Speech API
- ✅ **Speech Recognition** (Speech-to-Text) for user input
- ✅ **Premium Voice Synthesis** with ElevenLabs API (falls back to browser speech)
- ✅ **Voice Interruption** - Click red stop button to interrupt AI speech
- ✅ **File & Photo Upload** - Drag & drop or click to attach files
- ✅ **Mobile Responsive** - Works perfectly on all devices
- ✅ **Voice Transcription** - Voice input transcribes to chat before sending
- ✅ ChatGPT-style voice mode with dramatic orb animations
- ✅ Clean chat history sidebar
- ✅ Loading states and error handling
- ✅ Markdown formatting for special sections
- ✅ Browser compatibility detection for voice features

## 🎯 **Assistant Goals (in Priority Order):**

1. **Market Lithuania** as medical tourism destination
2. **Collect Contact Info** with GDPR compliance  
3. **Direct to Quiz** for free consultation
4. **Photo Upload** for accurate information

## 🔒 **GDPR Compliance Built-in:**
- Asks for consent before saving contact info
- Asks for consent before saving photos
- Transparent about data usage

## 💡 **Usage Tips:**

### **Contact Collection Example:**
*"**Before we continue**, could you please provide your name, email address and home country so we can reach out to you if needed?"*

### **Quiz Direction Example:**
*"**Next step:** Fill out our comprehensive quiz to get a free consultation and exact pricing: https://surgery-abroad.com/surgery-quiz/"*

### **Price Comparison Example:**
*"🇱🇹 Lithuania: €3,000 to €5,000"*
*"🇺🇸 USA: €8,000 to €15,000"*

---

**Your Surgery Abroad Assistant is now ready to help patients explore medical tourism in Lithuania!** 🏥✈️