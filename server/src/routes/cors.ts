import type { IncomingMessage, ServerResponse } from 'node:http'
import { ADVISOR_RECOMMENDATIONS_PATH } from './advisor.js'
import { sendJson } from './health.js'

/** Browser origins allowed to call the advisor API. */
export const ALLOWED_CORS_ORIGINS = [
  'https://course.xinxian-music.xyz',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const

function requestPath(req: IncomingMessage): string {
  return new URL(req.url ?? '/', 'http://localhost').pathname
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

function isAllowedOrigin(origin: string | undefined): origin is (typeof ALLOWED_CORS_ORIGINS)[number] {
  return origin !== undefined && ALLOWED_CORS_ORIGINS.includes(origin as (typeof ALLOWED_CORS_ORIGINS)[number])
}

/** Handle CORS for the advisor endpoint before its normal route handler. */
export function handleAdvisorCors(req: IncomingMessage, res: ServerResponse): boolean {
  if (requestPath(req) !== ADVISOR_RECOMMENDATIONS_PATH) return false

  const origin = req.headers.origin
  if (origin !== undefined && !isAllowedOrigin(origin)) {
    sendJson(res, 403, { status: 'error', message: '来源不被允许' })
    return true
  }

  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { status: 'error', message: '来源不被允许' })
      return true
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    setCorsHeaders(res)
    res.writeHead(204, { 'content-length': '0' })
    res.end()
    return true
  }

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    setCorsHeaders(res)
  }
  return false
}
