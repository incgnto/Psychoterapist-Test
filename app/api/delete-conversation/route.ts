import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const ALLOWED_ORIGIN = 'https://surgery-abroad.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// --- Preflight handler (CORS) ---
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// --- Main handler ---
export async function POST(req: NextRequest) {
  try {
    const { threadId } = await req.json();

    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid threadId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await clientPromise;
    const db = client.db('chatOFSurgery');

    const result = await db
      .collection('chat_sessions')
      .updateOne({ threadId }, { $set: { hidden: true, updatedAt: new Date() } });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error hiding conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
