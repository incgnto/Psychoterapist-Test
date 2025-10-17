// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth, currentUser } from "@clerk/nextjs/server";

const DB_NAME = process.env.MONGODB_DB_NAME || "chatOFSurgery";
const BOOKMARKS = "bookmarks";
const SESSIONS = "chat_sessions";

// Simple id
const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

type NormalizedUser = {
  email: string;
  username: string;
  fullname: string;
  isGuest: boolean;
};

async function getNormalizedUser(req: NextRequest): Promise<NormalizedUser> {
  // Clerk-first
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "unknown@user";
    const fullname =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      email;
    const username = user?.username || email.split("@")[0];
    return {
      email: email.toLowerCase(),
      username,
      fullname,
      isGuest: false,
    };
  }

  // Signed-out path → treat as guest (sidebar won’t call this when signed-out)
  return {
    email: "guest@pj.com",
    username: "guest",
    fullname: "Guest User",
    isGuest: true,
  };
}

/* ---------------- GET ----------------
   Query bookmarks for the CURRENT user (Clerk) optionally filtered by threadId
--------------------------------------*/
export async function GET(req: NextRequest) {
  try {
    const user = await getNormalizedUser(req);
    const url = new URL(req.url);
    const threadId = url.searchParams.get("threadId") || undefined;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const query: Record<string, any> = { "user.email": user.email };
    if (threadId) query.threadId = threadId;

    const docs = await db
      .collection(BOOKMARKS)
      .find(query)
      .sort({ createdAt: -1 }) // newest first by original message time
      .toArray();

    return NextResponse.json({
      success: true,
      bookmarks: docs.map((d) => ({
        id: d.id,
        messageId: d.messageId,
        threadId: d.threadId,
        title: d.title,
        note: d.note || "",
        contentPreview: d.contentPreview || "",
        createdAt: d.createdAt, // original message time
        updatedAt: d.updatedAt, // last modified
        isUser: Boolean(d.isUser),
      })),
    });
  } catch (err) {
    console.error("GET /api/bookmarks error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load bookmarks" },
      { status: 500 }
    );
  }
}

/* ---------------- POST ----------------
   Upsert a bookmark for the CURRENT user (Clerk)
   Body may include: messageId, threadId, title, note, contentPreview, messageTimestamp?, isUser?
--------------------------------------*/
export async function POST(req: NextRequest) {
  try {
    const user = await getNormalizedUser(req);
    const body = await req.json();

    const {
      messageId,
      threadId,
      title = "",
      note = "",
      contentPreview = "",
      messageTimestamp,
      isUser: isUserHint,
    } = body || {};

    if (!messageId || !threadId) {
      return NextResponse.json(
        { success: false, error: "messageId and threadId are required" },
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

    // Resolve isUser
    let resolvedIsUser: boolean | null =
      typeof isUserHint === "boolean" ? isUserHint : null;

    // If missing, look inside the session
    if (!originalSentAt || resolvedIsUser === null) {
      try {
        const session = await db.collection(SESSIONS).findOne({
          threadId,
          "user.email": user.email, // scope to owner
        });
        const msg = Array.isArray(session?.messages)
          ? session!.messages.find((m: any) => m?.id === messageId)
          : null;

        if (!originalSentAt && msg?.timestamp) {
          const ts = new Date(msg.timestamp);
          if (!isNaN(ts.getTime())) originalSentAt = ts;
        }
        if (resolvedIsUser === null && msg?.role) {
          resolvedIsUser = String(msg.role).toLowerCase() === "user";
        }
      } catch {
        // ignore lookup failures
      }
    }

    if (!originalSentAt) originalSentAt = now;
    if (resolvedIsUser === null) resolvedIsUser = false;

    // Upsert: one bookmark per user per message
    const res = await db.collection(BOOKMARKS).findOneAndUpdate(
      { "user.email": user.email, messageId },
      {
        $setOnInsert: {
          id: gid(),
          createdAt: originalSentAt,
        },
        $set: {
          user,
          threadId,
          title,
          note,
          contentPreview,
          updatedAt: now,
          isUser: resolvedIsUser,
          messageId,
        },
      },
      { upsert: true, returnDocument: "after" }
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
    console.error("POST /api/bookmarks error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save bookmark" },
      { status: 500 }
    );
  }
}

/* --------------- DELETE ---------------
   Delete a bookmark by id for CURRENT user (Clerk)
--------------------------------------*/
export async function DELETE(req: NextRequest) {
  try {
    const user = await getNormalizedUser(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const result = await db
      .collection(BOOKMARKS)
      .deleteOne({ id, "user.email": user.email });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/bookmarks error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}
