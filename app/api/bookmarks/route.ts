// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chatOFSurgery';
const BOOKMARKS = 'bookmarks';
const SESSIONS = 'chat_sessions';

// Simple id
const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'guest@pj.com';
    const threadId = url.searchParams.get('threadId') || undefined;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const query: Record<string, any> = { 'user.email': email };
    if (threadId) query.threadId = threadId;

    // Newest-first by the ORIGINAL message timestamp we store in createdAt
    const docs = await db
      .collection(BOOKMARKS)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      bookmarks: docs.map((d) => ({
        id: d.id,
        messageId: d.messageId,
        threadId: d.threadId,
        title: d.title,
        note: d.note || '',
        contentPreview: d.contentPreview || '',
        createdAt: d.createdAt, // original message time
        updatedAt: d.updatedAt, // last modified
        isUser: Boolean(d.isUser), // <-- include for UI ("From You" vs "From Therapist")
      })),
    });
  } catch (err) {
    console.error('GET /api/bookmarks error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load bookmarks' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email = 'guest@pj.com',
      user = { email, username: 'guest', fullname: 'Guest User', isGuest: true },
      messageId,
      threadId,
      title = '',
      note = '',
      contentPreview = '',
      // optional hints from client:
      messageTimestamp,
      isUser: isUserHint, // <-- client may pass this; we’ll still validate/fall back
    } = body || {};

    if (!email || !messageId || !threadId) {
      return NextResponse.json(
        { success: false, error: 'email, messageId, and threadId are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const now = new Date();

    // Resolve original message timestamp
    let originalSentAt: Date | null = null;

    if (messageTimestamp) {
      try {
        const ts = new Date(messageTimestamp);
        if (!isNaN(ts.getTime())) originalSentAt = ts;
      } catch {
        originalSentAt = null;
      }
    }

    // Resolve isUser (who sent the message)
    let resolvedIsUser: boolean | null = typeof isUserHint === 'boolean' ? isUserHint : null;

    // If either timestamp or isUser is missing, look inside the session
    if (!originalSentAt || resolvedIsUser === null) {
      try {
        const session = await db.collection(SESSIONS).findOne({ threadId });
        const msg = Array.isArray(session?.messages)
          ? session.messages.find((m: any) => m?.id === messageId)
          : null;

        if (!originalSentAt && msg?.timestamp) {
          const ts = new Date(msg.timestamp);
          if (!isNaN(ts.getTime())) originalSentAt = ts;
        }
        if (resolvedIsUser === null && msg?.role) {
          resolvedIsUser = String(msg.role).toLowerCase() === 'user';
        }
      } catch {
        // ignore lookup failures; we'll fallback below
      }
    }

    if (!originalSentAt) originalSentAt = now;
    if (resolvedIsUser === null) resolvedIsUser = false; // default to assistant/therapist

    // Upsert by (user.email + messageId) ⇒ one bookmark per message per user
    const res = await db.collection(BOOKMARKS).findOneAndUpdate(
      { 'user.email': email, messageId },
      {
        // Only set createdAt (message's sent time) on first insert
        $setOnInsert: {
          id: gid(),
          createdAt: originalSentAt, // store original message time
        },
        $set: {
          user,
          threadId,
          title,
          note,
          contentPreview,
          updatedAt: now,     // last modified
          isUser: resolvedIsUser, // <-- store who sent it
          messageId,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const doc =
      res.value || {
        id: gid(),
        messageId,
        threadId,
        title,
        note,
        contentPreview,
        createdAt: originalSentAt,
        updatedAt: now,
        isUser: resolvedIsUser,
      };

    return NextResponse.json({
      success: true,
      bookmark: {
        id: doc.id,
        messageId,
        threadId,
        title,
        note,
        contentPreview,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        isUser: Boolean(doc.isUser),
      },
    });
  } catch (err) {
    console.error('POST /api/bookmarks error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save bookmark' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'guest@pj.com';
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const result = await db.collection(BOOKMARKS).deleteOne({ id, 'user.email': email });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Bookmark not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/bookmarks error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}
