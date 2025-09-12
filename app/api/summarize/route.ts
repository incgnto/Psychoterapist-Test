// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function POST(req: Request) {
//   try {
//     const { threadId, messages } = await req.json();

//   const prompt = `
// Summarize the following conversation in a short professional paragraph:

// ${messages.map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
//   `;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.7
//     });

//   const summaryText = completion.choices[0]?.message?.content?.trim() || "";

//     const client = await clientPromise;
//     const db = client.db("chatOFSurgery");

//     await db.collection("chat_sessions").updateOne(
//       { threadId },
//       {
//         $push: {
//           summaries: {
//             text: summaryText,
//             messageCount: messages.length,
//             timestamp: new Date()
//           }
//         }
//       }
//     );

//     return NextResponse.json({ success: true, summary: summaryText });
//   } catch (error) {
//     console.error("Error generating summary:", error);
//     return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
//   }
// }




import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // change '*' to your WP domain for security
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { threadId, messages } = await req.json();

    if (!threadId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid data" },
        { status: 400, headers: corsHeaders }
      );
    }

    const prompt = `
Summarize the following conversation in a short professional paragraph:

${messages
  .map(
    (m: { role: string; content: string }) =>
      `${m.role?.toUpperCase() || "UNKNOWN"}: ${m.content || ""}`
  )
  .join("\n")}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const summaryText =
      completion.choices[0]?.message?.content?.trim() || "";

    const client = await clientPromise;
    const db = client.db("chatOFSurgery");

    await db.collection("chat_sessions").updateOne(
      { threadId },
      {
        $push: {
          summaries: {
            text: summaryText,
            messageCount: messages.length,
            timestamp: new Date(),
          },
        },
      }
    );

    return NextResponse.json(
      { success: true, summary: summaryText },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

