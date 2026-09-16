/**
 * 测评与能力画像领域模型（对应 DR3）
 */

/** 测评模式：练习模式即时解析 / 自测模式统一评分 */
export type QuizMode = 'practice' | 'exam'

export interface Choice {
  key: string
  text: string
}

export interface Question {
  id: string
  /** 所属单元 */
  unitId: string
  /** 关联知识点 */
  knowledgePoint: string
  stem: string
  choices: Choice[]
  /** 正确选项 key */
  answer: string
  explanation: string
  /** 解析时可回跳的资源 */
  resourceId?: string
  /** 实验情境题标记 */
  scenario?: boolean
}

export interface QuizUnit {
  id: string
  title: string
  /** 归属模块 */
  moduleId: string
  lessonIds: string[]
  knowledgePoints: string[]
  /** 限时（分钟） */
  minutes: number
}

/** 单次作答记录 */
export interface AttemptRecord {
  id: string
  unitId: string
  unitTitle: string
  at: string
  mode: QuizMode
  score: number
  total: number
  minutes: number
}

/** 知识点掌握度 */
export interface MasteryRecord {
  knowledgePoint: string
  /** 掌握度 0–100 */
  mastery: number
  /** 置信度 0–100，依据作答样本量 */
  confidence: number
  /** 依据题数 */
  evidence: number
  /** 画像结论：已掌握 / 待巩固 / 薄弱 */
  verdict: 'solid' | 'shaky' | 'weak'
}

/** 能力维度（雷达图） */
export interface Dimension {
  id: string
  name: string
  score: number
  note: string
}

/** 个性化复习建议 */
export interface Suggestion {
  knowledgePoint: string
  mastery: number
  /** 建议动作：回看课件 / 重做实验 / 巩固练习 */
  steps: SuggestionStep[]
}

export interface SuggestionStep {
  kind: 'slides' | 'lab' | 'quiz' | 'ask'
  label: string
  detail: string
  /** 学习路径跳转目标 */
  lessonId?: string
  resourceId?: string
  /** 问答追问 */
  prompt?: string
}

/**
 * 能力画像
 * 注意：正确率 / 作答量 / 用时一律由 history 聚合得到，不在此处重复存储，
 * 否则两处数字迟早会互相矛盾。
 */
export interface Portrait {
  updatedAt: string
  /** 检索行为次数，画像引擎的输入之一 */
  retrievals: number
  dimensions: Dimension[]
  knowledge: MasteryRecord[]
  suggestions: Suggestion[]
  history: AttemptRecord[]
}
