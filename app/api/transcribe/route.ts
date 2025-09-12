import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const form = await request.formData()
    const audioFile = form.get('audio') as unknown as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Forward to OpenAI Whisper API
    const openAiForm = new FormData()
    // Whisper accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm
    openAiForm.append('file', audioFile, (audioFile as any).name || 'audio.webm')
    openAiForm.append('model', 'whisper-1')
    // You can tweak these settings if needed
    // openAiForm.append('temperature', '0')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: openAiForm,
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      console.error('OpenAI transcription error:', err)
      return NextResponse.json({ error: 'Transcription failed' }, { status: response.status })
    }

    const data = await response.json()
    // OpenAI returns { text: '...' }
    return NextResponse.json({ text: data.text || '' })
  } catch (error) {
    console.error('Transcription route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


