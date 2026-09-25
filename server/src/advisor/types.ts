/**
 * 建议接口的领域类型
 * ----------------------------------------------------------------------------
 * 这些类型与 HTTP 无关：路由层、校验层、provider 层、兜底层都只通过这些类型通信。
 * 因此把 mock provider 换成真实大模型 provider 时，前端接口契约（docs/contracts.md）不需要任何改动。
 */

/** 契约版本：与 docs/contracts.md 第 8.1 节一致 */
export const CONTRACT_VERSION = '1.0'

/** 服务端支持的提示词版本（契约 4.1）：不在列表内的请求直接拒绝，不做静默降级 */
export const SUPPORTED_PROMPT_VERSIONS: readonly string[] = ['mvp-prompt-v1']

export type TaskStatus = 'todo' | 'doing' | 'done'
export type DoubtStatus = 'open' | 'resolved'

/* ------------------------------------------------------------------ 请求侧 */

export interface TaskSnapshot {
  taskId: string
  title: string
  status: TaskStatus
  doneCriteria: string | null
  owner: string | null
  milestone: string | null
  updatedAt: string
}

export interface EvidenceSnapshot {
  evidenceId: string
  submissionId: string
  taskId: string | null
  didWhat: string
  foundWhat: string | null
  stillUnsure: string | null
  author: string | null
  createdAt: string
}

export interface DoubtSnapshot {
  doubtId: string
  text: string
  status: DoubtStatus
  sourceEvidenceId: string | null
  createdAt: string
}

/** 通过校验之后的请求，各层只消费这个结构 */
export interface AdvisorRequest {
  requestId: string
  projectId: string
  projectRevision: number
  projectName: string
  currentMilestone: string | null
  confirmedContext: string[]
  tasks: TaskSnapshot[]
  evidence: EvidenceSnapshot[]
  doubts: DoubtSnapshot[]
  promptVersion: string
  forceRefresh: boolean
}

/* ------------------------------------------------------------------ 输出侧 */

/** 一条建议的线格式（契约 2.5a）。字段名必须与契约一致 */
export interface Suggestion {
  title: string
  whyNow: string
  doneCriteria: string
  /** null 表示"新任务候选" */
  existingTaskId: string | null
  basisEvidenceIds: string[]
  basisDoubtIds: string[]
}

export type AdvisorSource = 'model' | 'fallback'

export type AdvisorErrorCode =
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'MODEL_TIMEOUT'
  | 'INVALID_MODEL_OUTPUT'
  | 'MODEL_UNAVAILABLE'
  | 'MODEL_NOT_CONFIGURED'
  | 'INTERNAL'

/** 兜底原因：能进入 fallback 的原因集合（INVALID_INPUT 在进入服务前就被拒了） */
export type AdvisorFallbackReason = Exclude<AdvisorErrorCode, 'INVALID_INPUT' | 'INTERNAL'>

/** 运行期错误码：服务层可能返回给路由层、并映射成 HTTP 状态码的集合 */
export type AdvisorRuntimeErrorCode = Exclude<AdvisorErrorCode, 'INVALID_INPUT'>

/** 成功响应体（契约 4.3 / 4.4） */
export interface AdvisorSuccessResponse {
  contractVersion: string
  requestId: string
  projectId: string
  projectRevision: number
  source: AdvisorSource
  fallbackReason: AdvisorFallbackReason | null
  cached: boolean
  promptVersion: string
  suggestions: Suggestion[]
}

/** 失败响应体（契约 4.5） */
export interface AdvisorFailureResponse {
  contractVersion: string
  requestId: string | null
  code: AdvisorErrorCode
  message: string
  retryable: boolean
  retryAfterSeconds: number | null
}

/* ------------------------------------------------------------ 模型端点配置 */

/** provider 选型。默认是真实模型；mock 仅用于本地联调与离线测试注入 */
export type AdvisorProviderKind = 'openai-compatible' | 'mock'

/**
 * 一次模型调用的端点配置。
 * `url` 必须是**完整请求地址**（例如 https://host/v1/chat/completions）：
 * provider 不会拼接任何路径，也不会补 /v1 之类的后缀。
 */
export interface ModelEndpoint {
  url: string
  /** 只从环境变量读取，不落盘、不进日志、不进响应 */
  apiKey: string
  model: string
  timeoutMs: number
}

/** 与 fetch 同形，便于测试注入（单元测试禁止访问真实网络） */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

/* ---------------------------------------------------------------- provider */

/**
 * provider 的原始输出。
 * 故意用 unknown：真实模型返回的就是一段需要校验的 JSON，
 * 校验层（validation.ts）必须能处理任何形状，而不是相信 provider 的类型声明。
 */
export interface ProviderOutput {
  suggestions: unknown
}

/**
 * 建议生成器。mock provider 与将来的真实模型 provider 实现同一个接口。
 * 允许抛错与耗时过长，由服务层负责超时与兜底。
 */
export interface AdvisorProvider {
  readonly name: string
  generate(request: AdvisorRequest): Promise<ProviderOutput>
}

/**
 * provider 主动声明的失败原因。
 * 例如真实 provider 发现没有读取到密钥时，应抛 reason 为 MODEL_NOT_CONFIGURED 的错误，
 * 这样服务层能区分"重试也不会好"与"上游暂时故障"。
 */
export class AdvisorProviderError extends Error {
  readonly reason: AdvisorFallbackReason

  constructor(message: string, reason: AdvisorFallbackReason) {
    super(message)
    this.name = 'AdvisorProviderError'
    this.reason = reason
  }
}

/* ------------------------------------------------------------------ 日志 */

export interface AdvisorLogger {
  warn(message: string, detail?: Record<string, unknown>): void
}

export function createConsoleLogger(prefix = 'advisor'): AdvisorLogger {
  return {
    warn(message, detail) {
      if (detail === undefined) console.warn(`[${prefix}] ${message}`)
      else console.warn(`[${prefix}] ${message}`, detail)
    },
  }
}

/** 测试与不需要日志的场合使用 */
export const silentLogger: AdvisorLogger = { warn() {} }
