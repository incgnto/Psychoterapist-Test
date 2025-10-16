import { NextRequest, NextResponse } from 'next/server';
import { getChatSessions } from '@/lib/getChatSessions';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || 'guest@pj.com';

    // Defensive check: validate email format
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const sessions = await getChatSessions(email);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('GET /api/chat-history error:', err);
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
  }
}
