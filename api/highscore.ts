import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return null
  }
  return new Redis({ url, token })
}
const KEY = 'global_highscore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    try {
      const client = getRedis()
      if (!client) {
        return res.status(500).json({ error: 'Missing Redis ENV (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)' })
      }
      const valueRaw = await client.get(KEY)
      const value = Number(valueRaw ?? 0)
      return res.status(200).json({ highScore: Number.isNaN(value) ? 0 : value })
    } catch (e: any) {
      const msg = e?.message || String(e)
      console.error('GET /api/highscore error:', msg)
      return res.status(500).json({ error: 'Failed to fetch high score', message: msg })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const incoming = Number(body?.score) || 0
      const client = getRedis()
      if (!client) {
        return res.status(500).json({ error: 'Missing Redis ENV (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)' })
      }
      const current = Number((await client.get(KEY)) ?? 0)
      const next = Math.max(current, incoming)
      if (next !== current) await client.set(KEY, String(next))
      return res.status(200).json({ highScore: next })
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (msg.toLowerCase().includes('json')) {
        return res.status(400).json({ error: 'Invalid payload' })
      }
      console.error('POST /api/highscore error:', msg)
      return res.status(500).json({ error: 'Failed to update high score', message: msg })
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}


