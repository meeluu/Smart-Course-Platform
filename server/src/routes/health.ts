import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ServerConfig } from '../config.js'

/** 健康检查路径。本轮唯一的接口，见 docs/contracts.md 第 6.3 节。 */
export const HEALTH_PATH = '/health'

export interface HealthPayload {
  status: 'ok'
  /** 服务名。用于区分同一台服务器上的其他服务 */
  service: string
  /** 契约版本，便于确认线上部署的是哪一版 */
  contractVersion: string
  /** 本次检查时间，ISO 8601 */
  checkedAt: string
}

/**
 * 组装健康检查响应体。
 * 只包含固定字段与时间：不含环境变量、文件路径、密钥，也不含任何业务数据。
 */
export function buildHealthPayload(config: ServerConfig, now: Date = new Date()): HealthPayload {
  return {
    status: 'ok',
    service: config.serviceName,
    contractVersion: config.contractVersion,
    checkedAt: now.toISOString(),
  }
}

/**
 * 统一写出 JSON 响应。
 * 一律带 no-store：健康检查与后续接口都不允许被中间层缓存。
 */
export function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  const payload = JSON.stringify(body)
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...extraHeaders,
  })
  res.end(payload)
}

/**
 * 处理 GET /health。
 * 返回 true 表示这个请求已经被处理完，调用方不要再做兜底响应。
 */
export function handleHealth(req: IncomingMessage, res: ServerResponse, config: ServerConfig): boolean {
  // 用 URL 解析而不是直接比较 req.url：允许 /health?x=1 这类带查询串的访问
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  if (pathname !== HEALTH_PATH) return false

  if (req.method !== 'GET') {
    sendJson(res, 405, { status: 'error', message: '仅支持 GET /health' }, { allow: 'GET' })
    return true
  }

  sendJson(res, 200, buildHealthPayload(config))
  return true
}
