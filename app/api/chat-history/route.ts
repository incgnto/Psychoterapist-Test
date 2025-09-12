import { NextRequest, NextResponse } from 'next/server'
import { getChatSessions } from '@/lib/getChatSessions'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const email = url.searchParams.get('email') || 'guest@pj.com'
  const sessions = await getChatSessions(email)
  return NextResponse.json({ sessions })
}
