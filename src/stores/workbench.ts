import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MaterialType, Project, Template } from '@/types/platform'
import { TEMPLATES, TOPICS } from '@/data/topics'
// 论文方向只从这一个入口取：现在返回模板预置内容，接入后端后换实现即可，页面无需改动
import { generateDirection, genericDirections, presetDirections } from '@/services/papers'

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

  /* -------------------------------------------------------- 步骤与疑问 */

  /** 认领一步：把它标记为进行中的里程碑，并记一条证据占位 */
  function claimStep(stepIndex: number) {
    const project = current.value
    if (!project) return
    const step = project.steps[stepIndex]
    if (!step) return
    const cur = project.ms.find((m) => m.s === 'cur')
    if (cur && cur.p < 90) cur.p = Math.min(90, cur.p + 25)
    project.updated = `最近更新：认领了步骤 ${stepIndex + 1}「${step.t}」`
    toast(`已认领步骤 ${stepIndex + 1}，完成后请提交证据`)
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
    claimStep,
    askAboutStep,
    resolveDoubt,
    sendChat,
    submitEvidence,
    askPaperAi,
  }
})
