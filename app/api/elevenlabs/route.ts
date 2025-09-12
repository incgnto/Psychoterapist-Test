import { NextRequest, NextResponse } from 'next/server'
import { VOICE_OPTIONS, DEFAULT_VOICE, DEFAULT_SETTINGS } from '@/lib/elevenlabs-config'

// Helper function to preprocess text for more natural speech
function preprocessTextForSpeech(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, 'website link')
    // Remove common emojis that might sound weird
    .replace(/[📍💶🇱🇹✨🏥💼✈️🔍💡📋✅❌]/g, '')
    // Add natural pauses by inserting periods
    .replace(/\n\n/g, '. ') // Paragraph breaks
    .replace(/\n/g, '. ') // Line breaks
    // Clean up any double spaces or periods
    .replace(/\s+/g, ' ')
    .replace(/\.+/g, '.')
    .replace(/\.\s*\./g, '.')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    console.log('ElevenLabs API: Processing text of length:', text.length)

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
    }

    // Use configured voice or default to Rachel
    const voiceName = process.env.ELEVENLABS_VOICE_NAME || 'rachel'
    const selectedVoice = VOICE_OPTIONS[voiceName as keyof typeof VOICE_OPTIONS] || DEFAULT_VOICE
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || selectedVoice.id
    
    console.log(`Using ElevenLabs voice: ${selectedVoice.name} (${selectedVoice.description})`)
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: preprocessTextForSpeech(text),
        model_id: 'eleven_turbo_v2', // Latest turbo model for most natural speech
        voice_settings: DEFAULT_SETTINGS,
        // Safari-specific: Request MP3 format which has better Safari support
        output_format: 'mp3_44100_128',
        // Optional: Add these for even more natural speech
        pronunciation_dictionary_locators: [],
        seed: Math.floor(Math.random() * 1000), // Random seed for natural variation
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('ElevenLabs API error:', response.status, errorData)
      
      // Provide more specific error messages
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid ElevenLabs API key' }, { status: 500 })
      } else if (response.status === 429) {
        return NextResponse.json({ error: 'ElevenLabs rate limit exceeded' }, { status: 500 })
      } else if (response.status === 400) {
        return NextResponse.json({ error: 'Invalid voice ID or settings' }, { status: 500 })
      }
      
      return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 })
    }

    const audioBuffer = await response.arrayBuffer()
    
    console.log('ElevenLabs API: Successfully generated audio of size:', audioBuffer.byteLength)
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error in ElevenLabs API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
