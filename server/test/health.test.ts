import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/index.js'
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  loadConfig,
  parsePort,
  type ServerConfig,
} from '../src/config.js'
import { HEALTH_PATH, buildHealthPayload } from '../src/routes/health.js'

/** 测试用配置：端口填 0，让系统分配一个空闲端口，避免和本机 8080 冲突 */
const testConfig: ServerConfig = {
  host: '127.0.0.1',
  port: 0,
  serviceName: 'course-platform-api',
  contractVersion: '1.0',
}

let server: Server
let baseUrl: string

before(async () => {
  server = createApp(testConfig)
  await new Promise<void>((resolve) => {
    server.listen(testConfig.port, testConfig.host, resolve)
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://${testConfig.host}:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

test('GET /health 返回 200 与 JSON', async () => {
  const response = await fetch(`${baseUrl}${HEALTH_PATH}`)

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /application\/json/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('GET /health 的 JSON 至少包含 status 与 service', async () => {
  const response = await fetch(`${baseUrl}${HEALTH_PATH}`)
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(body.status, 'ok')
  assert.equal(body.service, 'course-platform-api')
})

test('GET /health 返回的 checkedAt 是合法 ISO 时间', async () => {
  const response = await fetch(`${baseUrl}${HEALTH_PATH}`)
  const body = (await response.json()) as { checkedAt?: unknown }

  assert.equal(typeof body.checkedAt, 'string')
  const parsed = new Date(body.checkedAt as string)
  assert.ok(!Number.isNaN(parsed.getTime()), 'checkedAt 应能被 Date 解析')
})

test('GET /health 带查询串时同样返回 200', async () => {
  const response = await fetch(`${baseUrl}${HEALTH_PATH}?probe=1`)
  assert.equal(response.status, 200)
})

test('GET /health 的响应不泄露密钥或服务器路径', async () => {
  const response = await fetch(`${baseUrl}${HEALTH_PATH}`)
  const text = await response.text()

  // 不出现任何形如 xxx_KEY / xxx_SECRET / xxx_TOKEN 的字段
  assert.doesNotMatch(text, /[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)/i)
  // 不出现 Windows 或 POSIX 的绝对路径
  assert.doesNotMatch(text, /[A-Za-z]:[\\/]/)
  assert.doesNotMatch(text, /(^|["\s])\/(home|root|etc|usr|var)\//)
})

test('非 GET 方法访问 /health 返回 405 与 allow 头', async () => {
  const response = await fetch(`${baseUrl}${HEALTH_PATH}`, { method: 'POST' })

  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET')
  const body = (await response.json()) as Record<string, unknown>
  assert.equal(body.status, 'error')
})

test('未知路径返回 404 JSON', async () => {
  // 注意：这里必须用一条真正不存在的路径。
  // /api/advisor/recommendations 现在已存在，对它发 GET 会正确返回 405（方法不支持），
  // 不再适合用来验证 404 兜底。
  const response = await fetch(`${baseUrl}/api/route-that-does-not-exist`)

  assert.equal(response.status, 404)
  assert.match(response.headers.get('content-type') ?? '', /application\/json/)

  const text = await response.text()
  const body = JSON.parse(text) as Record<string, unknown>
  assert.equal(body.status, 'error')

  // 兜底 404 同样不得泄露密钥、绝对路径、堆栈或内部模块信息
  assert.doesNotMatch(text, /[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)/i)
  assert.doesNotMatch(text, /[A-Za-z]:[\\/]/)
  assert.doesNotMatch(text, /node_modules/)
  assert.doesNotMatch(text, /\bat .+:\d+:\d+/)
})

test('默认端口是 8080', () => {
  assert.equal(DEFAULT_PORT, 8080)
  assert.equal(parsePort(undefined), 8080)
  assert.equal(parsePort(''), 8080)
  assert.equal(loadConfig({}).port, 8080)
})

test('PORT 环境变量可以覆盖默认端口', () => {
  assert.equal(parsePort('9090'), 9090)
  assert.equal(loadConfig({ PORT: '9090' }).port, 9090)
})

test('非法 PORT 直接报错，不回退到默认值', () => {
  assert.throws(() => parsePort('abc'))
  assert.throws(() => parsePort('0'))
  assert.throws(() => parsePort('70000'))
  assert.throws(() => parsePort('8080.5'))
})

test('默认监听 127.0.0.1，可用 HOST 覆盖', () => {
  assert.equal(DEFAULT_HOST, '127.0.0.1')
  assert.equal(loadConfig({}).host, '127.0.0.1')
  assert.equal(loadConfig({ HOST: '0.0.0.0' }).host, '0.0.0.0')
})

test('buildHealthPayload 只输出固定字段，可注入时间', () => {
  const payload = buildHealthPayload(testConfig, new Date('2026-09-25T11:03:00.000Z'))

  assert.deepEqual(payload, {
    status: 'ok',
    service: 'course-platform-api',
    contractVersion: '1.0',
    checkedAt: '2026-09-25T11:03:00.000Z',
  })
})
