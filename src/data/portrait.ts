import type { AttemptRecord, Dimension, MasteryRecord, Portrait, Suggestion } from '@/types/assessment'

/**
 * 能力画像（DR3 的输出）
 * ----------------------------------------------------------------------------
 * 由「作答正确率 + 检索行为 + 完成时长」按「知识点—能力维度」两层结构聚合而成。
 * 演示版为一份已完成过一次测评的学生画像：薄弱项会在建议中被映射回 DR1 的资源路径。
 */

const dimensions: Dimension[] = [
  { id: 'D1', name: '数据工程', score: 74, note: '采集、清洗与质量校验的整体把握' },
  { id: 'D2', name: '统计与建模', score: 79, note: '统计口径与聚类等基础方法的使用' },
  { id: 'D3', name: '可视化表达', score: 73, note: '视觉通道选择与配色可辨性' },
  { id: 'D4', name: '工程实现', score: 62, note: '环境配置、分布式与结果可复现' },
  { id: 'D5', name: '科研写作', score: 71, note: '论文规范与中期汇报组织' },
  { id: 'D6', name: '协作规范', score: 88, note: '计划、进度与组内约定' },
]

const knowledge: MasteryRecord[] = [
  { knowledgePoint: 'kp-team', mastery: 92, confidence: 78, evidence: 4, verdict: 'solid' },
  { knowledgePoint: 'kp-plan', mastery: 84, confidence: 72, evidence: 3, verdict: 'solid' },
  { knowledgePoint: 'kp-sampling', mastery: 71, confidence: 68, evidence: 3, verdict: 'shaky' },
  { knowledgePoint: 'kp-quality-5c', mastery: 88, confidence: 84, evidence: 4, verdict: 'solid' },
  { knowledgePoint: 'kp-missing', mastery: 46, confidence: 86, evidence: 6, verdict: 'weak' },
  { knowledgePoint: 'kp-standardize', mastery: 58, confidence: 74, evidence: 5, verdict: 'shaky' },
  { knowledgePoint: 'kp-outlier', mastery: 63, confidence: 61, evidence: 3, verdict: 'shaky' },
  { knowledgePoint: 'kp-spreadsheet', mastery: 86, confidence: 76, evidence: 3, verdict: 'solid' },
  { knowledgePoint: 'kp-distance', mastery: 76, confidence: 64, evidence: 3, verdict: 'solid' },
  { knowledgePoint: 'kp-kmeans', mastery: 81, confidence: 82, evidence: 4, verdict: 'solid' },
  { knowledgePoint: 'kp-channel', mastery: 79, confidence: 70, evidence: 3, verdict: 'solid' },
  { knowledgePoint: 'kp-color', mastery: 68, confidence: 72, evidence: 4, verdict: 'shaky' },
  { knowledgePoint: 'kp-mid', mastery: 90, confidence: 58, evidence: 2, verdict: 'solid' },
  { knowledgePoint: 'kp-bert-env', mastery: 74, confidence: 66, evidence: 3, verdict: 'solid' },
  { knowledgePoint: 'kp-finetune', mastery: 61, confidence: 71, evidence: 4, verdict: 'shaky' },
  { knowledgePoint: 'kp-tools', mastery: 70, confidence: 48, evidence: 2, verdict: 'shaky' },
  { knowledgePoint: 'kp-privacy', mastery: 83, confidence: 69, evidence: 3, verdict: 'solid' },
  { knowledgePoint: 'kp-spark', mastery: 55, confidence: 79, evidence: 4, verdict: 'shaky' },
  { knowledgePoint: 'kp-paper', mastery: 72, confidence: 54, evidence: 2, verdict: 'shaky' },
  { knowledgePoint: 'kp-demo', mastery: 87, confidence: 74, evidence: 3, verdict: 'solid' },
]

const suggestions: Suggestion[] = [
  {
    knowledgePoint: 'kp-missing',
    mastery: 46,
    steps: [
      {
        kind: 'slides',
        label: '回看第 4 讲课件',
        detail: '缺失机制与三类处理动作（插补 / 删除 / 标记）',
        lessonId: 'L04',
        resourceId: 'L04-slides',
      },
      {
        kind: 'lab',
        label: '重做实验 4',
        detail: '对比均值填充、中位数填充与多重插补的差异',
        lessonId: 'L04',
        resourceId: 'L04-lab-exp4',
      },
      {
        kind: 'quiz',
        label: '再做 2 道巩固题',
        detail: '聚焦缺失值策略的选择依据',
        lessonId: 'L04',
      },
      {
        kind: 'ask',
        label: '追问助手',
        detail: '把没想通的地方直接问出来',
        prompt: '缺失值有哪些插补方法？',
      },
    ],
  },
  {
    knowledgePoint: 'kp-spark',
    mastery: 55,
    steps: [
      {
        kind: 'slides',
        label: '回看第 13 讲课件',
        detail: '什么时候该用 Spark：分区与缓存的取舍',
        lessonId: 'L13',
        resourceId: 'L13-slides',
      },
      {
        kind: 'lab',
        label: '重做实验 12',
        detail: '对比缓存前后的执行耗时，用数据判断',
        lessonId: 'L13',
        resourceId: 'L13-lab-exp12',
      },
      {
        kind: 'ask',
        label: '追问助手',
        detail: '确认判断标准而不是背结论',
        prompt: 'Spark 什么时候才该用？',
      },
    ],
  },
  {
    knowledgePoint: 'kp-standardize',
    mastery: 58,
    steps: [
      {
        kind: 'slides',
        label: '回看第 6 讲课件',
        detail: '为什么基于距离的方法必须先标准化',
        lessonId: 'L06',
        resourceId: 'L06-slides',
      },
      {
        kind: 'lab',
        label: '重做实验 4',
        detail: 'Z-score 标准化与独热编码的实操',
        lessonId: 'L04',
        resourceId: 'L04-lab-exp4',
      },
      {
        kind: 'ask',
        label: '追问助手',
        detail: '区分标准化与归一化的适用场景',
        prompt: '标准化和归一化有什么区别？',
      },
    ],
  },
  {
    knowledgePoint: 'kp-color',
    mastery: 68,
    steps: [
      {
        kind: 'lab',
        label: '重做实验 7',
        detail: '为同一份数据设计两套视觉通道并说明取舍',
        lessonId: 'L07',
        resourceId: 'L07-lab-exp7',
      },
      {
        kind: 'quiz',
        label: '再做 1 道巩固题',
        detail: '分类配色的可辨性检查',
        lessonId: 'L07',
      },
    ],
  },
]

const history: AttemptRecord[] = [
  { id: 'A4', unitId: 'U3', unitTitle: '模型与工程实践', at: '2025-12-14 14:05', mode: 'exam', score: 4, total: 5, minutes: 9 },
  { id: 'A3', unitId: 'U2', unitTitle: '分析与可视化方法', at: '2025-12-07 20:18', mode: 'practice', score: 5, total: 6, minutes: 13 },
  { id: 'A2', unitId: 'U1', unitTitle: '数据预处理', at: '2025-11-30 16:42', mode: 'practice', score: 3, total: 6, minutes: 15 },
  { id: 'A1', unitId: 'U1', unitTitle: '数据预处理', at: '2025-09-28 09:10', mode: 'exam', score: 2, total: 6, minutes: 12 },
]

export const portrait: Portrait = {
  updatedAt: '2025-12-14 14:20',
  retrievals: 24,
  dimensions,
  knowledge,
  suggestions,
  history,
}

export const masteryByPoint = new Map(knowledge.map((record) => [record.knowledgePoint, record]))

/** 掌握度分级：用于条形图与薄弱项清单的配色 */
export function masteryTone(value: number): 'solid' | 'shaky' | 'weak' {
  if (value >= 80) return 'solid'
  if (value >= 65) return 'shaky'
  return 'weak'
}

export const verdictLabel: Record<MasteryRecord['verdict'], string> = {
  solid: '已掌握',
  shaky: '待巩固',
  weak: '薄弱',
}

/** 「知识点 → 能力维度」二层结构的映射，维度得分由所属知识点掌握度聚合得到 */
export const dimensionPoints: Record<string, string[]> = {
  D1: ['kp-sampling', 'kp-quality-5c', 'kp-missing', 'kp-standardize', 'kp-outlier'],
  D2: ['kp-spreadsheet', 'kp-distance', 'kp-kmeans'],
  D3: ['kp-channel', 'kp-color'],
  D4: ['kp-tools', 'kp-bert-env', 'kp-finetune', 'kp-spark'],
  D5: ['kp-mid', 'kp-paper'],
  D6: ['kp-team', 'kp-plan', 'kp-privacy', 'kp-demo'],
}

export const dimensionBase = dimensions
