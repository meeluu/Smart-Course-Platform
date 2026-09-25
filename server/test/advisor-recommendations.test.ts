import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/index.js'
import { createAdvisorService } from '../src/advisor/service.js'
import { createRuleFallback } from '../src/advisor/fallback.js'
import { createMockProvider } from '../src/advisor/mockProvider.js'
import { silentLogger, type AdvisorProvider } from '../src/advisor/types.js'
import type { ServerConfig } from '../src/config.js'

/**
 * POST /api/advisor/recommendations 的集成测试
 * ----------------------------------------------------------------------------
 * 通过真实 HTTP 服务（随机端口）验证契约 docs/contracts.md 的请求校验、错误响应与兜底行为。
 * 不占用 8080，也不触碰 18080。
 */

const testConfig: ServerConfig = {
  host: '127.0.0.1',
  port: 0,
  serviceName: 'course-platform-api',
  contractVersion: '1.0',
}

const PATH = '/api/advisor/recommendations'

const FAILURE_KEYS = [
  'code',
  'contractVersion',
  'message',
  'requestId',
  'retryAfterSeconds',
  'retryable',
]

const SUCCESS_KEYS = [
  'cached',
  'contractVersion',
  'fallbackReason',
  'projectId',
  'projectRevision',
  'promptVersion',
  'requestId',
  'source',
  'suggestions',
]

/** 一个符合契约 4.2 的最小合法请求 */
function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contractVersion: '1.0',
    requestId: '9c1f0a6b-2c4d-4e77-9a3f-7b5e8d1c2043',
    projectId: 'prj_3f7a91d24c8b4e0a9d5f1b7c2e6a8031',
    projectRevision: 12,
    projectName: '面向海洋环境安全保障的极端风和浪事件的智能分析系统',
    currentMilestone: '选题确认与文献调研',
    confirmedContext: ['项目目标：构建极端风浪事件识别与预警的原型系统'],
    tasks: [
      {
        taskId: 'tsk_doing',
        title: '调研极端风浪事件的定义与识别方法',
        status: 'doing',
        doneCriteria: '一页调研笔记：3 类定义 + 阈值方法对比',
        owner: null,
        milestone: '选题确认与文献调研',
        updatedAt: '2026-09-25T10:12:00+08:00',
      },
      {
        taskId: 'tsk_todo',
        title: '跑通 ERA5 与浮标数据的下载链路',
        status: 'todo',
        doneCriteria: null,
        owner: null,
        milestone: '数据获取与预处理',
        updatedAt: '2026-09-24T20:40:00+08:00',
      },
      {
        taskId: 'tsk_done',
        title: '确定研究海域与时间范围',
        status: 'done',
        doneCriteria: null,
        owner: null,
        milestone: '选题确认与文献调研',
        updatedAt: '2026-09-23T15:02:00+08:00',
      },
    ],
    evidence: [
      {
        evidenceId: 'evd_1',
        submissionId: '1b7c9e40-6c2f-4f18-8d5a-0e2b7c4a9f31',
        taskId: 'tsk_doing',
        didWhat: '查了 6 篇关于极端风浪事件定义与阈值方法的文献',
        foundWhat: '多数研究用有效波高第 95 或 99 百分位做阈值',
        stillUnsure: 'ERA5 海浪场分辨率与公里级判断的差距怎么处理',
        author: null,
        createdAt: '2026-09-25T10:05:00+08:00',
      },
    ],
    doubts: [
      {
        doubtId: 'dbt_1',
        text: 'ERA5 海浪场分辨率与需求方要的公里级判断存在数量级差距',
        status: 'open',
        sourceEvidenceId: 'evd_1',
        createdAt: '2026-09-25T10:05:00+08:00',
      },
    ],
    promptVersion: 'mvp-prompt-v1',
    forceRefresh: false,
    ...overrides,
  }
}

interface RunningApp {
  baseUrl: string
  stop: () => Promise<void>
}

async function startApp(app: Server): Promise<RunningApp> {
  await new Promise<void>((resolve) => {
    app.listen(0, '127.0.0.1', resolve)
  })
  const address = app.address() as AddressInfo
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        app.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}

/** 用指定的 provider 起一个独立的服务，用于测试各种失败与非法输出 */
async function withProvider(
  provider: AdvisorProvider,
  options: { timeoutMs?: number } = {},
): Promise<RunningApp> {
  return startApp(
    createApp(testConfig, {
      logger: silentLogger,
      advisorService: createAdvisorService({
        provider,
        fallback: createRuleFallback(),
        logger: silentLogger,
        timeoutMs: options.timeoutMs,
      }),
    }),
  )
}

async function post(baseUrl: string, body: unknown, init: RequestInit = {}): Promise<Response> {
  return fetch(`${baseUrl}${PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  })
}

let app: RunningApp

before(async () => {
  // 运行时默认 provider 已改为真实模型（openai-compatible）。
  // 本文件走真实 HTTP，必须显式注入 mock provider 才能离线、确定性地断言，
  // 否则在未配置模型的机器上所有成功路径都会变成 fallback。
  app = await startApp(
    createApp(testConfig, {
      logger: silentLogger,
      advisorService: createAdvisorService({
        provider: createMockProvider(),
        fallback: createRuleFallback(),
        logger: silentLogger,
      }),
    }),
  )
})

after(async () => {
  await app.stop()
})

/* ------------------------------------------------ 1-3 正常路径 */

test('合法请求返回 200，source 为 model', async () => {
  const response = await post(app.baseUrl, validBody())
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.equal(body.source, 'model')
  assert.equal(body.fallbackReason, null)
  assert.equal(body.cached, false)
  assert.equal(body.requestId, '9c1f0a6b-2c4d-4e77-9a3f-7b5e8d1c2043')
  assert.equal(body.projectId, 'prj_3f7a91d24c8b4e0a9d5f1b7c2e6a8031')
  assert.equal(body.projectRevision, 12)
  assert.equal(body.promptVersion, 'mvp-prompt-v1')
  assert.equal(body.contractVersion, '1.0')
  assert.deepEqual(Object.keys(body).sort(), SUCCESS_KEYS)
})

test('建议字段完整，且最多 3 条', async () => {
  const response = await post(app.baseUrl, validBody())
  const body = (await response.json()) as { suggestions: Array<Record<string, unknown>> }

  assert.ok(body.suggestions.length >= 1 && body.suggestions.length <= 3)

  const suggestionKeys = [
    'basisDoubtIds',
    'basisEvidenceIds',
    'doneCriteria',
    'existingTaskId',
    'title',
    'whyNow',
  ]
  const taskIds = new Set(['tsk_doing', 'tsk_todo', 'tsk_done'])
  const evidenceIds = new Set(['evd_1'])
  const doubtIds = new Set(['dbt_1'])

  for (const suggestion of body.suggestions) {
    assert.deepEqual(Object.keys(suggestion).sort(), suggestionKeys)
    assert.equal(typeof suggestion.title, 'string')
    assert.ok((suggestion.title as string).trim().length > 0)
    assert.ok((suggestion.whyNow as string).trim().length > 0)
    assert.ok((suggestion.doneCriteria as string).trim().length > 0)

    const existingTaskId = suggestion.existingTaskId
    assert.ok(existingTaskId === null || taskIds.has(existingTaskId as string))
    // 已完成任务不得出现在建议里
    assert.notEqual(existingTaskId, 'tsk_done')

    for (const id of suggestion.basisEvidenceIds as string[]) assert.ok(evidenceIds.has(id))
    for (const id of suggestion.basisDoubtIds as string[]) assert.ok(doubtIds.has(id))
  }
})

test('相同请求返回稳定结果（mock provider 是确定性的）', async () => {
  const first = await post(app.baseUrl, validBody())
  const second = await post(app.baseUrl, validBody())
  assert.deepEqual(await first.json(), await second.json())
})

/* ------------------------------------------------ 4-8 请求校验 */

test('非法 JSON 返回 400，且 requestId 为 null', async () => {
  const response = await post(app.baseUrl, '{ "contractVersion": "1.0", ')
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(body.code, 'INVALID_INPUT')
  assert.equal(body.requestId, null)
  assert.equal(body.retryable, false)
  assert.equal(body.retryAfterSeconds, null)
  assert.equal(body.contractVersion, '1.0')
  assert.deepEqual(Object.keys(body).sort(), FAILURE_KEYS)
})

test('缺少必填字段返回 400，并回显 requestId', async () => {
  const body = validBody()
  delete body.projectName

  const response = await post(app.baseUrl, body)
  const result = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(result.code, 'INVALID_INPUT')
  assert.equal(result.requestId, '9c1f0a6b-2c4d-4e77-9a3f-7b5e8d1c2043')
})

test('缺少 requestId 时错误响应的 requestId 为 null', async () => {
  const body = validBody()
  delete body.requestId

  const response = await post(app.baseUrl, body)
  const result = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(result.requestId, null)
})

test('contractVersion 不是 1.0 时被拒绝', async () => {
  const response = await post(app.baseUrl, validBody({ contractVersion: '2.0' }))
  const result = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(result.code, 'INVALID_INPUT')
})

test('promptVersion 不受支持时被拒绝', async () => {
  const response = await post(app.baseUrl, validBody({ promptVersion: 'mvp-prompt-v9' }))
  const result = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(result.code, 'INVALID_INPUT')
})

test('projectRevision 类型不正确时被拒绝', async () => {
  const response = await post(app.baseUrl, validBody({ projectRevision: '12' }))
  assert.equal(response.status, 400)
})

test('tasks 超过契约上限时被拒绝', async () => {
  const manyTasks = Array.from({ length: 101 }, (_item, index) => ({
    taskId: `tsk_${index}`,
    title: `任务 ${index}`,
    status: 'todo',
    doneCriteria: null,
    owner: null,
    milestone: null,
    updatedAt: '2026-09-25T10:00:00+08:00',
  }))

  const response = await post(app.baseUrl, validBody({ tasks: manyTasks }))
  assert.equal(response.status, 400)
})

test('未知字段被忽略，不影响正常返回', async () => {
  const response = await post(
    app.baseUrl,
    validBody({ materialUnderstanding: { anything: true }, qaTurn: 'ignored' }),
  )

  assert.equal(response.status, 200)
})

test('请求体超过 256 KB 时返回 400', async () => {
  const response = await post(app.baseUrl, validBody({ padding: 'x'.repeat(300 * 1024) }))
  const result = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(result.code, 'INVALID_INPUT')
  assert.equal(result.requestId, null)
})

test('Content-Type 不是 application/json 时返回 400', async () => {
  const response = await fetch(`${app.baseUrl}${PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify(validBody()),
  })

  assert.equal(response.status, 400)
  const result = (await response.json()) as Record<string, unknown>
  assert.equal(result.code, 'INVALID_INPUT')
})

test('单条文本超过长度上限时被拒绝', async () => {
  const response = await post(app.baseUrl, validBody({ projectName: 'x'.repeat(121) }))
  assert.equal(response.status, 400)
})

/* ------------------------------------------------ 9-10 引用与任务状态清理 */

test('未知 evidenceId / doubtId 被剔除，建议本身保留', async () => {
  const provider: AdvisorProvider = {
    name: 'stub-unknown-refs',
    async generate() {
      return {
        suggestions: [
          {
            title: '保留这条建议',
            whyNow: '依据里混入了不存在的引用，应该只剔除引用本身。',
            doneCriteria: '完成即可',
            existingTaskId: 'tsk_doing',
            basisEvidenceIds: ['evd_1', 'evd_not_in_request'],
            basisDoubtIds: ['dbt_not_in_request'],
          },
        ],
      }
    },
  }

  const running = await withProvider(provider)
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as {
      suggestions: Array<{ basisEvidenceIds: string[]; basisDoubtIds: string[] }>
    }

    assert.equal(response.status, 200)
    assert.equal(body.suggestions.length, 1)
    assert.deepEqual(body.suggestions[0].basisEvidenceIds, ['evd_1'])
    assert.deepEqual(body.suggestions[0].basisDoubtIds, [])
  } finally {
    await running.stop()
  }
})

test('指向已完成任务的建议被剔除，其余保留', async () => {
  const provider: AdvisorProvider = {
    name: 'stub-done-task',
    async generate() {
      return {
        suggestions: [
          {
            title: '指向已完成任务，应被剔除',
            whyNow: '这条必须消失。',
            doneCriteria: '不适用',
            existingTaskId: 'tsk_done',
            basisEvidenceIds: [],
            basisDoubtIds: [],
          },
          {
            title: '这条应保留',
            whyNow: '它指向一个进行中的任务。',
            doneCriteria: '完成即可',
            existingTaskId: 'tsk_doing',
            basisEvidenceIds: [],
            basisDoubtIds: [],
          },
        ],
      }
    },
  }

  const running = await withProvider(provider)
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as {
      source: string
      suggestions: Array<{ title: string; existingTaskId: string | null }>
    }

    assert.equal(response.status, 200)
    assert.equal(body.source, 'model')
    assert.equal(body.suggestions.length, 1)
    assert.equal(body.suggestions[0].title, '这条应保留')
    assert.equal(body.suggestions[0].existingTaskId, 'tsk_doing')
  } finally {
    await running.stop()
  }
})

test('存在的 existingTaskId 被降级为新候选当且仅当它不在请求里', async () => {
  const provider: AdvisorProvider = {
    name: 'stub-unknown-task',
    async generate() {
      return {
        suggestions: [
          {
            title: '任务 ID 不在请求中',
            whyNow: '应降级为 null，而不是整条丢弃。',
            doneCriteria: '完成即可',
            existingTaskId: 'tsk_not_in_request',
            basisEvidenceIds: [],
            basisDoubtIds: [],
          },
        ],
      }
    },
  }

  const running = await withProvider(provider)
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as {
      source: string
      suggestions: Array<{ existingTaskId: string | null }>
    }

    assert.equal(response.status, 200)
    assert.equal(body.source, 'model')
    assert.equal(body.suggestions[0].existingTaskId, null)
  } finally {
    await running.stop()
  }
})

/* ------------------------------------------------ 11 模型输出非法 → 兜底 */

test('模型输出全被清理后，整份判非法并进入 fallback', async () => {
  const provider: AdvisorProvider = {
    name: 'stub-all-dropped',
    async generate() {
      return {
        suggestions: [
          {
            title: '指向已完成任务',
            whyNow: '会被丢弃。',
            doneCriteria: '不适用',
            existingTaskId: 'tsk_done',
            basisEvidenceIds: [],
            basisDoubtIds: [],
          },
        ],
      }
    },
  }

  const running = await withProvider(provider)
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as Record<string, unknown>

    assert.equal(response.status, 200)
    assert.equal(body.source, 'fallback')
    assert.equal(body.fallbackReason, 'INVALID_MODEL_OUTPUT')
    assert.ok((body.suggestions as unknown[]).length >= 1)
  } finally {
    await running.stop()
  }
})

test('建议超过 3 条时整份判非法并进入 fallback', async () => {
  const provider: AdvisorProvider = {
    name: 'stub-too-many',
    async generate() {
      return {
        suggestions: Array.from({ length: 4 }, (_item, index) => ({
          title: `建议 ${index}`,
          whyNow: '超过上限。',
          doneCriteria: '完成即可',
          existingTaskId: null,
          basisEvidenceIds: [],
          basisDoubtIds: [],
        })),
      }
    },
  }

  const running = await withProvider(provider)
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as Record<string, unknown>

    assert.equal(response.status, 200)
    assert.equal(body.source, 'fallback')
    assert.equal(body.fallbackReason, 'INVALID_MODEL_OUTPUT')
  } finally {
    await running.stop()
  }
})

/* ------------------------------------------------ 11-12 provider 失败 */

test('provider 抛错时改用规则兜底，仍返回 200 与合法建议', async () => {
  const running = await withProvider(createMockProvider({ mode: 'throw' }))
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as Record<string, unknown>

    assert.equal(response.status, 200)
    assert.equal(body.source, 'fallback')
    assert.equal(body.fallbackReason, 'MODEL_UNAVAILABLE')
    const suggestions = body.suggestions as Array<Record<string, unknown>>
    assert.ok(suggestions.length >= 1 && suggestions.length <= 3)
    assert.ok((suggestions[0].title as string).trim().length > 0)
  } finally {
    await running.stop()
  }
})

test('provider 未配置密钥时改用规则兜底，fallbackReason 为 MODEL_NOT_CONFIGURED', async () => {
  const running = await withProvider(createMockProvider({ mode: 'not-configured' }))
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as Record<string, unknown>

    assert.equal(response.status, 200)
    assert.equal(body.source, 'fallback')
    assert.equal(body.fallbackReason, 'MODEL_NOT_CONFIGURED')
  } finally {
    await running.stop()
  }
})

test('provider 超时时改用规则兜底，fallbackReason 为 MODEL_TIMEOUT', async () => {
  const running = await withProvider(createMockProvider({ mode: 'slow', delayMs: 300 }), {
    timeoutMs: 30,
  })
  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as Record<string, unknown>

    assert.equal(response.status, 200)
    assert.equal(body.source, 'fallback')
    assert.equal(body.fallbackReason, 'MODEL_TIMEOUT')
  } finally {
    await running.stop()
  }
})

/* ------------------------------------------------ 12 兜底也失败 → 最终错误码 */

test('兜底也失败时返回契约规定的最终错误码', async () => {
  const running = await startApp(
    createApp(testConfig, {
      logger: silentLogger,
      advisorService: createAdvisorService({
        provider: createMockProvider({ mode: 'throw' }),
        fallback: () => {
          throw new Error('兜底故意失败')
        },
        logger: silentLogger,
      }),
    }),
  )

  try {
    const response = await post(running.baseUrl, validBody())
    const body = (await response.json()) as Record<string, unknown>

    assert.equal(response.status, 503)
    assert.equal(body.code, 'MODEL_UNAVAILABLE')
    assert.equal(body.retryable, true)
    assert.equal(body.retryAfterSeconds, null)
    assert.equal(body.requestId, '9c1f0a6b-2c4d-4e77-9a3f-7b5e8d1c2043')
    assert.deepEqual(Object.keys(body).sort(), FAILURE_KEYS)
  } finally {
    await running.stop()
  }
})

/* ------------------------------------------------ 13 错误响应不泄露内部信息 */

test('错误响应不泄露密钥、环境变量、堆栈或绝对路径', async () => {
  const responses = [
    await post(app.baseUrl, '{ not json'),
    await post(app.baseUrl, validBody({ contractVersion: '9.9' })),
    await post(app.baseUrl, validBody({ padding: 'x'.repeat(300 * 1024) })),
  ]

  for (const response of responses) {
    const text = await response.text()
    assert.doesNotMatch(text, /[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)/i)
    assert.doesNotMatch(text, /[A-Za-z]:[\\/]/)
    assert.doesNotMatch(text, /node_modules/)
    assert.doesNotMatch(text, /\bat .+:\d+:\d+/) // 堆栈帧
    assert.doesNotMatch(text, /process\.env/)
  }
})

/* ------------------------------------------------ 路由行为 */

test('GET /api/advisor/recommendations 返回 405 并给出 allow', async () => {
  const response = await fetch(`${app.baseUrl}${PATH}`)
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'POST')
})

test('GET /health 仍然可用', async () => {
  const response = await fetch(`${app.baseUrl}/health`)
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
  assert.equal(body.service, 'course-platform-api')
})

test('未知路径仍然返回 404', async () => {
  const response = await fetch(`${app.baseUrl}/api/unknown`)
  assert.equal(response.status, 404)
})
