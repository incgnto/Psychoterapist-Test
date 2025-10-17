// app/api/chat-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getChatSessions } from "@/lib/getChatSessions";

function isValidEmail(v: string) {
  return typeof v === "string" && v.includes("@") && v.length <= 320;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();  
    let effectiveEmail: string | null = null;

    if (userId) {
      const user = await currentUser();
      effectiveEmail =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        null;
    } else {
      const url = new URL(request.url);
      effectiveEmail = url.searchParams.get("email") || "guest@pj.com";
    }

    if (!effectiveEmail || !isValidEmail(effectiveEmail)) {
      return NextResponse.json({ error: "Invalid or missing email address" }, { status: 400 });
    }

    const sessions = await getChatSessions(effectiveEmail.toLowerCase());
    return NextResponse.json({ sessions });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch chat sessions" }, { status: 500 });
  }
}
