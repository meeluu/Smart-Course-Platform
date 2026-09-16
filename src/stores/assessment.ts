import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AttemptRecord, MasteryRecord, QuizMode, Suggestion } from '@/types/assessment'
import { portrait, dimensionBase, dimensionPoints, masteryByPoint } from '@/data/portrait'
import { questionsOfUnit, unitById } from '@/data/quiz'
import { kpById, lessonById, resourceById } from '@/data/course'

/** 知识点的定向追问，用于建议里的「追问助手」 */
const PROMPT_BY_KP: Record<string, string> = {
  'kp-missing': '缺失值有哪些插补方法？',
  'kp-standardize': '标准化和归一化有什么区别？',
  'kp-quality-5c': '5C 数据质量维度分别是什么？',
  'kp-outlier': '怎么判断数据里有异常值？',
  'kp-spark': 'Spark 什么时候才该用？',
  'kp-kmeans': '为什么聚类之前一定要标准化？',
  'kp-distance': '欧氏距离和曼哈顿距离有什么区别？',
  'kp-channel': '可视化设计的三条硬规则是什么？',
  'kp-color': '配色怎么保证可辨性？',
  'kp-privacy': '手机采集的数据有什么隐私要求？',
  'kp-bert-env': 'BERT 实验环境怎么配？',
  'kp-paper': '论文的字数和参考文献有什么要求？',
  'kp-mid': '中期检查需要提交什么？',
  'kp-demo': '系统演示必须包含哪些模块？',
  'kp-sampling': '抽样怎么保证代表性？',
  'kp-spreadsheet': '电子表格处理有什么要求？',
}

function verdictOf(mastery: number): MasteryRecord['verdict'] {
  if (mastery >= 80) return 'solid'
  if (mastery >= 65) return 'shaky'
  return 'weak'
}

function suggestionFor(knowledgePoint: string, mastery: number): Suggestion {
  const kp = kpById.get(knowledgePoint)
  const lesson = kp ? lessonById.get(kp.lessonId) : undefined
  const resource = kp ? resourceById.get(kp.resourceId) : undefined
  const steps: Suggestion['steps'] = []

  if (resource && lesson) {
    steps.push({
      kind: resource.kind === 'lab' ? 'lab' : 'slides',
      label: `回看${lesson.title}`,
      detail: resource.title,
      lessonId: lesson.id,
      resourceId: resource.id,
    })
  }
  if (lesson) {
    steps.push({
      kind: 'quiz',
      label: '再做巩固题',
      detail: `围绕「${kp?.name ?? knowledgePoint}」验证掌握程度`,
      lessonId: lesson.id,
    })
  }
  const prompt = PROMPT_BY_KP[knowledgePoint]
  if (prompt) {
    steps.push({ kind: 'ask', label: '追问助手', detail: '把没想通的地方直接问出来', prompt })
  }

  return { knowledgePoint, mastery, steps }
}

/** 测评与能力画像状态（DR3） */
export const useAssessmentStore = defineStore('assessment', () => {
  const knowledge = ref<MasteryRecord[]>(portrait.knowledge.map((record) => ({ ...record })))
  const history = ref<AttemptRecord[]>([...portrait.history])
  const retrievals = ref(portrait.retrievals)

  /** 答题会话 */
  const activeUnitId = ref<string | null>(null)
  const mode = ref<QuizMode>('practice')
  const answers = ref<Record<string, string>>({})
  const submitted = ref(false)
  const startedAt = ref<number>(0)
  const elapsed = ref(0)

  const activeUnit = computed(() => (activeUnitId.value ? unitById(activeUnitId.value) : undefined))
  const activeQuestions = computed(() => (activeUnitId.value ? questionsOfUnit(activeUnitId.value) : []))

  const answeredCount = computed(() => Object.keys(answers.value).length)

  const score = computed(() =>
    activeQuestions.value.reduce((sum, q) => sum + (answers.value[q.id] === q.answer ? 1 : 0), 0),
  )

  const recordByPoint = computed(() => new Map(knowledge.value.map((r) => [r.knowledgePoint, r])))

  const dimensions = computed(() =>
    dimensionBase.map((dim) => {
      const points = dimensionPoints[dim.id] ?? []
      const scores = points
        .map((point) => recordByPoint.value.get(point)?.mastery)
        .filter((value): value is number => typeof value === 'number')
      const mean = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : dim.score
      return { ...dim, score: mean }
    }),
  )

  /** 掌握度升序：最薄弱的排在最前 */
  const ranked = computed(() => [...knowledge.value].sort((a, b) => a.mastery - b.mastery))

  const weakPoints = computed(() => ranked.value.filter((r) => r.mastery < 75))

  const suggestions = computed(() => {
    const base = new Map(portrait.suggestions.map((s) => [s.knowledgePoint, s]))
    return ranked.value
      .filter((record) => record.mastery < 75)
      .slice(0, 4)
      .map((record) => base.get(record.knowledgePoint) ?? suggestionFor(record.knowledgePoint, record.mastery))
  })

  /** 以下三项唯一来源于作答记录，避免不同页面出现互相矛盾的数字 */
  const accuracy = computed(() => {
    const total = answered.value
    const scored = history.value.reduce((sum, item) => sum + item.score, 0)
    return total ? Math.round((scored / total) * 100) : 0
  })

  const answered = computed(() => history.value.reduce((sum, item) => sum + item.total, 0))

  const minutes = computed(() => history.value.reduce((sum, item) => sum + item.minutes, 0))

  function start(unitId: string, quizMode: QuizMode) {
    activeUnitId.value = unitId
    mode.value = quizMode
    answers.value = {}
    submitted.value = false
    elapsed.value = 0
    startedAt.value = Date.now()
  }

  function choose(questionId: string, key: string) {
    if (submitted.value && mode.value === 'exam') return
    answers.value = { ...answers.value, [questionId]: key }
    // 练习模式：选完立即判定，用于逐题解析
    if (mode.value === 'practice') submitted.value = false
  }

  function finish() {
    if (!activeUnitId.value) return
    submitted.value = true
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.value) / 60000)) || 1
    elapsed.value = minutes

    const unit = activeUnit.value
    if (unit) {
      history.value = [
        {
          id: `A${history.value.length + 1}`,
          unitId: unit.id,
          unitTitle: unit.title,
          at: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
          mode: mode.value,
          score: score.value,
          total: activeQuestions.value.length,
          minutes,
        },
        ...history.value,
      ]
    }

    // 画像更新：按知识点聚合本次作答，与学生已有样本量加权融合
    const perPoint = new Map<string, { right: number; total: number }>()
    activeQuestions.value.forEach((question) => {
      const entry = perPoint.get(question.knowledgePoint) ?? { right: 0, total: 0 }
      entry.total += 1
      if (answers.value[question.id] === question.answer) entry.right += 1
      perPoint.set(question.knowledgePoint, entry)
    })

    knowledge.value = knowledge.value.map((record) => {
      const entry = perPoint.get(record.knowledgePoint)
      if (!entry) return record
      const observed = (entry.right / entry.total) * 100
      const weight = Math.min(entry.total, 3)
      const mastery = Math.round((record.mastery * record.evidence + observed * weight) / (record.evidence + weight))
      return {
        ...record,
        mastery,
        evidence: record.evidence + weight,
        confidence: Math.min(96, record.confidence + 6),
        verdict: verdictOf(mastery),
      }
    })
  }

  function reset() {
    activeUnitId.value = null
    answers.value = {}
    submitted.value = false
  }

  function countRetrieval() {
    retrievals.value += 1
  }

  return {
    knowledge,
    history,
    retrievals,
    activeUnitId,
    activeUnit,
    activeQuestions,
    mode,
    answers,
    submitted,
    elapsed,
    answeredCount,
    score,
    recordByPoint,
    dimensions,
    ranked,
    weakPoints,
    suggestions,
    accuracy,
    answered,
    minutes,
    start,
    choose,
    finish,
    reset,
    countRetrieval,
    portraitMeta: portrait,
    masteryByPoint,
  }
})
