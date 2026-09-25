import type { Milestone, Project } from '@/types/platform'
import type { TaskSnapshot } from '@/domain/recommendation'

/**
 * 进度与任务状态（纯函数）
 * ----------------------------------------------------------------------------
 * 现有 store 的"任务"是模板里的步骤（`t` / `owner` / `why` / `done`），没有 id 也没有状态；
 * 而契约（docs/contracts.md 4.1）需要带 id 与 status 的 TaskSnapshot。
 * 这里做**兼容映射**，等结构化迁移（新增 Task 模型）之后，这些函数改为直接读任务模型即可：
 *
 *   - taskId：`tsk_<项目ID>_<序号>`，同输入必然同输出，稳定可复现；
 *   - status：按当前里程碑的进度反推"已认领数"（认领一次 +25，见 store 的 claimStep），
 *     已认领的步骤记 `doing`，其余记 `todo`。现有模型表达不了 `done`，所以不会产出 done；
 *   - projectRevision：见 computeProjectRevision 的说明。
 *
 * 全部是纯函数：不读时间、不读随机数、不写任何状态。
 */

/** 模板里当前里程碑的起始进度（见 data/topics.ts 与 store 的 customTemplate） */
const MILESTONE_START_PROGRESS = 10
/** 认领一次增加的进度（见 store 的 claimStep） */
const CLAIM_STEP_PROGRESS = 25

/**
 * 32 位 FNV-1a。
 * 只用来把字符串压成稳定的短标识：不用于安全判断，也不需要抗碰撞。
 */
function hash32(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * 派生稳定的 projectId。
 * 现有 Project 没有 id 字段；名字 + 组号在同一会话内唯一且不会变化，
 * 足以作为项目标识（结构化迁移后会换成真正的项目 id）。
 */
export function deriveProjectId(project: Project): string {
  return `prj_${hash32(`${project.name}#${project.group}`).toString(16).padStart(8, '0')}`
}

/** 任务 id 约定：`tsk_<项目ID 的哈希部分>_<序号>` */
export function buildTaskId(projectId: string, index: number): string {
  return `tsk_${projectId.replace(/^prj_/, '')}_${index}`
}

/** 当前里程碑：优先取进行中的，其次取第一个未完成的 */
export function currentMilestone(project: Project): Milestone | undefined {
  return project.ms.find((item) => item.s === 'cur') ?? project.ms.find((item) => item.s !== 'done')
}

/** 契约 4.1 的 currentMilestone 字段 */
export function currentMilestoneName(project: Project): string | null {
  return currentMilestone(project)?.t ?? null
}

/**
 * 已认领的步骤数：由当前里程碑的进度反推。
 * 进度每 +25 视为多认领一步（起始 10），上限为步骤总数。
 */
export function claimedStepCount(project: Project): number {
  const milestone = project.ms.find((item) => item.s === 'cur')
  if (milestone === undefined) return 0

  const extra = Math.floor((milestone.p - MILESTONE_START_PROGRESS) / CLAIM_STEP_PROGRESS)
  return Math.min(Math.max(extra, 0), project.steps.length)
}

/**
 * 把现有步骤映射成任务快照。
 * `reference` 由调用方传入（保持纯函数），用于 updatedAt。
 */
export function deriveTaskSnapshots(project: Project, reference: Date): TaskSnapshot[] {
  const projectId = deriveProjectId(project)
  const milestone = currentMilestoneName(project)
  const claimed = claimedStepCount(project)
  const updatedAt = reference.toISOString()

  return project.steps.map((step, index) => ({
    taskId: buildTaskId(projectId, index),
    title: step.t,
    status: index < claimed ? 'doing' : 'todo',
    doneCriteria: step.done.trim() === '' ? null : step.done,
    owner: step.owner.trim() === '' ? null : step.owner,
    milestone,
    updatedAt,
  }))
}

/**
 * projectRevision：契约 2.6 要求"每次状态写入 +1"。
 *
 * 现有 store 没有集中的写入点（也不重写既有 action），所以这里改用**状态摘要**当版本号：
 * 它对同一份状态稳定、状态一变就变，正好满足 revision 的用途（判断响应是否过期、
 * 作为服务端缓存键）。结构化迁移后应换成真正的递增计数。
 *
 * 参与摘要的是会影响建议的字段（里程碑进度、步骤、证据、疑问）：
 * 聊天、论文方向、材料名不影响建议，所以不进摘要。
 */
export function computeProjectRevision(project: Project): number {
  const canonical = JSON.stringify({
    name: project.name,
    group: project.group,
    milestones: project.ms.map((item) => [item.t, item.s, item.p]),
    steps: project.steps.map((item) => [item.t, item.owner, item.done]),
    evidence: project.evidence.map((item) => [item.time, item.text]),
    doubts: project.doubts,
  })

  // 保证是 ≥ 1 的正整数
  return 1 + (hash32(canonical) % 1_000_000)
}
