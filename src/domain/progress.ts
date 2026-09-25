import type { Milestone, Project } from '@/types/platform'
import type { TaskSnapshot } from '@/domain/recommendation'
// 已认领/已创建的任务记录（见 domain/task）与这里派生的任务合并成同一份任务视图
import { hash32, toTaskSnapshot } from '@/domain/task'
import type { Task } from '@/domain/task'

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
 * 把现有步骤映射成任务快照，并合并已认领/已创建的任务记录。
 * `reference` 由调用方传入（保持纯函数），用于 updatedAt。
 *
 * 合并规则：同 `taskId` 以**记录**为准。
 * 认领一步会同时写一条记录（见 store 的 claimTask），这样"已认领"不依赖
 * 里程碑进度反推，认领顺序也不会被进度反推改写；新任务候选的 id 与步骤派生的
 * id 形状不同，只会追加、不会覆盖。
 */
export function deriveTaskSnapshots(
  project: Project,
  reference: Date,
  createdTasks: Task[] = [],
): TaskSnapshot[] {
  const projectId = deriveProjectId(project)
  const milestone = currentMilestoneName(project)
  const claimed = claimedStepCount(project)
  const updatedAt = reference.toISOString()

  const byId = new Map<string, TaskSnapshot>(
    project.steps.map((step, index) => [
      buildTaskId(projectId, index),
      {
        taskId: buildTaskId(projectId, index),
        title: step.t,
        status: index < claimed ? 'doing' : 'todo',
        doneCriteria: step.done.trim() === '' ? null : step.done,
        owner: step.owner.trim() === '' ? null : step.owner,
        milestone,
        updatedAt,
      },
    ]),
  )

  for (const task of createdTasks) byId.set(task.taskId, toTaskSnapshot(task))

  return [...byId.values()]
}

/**
 * projectRevision：契约 2.6 要求"每次状态写入 +1"。
 *
 * 现有 store 没有集中的写入点（也不重写既有 action），所以这里改用**状态摘要**当版本号：
 * 它对同一份状态稳定、状态一变就变，正好满足 revision 的用途（判断响应是否过期、
 * 作为服务端缓存键）。结构化迁移后应换成真正的递增计数。
 *
 * 参与摘要的是会影响建议的字段（里程碑进度、步骤、证据、疑问、已创建的任务）：
 * 聊天、论文方向、材料名不影响建议，所以不进摘要。
 */
export function computeProjectRevision(project: Project, createdTasks: Task[] = []): number {
  const canonical = JSON.stringify({
    name: project.name,
    group: project.group,
    milestones: project.ms.map((item) => [item.t, item.s, item.p]),
    steps: project.steps.map((item) => [item.t, item.owner, item.done]),
    evidence: project.evidence.map((item) => [item.time, item.text]),
    doubts: project.doubts,
    // 认领/新建任务也是项目状态的一部分：不参与摘要的话，创建任务不会改变
    // projectRevision，过期响应判断与服务端缓存都会出错。
    tasks: createdTasks.map((task) => [
      task.taskId,
      task.title,
      task.status,
      task.doneCriteria,
      task.owner,
      task.milestone,
    ]),
  })

  // 保证是 ≥ 1 的正整数
  return 1 + (hash32(canonical) % 1_000_000)
}
