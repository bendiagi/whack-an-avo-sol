import { Redis } from '@upstash/redis'

const KEY = 'global_highscore'

function getRedis() {
  const url = process.env.CUSTOM_KV_REST_API_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.CUSTOM_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return json({}, 200)

  try {
    const url = new URL(req.url)
    const debug = url.searchParams.get('debug')
    if (debug === '1' || debug === '2') {
      const usedUrl = process.env.CUSTOM_KV_REST_API_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
      const usedToken = process.env.CUSTOM_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
      const mask = (v: string) => (v ? `${v.slice(0, 10)}...${v.slice(-6)}` : '')
      return json({
        ok: true,
        envs: {
          CUSTOM_KV_REST_API_URL: Boolean(process.env.CUSTOM_KV_REST_API_URL),
          CUSTOM_KV_REST_API_TOKEN: Boolean(process.env.CUSTOM_KV_REST_API_TOKEN),
          KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
          KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
          UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
          UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN)
        },
        used: debug === '2' ? { url: mask(usedUrl), token: mask(usedToken) } : undefined
      })
    }

    if (req.method === 'GET') {
      const client = getRedis()
      if (!client) return json({ error: 'Missing Redis ENV (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)' }, 500)
      const valueRaw = await client.get(KEY)
      const value = Number(valueRaw ?? 0)
      return json({ highScore: Number.isNaN(value) ? 0 : value })
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null)
      if (!body || typeof body !== 'object') return json({ error: 'Invalid payload' }, 400)
      const incoming = Number((body as any)?.score) || 0
      const client = getRedis()
      if (!client) return json({ error: 'Missing Redis ENV (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)' }, 500)
      const current = Number((await client.get(KEY)) ?? 0)
      const next = Math.max(current, incoming)
      if (next !== current) await client.set(KEY, String(next))
      return json({ highScore: next })
    }

    return json({ error: 'Method Not Allowed' }, 405)
  } catch (e: any) {
    const msg = e?.message || String(e)
    return json({ error: 'Internal Server Error', message: msg }, 500)
  }
}
