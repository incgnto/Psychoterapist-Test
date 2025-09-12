import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function saveChatSession({ threadId, user, messages, title, type }: {
  threadId: string,
  user: { email?: string, username?: string, fullname?: string, isGuest?: boolean },
  messages: any[],
  title: string,
  type: 'voice' | 'text',
}) {
  const client = await clientPromise
  const db = client.db()
  const collection = db.collection('chat_sessions')

  // Upsert session by threadId
  await collection.updateOne(
    { threadId },
    {
      $set: {
        threadId,
        user,
        title,
        type,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
      $push: {
        messages: { $each: messages },
      },
    },
    { upsert: true }
  )
}
