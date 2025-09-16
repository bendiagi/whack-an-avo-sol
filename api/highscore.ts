import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const KEY = 'global_highscore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const value = Number((await redis.get(KEY)) ?? 0)
    return res.status(200).json({ highScore: value })
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const incoming = Number(body?.score) || 0
      const current = Number((await redis.get(KEY)) ?? 0)
      const next = Math.max(current, incoming)
      if (next !== current) await redis.set(KEY, String(next))
      return res.status(200).json({ highScore: next })
    } catch (_err) {
      return res.status(400).json({ error: 'Invalid payload' })
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}


