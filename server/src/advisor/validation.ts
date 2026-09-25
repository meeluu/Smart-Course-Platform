import {
  CONTRACT_VERSION,
  SUPPORTED_PROMPT_VERSIONS,
  type AdvisorRequest,
  type DoubtSnapshot,
  type DoubtStatus,
  type EvidenceSnapshot,
  type Suggestion,
  type TaskSnapshot,
  type TaskStatus,
} from './types.js'

/**
 * 请求校验与输出校验
 * ----------------------------------------------------------------------------
 * 两层职责分开：
 *   1. parseAdvisorRequest —— 校验客户端发来的请求（契约 4.1 / 4.6），不做任何默认值补全；
 *   2. normalizeSuggestions —— 校验 provider 返回的建议（契约 4.6），
 *      能修的就修（截断、剔除未知引用），不能修的就丢弃整条，全丢了就判整份非法。
 *
 * 这里不判断"某条建议该不该现在做"，也不生成或保存任何 ID。
 */

/** 契约 4.1 里的各项上限。集中放在这里，测试与文档都以它为准 */
export const LIMITS = {
  /** 请求体上限：256 KB */
  bodyBytes: 256 * 1024,
  tasks: 100,
  evidence: 30,
  doubts: 30,
  confirmedContext: 10,
  confirmedContextLength: 200,
  projectIdLength: 64,
  idLength: 64,
  projectNameLength: 120,
  milestoneLength: 60,
  taskTitleLength: 60,
  evidenceDidWhatLength: 300,
  doubtTextLength: 500,
  suggestionTitleLength: 60,
  suggestionWhyNowLength: 300,
  suggestionDoneCriteriaLength: 200,
  maxSuggestions: 3,
} as const

const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done']
const DOUBT_STATUSES: readonly DoubtStatus[] = ['open', 'resolved']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoTime(value: string): boolean {
  // 至少要长得像 ISO（带 T），并且能被 Date 解析
  return value.includes('T') && !Number.isNaN(Date.parse(value))
}

/* ----------------------------------------------------------- 请求：字段读取 */

/**
 * 读取必填字符串。缺失、类型不对、超长都会记入 issues 并返回 undefined。
 * 任何情况下都不补默认值——"缺少必填字段不能静默补默认值"。
 */
function readRequiredString(
  source: Record<string, unknown>,
  key: string,
  maxLength: number,
  issues: string[],
  path = key,
): string | undefined {
  const value = source[key]
  if (value === undefined) {
    issues.push(`${path} 缺失`)
    return undefined
  }
  if (typeof value !== 'string') {
    issues.push(`${path} 必须是字符串`)
    return undefined
  }
  const trimmed = value.trim()
  if (trimmed === '') {
    issues.push(`${path} 不能为空`)
    return undefined
  }
  if (trimmed.length > maxLength) {
    issues.push(`${path} 超过长度上限 ${maxLength}`)
    return undefined
  }
  return trimmed
}

/** 读取必填的 string | null 字段 */
function readNullableString(
  source: Record<string, unknown>,
  key: string,
  maxLength: number,
  issues: string[],
  path = key,
): string | null | undefined {
  const value = source[key]
  if (value === undefined) {
    issues.push(`${path} 缺失`)
    return undefined
  }
  if (value === null) return null
  if (typeof value !== 'string') {
    issues.push(`${path} 必须是字符串或 null`)
    return undefined
  }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    issues.push(`${path} 超过长度上限 ${maxLength}`)
    return undefined
  }
  return trimmed === '' ? null : trimmed
}

/** 读取必填的字符串数组 */
function readStringArray(
  source: Record<string, unknown>,
  key: string,
  maxItems: number,
  maxItemLength: number,
  issues: string[],
  path = key,
): string[] | undefined {
  const value = source[key]
  if (value === undefined) {
    issues.push(`${path} 缺失`)
    return undefined
  }
  if (!Array.isArray(value)) {
    issues.push(`${path} 必须是数组`)
    return undefined
  }
  if (value.length > maxItems) {
    issues.push(`${path} 最多 ${maxItems} 条`)
    return undefined
  }
  const result: string[] = []
  value.forEach((item, index) => {
    if (typeof item !== 'string') {
      issues.push(`${path}[${index}] 必须是字符串`)
      return
    }
    const trimmed = item.trim()
    if (trimmed === '') {
      issues.push(`${path}[${index}] 不能为空`)
      return
    }
    if (trimmed.length > maxItemLength) {
      issues.push(`${path}[${index}] 超过长度上限 ${maxItemLength}`)
      return
    }
    result.push(trimmed)
  })
  return result
}

/* --------------------------------------------------------- 请求：快照解析 */

function parseTask(raw: unknown, index: number, issues: string[]): TaskSnapshot | undefined {
  const path = `tasks[${index}]`
  if (!isPlainObject(raw)) {
    issues.push(`${path} 必须是对象`)
    return undefined
  }
  const taskId = readRequiredString(raw, 'taskId', LIMITS.idLength, issues, `${path}.taskId`)
  const title = readRequiredString(raw, 'title', LIMITS.taskTitleLength, issues, `${path}.title`)
  const status = readRequiredString(raw, 'status', 16, issues, `${path}.status`)
  const doneCriteria = readNullableString(
    raw,
    'doneCriteria',
    LIMITS.suggestionDoneCriteriaLength,
    issues,
    `${path}.doneCriteria`,
  )
  const owner = readNullableString(raw, 'owner', LIMITS.idLength, issues, `${path}.owner`)
  const milestone = readNullableString(raw, 'milestone', LIMITS.milestoneLength, issues, `${path}.milestone`)
  const updatedAt = readRequiredString(raw, 'updatedAt', 40, issues, `${path}.updatedAt`)

  if (status !== undefined && !TASK_STATUSES.includes(status as TaskStatus)) {
    issues.push(`${path}.status 必须是 ${TASK_STATUSES.join(' / ')} 之一`)
    return undefined
  }
  if (updatedAt !== undefined && !isIsoTime(updatedAt)) {
    issues.push(`${path}.updatedAt 必须是 ISO 8601 时间`)
    return undefined
  }
  if (
    taskId === undefined ||
    title === undefined ||
    status === undefined ||
    doneCriteria === undefined ||
    owner === undefined ||
    milestone === undefined ||
    updatedAt === undefined
  ) {
    return undefined
  }

  return {
    taskId,
    title,
    status: status as TaskStatus,
    doneCriteria,
    owner,
    milestone,
    updatedAt,
  }
}

function parseEvidence(raw: unknown, index: number, issues: string[]): EvidenceSnapshot | undefined {
  const path = `evidence[${index}]`
  if (!isPlainObject(raw)) {
    issues.push(`${path} 必须是对象`)
    return undefined
  }
  const evidenceId = readRequiredString(raw, 'evidenceId', LIMITS.idLength, issues, `${path}.evidenceId`)
  const submissionId = readRequiredString(raw, 'submissionId', LIMITS.idLength, issues, `${path}.submissionId`)
  const taskId = readNullableString(raw, 'taskId', LIMITS.idLength, issues, `${path}.taskId`)
  const didWhat = readRequiredString(
    raw,
    'didWhat',
    LIMITS.evidenceDidWhatLength,
    issues,
    `${path}.didWhat`,
  )
  const foundWhat = readNullableString(raw, 'foundWhat', 1000, issues, `${path}.foundWhat`)
  const stillUnsure = readNullableString(raw, 'stillUnsure', 1000, issues, `${path}.stillUnsure`)
  const author = readNullableString(raw, 'author', LIMITS.idLength, issues, `${path}.author`)
  const createdAt = readRequiredString(raw, 'createdAt', 40, issues, `${path}.createdAt`)

  if (createdAt !== undefined && !isIsoTime(createdAt)) {
    issues.push(`${path}.createdAt 必须是 ISO 8601 时间`)
    return undefined
  }
  if (
    evidenceId === undefined ||
    submissionId === undefined ||
    taskId === undefined ||
    didWhat === undefined ||
    foundWhat === undefined ||
    stillUnsure === undefined ||
    author === undefined ||
    createdAt === undefined
  ) {
    return undefined
  }

  return { evidenceId, submissionId, taskId, didWhat, foundWhat, stillUnsure, author, createdAt }
}

function parseDoubt(raw: unknown, index: number, issues: string[]): DoubtSnapshot | undefined {
  const path = `doubts[${index}]`
  if (!isPlainObject(raw)) {
    issues.push(`${path} 必须是对象`)
    return undefined
  }
  const doubtId = readRequiredString(raw, 'doubtId', LIMITS.idLength, issues, `${path}.doubtId`)
  const text = readRequiredString(raw, 'text', LIMITS.doubtTextLength, issues, `${path}.text`)
  const status = readRequiredString(raw, 'status', 16, issues, `${path}.status`)
  const sourceEvidenceId = readNullableString(
    raw,
    'sourceEvidenceId',
    LIMITS.idLength,
    issues,
    `${path}.sourceEvidenceId`,
  )
  const createdAt = readRequiredString(raw, 'createdAt', 40, issues, `${path}.createdAt`)

  if (status !== undefined && !DOUBT_STATUSES.includes(status as DoubtStatus)) {
    issues.push(`${path}.status 必须是 ${DOUBT_STATUSES.join(' / ')} 之一`)
    return undefined
  }
  if (createdAt !== undefined && !isIsoTime(createdAt)) {
    issues.push(`${path}.createdAt 必须是 ISO 8601 时间`)
    return undefined
  }
  if (
    doubtId === undefined ||
    text === undefined ||
    status === undefined ||
    sourceEvidenceId === undefined ||
    createdAt === undefined
  ) {
    return undefined
  }

  return { doubtId, text, status: status as DoubtStatus, sourceEvidenceId, createdAt }
}

/* ------------------------------------------------------------- 请求：入口 */

export interface ParseSuccess {
  ok: true
  value: AdvisorRequest
}

export interface ParseFailure {
  ok: false
  /** 能取到就回显，取不到就是 null（契约 4.5） */
  requestId: string | null
  issues: string[]
}

export type ParseResult = ParseSuccess | ParseFailure

/**
 * 从原始请求体里尽量取出 requestId，用于失败响应回显（契约 4.5）。
 * 只在它是"短的可打印字符串"时才回显，避免把任意内容原样反射回去。
 */
export function extractRequestId(body: unknown): string | null {
  if (!isPlainObject(body)) return null
  const value = body.requestId
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.length > LIMITS.idLength) return null
  if (!/^[\x21-\x7e]+$/.test(trimmed)) return null
  return trimmed
}

/** 校验请求体。未知字段一律忽略（契约 8.4） */
export function parseAdvisorRequest(body: unknown): ParseResult {
  if (!isPlainObject(body)) {
    return { ok: false, requestId: null, issues: ['请求体必须是一个 JSON 对象'] }
  }

  const requestId = extractRequestId(body)
  const issues: string[] = []

  const contractVersion = readRequiredString(body, 'contractVersion', LIMITS.idLength, issues)
  if (contractVersion !== undefined && contractVersion !== CONTRACT_VERSION) {
    issues.push(`contractVersion 必须是 "${CONTRACT_VERSION}"`)
  }

  const promptVersion = readRequiredString(body, 'promptVersion', LIMITS.idLength, issues)
  if (promptVersion !== undefined && !SUPPORTED_PROMPT_VERSIONS.includes(promptVersion)) {
    issues.push(`promptVersion 不受支持，当前支持：${SUPPORTED_PROMPT_VERSIONS.join(', ')}`)
  }

  if (requestId === null) {
    issues.push('requestId 缺失或不是合法字符串')
  }

  const projectId = readRequiredString(body, 'projectId', LIMITS.projectIdLength, issues)
  const projectName = readRequiredString(body, 'projectName', LIMITS.projectNameLength, issues)
  const currentMilestone = readNullableString(
    body,
    'currentMilestone',
    LIMITS.milestoneLength,
    issues,
  )
  const confirmedContext = readStringArray(
    body,
    'confirmedContext',
    LIMITS.confirmedContext,
    LIMITS.confirmedContextLength,
    issues,
  )

  // projectRevision：必须是 ≥ 1 的整数
  let projectRevision: number | undefined
  const rawRevision = body.projectRevision
  if (rawRevision === undefined) {
    issues.push('projectRevision 缺失')
  } else if (typeof rawRevision !== 'number' || !Number.isInteger(rawRevision) || rawRevision < 1) {
    issues.push('projectRevision 必须是 ≥ 1 的整数')
  } else {
    projectRevision = rawRevision
  }

  // forceRefresh：必须是布尔
  let forceRefresh: boolean | undefined
  const rawForceRefresh = body.forceRefresh
  if (rawForceRefresh === undefined) {
    issues.push('forceRefresh 缺失')
  } else if (typeof rawForceRefresh !== 'boolean') {
    issues.push('forceRefresh 必须是布尔值')
  } else {
    forceRefresh = rawForceRefresh
  }

  const tasks = parseArray(body, 'tasks', LIMITS.tasks, issues, parseTask)
  const evidence = parseArray(body, 'evidence', LIMITS.evidence, issues, parseEvidence)
  const doubts = parseArray(body, 'doubts', LIMITS.doubts, issues, parseDoubt)

  if (issues.length > 0) return { ok: false, requestId, issues }

  return {
    ok: true,
    value: {
      requestId: requestId as string,
      projectId: projectId as string,
      projectRevision: projectRevision as number,
      projectName: projectName as string,
      currentMilestone: currentMilestone ?? null,
      confirmedContext: confirmedContext as string[],
      tasks: tasks as TaskSnapshot[],
      evidence: evidence as EvidenceSnapshot[],
      doubts: doubts as DoubtSnapshot[],
      promptVersion: promptVersion as string,
      forceRefresh: forceRefresh as boolean,
    },
  }
}

function parseArray<T>(
  body: Record<string, unknown>,
  key: string,
  maxItems: number,
  issues: string[],
  parseItem: (raw: unknown, index: number, issues: string[]) => T | undefined,
): T[] | undefined {
  const value = body[key]
  if (value === undefined) {
    issues.push(`${key} 缺失`)
    return undefined
  }
  if (!Array.isArray(value)) {
    issues.push(`${key} 必须是数组`)
    return undefined
  }
  if (value.length > maxItems) {
    issues.push(`${key} 最多 ${maxItems} 条`)
    return undefined
  }
  const parsed: T[] = []
  value.forEach((item, index) => {
    const result = parseItem(item, index, issues)
    if (result !== undefined) parsed.push(result)
  })
  return parsed
}

/* ------------------------------------------------------------- 输出：校验 */

export interface NormalizeSuccess {
  ok: true
  suggestions: Suggestion[]
  notes: string[]
}

export interface NormalizeFailure {
  ok: false
  notes: string[]
}

export type NormalizeResult = NormalizeSuccess | NormalizeFailure

/** 非空、trim、超长截断；为空或类型不对则返回 null（调用方据此丢弃整条） */
function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

function normalizeIdList(value: unknown, allowed: Set<string>, label: string, notes: string[]): string[] {
  if (!Array.isArray(value)) {
    // 契约只规定"数组必须存在"，未规定缺失时如何处理。
    // 依据缺失不影响建议本身可执行，所以按空数组处理并记日志，不丢弃整条建议。
    notes.push(`${label} 不是数组，按空数组处理`)
    return []
  }
  const seen = new Set<string>()
  const result: string[] = []
  value.forEach((item) => {
    if (typeof item !== 'string') {
      notes.push(`${label} 含非字符串项，已忽略`)
      return
    }
    const id = item.trim()
    if (id === '') return
    if (!allowed.has(id)) {
      notes.push(`${label} 引用了本次请求中不存在的 ID：${id}`)
      return
    }
    if (seen.has(id)) return
    seen.add(id)
    result.push(id)
  })
  return result
}

/**
 * 校验并清理 provider（或兜底层）返回的建议。
 * 规则见契约 4.6：能修就修，不能修就丢弃该条；清理后 0 条即整份非法。
 */
export function normalizeSuggestions(raw: unknown, request: AdvisorRequest): NormalizeResult {
  const notes: string[] = []
  const list = isPlainObject(raw) ? raw.suggestions : undefined

  if (!Array.isArray(list)) {
    notes.push('suggestions 不是数组')
    return { ok: false, notes }
  }
  if (list.length === 0 || list.length > LIMITS.maxSuggestions) {
    notes.push(`suggestions 数量 ${list.length} 不在 1-${LIMITS.maxSuggestions} 之间`)
    return { ok: false, notes }
  }

  const taskById = new Map(request.tasks.map((task) => [task.taskId, task]))
  const evidenceIds = new Set(request.evidence.map((item) => item.evidenceId))
  const doubtIds = new Set(request.doubts.map((item) => item.doubtId))

  const suggestions: Suggestion[] = []

  list.forEach((item, index) => {
    const label = `第 ${index + 1} 条建议`
    if (!isPlainObject(item)) {
      notes.push(`${label} 不是对象，已丢弃`)
      return
    }

    const title = normalizeText(item.title, LIMITS.suggestionTitleLength)
    const whyNow = normalizeText(item.whyNow, LIMITS.suggestionWhyNowLength)
    const doneCriteria = normalizeText(item.doneCriteria, LIMITS.suggestionDoneCriteriaLength)
    if (title === null || whyNow === null || doneCriteria === null) {
      notes.push(`${label} 的 title / whyNow / doneCriteria 有空值，已丢弃`)
      return
    }

    let existingTaskId: string | null = null
    const rawTaskId = item.existingTaskId
    if (typeof rawTaskId === 'string' && rawTaskId.trim() !== '') {
      const task = taskById.get(rawTaskId.trim())
      if (task === undefined) {
        notes.push(`${label} 的 existingTaskId 不在本次请求的任务中，已降级为新任务候选`)
      } else if (task.status === 'done') {
        notes.push(`${label} 指向已完成任务 ${task.taskId}，已丢弃`)
        return
      } else {
        existingTaskId = task.taskId
      }
    } else if (rawTaskId !== null && rawTaskId !== undefined) {
      notes.push(`${label} 的 existingTaskId 类型不合法，已降级为新任务候选`)
    }

    suggestions.push({
      title,
      whyNow,
      doneCriteria,
      existingTaskId,
      basisEvidenceIds: normalizeIdList(item.basisEvidenceIds, evidenceIds, `${label} basisEvidenceIds`, notes),
      basisDoubtIds: normalizeIdList(item.basisDoubtIds, doubtIds, `${label} basisDoubtIds`, notes),
    })
  })

  if (suggestions.length === 0) {
    notes.push('清理后没有剩余建议')
    return { ok: false, notes }
  }

  return { ok: true, suggestions, notes }
}
