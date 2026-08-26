import fs from 'node:fs'
import path from 'node:path'
import type { Connect } from 'vite'
import type { Plugin } from 'vite'

/**
 * Dev proxy to the local OmniRoute gateway (http://localhost:20128).
 * Keeps the gateway key server-side — the browser only ever talks to
 * /api/gateway/*. In production this becomes a route on idexal.com that
 * authenticates users and forwards to https://api.idexa.com.
 */

// Vite doesn't preload .env for config-adjacent modules — load it here.
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
loadEnv()

const GATEWAY = process.env.OMNIROUTE_URL ?? 'http://localhost:20128'
const KEY = process.env.OMNIROUTE_INFERENCE_KEY ?? ''

// /v1/models is ~740KB and slow — cache it for 5 minutes so pages load instantly.
let modelsCache: { body: string; at: number } | null = null
const MODELS_TTL = 5 * 60_000

async function proxy(path: string, req: Connect.IncomingMessage, res: import('node:http').ServerResponse) {
  if (!KEY) {
    res.statusCode = 503
    res.end(JSON.stringify({ error: 'Gateway key not configured (OMNIROUTE_INFERENCE_KEY).' }))
    return
  }

  // Serve the model catalog from cache when fresh.
  if (path === '/v1/models' && modelsCache && Date.now() - modelsCache.at < MODELS_TTL) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Cache', 'HIT')
    res.end(modelsCache.body)
    return
  }

  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const body = Buffer.concat(chunks).toString('utf8')

  try {
    const upstream = await fetch(`${GATEWAY}${path}`, {
      method: req.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method ?? '') ? body || undefined : undefined,
    })

    res.statusCode = upstream.status
    const ct = upstream.headers.get('content-type') ?? 'application/json'
    res.setHeader('Content-Type', ct)

    if (path === '/v1/models' && upstream.ok) {
      // Cache the catalog, then serve from memory.
      const text = await upstream.text()
      modelsCache = { body: text, at: Date.now() }
      res.setHeader('X-Cache', 'MISS')
      res.end(text)
      return
    }

    // Stream SSE bodies straight through (chat completions use streaming).
    if (upstream.body) {
      const reader = upstream.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (e) {
    // Serve stale cache if the gateway dies mid-flight.
    if (path === '/v1/models' && modelsCache) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Cache', 'STALE')
      res.end(modelsCache.body)
      return
    }
    res.statusCode = 502
    res.end(JSON.stringify({ error: `Gateway unreachable: ${(e as Error).message}` }))
  }
}

export function gatewayProxy(): Plugin {
  return {
    name: 'omniroute-gateway-proxy',
    configureServer(server) {
      server.middlewares.use('/api/gateway', (req, res) => {
        const path = (req.url ?? '').split('?')[0] || '/v1/models'
        void proxy(path.startsWith('/v1') ? path : `/v1${path}`, req, res)
      })
    },
    // Also available in `vite preview` (production-like local run).
    configurePreviewServer(server) {
      server.middlewares.use('/api/gateway', (req, res) => {
        const path = (req.url ?? '').split('?')[0] || '/v1/models'
        void proxy(path.startsWith('/v1') ? path : `/v1${path}`, req, res)
      })
    },
  }
}
