import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://surgery-abroad.com';
const DB_NAME = process.env.MONGODB_DB_NAME || 'chatOFSurgery';
const COLLECTION = 'chat_sessions';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Filters / controls
    const includeHidden = url.searchParams.get('includeHidden') === 'true';
    const email = url.searchParams.get('email') || '';         // optional filter by user email
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200); // simple cap
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const query: Record<string, any> = {};
    if (!includeHidden) query.hidden = { $ne: true };
    if (email) query['user.email'] = email;

    const cursor = db
      .collection(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const conversations = await cursor.toArray();

    return NextResponse.json(
      {
        success: true,
        conversations: conversations.map((conv) => ({
          threadId: conv.threadId,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          title: conv.title,
          type: conv.type,
          messages: conv.messages || [],
          summaries: conv.summaries || [],
          username: conv.user?.username || '',
          email: conv.user?.email || '',
          fullname: conv.user?.fullname || '',
          hidden: !!conv.hidden,
        })),
        page: { offset, limit, count: conversations.length },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
