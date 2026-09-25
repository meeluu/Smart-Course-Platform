import type { AdvisorFallbackReason, AdvisorRequest, ProviderOutput, Suggestion } from './types.js'

/**
 * 服务端规则兜底
 * ----------------------------------------------------------------------------
 * 模型超时、上游故障、未配置密钥或输出非法时，服务端用这里生成建议，
 * 对外仍是 HTTP 200 + source: "fallback"（契约 4.4 / 5.1）。
 *
 * 两条硬约束：
 *   1. 完全确定性：只依赖请求内容，不读时间、不读随机数、不读环境变量；
 *   2. 至少要能在正常项目状态下产出 1 条合法建议（引用的 ID 必须来自本次请求）。
 *
 * 兜底结果同样要经过 normalizeSuggestions 校验——兜底不是"免检通道"。
 */

export type FallbackGenerator = (request: AdvisorRequest, reason: AdvisorFallbackReason) => ProviderOutput

export function createRuleFallback(): FallbackGenerator {
  return (request: AdvisorRequest) => ({ suggestions: buildRuleSuggestions(request) })
}

/**
 * 规则优先级：先把已有投入收尾 → 处理未解决疑问 → 启动未开始的任务 → 推进当前里程碑 → 补证据。
 * 最多 3 条，与契约的建议数量上限一致。
 */
export function buildRuleSuggestions(request: AdvisorRequest): Suggestion[] {
  const doing = request.tasks.filter((task) => task.status === 'doing')
  const todo = request.tasks.filter((task) => task.status === 'todo')
  const openDoubts = request.doubts.filter((doubt) => doubt.status === 'open')
  const evidenceIds = new Set(request.evidence.map((item) => item.evidenceId))

  const results: Suggestion[] = []

  const doingTask = doing[0]
  if (doingTask !== undefined) {
    results.push({
      title: `先把进行中的任务收尾：${doingTask.title}`,
      whyNow: `该项目当前有 ${doing.length} 个进行中的任务，这是其中之一；先把它收尾，后面的判断才有稳定的前提。`,
      doneCriteria: doingTask.doneCriteria ?? '补齐完成标志里要求的内容，并提交证据',
      existingTaskId: doingTask.taskId,
      basisEvidenceIds: request.evidence[0] === undefined ? [] : [request.evidence[0].evidenceId],
      basisDoubtIds: [],
    })
  }

  const doubt = openDoubts[0]
  if (doubt !== undefined && results.length < 3) {
    const sourceEvidenceId =
      doubt.sourceEvidenceId !== null && evidenceIds.has(doubt.sourceEvidenceId)
        ? doubt.sourceEvidenceId
        : null
    results.push({
      title: '处理未解决疑问：先给它一个结论',
      whyNow: `项目里还有 ${openDoubts.length} 条未解决的疑问，它会直接影响后续步骤的判断。`,
      doneCriteria: '写清结论，并在疑问上标记已解决',
      existingTaskId: null,
      basisEvidenceIds: sourceEvidenceId === null ? [] : [sourceEvidenceId],
      basisDoubtIds: [doubt.doubtId],
    })
  }

  const todoTask = todo[0]
  if (todoTask !== undefined && results.length < 3) {
    results.push({
      title: `启动下一个任务：${todoTask.title}`,
      whyNow: '当前里程碑里还有未开始的任务，它是这条线上最先要做的事。',
      doneCriteria: todoTask.doneCriteria ?? '完成这一步，并提交一条证据',
      existingTaskId: todoTask.taskId,
      basisEvidenceIds: [],
      basisDoubtIds: [],
    })
  }

  if (results.length === 0 && request.currentMilestone !== null) {
    results.push({
      title: `推进当前里程碑：${request.currentMilestone}`,
      whyNow: '项目里暂时没有任务与疑问可供判断，先把当前里程碑的下一步写下来，形成第一条可追踪的任务。',
      doneCriteria: '写下一条具体任务，并说明完成时会留下什么',
      existingTaskId: null,
      basisEvidenceIds: [],
      basisDoubtIds: [],
    })
  }

  if (results.length === 0) {
    results.push({
      title: '先给项目补一条证据',
      whyNow: '目前没有任何任务或疑问，也没有记录当前里程碑；先写下刚做完的事和结论，后续建议才有依据。',
      doneCriteria: '提交一条包含「完成了什么」和「发现了什么」的证据',
      existingTaskId: null,
      basisEvidenceIds: [],
      basisDoubtIds: [],
    })
  }

  return results.slice(0, 3)
}
