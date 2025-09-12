import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const contentType = file.type || ''
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Handle plain text directly
    if (contentType.startsWith('text/')) {
      const text = buffer.toString('utf8')
      return NextResponse.json({ text })
    }

    // Handle PDF
    if (contentType === 'application/pdf') {
      const pdfParseMod = await import('pdf-parse')
      const pdfParse = (pdfParseMod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default
      const result = await pdfParse(buffer)
      const text: string = (result && typeof result.text === 'string') ? result.text : ''
      return NextResponse.json({ text })
    }

    // Handle DOCX
    if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      const text: string = (result && typeof (result as any).value === 'string') ? (result as any).value : ''
      return NextResponse.json({ text })
    }

    // Basic fallback for unsupported types
    return NextResponse.json({ text: '' })
  } catch (error) {
    console.error('extract-text error:', error)
    return NextResponse.json({ error: 'Failed to extract text' }, { status: 500 })
  }
}


