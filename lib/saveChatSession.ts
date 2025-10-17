import clientPromise from '@/lib/mongodb'

type MinimalUser = {
  email?: string
  username?: string
  fullname?: string
  isGuest?: boolean
}

type SaveArgs = {
  threadId: string
  user: MinimalUser
  ownerEmail?: string
  messages: Array<{ id?: string } & Record<string, any>>
  title: string
  type: 'voice' | 'text'
}

export async function saveChatSession({ threadId, user, ownerEmail, messages, title, type }: SaveArgs) {
  const client = await clientPromise
  const db = client.db()
  const collection = db.collection('chat_sessions')

  const email = (ownerEmail || user?.email || 'guest@pj.com').toLowerCase()
  const now = new Date()

  const seen = new Set<string>()
  const msgs = (messages || []).filter((m) => {
    if (!m || typeof m !== 'object') return false
    if (m.id && typeof m.id === 'string') {
      if (seen.has(m.id)) return false
      seen.add(m.id)
    }
    return true
  })

  await collection.updateOne(
    { threadId, 'user.email': email },
    [
      {
        $set: {
          threadId,
          user: { ...user, email },
          ownerEmail: email,
          title,
          type,
          updatedAt: now,
          createdAt: { $ifNull: ['$createdAt', now] },
          messages: {
            $let: {
              vars: { existing: { $ifNull: ['$messages', []] }, incoming: msgs },
              in: {
                $concatArrays: [
                  '$$existing',
                  {
                    $filter: {
                      input: '$$incoming',
                      as: 'm',
                      cond: {
                        $not: {
                          $in: [
                            { $ifNull: ['$$m.id', '___NO_ID___'] },
                            {
                              $map: {
                                input: '$$existing',
                                as: 'e',
                                in: { $ifNull: ['$$e.id', '___NO_ID___'] },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ],
    { upsert: true }
  )
}
