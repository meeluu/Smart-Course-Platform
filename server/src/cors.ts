import type { IncomingMessage, ServerResponse } from 'node:http'

/** Browser origin allowed to call the advisor API. */
export const ALLOWED_CORS_ORIGIN = 'https://course.xinxian-music.xyz'
export const ADVISOR_PATH = '/api/advisor/recommendations'

function requestPath(req: IncomingMessage): string {
  return new URL(req.url ?? '/', 'http://localhost').pathname
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

function sendRejectedOrigin(res: ServerResponse): void {
  const body = JSON.stringify({ status: 'error', message: '来源不被允许' })
  res.writeHead(403, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

/** Handle CORS for the advisor endpoint before its normal route handler. */
export function handleAdvisorCors(req: IncomingMessage, res: ServerResponse): boolean {
  if (requestPath(req) !== ADVISOR_PATH) return false

  const origin = req.headers.origin
  if (origin !== undefined && origin !== ALLOWED_CORS_ORIGIN) {
    sendRejectedOrigin(res)
    return true
  }

  if (req.method === 'OPTIONS') {
    if (origin !== ALLOWED_CORS_ORIGIN) {
      sendRejectedOrigin(res)
      return true
    }
    setCorsHeaders(res)
    res.writeHead(204, { 'content-length': '0' })
    res.end()
    return true
  }

  if (origin === ALLOWED_CORS_ORIGIN) setCorsHeaders(res)
  return false
}
