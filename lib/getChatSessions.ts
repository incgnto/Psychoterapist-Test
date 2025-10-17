import clientPromise from '@/lib/mongodb'

export async function getChatSessions(ownerEmail: string) {
  const client = await clientPromise
  const db = client.db()
  const collection = db.collection('chat_sessions')

  const email = String(ownerEmail || '').trim().toLowerCase()

  const sessions = await collection
    .find({ 'user.email': email })
    .project({
      threadId: 1,
      title: 1,
      type: 1,
      createdAt: 1,
      updatedAt: 1,
      hidden: 1,
      user: 1,
      messages: 1,
      summaries: 1,
    })
    .sort({ updatedAt: -1 })
    .toArray()

  return sessions
}
