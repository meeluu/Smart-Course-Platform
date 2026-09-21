import type { ResourceKind } from './course'

/**
 * v1 领域模型
 * ----------------------------------------------------------------------------
 * 系统只服务一条闭环：材料 → 理解 → 下一步 → 结果与证据 → 更新状态。
 * 因此这里只有五个对象，每个字段都对应闭环里的一个具体动作，
 * 没有「以后可能用得上」的字段。
 *
 * 三条不可协商的规则由这些类型承载：
 *  1. 系统整理的内容必须经学生确认才进入项目状态（confidence 从 inferred 变 confirmed）；
 *  2. 每条状态都标可信程度（Confidence 必填）；
 *  3. 步骤必须写清为什么现在做（whyNow 必填），资料必须写清为什么有用（whyUseful 必填）。
 */

/** 可信程度：三档，界面上始终可见 */
export type Confidence = 'confirmed' | 'inferred' | 'uncertain'

/** 内容的产生者 */
export type Origin = 'student' | 'ai' | 'teacher'

/* -------------------------------------------------------------- 材料 */

/** 材料类型：学生刚拿到项目时手上会有的东西 */
export type MaterialType = 'requirement' | 'document' | 'data' | 'other'

export interface Material {
  id: string
  name: string
  type: MaterialType
  /** 材料正文。v1 支持上传后抽取的纯文本，或直接粘贴 */
  text: string
  uploadedAt: string
  /** 摘出证据的来源位置说明，例如「议题 2」 */
  note?: string
  /** 系统整理过这份材料的时间；为空表示还没读 */
  organizedAt?: string
}

/* ------------------------------------------------------------ 项目理解 */

/**
 * 四块：项目目标 / 交付内容 / 当前问题 / 待确认事项。
 * 顺序即界面上从上到下的顺序，也对应学生刚拿到项目时的阅读顺序。
 */
export type UnderstandingKey = 'goal' | 'deliverables' | 'questions' | 'toConfirm'

/** 一条理解必须能指回材料：哪份、哪一部分、原文怎么说的 */
export interface UnderstandingSource {
  materialId: string
  /** 位置说明，例如「第 3 段」「议题 2」 */
  locator: string
  /** 原文片段，供学生核对 */
  quote: string
}

export interface UnderstandingItem {
  id: string
  key: UnderstandingKey
  text: string
  confidence: Confidence
  source?: UnderstandingSource
  /** 谁写的：系统整理出来的标 ai，学生改写过的标 student */
  origin: Origin
  at: string
}

/* -------------------------------------------------------------- 步骤 */

export type StepStatus = 'todo' | 'doing' | 'done'

/** 推荐资料：系统知识库里的一条，必须写清它对这个具体问题为什么有用 */
export interface StepResource {
  id: string
  docId: string
  /** 指向证据块；经验材料为整篇文档，此字段缺省 */
  blockId?: string
  title: string
  kind: ResourceKind
  page: string
  /** 为什么它对这个具体问题有用——必须用当前问题的说法写 */
  whyUseful: string
}

export interface Step {
  id: string
  title: string
  /** 为什么现在做。必填，空着说明这条建议没有依据 */
  whyNow: string
  /** 关联到哪个当前问题。必填 */
  questionId: string
  status: StepStatus
  resources: StepResource[]
  at: string
}

/* -------------------------------------------------------- 结果与证据 */

/**
 * 一步完成后留下的四个字段。
 * 一个 Step 只对应一个 Result；提交之后 Step 变为已完成，项目状态随之更新。
 */
export interface Result {
  stepId: string
  /** 完成了什么 */
  didWhat: string
  /** 发现了什么 */
  foundWhat: string
  /** 解决了哪个问题：某个问题的 id，或 'none' 表示没有解决 */
  solvedWhich: string
  /** 还有什么不确定 */
  stillUnsure: string
  at: string
}

/* ------------------------------------------------------------ 进展记录 */

/** 首页时间线上的一条：这一步留下了什么、状态因此变了什么 */
export interface ProgressEntry {
  id: string
  at: string
  stepId: string
  stepTitle: string
  summary: string
  /** 状态因此发生的变化，逐条列出 */
  changes: string[]
}

/* -------------------------------------------------------------- 其他 */

/** 项目元信息 */
export interface ProjectMeta {
  id: string
  /** 完整项目名（含赛题前缀），用于页脚等长文本位置 */
  name: string
  /** 短名，用于标题与任务栏，避免中英混排被拦腰折断 */
  shortName: string
  /** 赛题或来源前缀 */
  source: string
  team: string
  members: { name: string; role: string }[]
  /** 课程讲次进度，仅作背景信息 */
  phase: string
  /** 课程总周数与当前周次：whyNow 必须能引用它，否则建议就是空话 */
  totalWeeks: number
  currentWeek: number
  startedAt: string
  updatedAt: string
}
