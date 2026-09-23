/**
 * 平台领域模型
 * ----------------------------------------------------------------------------
 * 与 platform-ui-mockup(3).html 的数据结构一一对应。
 * 一个项目 = 五个里程碑 + 若干疑问 + AI 顾问的三步建议 + 论文检索方向 + 证据时间线。
 */

/** 里程碑状态：已完成 / 进行中 / 未开始 */
export type MilestoneStatus = 'done' | 'cur' | 'todo'

export interface Milestone {
  /** 里程碑名称 */
  t: string
  s: MilestoneStatus
  /** 进行中的进度百分比 */
  p: number
  /** 状态说明，例如「刚启动」「未开始」 */
  sub: string
}

/** AI 顾问给出的步骤建议 */
export interface SuggestedStep {
  t: string
  /** 建议负责人 */
  owner: string
  /** 为什么现在做 */
  why: string
  /** 完成标志 */
  done: string
}

/** 论文检索方向：给提示词，不给现成链接 */
export interface PaperDirection {
  title: string
  meta: string
  why: string
  prompt: string
}

/** 题目模板（创建项目时实例化） */
export interface Template {
  short: string
  ms: Milestone[]
  doubts: string[]
  banner: string
  steps: SuggestedStep[]
  papers: PaperDirection[]
}

/** 项目材料类型 */
export type MaterialType = '实验手册' | '数据集' | '材料'

export interface MaterialItem {
  name: string
  type: MaterialType
}

/** 证据时间线上的一条 */
export interface EvidenceItem {
  time: string
  text: string
  who: string
}

export interface ChatMessage {
  who: string
  text: string
  /** 是否是学生自己说的 */
  me: boolean
}

/** AI 现场生成的检索方向卡片 */
export interface AiPaperDirection {
  title: string
  meta: string
  prompt: string
}

/** 一个项目实例 */
export interface Project {
  /** 项目题目（完整名称） */
  name: string
  /** 短名，用于标签与地图中心 */
  short: string
  group: string
  members: string
  updated: string
  ms: Milestone[]
  doubts: string[]
  banner: string
  steps: SuggestedStep[]
  papers: PaperDirection[]
  evidence: EvidenceItem[]
  /** 近 4 周的活跃度计数 */
  weekly: number[]
  materials: MaterialItem[]
  chat: ChatMessage[]
  /** AI 现场生成的检索方向 */
  aiPapers: AiPaperDirection[]
}
