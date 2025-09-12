import clientPromise from '@/lib/mongodb'

export async function getChatSessions(userEmail: string) {
  const client = await clientPromise
  const db = client.db()
  const collection = db.collection('chat_sessions')
  // Find all chat sessions for this user
  const sessions = await collection.find({ 'user.email': userEmail }).sort({ updatedAt: -1 }).toArray()
  return sessions
}
