// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";

// export async function GET() {
//   try {
//     const client = await clientPromise;
//     const db = client.db("chatOFSurgery");

//     const conversations = await db.collection("chat_sessions")
//       .find({})
//       .sort({ createdAt: -1 })
//       .toArray();

//     return NextResponse.json({
//       success: true,
//       conversations: conversations.map(conv => ({
//         threadId: conv.threadId,
//         createdAt: conv.createdAt,
//         updatedAt: conv.updatedAt,
//         title: conv.title,
//         type: conv.type,
//         messages: conv.messages || [],
//         summaries: conv.summaries || [],
//         username: conv.user?.username || "",
//         email: conv.user?.email || "",
//         fullname: conv.user?.fullname || ""
//       }))
//     });
//   } catch (error) {
//     console.error("Error fetching conversations:", error);
//     return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://surgery-abroad.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("chatOFSurgery");

    const conversations = await db.collection("chat_sessions")
      .find({ hidden: { $ne: true } }) // only show non-hidden
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      conversations: conversations.map(conv => ({
        threadId: conv.threadId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        title: conv.title,
        type: conv.type,
        messages: conv.messages || [],
        summaries: conv.summaries || [],
        username: conv.user?.username || "",
        email: conv.user?.email || "",
        fullname: conv.user?.fullname || ""
      }))
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
