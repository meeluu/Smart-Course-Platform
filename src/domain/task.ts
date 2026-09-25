import type { TaskSnapshot, TaskStatus } from '@/domain/recommendation'

/**
 * 任务领域模型
 * ----------------------------------------------------------------------------
 * 为什么需要这个文件：契约 3.2 的 `claimTask` 要能认领两类东西——
 *
 *   ① `{ taskId }`  认领**已有任务**。现在这类任务由 `project.steps` + 里程碑进度
 *      派生出来（见 domain/progress.ts 的兼容映射），没有独立记录。
 *   ② `{ draft }`   把建议里的**新任务候选**（`existingTaskId === null`）落成真实任务。
 *      它必须真的存在于项目状态里，否则下次请求建议时服务端还会再推荐一遍。
 *
 * 现有 `Project` 还是模板结构（`steps` 没有 id 也没有状态），本文件定义结构化的
 * `Task` 记录，由 store 按 projectId 保存。将来 `Project` 迁成结构化任务数组后，
 * 把这份记录搬进 project 即可，**`claimTask` 的公开接口不变**。
 *
 * 全部是纯函数：不读时间、不读随机数、不写任何状态（时间由调用方传入）。
 */

/**
 * 契约 3.2：认领「新任务候选」的入参 `NewTaskDraft`。
 * 字段与契约 3.2 的表格一致；`owner` 是可选扩展（表格没有它，缺失即 null）。
 */
export interface NewTaskDraft {
  /** 取建议的 `title` */
  title: string
  /** 取建议的 `doneCriteria` */
  doneCriteria: string
  /** 该候选来自哪次建议请求；本地规则为 `null` */
  requestId: string | null
  /** 原样保存，供日后追溯「这条任务为什么会出现」 */
  basisEvidenceIds: string[]
  basisDoubtIds: string[]
  /** 建议里带的负责人；没有就是 `null` */
  owner?: string | null
}

/** 已落库的本地任务（MVP 只存在于内存，随 store 一起生命周期） */
export interface Task {
  taskId: string
  projectId: string
  title: string
  status: TaskStatus
  doneCriteria: string | null
  owner: string | null
  /** 创建时所属的里程碑名称 */
  milestone: string | null
  /** 来自哪次建议请求；从模板步骤认领的任务为 `null` */
  requestId: string | null
  basisEvidenceIds: string[]
  basisDoubtIds: string[]
  createdAt: string
  updatedAt: string
}

/** 契约 3.2：`claimTask` 成功时返回的 `data` */
export interface ClaimTaskResult {
  taskId: string
  status: 'doing'
  projectRevision: number
}

/**
 * 32 位 FNV-1a。
 * 只用来把字符串压成稳定的短标识：不用于安全判断，也不需要抗碰撞。
 * （`deriveProjectId` 与 `buildDraftTaskId` 共用同一套约定。）
 */
export function hash32(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * 新任务候选的 `taskId`，**由 draft 内容派生**：
 * 同一个项目、同一份 draft 必然得到同一个 id，所以重复点击不会创建第二条任务——
 * 幂等由 id 本身保证，不需要在别处再记一份"这条建议点过了"。
 *
 * 形状：`tsk_<项目哈希>_d<内容哈希>`，与步骤派生的 `tsk_<项目哈希>_<序号>` 不会撞。
 */
export function buildDraftTaskId(projectId: string, draft: NewTaskDraft): string {
  const identity = JSON.stringify([
    projectId,
    draft.requestId,
    draft.title.trim(),
    draft.doneCriteria.trim(),
    draft.basisEvidenceIds,
    draft.basisDoubtIds,
  ])
  return `tsk_${projectId.replace(/^prj_/, '')}_d${hash32(identity).toString(16).padStart(8, '0')}`
}

/** 把 draft 落成一条真实任务：直接是 `doing`，不经过 `todo`（契约 3.2 约束 1） */
export function buildTaskFromDraft(input: {
  projectId: string
  draft: NewTaskDraft
  milestone: string | null
  /** 落库时间（ISO）；由调用方传入，保持本函数是纯函数 */
  now: string
}): Task {
  const { projectId, draft, milestone, now } = input
  const doneCriteria = draft.doneCriteria.trim()
  const owner = draft.owner?.trim() ?? ''

  return {
    taskId: buildDraftTaskId(projectId, draft),
    projectId,
    title: draft.title.trim(),
    status: 'doing',
    doneCriteria: doneCriteria === '' ? null : doneCriteria,
    owner: owner === '' ? null : owner,
    milestone,
    requestId: draft.requestId,
    basisEvidenceIds: [...draft.basisEvidenceIds],
    basisDoubtIds: [...draft.basisDoubtIds],
    createdAt: now,
    updatedAt: now,
  }
}

/** 任务记录 → 契约 4.1 的 `TaskSnapshot` */
export function toTaskSnapshot(task: Task): TaskSnapshot {
  return {
    taskId: task.taskId,
    title: task.title,
    status: task.status,
    doneCriteria: task.doneCriteria,
    owner: task.owner,
    milestone: task.milestone,
    updatedAt: task.updatedAt,
  }
}
