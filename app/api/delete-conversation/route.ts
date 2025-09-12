// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";

// export async function POST(req: Request) {
//   try {
//     const { threadId, adminToken } = await req.json();

//     if (adminToken !== process.env.ADMIN_DELETE_TOKEN) {
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
//     }

//     const client = await clientPromise;
//     const db = client.db("chatOFSurgery");

//     const result = await db.collection("chat_sessions").deleteOne({ threadId });

//     if (result.deletedCount === 1) {
//       return NextResponse.json({ success: true });
//     } else {
//       return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
//     }
//   } catch (error) {
//     console.error("Error deleting conversation:", error);
//     return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
//   }
// }


import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Common CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://surgery-abroad.com", // Your WP admin domain
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Handle soft-delete POST
export async function POST(req: Request) {
  try {
    const { threadId } = await req.json();
    if (!threadId) {
      return NextResponse.json(
        { success: false, error: "threadId required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await clientPromise;
    const db = client.db("chatOFSurgery");

    // Mark conversation as hidden instead of deleting
    await db.collection("chat_sessions").updateOne(
      { threadId },
      { $set: { hidden: true } }
    );

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error hiding conversation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
