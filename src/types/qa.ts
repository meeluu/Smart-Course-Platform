import type { EvidenceBlock } from './course'

/**
 * 问答领域模型（对应 DR2）
 * 问题类型由问答助手在任务识别阶段判定：
 *  - explore   探索型：找学习入口与路径
 *  - retrieve  检索型：精确定位课程材料与事实
 *  - composite 复合型：概念解释 + 场景判断
 */
export type QuestionType = 'explore' | 'retrieve' | 'composite'

/** 引用：回答中的一条可核验出处 */
export interface Citation {
  /** 证据块 id，与知识库一致 */
  blockId: string
  docId: string
  docTitle: string
  heading: string
  page: string
  quote: string
  /** 该证据在学习路径上归属的讲次与资源，用于「去课程内容视图」 */
  lessonId?: string
  resourceId?: string
  resourceKind?: string
}

/** 助手的一条回答 */
export interface Answer {
  type: QuestionType
  /** 回答正文（markdown） */
  body: string
  citations: Citation[]
  /** 证据不足：课程材料中未找到足够依据 */
  insufficient?: boolean
  /** 证据不足时给出的诚实说明 */
  gapNote?: string
  followUps: string[]
}

/** 对话消息 */
export interface Turn {
  id: string
  role: 'user' | 'assistant'
  /** 用户提问文本 */
  text?: string
  /** 助手回答 */
  answer?: Answer
  at: string
  /** 生成中标记，用于打字态 */
  pending?: boolean
}

/** 历史问答归档（按学习单元） */
export interface Thread {
  id: string
  lessonId: string
  question: string
  type: QuestionType
  at: string
  turns: number
}

/** 用于原型演示的本地知识库问答规则 */
export interface QaRule {
  id: string
  /** 命中关键词 */
  match: string[]
  type: QuestionType
  body: string
  /** 引用的证据块 id */
  blocks: string[]
  followUps: string[]
}

export type { EvidenceBlock }
