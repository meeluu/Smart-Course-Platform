import type { Project } from '@/types/platform'
import type { DoubtSnapshot, EvidenceSnapshot } from '@/domain/recommendation'
import { deriveProjectId } from '@/domain/progress'

/**
 * 活跃度与时间计算（纯函数）
 * ----------------------------------------------------------------------------
 * 现有 store 里的记录是"给人看的展示形态"：证据是 `{ time: '09-23 14:05', text, who }`，
 * 疑问是一串纯文本。契约要求的是结构化快照，这里负责兼容映射：
 *
 *   - 时间：把 `MM-DD HH:mm` 还原成 ISO 8601（年份取参考时间）。契约要求 ISO，
 *     而展示字符串无法排序、也无法跨时区比较；
 *   - 证据：现有证据是"一条拼好的文本"，没有结构化字段，因此整段文本进 `didWhat`，
 *     `foundWhat` / `stillUnsure` 留空（结构化迁移后再拆开）；
 *   - 疑问：现有没有疑问 id，按"项目 + 序号"派生，状态一律 `open`。
 *
 * 纯函数：时间由调用方以 `reference` 传入，不读系统时钟。
 */

/** `09-23 14:05` 这类展示时间 */
const TIME_LABEL_PATTERN = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/

/** 把展示时间还原成 ISO；解析不了返回 null（调用方自行兜底） */
export function parseProjectTimeLabel(label: string, reference: Date): string | null {
  const matched = TIME_LABEL_PATTERN.exec(label.trim())
  if (matched === null) return null

  const month = Number(matched[1])
  const day = Number(matched[2])
  const hour = Number(matched[3])
  const minute = Number(matched[4])

  const parsed = new Date(reference.getFullYear(), month - 1, day, hour, minute)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/** 证据 id 约定：`evd_<项目ID 的哈希部分>_<倒序序号>` */
export function buildEvidenceId(projectId: string, index: number): string {
  return `evd_${projectId.replace(/^prj_/, '')}_${index}`
}

/** 疑问 id 约定：`dbt_<项目ID 的哈希部分>_<序号>` */
export function buildDoubtId(projectId: string, index: number): string {
  return `dbt_${projectId.replace(/^prj_/, '')}_${index}`
}

/**
 * 证据快照。
 * 不做任何"猜字段"的事：现有模型里拿不到的信息一律留空，宁缺毋造。
 */
export function deriveEvidenceSnapshots(project: Project, reference: Date): EvidenceSnapshot[] {
  const projectId = deriveProjectId(project)
  const fallbackIso = reference.toISOString()

  return project.evidence.map((item, index) => {
    const evidenceId = buildEvidenceId(projectId, index)
    return {
      evidenceId,
      // submissionId 是幂等键：现有模型没有它，用证据 id 派生一个稳定值
      submissionId: `${evidenceId}_sub`,
      // 现有证据没有关联任务信息
      taskId: null,
      didWhat: item.text,
      foundWhat: null,
      stillUnsure: null,
      author: item.who.trim() === '' ? null : item.who,
      createdAt: parseProjectTimeLabel(item.time, reference) ?? fallbackIso,
    }
  })
}

/** 疑问快照：现有疑问只有文本，一律当作 open */
export function deriveDoubtSnapshots(project: Project, reference: Date): DoubtSnapshot[] {
  const projectId = deriveProjectId(project)
  const createdAt = reference.toISOString()

  return project.doubts.map((text, index) => ({
    doubtId: buildDoubtId(projectId, index),
    text,
    status: 'open',
    // 现有模型不记录疑问来自哪条证据
    sourceEvidenceId: null,
    createdAt,
  }))
}
