// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";

// export async function GET() {
//   try {
//     const client = await clientPromise;
//     const db = client.db("chatOFSurgery");

//     const totalConversations = await db.collection("chat_sessions").countDocuments();
//     const totalMessages = await db.collection("chat_sessions").aggregate([
//       { $unwind: "$messages" },
//       { $count: "total" }
//     ]).toArray();

//     const totalUsers = await db.collection("chat_sessions").distinct("user.email");

//     return NextResponse.json({
//       success: true,
//       summary: `
// 💬 Total Conversations: ${totalConversations}  
// 📨 Total Messages: ${totalMessages[0]?.total || 0}  
// 👤 Unique Users: ${totalUsers.length}
//       `
//     });
//   } catch (error) {
//     console.error("Error fetching analytics:", error);
//     return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
//   }
// }

// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function GET() {
//   try {
//     const client = await clientPromise;
//     const db = client.db("chatOFSurgery");

//     const conversations = await db.collection("chat_sessions")
//       .find({}, { projection: { messages: 1, user: 1 } })
//       .limit(20)
//       .toArray();

//     console.log("Conversations fetched:", conversations.length);

//     const allMessagesText = conversations
//       .flatMap(conv => conv.messages.map((msg: { content: string }) => msg.content))
//       .join("\n");

//     if (!allMessagesText.trim()) {
//       return NextResponse.json({
//         success: true,
//         summaryStats: {
//           totalConversations: conversations.length,
//           totalMessages: 0,
//           totalUsers: (await db.collection("chat_sessions").distinct("user.email")).length,
//         },
//         summaryText: "No conversation messages found to summarize.",
//       });
//     }

//     const prompt = `
// You are an AI assistant. Summarize the following chat conversations in a concise and professional manner:

// ${allMessagesText}
// `;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "You summarize chat conversations." },
//         { role: "user", content: prompt },
//       ],
//       max_tokens: 300,
//       temperature: 0.5,
//     });

//     const summaryText = completion.choices[0].message.content;

//     const totalConversations = await db.collection("chat_sessions").countDocuments();
//     const totalMessages = await db.collection("chat_sessions").aggregate([
//       { $unwind: "$messages" },
//       { $count: "total" }
//     ]).toArray();
//     const totalUsers = await db.collection("chat_sessions").distinct("user.email");

//     return NextResponse.json({
//       success: true,
//       summaryStats: {
//         totalConversations,
//         totalMessages: totalMessages[0]?.total || 0,
//         totalUsers: totalUsers.length,
//       },
//       summaryText,
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
//   }
// }












import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://surgery-abroad.com", // change to "*" if you want to allow all
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("chatOFSurgery");

    const conversations = await db.collection("chat_sessions")
      .find({ hidden: { $ne: true } }, { projection: { messages: 1, user: 1 } })
      .limit(20)
      .toArray();

    const allMessagesText = conversations
      .flatMap(conv => conv.messages.map((msg: { content: string }) => msg.content))
      .join("\n");

    if (!allMessagesText.trim()) {
      return NextResponse.json({
        success: true,
        summaryStats: {
          totalConversations: conversations.length,
          totalMessages: 0,
          totalUsers: (await db.collection("chat_sessions").distinct("user.email", { hidden: { $ne: true } })).length,
        },
        summaryText: "No conversation messages found to summarize.",
      }, { headers: corsHeaders });
    }

    const prompt = `
You are an AI assistant. Summarize the following chat conversations in a concise and professional manner:

${allMessagesText}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You summarize chat conversations." },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.5,
    });

    const summaryText = completion.choices[0].message.content;

    const totalConversations = await db.collection("chat_sessions").countDocuments({ hidden: { $ne: true } });
    const totalMessages = await db.collection("chat_sessions").aggregate([
      { $match: { hidden: { $ne: true } } },
      { $unwind: "$messages" },
      { $count: "total" }
    ]).toArray();
    const totalUsers = await db.collection("chat_sessions").distinct("user.email", { hidden: { $ne: true } });

    return NextResponse.json({
      success: true,
      summaryStats: {
        totalConversations,
        totalMessages: totalMessages[0]?.total || 0,
        totalUsers: totalUsers.length,
      },
      summaryText,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
