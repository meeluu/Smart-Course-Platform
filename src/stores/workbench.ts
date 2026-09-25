import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MaterialType, Project, Template } from '@/types/platform'
import { TEMPLATES, TOPICS } from '@/data/topics'
// 论文方向只从这一个入口取：现在返回模板预置内容，接入后端后换实现即可，页面无需改动
import { generateDirection, genericDirections, presetDirections } from '@/services/papers'
// 建议请求：适配层负责 HTTP 与契约校验，mvpFallbacks 负责后端不可用时的本地兜底
import {
  buildAdvisorRequest,
  fetchRecommendations,
  isStaleResponseError,
  shouldFallbackToLocalRule,
  toRecommendations,
} from '@/services/advisorApi'
import { buildLocalRecommendations } from '@/data/mvpFallbacks'
import { deriveDoubtSnapshots, deriveEvidenceSnapshots } from '@/domain/activity'
import {
  buildTaskId,
  computeProjectRevision,
  currentMilestoneName,
  deriveProjectId,
  deriveTaskSnapshots,
} from '@/domain/progress'
import { buildTaskFromDraft } from '@/domain/task'
import type { ClaimTaskResult, NewTaskDraft, Task } from '@/domain/task'
import type {
  ActionResult,
  AdvisorApiError,
  AdvisorFallbackReason,
  Recommendation,
  RecommendationSource,
  TaskStatus,
} from '@/domain/recommendation'

/** 近 4 周的时间标签，与 mockup 一致 */
export const WEEK_LABELS = ['8.31-9.6', '9.7-9.13', '9.14-9.20', '9.21-9.27']

/** 中文序号，用于里程碑编号 */
export const CHINESE_NUM = ['①', '②', '③', '④', '⑤', '⑥']

/** 答疑模式下的回复池：给方向，不给答案 */
const AI_REPLIES = [
  '项目刚启动，建议先按推荐的步骤走——完成任何一步后记得提交证据，我会据此更新状态并给出下一步。',
  '这个问题可以先用「论文推荐」页的检索提示词查一查，把文献结论带回组内讨论，调研结论本身就是很好的第一条证据。',
  '我不直接给答案，但提示一个方向：先想清楚这个问题影响哪个里程碑的决策——如果影响启动方向就值得现在花时间；如果只是细节，先记下来往前走。',
  '如果想深入了解某个具体方向，可以去「论文推荐」页让 AI 生成针对性的检索提示词。',
]

/** 建议请求的状态机（契约 5.3） */
export type AiStatus = 'idle' | 'loading' | 'model' | 'fallback' | 'local-rule' | 'error'

/** refreshRecommendations 的成功返回（契约 3.2） */
export interface AdvisorOutcome {
  source: RecommendationSource
  suggestions: Recommendation[]
  cached: boolean
  fallbackReason: AdvisorFallbackReason | null
  requestId: string | null
}

/**
 * 单个项目的建议状态。
 * 按项目分开存：切换项目时天然隔离，旧响应不会串写到新项目。
 * 目前只在内存里（现有 store 没有持久化）；后续要落 localStorage 时，
 * 这个结构里都是可序列化的普通对象，直接挂到现有持久化方式上即可。
 */
interface AdvisorState {
  status: AiStatus
  suggestions: Recommendation[]
  /** 失败原因，留给界面层映射文案；不要把技术错误直接当成用户文案 */
  error: AdvisorApiError | null
  /** 这批建议对应的请求与项目版本 */
  requestId: string | null
  projectRevision: number
  cached: boolean
  fallbackReason: AdvisorFallbackReason | null
}

function emptyAdvisorState(): AdvisorState {
  return {
    status: 'idle',
    suggestions: [],
    error: null,
    requestId: null,
    projectRevision: 0,
    cached: false,
    fallbackReason: null,
  }
}

/** 契约 4.0：可重试的失败自动重试一次，退避 1 秒 */
const RETRY_DELAY_MS = 1_000

/**
 * 工作台状态
 * ----------------------------------------------------------------------------
 * 多项目：可以创建多个项目并在左栏切换。所有数据驻留内存，刷新即重置。
 */
export const useWorkbenchStore = defineStore('workbench', () => {
  const projects = ref<Project[]>([])
  const curIdx = ref(-1)
  /** 是否停在「创建项目」界面 */
  const creating = ref(true)
  const toastText = ref('')
  const toastVisible = ref(false)

  let toastTimer: number | undefined
  let replyIdx = 0

  const current = computed<Project | undefined>(() =>
    curIdx.value >= 0 ? projects.value[curIdx.value] : undefined,
  )
  const hasProject = computed(() => Boolean(current.value))

  /* ------------------------------------------------------------ 建议状态 */

  /** 每个项目一份建议状态，key 是派生出的 projectId */
  const advisorByProject = ref<Record<string, AdvisorState>>({})
  /** 在途请求序号：只有最后一次请求的响应才允许写入 */
  let inFlightToken = 0
  /** 在途请求的控制器：新请求会取消上一次（契约 4.7 第 4 条） */
  let inFlightAbort: AbortController | null = null

  /** 当前项目的 projectId（现有 Project 没有 id，由 name + group 派生） */
  const currentProjectId = computed<string | null>(() =>
    current.value === undefined ? null : deriveProjectId(current.value),
  )

  /** 当前项目的建议状态；没有项目或还没请求过时是空状态 */
  const advisor = computed<AdvisorState>(() => {
    const projectId = currentProjectId.value
    if (projectId === null) return emptyAdvisorState()
    return advisorByProject.value[projectId] ?? emptyAdvisorState()
  })

  /** 页面直接用的三个读法：状态 / 建议列表 / 失败原因 */
  const aiStatus = computed<AiStatus>(() => advisor.value.status)
  const recommendations = computed<Recommendation[]>(() => advisor.value.suggestions)
  const aiError = computed<AdvisorApiError | null>(() => advisor.value.error)

  /** 只替换目标项目的那一份状态，不碰其他项目 */
  function patchAdvisor(projectId: string, patch: Partial<AdvisorState>): void {
    const previous = advisorByProject.value[projectId] ?? emptyAdvisorState()
    advisorByProject.value = {
      ...advisorByProject.value,
      [projectId]: { ...previous, ...patch },
    }
  }

  /* ------------------------------------------------------------ 提示条 */

  function toast(message: string) {
    toastText.value = message
    toastVisible.value = true
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => (toastVisible.value = false), 2600)
  }

  /* ---------------------------------------------------------- 创建项目 */

  function showCreate() {
    creating.value = true
    window.scrollTo(0, 0)
  }

  function selectProject(index: number) {
    curIdx.value = Number(index)
  }

  /** 自定义题目的通用模板，字段与 mockup 一致，名称按输入插值 */
  function customTemplate(name: string): Template {
    return {
      short: name.length > 8 ? `${name.slice(0, 8)}…` : name,
      ms: [
        { t: '选题确认与文献调研', s: 'cur', p: 10, sub: '刚启动' },
        { t: '数据获取与预处理', s: 'todo', p: 0, sub: '未开始' },
        { t: '核心方法 / 模型实现', s: 'todo', p: 0, sub: '未开始' },
        { t: '分析与验证', s: 'todo', p: 0, sub: '未开始' },
        { t: '系统集成与结题报告', s: 'todo', p: 0, sub: '未开始' },
      ],
      doubts: ['项目的具体范围和技术路线还没有和指导老师确认'],
      banner:
        '项目刚启动。建议先把三件事定下来：研究目标的一句话描述、主流方法的文献调研、数据或工具的可获取性验证。上传实验手册后，我可以按手册要求进一步细化步骤。',
      steps: [
        {
          t: '用一句话写清项目目标与预期产出',
          owner: '成员A',
          why: '目标不清是所有后续分歧的根源。一句话目标（为谁、解决什么、产出什么）能让全组对齐，也是 AI 追踪进度的基准。',
          done: '一句话目标 + 预期产出清单，全组确认。',
        },
        {
          t: '完成主流方法的文献调研',
          owner: '成员B',
          why: '不了解现有方法就动手，大概率走弯路。用「论文推荐」页的检索提示词查 5-8 篇相关文献。',
          done: '调研笔记：2-3 类主流方法 + 各自优缺点 + 初步倾向。',
        },
        {
          t: '验证数据 / 工具的可获取性',
          owner: '成员C',
          why: '大数据项目最常见的失败原因是数据拿不到或环境搭不起来，第一周必须验证。',
          done: '确认数据来源或工具链可用，附验证记录。',
        },
      ],
      // 通用论文方向搬到 services/papers.ts，这里不再内联
      papers: genericDirections(name),
    }
  }

  function createProject(input: {
    topic: string
    customName: string
    members: string
    manual: string | null
    data: string | null
  }) {
    if (!input.topic) {
      toast('请先选择项目题目')
      return
    }

    let name: string
    let tpl: Template

    if (input.topic === '__custom__') {
      name = input.customName.trim()
      if (!name) {
        toast('请填写自定义项目名称')
        return
      }
      tpl = customTemplate(name)
    } else {
      name = input.topic
      tpl = TEMPLATES[input.topic]
    }

    const project: Project = {
      ...JSON.parse(JSON.stringify(tpl)),
      // 覆盖模板里的 papers：论文方向的唯一来源，便于日后换成后端接口
      papers: presetDirections({ topic: input.topic, projectName: name }),
      name,
      group: `第 ${projects.value.length + 1} 组`,
      members: input.members.replace('人', '名成员'),
      updated: '项目创建于今天 · 等待第一条证据',
      evidence: [],
      weekly: [0, 0, 0, 0],
      materials: [],
      chat: [
        {
          who: 'AI 顾问',
          me: false,
          text: `你好，我是「${tpl.short}」项目的顾问。项目刚启动，我已为你们生成了最初的步骤（见上方推荐）。上传实验手册或数据集后，我会解析内容让步骤追踪更精准。有问题随时问我。`,
        },
      ],
      aiPapers: [],
    }

    if (input.manual) project.materials.push({ name: input.manual, type: '实验手册' })
    if (input.data) project.materials.push({ name: input.data, type: '数据集' })

    projects.value = [...projects.value, project]
    curIdx.value = projects.value.length - 1
    creating.value = false
    window.scrollTo(0, 0)

    toast(
      project.materials.length
        ? `项目已创建，AI 已解析 ${project.materials.length} 份材料并开始追踪步骤`
        : '项目已创建，AI 已生成启动步骤',
    )
  }

  /* ---------------------------------------------------------- 材料上传 */

  function uploadMaterial(type: MaterialType, fileName: string) {
    const project = current.value
    if (!project) return
    project.materials.push({ name: fileName, type })
    if (type === '实验手册') toast('AI 已解析实验手册，将按手册要求校准里程碑与完成标志')
    else if (type === '数据集') toast('AI 已登记数据集，「数据获取与预处理」阶段将按此追踪')
    else toast('材料已上传，AI 已纳入项目状态')
  }

  /* -------------------------------------------------------- 任务与认领 */

  /**
   * 已认领 / 已创建的任务，按 projectId 分开存：切换项目天然隔离，任务不会串项目。
   * 现有 Project 是模板结构（steps 既没有 id 也没有状态），所以任务记录先放在这里；
   * 将来 Project 迁成结构化任务数组时把它搬进去即可，claimTask 的公开接口不变。
   * 类型与 id 规则见 src/domain/task.ts。
   */
  const tasksByProject = ref<Record<string, Task[]>>({})

  /** 当前项目已落库的任务 */
  const tasks = computed<Task[]>(() => {
    const projectId = currentProjectId.value
    if (projectId === null) return []
    return tasksByProject.value[projectId] ?? []
  })

  /**
   * 当前项目全部任务的状态（含由 steps 派生的任务）。
   * 页面据此判断"已认领"，不必自己在组件里记一份页面局部状态。
   */
  const taskStatusById = computed<Record<string, TaskStatus>>(() => {
    const project = current.value
    if (project === undefined) return {}

    const statuses: Record<string, TaskStatus> = {}
    for (const snapshot of deriveTaskSnapshots(project, new Date(), tasks.value)) {
      statuses[snapshot.taskId] = snapshot.status
    }
    return statuses
  })

  /** 整体替换某个项目的任务列表（保证响应式，且顺序稳定） */
  function writeTasks(projectId: string, list: Task[]): void {
    tasksByProject.value = { ...tasksByProject.value, [projectId]: list }
  }

  /**
   * 认领任务（契约 3.2 的 claimTask）
   * ----------------------------------------------------------------------------
   * 两种入参互斥、且必须给一个：
   *
   *   `{ taskId }` —— 认领**已有任务**：由 steps 派生的任务，或之前创建的任务；
   *   `{ draft }`  —— 认领建议里的**新任务候选**（`existingTaskId === null`）：
   *                   由前端生成 taskId，任务直接以 `doing` 落库（不经过 `todo`）。
   *
   * 不访问网络、不改服务端：任务只写进本地项目状态。
   *
   * 幂等：draft 的 taskId 由内容派生（见 domain/task.ts），同一份 draft 必然得到
   * 同一个 id，所以重复点击不会创建第二条任务；已经在进行中的任务不会重复认领，
   * 也不会再加进度。
   */
  function claimTask(
    input: { taskId: string } | { draft: NewTaskDraft },
  ): ActionResult<ClaimTaskResult> {
    const project = current.value
    if (project === undefined) {
      return { ok: false, code: 'NOT_FOUND', message: '还没有项目，无法认领任务' }
    }

    const hasTaskId = 'taskId' in input
    const hasDraft = 'draft' in input
    if (hasTaskId === hasDraft) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        message: '认领任务需要且只能提供 taskId 或 draft 之一',
      }
    }

    const projectId = deriveProjectId(project)
    const known = tasksByProject.value[projectId] ?? []

    /* ---- 新任务候选：落一条真实任务，直接 doing ---- */
    if (hasDraft) {
      const draft = input.draft
      if (draft.title.trim() === '') {
        return { ok: false, code: 'INVALID_INPUT', message: '这条建议没有标题，无法创建任务' }
      }

      const task = buildTaskFromDraft({
        projectId,
        draft,
        milestone: currentMilestoneName(project),
        now: new Date().toISOString(),
      })

      // 幂等：已经创建过同一条任务就什么都不做（同一条建议重复点击只产生一次任务）
      if (known.some((item) => item.taskId === task.taskId)) {
        toast(`「${task.title}」已经认领过了`)
        return {
          ok: true,
          data: {
            taskId: task.taskId,
            status: 'doing',
            projectRevision: computeProjectRevision(project, known),
          },
        }
      }

      const next = [...known, task]
      writeTasks(projectId, next)
      project.updated = `最近更新：把建议「${task.title}」认领为新任务`
      toast(`已认领「${task.title}」，完成后请提交证据`)

      return {
        ok: true,
        data: {
          taskId: task.taskId,
          status: 'doing',
          projectRevision: computeProjectRevision(project, next),
        },
      }
    }

    /* ---- 已有任务：必须属于当前项目，且不能已完成 ---- */
    const taskId = input.taskId
    const stepTasks = deriveTaskSnapshots(project, new Date())
    const stepIndex = stepTasks.findIndex((task) => task.taskId === taskId)
    const recorded = known.find((task) => task.taskId === taskId)

    if (stepIndex < 0 && recorded === undefined) {
      return { ok: false, code: 'NOT_FOUND', message: '这个任务已经不在当前项目里，请刷新后重试' }
    }

    const status: TaskStatus = recorded !== undefined ? recorded.status : stepTasks[stepIndex].status
    if (status === 'done') {
      return { ok: false, code: 'TASK_NOT_CLAIMABLE', message: '这个任务已经完成，不需要再认领' }
    }
    if (status === 'doing') {
      toast('这个任务已经在进行中，不用重复认领')
      return {
        ok: true,
        data: { taskId, status: 'doing', projectRevision: computeProjectRevision(project, known) },
      }
    }

    const now = new Date().toISOString()
    const step = stepIndex >= 0 ? project.steps[stepIndex] : undefined
    const next: Task[] =
      step === undefined
        ? known.map((task) => (task.taskId === taskId ? { ...task, status: 'doing', updatedAt: now } : task))
        : [
            ...known,
            {
              taskId,
              projectId,
              title: step.t,
              status: 'doing',
              doneCriteria: step.done.trim() === '' ? null : step.done,
              owner: step.owner.trim() === '' ? null : step.owner,
              milestone: currentMilestoneName(project),
              requestId: null,
              basisEvidenceIds: [],
              basisDoubtIds: [],
              createdAt: now,
              updatedAt: now,
            },
          ]
    writeTasks(projectId, next)

    // 认领仍然沿用现有行为：进行中的里程碑 +25
    const cur = project.ms.find((m) => m.s === 'cur')
    if (cur && cur.p < 90) cur.p = Math.min(90, cur.p + 25)

    project.updated =
      step === undefined
        ? `最近更新：认领了任务「${taskId}」`
        : `最近更新：认领了步骤 ${stepIndex + 1}「${step.t}」`
    toast(
      step === undefined
        ? '已认领该任务，完成后请提交证据'
        : `已认领步骤 ${stepIndex + 1}，完成后请提交证据`,
    )

    return {
      ok: true,
      data: { taskId, status: 'doing', projectRevision: computeProjectRevision(project, next) },
    }
  }

  /* -------------------------------------------------------- 步骤与疑问 */

  /**
   * 兼容入口：页面对外只用 claimTask。
   * 这里把步骤下标换算成 taskId，内部走同一套认领逻辑，行为与原来一致。
   */
  function claimStep(stepIndex: number): void {
    const project = current.value
    if (!project) return
    claimTask({ taskId: buildTaskId(deriveProjectId(project), stepIndex) })
  }

  function askAboutStep(stepIndex: number) {
    const project = current.value
    if (!project) return
    const step = project.steps[stepIndex]
    if (!step) return
    project.chat.push({
      who: '我',
      me: true,
      text: `关于步骤 ${stepIndex + 1}「${step.t}」，我想先了解：${step.why.slice(0, 40)}…该怎么开始？`,
    })
    project.chat.push({
      who: 'AI 顾问',
      me: false,
      text: `这一步的完成标志是「${step.done}」。建议先做其中的文献部分——用「论文推荐」页的提示词检索，把结论整理成一页笔记，那就是最初的证据。`,
    })
    toast('已就该步骤向 AI 提问')
  }

  function resolveDoubt(index: number) {
    const project = current.value
    if (!project) return
    const doubt = project.doubts[index]
    project.doubts.splice(index, 1)
    project.evidence.unshift({
      time: nowLabel(),
      text: `已解决疑问：${doubt}`,
      who: '我 · 刚更新',
    })
    toast('疑问已标记解决，并记入证据')
  }

  /* ------------------------------------------------------------ 问答 */

  function sendChat(text: string) {
    const project = current.value
    if (!project || !text.trim()) return
    project.chat.push({ who: '我', me: true, text: text.trim() })
    const reply = AI_REPLIES[replyIdx % AI_REPLIES.length]
    replyIdx += 1
    window.setTimeout(() => {
      project.chat.push({ who: 'AI 顾问', me: false, text: reply })
    }, 600)
  }

  /* -------------------------------------------------------- 提交证据 */

  function submitEvidence(input: {
    stepLabel: string
    didWhat: string
    foundWhat: string
    solved: string
    unsure: string
    attachment: string | null
  }) {
    const project = current.value
    if (!project) return
    if (!input.didWhat.trim()) {
      toast('请先写清「完成了什么」')
      return
    }

    const parts = [input.didWhat.trim()]
    if (input.foundWhat.trim()) parts.push(`发现：${input.foundWhat.trim()}`)
    if (input.solved.trim()) parts.push(`解决：${input.solved.trim()}`)
    if (input.unsure.trim()) parts.push(`待定：${input.unsure.trim()}`)
    if (input.attachment) parts.push(`附件：${input.attachment}`)

    project.evidence.unshift({
      time: nowLabel(),
      text: `【${input.stepLabel}】${parts.join('；')}`,
      who: '我 · 刚提交',
    })

    // 还没确定的事进「未解决的疑问」
    if (input.unsure.trim()) project.doubts.push(input.unsure.trim())

    // 提交证据 = 本周有活跃
    project.weekly[3] += 1

    project.updated = `最近更新：提交了「${input.stepLabel}」的证据 · 共 ${project.evidence.length} 条`
    toast('证据已提交，AI 已更新项目状态与下一步建议')
  }

  function nowLabel() {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `09-23 ${pad(now.getHours())}:${pad(now.getMinutes())}`
  }

  /* ------------------------------------------------------ 论文推荐 */

  function askPaperAi(topic: string) {
    const project = current.value
    if (!project) {
      toast('请先创建项目')
      return
    }
    if (!topic.trim()) {
      toast('先描述一下你想了解的方向')
      return
    }
    const curMs = (project.ms.find((m) => m.s === 'cur') || { t: '当前阶段' }).t
    project.aiPapers.unshift(
      generateDirection({
        projectName: project.name,
        shortName: project.short,
        currentMilestone: curMs,
        ask: topic,
      }),
    )
    toast('AI 已生成专属检索提示词')
  }

  /* -------------------------------------------------------- 建议请求流程 */

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  /** 把未预期异常收敛成界面可用的失败原因：只记类型名，不外泄技术细节 */
  function toUnexpectedError(error: unknown): AdvisorApiError {
    console.warn('[advisor] 建议流程出现未预期异常', error instanceof Error ? error.name : 'unknown')
    return {
      code: 'NETWORK_ERROR',
      message: '建议请求未能完成',
      retryable: true,
      retryAfterSeconds: null,
      requestId: null,
      cause: 'network',
    }
  }

  /**
   * 请求下一步建议（契约 3.2 的 refreshRecommendations）。
   *
   * 流程：组装请求 → 记录发起时的 projectId / projectRevision → 调用适配层
   *      → 校验响应是否过期 → 写入状态；后端失败时改用本地规则（source=local-rule），
   *      本地规则也给不出建议才进入 error。
   *
   * 三条不变量：只改建议状态（不动任务、证据、疑问），不抛未处理异常，过期响应不改任何状态。
   */
  async function refreshRecommendations(
    options: { forceRefresh?: boolean } = {},
  ): Promise<ActionResult<AdvisorOutcome>> {
    const project = current.value
    if (project === undefined) {
      return { ok: false, code: 'NOT_FOUND', message: '还没有项目，无法请求建议' }
    }

    // 发起请求时的快照与身份：响应用它们判断是否已经过期
    // 已认领/已创建的任务也要一起带上，否则服务端会再次推荐同一条任务
    const createdTasks = tasks.value
    const reference = new Date()
    const projectId = deriveProjectId(project)
    const projectRevision = computeProjectRevision(project, createdTasks)
    const currentMilestone = currentMilestoneName(project)
    const taskSnapshots = deriveTaskSnapshots(project, reference, createdTasks)
    const evidence = deriveEvidenceSnapshots(project, reference)
    const doubts = deriveDoubtSnapshots(project, reference)
    const generatedAt = reference.toISOString()

    const request = buildAdvisorRequest({
      projectId,
      projectRevision,
      projectName: project.name,
      currentMilestone,
      tasks: taskSnapshots,
      evidence,
      doubts,
      forceRefresh: options.forceRefresh ?? false,
    })

    // 本地规则与请求体同源：后端不可用时，兜底建议必须基于同一份快照
    const localInput = {
      generatedAt,
      projectRevision,
      currentMilestone,
      tasks: taskSnapshots,
      evidence,
      doubts,
    }

    // 新请求作废前一次在途请求
    inFlightAbort?.abort()
    const controller = new AbortController()
    inFlightAbort = controller
    inFlightToken += 1
    const token = inFlightToken

    patchAdvisor(projectId, {
      status: 'loading',
      suggestions: [],
      error: null,
      requestId: request.requestId,
      projectRevision,
      cached: false,
      fallbackReason: null,
    })

    /** 丢弃过期响应：当前项目的状态一律不动（契约 4.7 补充约定 1） */
    const discard = (): ActionResult<AdvisorOutcome> => {
      // 项目已经切走时，把它自己的 loading 收尾，避免切回来看到永远转圈的状态
      if (currentProjectId.value !== projectId) {
        const state = advisorByProject.value[projectId]
        if (state !== undefined && state.status === 'loading' && state.requestId === request.requestId) {
          patchAdvisor(projectId, { status: 'idle', requestId: null })
        }
      }
      return { ok: false, code: 'STALE_RESPONSE', message: '该建议响应已过期，已丢弃' }
    }

    /** 契约 5.1：后端失败 → 本地规则；本地规则也空 → error */
    const fallbackToLocalRule = (error: AdvisorApiError): ActionResult<AdvisorOutcome> => {
      const suggestions = buildLocalRecommendations(localInput)

      if (suggestions.length > 0) {
        patchAdvisor(projectId, {
          status: 'local-rule',
          suggestions,
          // 失败原因留给界面层映射文案
          error,
          cached: false,
          fallbackReason: null,
          requestId: null,
          projectRevision,
        })
        return {
          ok: true,
          data: {
            source: 'local-rule',
            suggestions,
            cached: false,
            fallbackReason: null,
            requestId: null,
          },
        }
      }

      patchAdvisor(projectId, {
        status: 'error',
        suggestions: [],
        error,
        requestId: null,
        projectRevision,
      })
      return { ok: false, code: error.code, message: error.message }
    }

    try {
      let result = await fetchRecommendations(request, { signal: controller.signal })

      // 契约 4.0：可重试的失败自动重试 1 次。契约把它划给适配层，
      // 适配层本轮不改，先在 store 里补上；后续可以下移。
      if (!result.ok && result.error.retryable && !controller.signal.aborted && token === inFlightToken) {
        await delay(RETRY_DELAY_MS)
        if (!controller.signal.aborted && token === inFlightToken) {
          result = await fetchRecommendations(request, { signal: controller.signal })
        }
      }

      // 过期判断（契约 4.7 第 1~4 条）
      if (token !== inFlightToken) return discard()
      if (currentProjectId.value !== projectId) return discard()
      if (computeProjectRevision(project, createdTasks) !== projectRevision) return discard()

      if (result.ok) {
        const suggestions = toRecommendations(result.data)
        const status: AiStatus = result.data.source === 'model' ? 'model' : 'fallback'

        patchAdvisor(projectId, {
          status,
          suggestions,
          error: null,
          cached: result.data.cached,
          fallbackReason: result.data.fallbackReason,
          requestId: result.data.requestId,
          projectRevision,
        })

        return {
          ok: true,
          data: {
            source: result.data.source,
            suggestions,
            cached: result.data.cached,
            fallbackReason: result.data.fallbackReason,
            requestId: result.data.requestId,
          },
        }
      }

      // 适配层已判定的过期响应：静默丢弃，不提示用户
      if (isStaleResponseError(result.error) || !shouldFallbackToLocalRule(result.error)) {
        return discard()
      }

      return fallbackToLocalRule(result.error)
    } catch (unexpected) {
      return fallbackToLocalRule(toUnexpectedError(unexpected))
    } finally {
      if (inFlightAbort === controller) inFlightAbort = null
    }
  }

  return {
    projects,
    curIdx,
    creating,
    toastText,
    toastVisible,
    current,
    hasProject,
    topics: TOPICS,
    toast,
    showCreate,
    selectProject,
    createProject,
    uploadMaterial,
    // 任务与认领（契约 3.2）：claimTask 是唯一的认领入口；
    // claimStep 只作为兼容入口保留，内部同样走 claimTask
    tasks,
    taskStatusById,
    claimTask,
    claimStep,
    askAboutStep,
    resolveDoubt,
    sendChat,
    submitEvidence,
    askPaperAi,
    // 建议请求（契约 3.2）：状态 + 读取器 + action
    advisor,
    aiStatus,
    recommendations,
    aiError,
    refreshRecommendations,
  }
})
