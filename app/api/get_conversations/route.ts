// app/api/get_conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import clientPromise from "@/lib/mongodb";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://surgery-abroad.com";
const DB_NAME = process.env.MONGODB_DB_NAME || "chatOFSurgery";
const COLLECTION = "chat_sessions";

const ALLOW_ADMIN = process.env.ALLOW_ADMIN_CONVERSATIONS === "true";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function isValidEmail(v: string) {
  return typeof v === "string" && v.includes("@") && v.length <= 320;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeHidden = url.searchParams.get("includeHidden") === "true";
    const emailParam = (url.searchParams.get("email") || "").trim().toLowerCase();
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

    const { userId } = await auth();  
    let clerkEmail: string | null = null;

    if (userId) {
      const user = await currentUser();
      clerkEmail =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        null;
      if (clerkEmail) clerkEmail = clerkEmail.toLowerCase();
    }

    const isAdmin = ALLOW_ADMIN && !!clerkEmail && ADMIN_EMAILS.includes(clerkEmail);

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const query: Record<string, any> = {};
    if (!includeHidden) query.hidden = { $ne: true };

    if (isAdmin) {
      if (emailParam) {
        if (!isValidEmail(emailParam)) {
          return NextResponse.json({ success: false, error: "Invalid email filter" }, { status: 400, headers: corsHeaders });
        }
        query["user.email"] = emailParam;
      }
    } else if (clerkEmail) {
      if (!isValidEmail(clerkEmail)) {
        return NextResponse.json({ success: false, error: "Invalid authenticated email" }, { status: 400, headers: corsHeaders });
      }
      query["user.email"] = clerkEmail;
    } else {
      const effectiveGuest = emailParam || "guest@pj.com";
      if (!isValidEmail(effectiveGuest)) {
        return NextResponse.json({ success: false, error: "Invalid email for guest mode" }, { status: 400, headers: corsHeaders });
      }
      query["user.email"] = effectiveGuest;
    }

    const conversations = await db
      .collection(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

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
          username: conv.user?.username || "",
          email: conv.user?.email || "",
          fullname: conv.user?.fullname || "",
          hidden: !!conv.hidden,
        })),
        page: { offset, limit, count: conversations.length },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
