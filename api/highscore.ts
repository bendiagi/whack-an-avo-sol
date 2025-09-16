import { Redis } from '@upstash/redis'

const KEY = 'global_highscore'

// Simple in-memory rate limiting (resets on function restart)
const rateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimit.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT) {
    return false
  }
  
  record.count++
  return true
}

function getClientIP(req: Request): string {
  // Try various headers for IP (Vercel, Cloudflare, etc.)
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown'
}

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
      'Access-Control-Allow-Origin': 'https://whack-an-avo-sol.vercel.app',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
}

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return json({}, 200)

  try {
    // Rate limiting
    const clientIP = getClientIP(req)
    if (!checkRateLimit(clientIP)) {
      return json({ error: 'Rate limit exceeded. Try again later.' }, 429)
    }

    const url = new URL(req.url)
    // Debug endpoints only in development
    if (process.env.NODE_ENV !== 'production') {
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
      
      // Input validation
      if (incoming < 0 || incoming > 1000000) {
        return json({ error: 'Score must be between 0 and 1,000,000' }, 400)
      }
      
      const client = getRedis()
      if (!client) return json({ error: 'Missing Redis ENV (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)' }, 500)
      const current = Number((await client.get(KEY)) ?? 0)
      const next = Math.max(current, incoming)
      if (next !== current) await client.set(KEY, String(next))
      return json({ highScore: next })
    }

    return json({ error: 'Method Not Allowed' }, 405)
  } catch (e: any) {
    // Generic error message in production
    const isProduction = process.env.NODE_ENV === 'production'
    const msg = isProduction ? 'Internal Server Error' : (e?.message || String(e))
    return json({ error: msg }, 500)
  }
}
