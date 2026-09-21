import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  Material,
  MaterialType,
  ProgressEntry,
  ProjectMeta,
  Result,
  Step,
  UnderstandingItem,
  UnderstandingKey,
} from '@/types/project'
import { projectMeta as seedMeta, seedCompleted, seedMaterials } from '@/data/project'
import { extractUnderstanding } from '@/data/intake'
import { resourcesFor, suggestSteps } from '@/data/steps'
import { nextId } from '@/utils/id'

const stamp = () =>
  new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

/**
 * 项目状态中心
 * ----------------------------------------------------------------------------
 * 只做一条闭环：材料 → 理解 → 下一步 → 结果与证据 → 更新状态。
 *
 * 四条硬规则在这里被强制执行：
 *  1. 材料整理出来的内容一律先标 inferred，学生确认或改写之后才变 confirmed；
 *  2. 理解条目、步骤、资料都带着可信程度或理由，界面上始终可见；
 *  3. 下一步最多 3 条，且每条都有 whyNow（由 suggestSteps 保证，写不出理由的不产出）；
 *  4. 阅读资料不改变任何状态，只有 completeStep 会改变状态。
 */
export const useProjectStore = defineStore('project', () => {
  const meta = ref<ProjectMeta>({ ...seedMeta })
  const materials = ref<Material[]>(seedMaterials.map((material) => ({ ...material })))
  const understanding = ref<UnderstandingItem[]>([])
  const steps = ref<Step[]>([])
  const results = ref<Result[]>([])
  const progress = ref<ProgressEntry[]>([])

  /* ------------------------------------------------------------ 计算 */

  const weeksLeft = computed(() => Math.max(0, meta.value.totalWeeks - meta.value.currentWeek))

  const understandingById = computed(
    () => new Map(understanding.value.map((item) => [item.id, item])),
  )

  const byKey = (key: UnderstandingKey) => understanding.value.filter((item) => item.key === key)

  /** 待你处理：还没确认的理解条目。系统的推断一律先停在这里 */
  const pendingItems = computed(() =>
    understanding.value.filter((item) => item.confidence !== 'confirmed'),
  )

  const unorganizedMaterials = computed(() => materials.value.filter((item) => !item.organizedAt))

  /** 当前显示的步骤：未完成的排在前面，已完成的沉到进展记录里 */
  const activeSteps = computed(() => steps.value.filter((step) => step.status !== 'done'))

  const solvingSteps = computed(() => steps.value.filter((step) => step.status === 'doing'))

  function isAnswered(questionId: string) {
    return results.value.some((result) => result.solvedWhich === questionId)
  }

  /** 步骤挂在哪一条理解上；界面按它的类型显示「当前问题」或「待确认事项」 */
  function anchorOf(step: Step): UnderstandingItem | undefined {
    return understandingById.value.get(step.questionId)
  }

  function resultOf(stepId: string): Result | undefined {
    return results.value.find((result) => result.stepId === stepId)
  }

  function materialName(id?: string) {
    if (!id) return ''
    return materials.value.find((material) => material.id === id)?.name ?? ''
  }

  /* ------------------------------------------------------------ 材料 */

  function addMaterial(input: { name: string; type: MaterialType; text: string; note?: string }) {
    const material: Material = {
      id: nextId('mat'),
      name: input.name.trim() || '未命名材料',
      type: input.type,
      text: input.text.trim(),
      note: input.note?.trim() || undefined,
      uploadedAt: stamp(),
    }
    materials.value = [...materials.value, material]
    return material
  }

  /**
   * 整理：把还没整理过的材料读成四块草稿。
   * 抽出来的每一条都标 inferred，并且带上它来自哪份材料的哪一部分。
   */
  function organize() {
    const targets = unorganizedMaterials.value
    if (!targets.length) return 0

    const drafts = targets.flatMap((material) => extractUnderstanding(material))
    const existing = new Set(understanding.value.map((item) => item.text))
    const fresh = drafts.filter((draft) => !existing.has(draft.text))

    understanding.value = [
      ...understanding.value,
      ...fresh.map((draft) => ({
        id: draft.id,
        key: draft.key,
        text: draft.text,
        confidence: draft.confidence,
        origin: draft.origin,
        source: draft.source,
        at: stamp(),
      })),
    ]

    const organizedIds = new Set(targets.map((material) => material.id))
    materials.value = materials.value.map((material) =>
      organizedIds.has(material.id) ? { ...material, organizedAt: stamp() } : material,
    )
    meta.value.updatedAt = stamp()
    return fresh.length
  }

  /* ---------------------------------------------------------- 理解确认 */

  function confirmItem(id: string) {
    understanding.value = understanding.value.map((item) =>
      item.id === id ? { ...item, confidence: 'confirmed', at: stamp() } : item,
    )
  }

  /** 改动过内容的一律记为学生自己写的，规则 1 里这一条最重要 */
  function reviseItem(id: string, text: string) {
    const next = text.trim()
    if (!next) return
    understanding.value = understanding.value.map((item) =>
      item.id === id ? { ...item, text: next, confidence: 'confirmed', origin: 'student', at: stamp() } : item,
    )
  }

  /** 删掉：系统猜错了。删掉之后不再出现在状态里 */
  function rejectItem(id: string) {
    understanding.value = understanding.value.filter((item) => item.id !== id)
  }

  function confirmAll() {
    understanding.value = understanding.value.map((item) =>
      item.confidence === 'confirmed' ? item : { ...item, confidence: 'confirmed', at: stamp() },
    )
  }

  /* ------------------------------------------------------------ 步骤 */

  /** 重新判断下一步：只补新步骤，不覆盖已经存在的 */
  function refreshNext() {
    const fresh = suggestSteps({
      items: understanding.value,
      results: results.value,
      steps: steps.value,
      meta: meta.value,
    })
    if (fresh.length) steps.value = [...steps.value, ...fresh]
    return fresh.length
  }

  function startStep(id: string) {
    steps.value = steps.value.map((step) => (step.id === id ? { ...step, status: 'doing' } : step))
  }

  function stepById(id: string) {
    return steps.value.find((step) => step.id === id)
  }

  /**
   * 完成一步：留下结果与证据，项目状态随之更新。
   * 这是整个系统里唯一会改变项目状态的动作——读资料不会。
   */
  function completeStep(
    stepId: string,
    input: { didWhat: string; foundWhat: string; solvedWhich: string; stillUnsure: string },
  ) {
    const step = stepById(stepId)
    if (!step) return

    const at = stamp()
    const result: Result = { stepId, ...input, at }
    results.value = [...results.value, result]
    steps.value = steps.value.map((item) => (item.id === stepId ? { ...item, status: 'done' } : item))

    const changes: string[] = []

    const solved = input.solvedWhich !== 'none' ? understandingById.value.get(input.solvedWhich) : undefined
    if (solved) changes.push(`「${solved.text}」有了一次结果落地`)

    // 还没确定的事进「待确认事项」——规则 1 要求它必须标成待确认
    if (input.stillUnsure.trim()) {
      const item: UnderstandingItem = {
        id: nextId('u'),
        key: 'toConfirm',
        text: input.stillUnsure.trim(),
        confidence: 'uncertain',
        origin: 'student',
        source: {
          materialId: '',
          locator: `来自步骤：${step.title}`,
          quote: input.stillUnsure.trim(),
        },
        at,
      }
      understanding.value = [...understanding.value, item]
      changes.push(`新增一条待确认事项：${input.stillUnsure.trim().slice(0, 34)}`)
    }

    changes.push(`步骤「${step.title}」标记为已完成`)
    if (!solved) changes.unshift('这一步没有解决任何一个已确认的问题——请确认它是不是白做了')

    progress.value = [
      {
        id: nextId('p'),
        at,
        stepId,
        stepTitle: step.title,
        summary: input.foundWhat.trim() || input.didWhat.trim(),
        changes,
      },
      ...progress.value,
    ]

    meta.value.updatedAt = at
  }

  /* ------------------------------------------------------------ 初始化 */

  function init() {
    // 材料先整理一遍，理解条目由此产生
    organize()

    // 起点不是零：项目已经走完一步
    const doneId = nextId('step')
    const doneStep: Step = {
      id: doneId,
      title: seedCompleted.step.title,
      whyNow: seedCompleted.step.whyNow,
      questionId: seedCompleted.step.questionId,
      status: 'done',
      resources: resourcesFor(`${seedCompleted.step.title} 统计分析 数据质量 阈值`),
      at: seedCompleted.step.at,
    }
    steps.value = [doneStep]
    results.value = [{ stepId: doneId, ...seedCompleted.result }]
    progress.value = [
      {
        id: nextId('p'),
        at: seedCompleted.result.at,
        stepId: doneId,
        stepTitle: doneStep.title,
        summary: seedCompleted.result.foundWhat,
        changes: seedCompleted.changes,
      },
    ]

    refreshNext()
  }

  init()

  return {
    meta,
    materials,
    understanding,
    steps,
    results,
    progress,

    weeksLeft,
    understandingById,
    byKey,
    pendingItems,
    unorganizedMaterials,
    activeSteps,
    solvingSteps,

    isAnswered,
    anchorOf,
    resultOf,
    materialName,
    stepById,

    addMaterial,
    organize,
    confirmItem,
    reviseItem,
    rejectItem,
    confirmAll,
    refreshNext,
    startStep,
    completeStep,
  }
})
