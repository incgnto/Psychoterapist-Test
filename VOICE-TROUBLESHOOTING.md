# Voice Mode Troubleshooting Guide

## Common Issues and Solutions

### 1. Voice Mode Not Starting
**Symptoms:** Voice mode button doesn't work or shows error immediately

**Solutions:**
- Refresh the page and try again
- Check browser console for errors
- Ensure you're using a supported browser (Chrome, Edge, Safari 14.1+)
- Make sure you're on HTTPS or localhost (HTTP blocks voice features)

### 2. Microphone Permission Issues
**Symptoms:** "Microphone permission denied" or "Access blocked" errors

**Solutions:**

#### For Chrome/Edge:
1. Click the microphone icon in the address bar
2. Select "Always allow" for microphone access
3. Refresh the page

#### For Safari (Desktop):
1. Safari menu → Preferences → Websites
2. Click "Microphone" in the left sidebar
3. Set the website to "Allow"
4. Refresh the page

#### For iOS Safari:
1. iPhone Settings → Safari
2. Tap "Camera & Microphone"
3. Select "Allow" (not "Ask")
4. Close Safari completely
5. Reopen Safari and refresh the page

### 3. Speech Recognition Not Working
**Symptoms:** Voice mode starts but doesn't recognize speech

**Solutions:**
- Ensure microphone is working in other apps
- Speak clearly and close to the microphone
- Check for background noise
- Try speaking in English (currently supported language)
- Wait for the "Listening..." indicator before speaking

### 4. Audio Playback Issues
**Symptoms:** Assistant response text appears but no audio plays

**Solutions:**
- Check device volume settings
- Ensure audio isn't muted in browser
- Try unmuting/muting the voice mode toggle
- For iOS: ensure Silent Mode is off
- Close other audio-playing applications

### 5. ElevenLabs Voice Issues
**Symptoms:** Robotic voice or fallback to system voice

**Solutions:**
- Check if ELEVENLABS_API_KEY is configured in .env.local
- Verify API key is valid at elevenlabs.io
- Check browser console for API errors
- Fallback to native voice is normal if API fails

### 6. iOS-Specific Issues
**Common iOS problems and fixes:**

#### "Voice recognition unavailable"
- Update to iOS 14.5+ and Safari 14.1+
- Enable microphone in Settings → Safari
- Ensure you're not in Private Browsing mode

#### Audio won't play
- Disable Silent Mode (check the physical switch)
- Ensure volume is up
- Close other audio apps
- Try tapping the screen to "wake up" audio context

### 7. Android Chrome Issues
**Common Android problems:**

#### Speech recognition starts then immediately stops
- Enable microphone permission in Chrome settings
- Disable "Enhanced Google services" if causing conflicts
- Clear Chrome cache and try again

#### Poor speech recognition accuracy
- Speak clearly and pause between sentences
- Reduce background noise
- Try moving closer to the microphone

## Environment Setup
Ensure these are configured in your `.env.local`:

```bash
# Required for chat functionality
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional for enhanced voice quality
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
ELEVENLABS_VOICE_ID=your-preferred-voice-id
```

## Testing Voice Mode
1. Open the test file: `test-voice.html` in your browser
2. Click "Test Voice Recognition"
3. Grant microphone permission when prompted
4. Check for success/error messages

## Browser Support
- ✅ Chrome 25+
- ✅ Edge 79+
- ✅ Safari 14.1+ (desktop)
- ✅ iOS Safari 14.5+
- ❌ Firefox (limited support)
- ❌ Internet Explorer

## Still Having Issues?
1. Check browser console for error messages
2. Try in an incognito/private window
3. Test with the voice test page
4. Ensure you're running the latest browser version
5. Contact support with specific error messages
