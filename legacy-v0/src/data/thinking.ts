import type {
  Advice,
  BlockerKind,
  Decision,
  Kickoff,
  KnowledgeLink,
  ProjectNode,
  StateBoard,
  ThinkingAction,
  ThinkingQuestion,
} from '@/types/project'
import { docById } from './materials'
import { searchBlocks } from '@/utils/content'

/**
 * 思考引擎
 * ----------------------------------------------------------------------------
 * 这是整个系统最重要的部分：AI 不负责给答案，而负责在项目状态变化后，
 * 决定此刻该让学生做哪种思考。八类思考动作对应需求文档中的八种情境。
 *
 * 所有产出都是「追问」而不是「结论」；需要课程知识时，知识以小卡形式出现，
 * 并且必须带一个追问，让学生把知识转成项目判断
 * （课程知识 → 当前项目问题 → 学生判断 → 项目节点）。
 */

/* ------------------------------------------------------------ 关键词判定 */

const BLOCKER_KEYWORDS: Record<BlockerKind, string[]> = {
  requirement: ['需求', '要求', '范围', '边界', '验收', '标准', '赛题', '交付', '评审'],
  data: ['数据', '缺失', '异常', '采样', '量纲', '格式', '精度', '网格', '内存', '读取'],
  method: ['方法', '模型', '算法', '参数', '归一化', '标准化', '特征', '训练', '公式'],
  interpretation: ['结果', '结论', '支持', '解释', '显著', '趋势', '说明', '证据'],
  collaboration: ['分工', '进度', '沟通', '配合', '队友', '组内', '时间', '排期'],
}

/** 八类思考动作的中文名（界面上不出现英文枚举） */
export const thinkingLabel: Record<ThinkingAction['kind'], string> = {
  frame: '追问：到底要解决什么',
  align: '对齐：它在回答哪个问题',
  evidence: '证据：结果支持什么',
  rationale: '依据：为什么这样选',
  diagnose: '诊断：真正卡在哪里',
  monitor: '监控：哪些工作推进了核心问题',
  critique: '评判：接受、部分接受还是拒绝',
  reflect: '反思：项目认识发生了什么改变',
}

export const blockerLabel: Record<BlockerKind, { label: string; hint: string; toTeacher: boolean }> = {
  requirement: { label: '需求边界', hint: '这类问题 AI 不应替你决定', toTeacher: true },
  data: { label: '数据问题', hint: '通常可以先自己查清', toTeacher: false },
  method: { label: '方法取舍', hint: '先明确评价标准再比较', toTeacher: false },
  interpretation: { label: '结果解释', hint: '关键是证据够不够', toTeacher: false },
  collaboration: { label: '协作问题', hint: '多半需要团队内部对齐', toTeacher: false },
}

/** 判断卡点类型；命中多个时取出现次数最多者 */
export function classifyBlocker(text: string): BlockerKind | undefined {
  const hit = new Map<BlockerKind, number>()
  ;(Object.keys(BLOCKER_KEYWORDS) as BlockerKind[]).forEach((kind) => {
    const score = BLOCKER_KEYWORDS[kind].reduce(
      (sum, word) => sum + (text.includes(word) ? 1 : 0),
      0,
    )
    if (score > 0) hit.set(kind, score)
  })
  if (!hit.size) return undefined
  return [...hit.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/* ------------------------------------------------------------ 知识小卡 */

/** 每条课程知识都配一个追问，确保知识必须转成项目判断 */
const PROBE_BY_BLOCK: Record<string, string> = {
  'slides#L03': '你们当前的样本能代表总体吗？抽样偏差会不会正好落在你要对比的那片区域上？',
  'slides#L04': '你们项目里哪几个字段的量纲或量级不同？当前方法对尺度敏感吗？不做处理会带来什么后果？',
  'slides#L06': '你们用到的距离或聚类方法，对量纲与异常值有多敏感？这一点会不会影响 Q1 的结论？',
  'slides#L07': '这张图在回答哪个项目问题？把颜色通道换成位置通道会更可读吗？',
  'slides#L13': '数据量是否真的超过单机可用内存？引入分布式的收益能覆盖它的调试成本吗？',
  'lab#exp3': '你们算过 5C 各维度的指标吗？哪一维最差，它会影响哪个项目问题？',
  'lab#exp4': '缺失比例最高的字段是多少？你打算插补还是删除，依据是什么？',
  'lab#exp6': '你们的目标 k 是怎么定的？换一个 k，Q1 的结论会变吗？',
  'lab#exp7': '两套视觉方案各自回答什么问题？哪一个能直接支撑当前判断？',
  'spec#s3': '规范要求的四个演示模块里，哪一个目前还没有可运行入口？',
  'grading#g2': '按评分构成，你们现在投入最多的工作落在哪一项上？它占多少分？',
}

const DEFAULT_PROBE = '这条课程知识与你们当前的哪个项目问题对应？请写下来——写不出来，说明它可能不该现在看。'

/** 按项目上下文检索最多 3 条课程知识，只做关联与追问，不给答案 */
export function matchKnowledge(text: string, limit = 3): KnowledgeLink[] {
  const hits = searchBlocks(text, 12)
  const picked: KnowledgeLink[] = []
  const seen = new Set<string>()

  hits.forEach(({ block, doc }) => {
    if (picked.length >= limit) return
    if (doc.kind === 'experience') return
    if (seen.has(doc.docId)) return
    seen.add(doc.docId)
    picked.push({
      blockId: block.id,
      docId: block.docId,
      title: doc.title,
      page: block.page,
      reason: `你们在讨论「${text.slice(0, 18)}${text.length > 18 ? '…' : ''}」，课程材料中的这一节正好相关`,
      probe: PROBE_BY_BLOCK[block.id] ?? DEFAULT_PROBE,
    })
  })

  return picked
}

export function knowledgeDocTitle(docId: string): string {
  return docById.get(docId)?.title ?? docId
}

let seq = 0
export const nextId = (prefix: string) => `${prefix}-${(seq += 1)}`

export function question(text: string): ThinkingQuestion {
  return { id: nextId('q'), text }
}

/* --------------------------------------------------------- 我卡住了：诊断 */

export interface StuckInput {
  /** 我现在在做什么 */
  doing: string
  /** 想回答哪个项目问题 */
  question: string
  /** 已经试过什么 */
  tried: string
  /** 看到了什么结果 */
  saw: string
  /** 希望得到什么帮助 */
  need: string
  /** 剩余周数：让追问能引用现实约束，而不是泛泛而谈 */
  weeksLeft?: number
  /** 已知的约束清单（数据粒度 gap、数据许可等） */
  constraints?: string[]
}

const BLOCKER_QUESTIONS: Record<BlockerKind, string[]> = {
  requirement: [
    '这条需求里，哪一句是你们最不确定的？把它原话抄下来。',
    '如果按你们现在的理解做下去，最坏会错过什么？',
    '这件事谁有权确认——老师、助教，还是需求方？你们打算怎么问？',
  ],
  data: [
    '需求方要的是什么粒度（空间 / 时间 / 精度）？我们手上的数据是什么粒度？差距在哪一层？',
    '这个 gap 在剩余周期内解决得了吗？如果不能，是降尺度、换数据，还是缩范围绕开？',
    '你已经查过数据的哪些方面？还有哪一项完全没查过？',
    '这个数据问题如果不解决，会污染哪一个结论？',
  ],
  method: [
    '你们打算用什么标准判断方法 A 比方法 B 好？',
    '这个评价标准是项目问题要求的，还是顺手选的？',
    '如果两种方法结果接近，你们会怎么选，依据是什么？',
  ],
  interpretation: [
    '现在的结果，能支持的最大结论是什么？不要多说一分。',
    '什么结果会推翻你现在的解释？',
    '这份证据的样本与范围，够支撑到你们声称的那个尺度吗？',
  ],
  collaboration: [
    '卡住的是信息不对称，还是没有人明确负责这件事？',
    '有没有一件事你们反复讨论、但始终没有结论？',
    '这个问题需要团队内部决定，还是需要有人去问外面的人？',
  ],
}

/**
 * 卡点诊断
 * 学生先把背景补足（在做什么、想回答什么、试过什么、看到了什么、想要什么帮助），
 * 系统再判断卡点在需求 / 数据 / 方法 / 结果解释 / 协作，据此决定给知识、继续追问，
 * 还是建议去找老师。
 */
export function diagnoseStuck(input: StuckInput): ThinkingAction {
  const corpus = [input.doing, input.question, input.tried, input.saw, input.need].join(' ')
  const blocker = classifyBlocker(corpus) ?? classifyBlocker(input.need)
  const kind = blocker ?? 'interpretation'

  const base = BLOCKER_QUESTIONS[kind]
  const questions: ThinkingQuestion[] = []

  // 现实约束先摆上桌：剩余周期与已知 gap 是判断卡点值不值得解决的依据
  if (input.weeksLeft !== undefined) {
    questions.push(question(`项目还剩 ${input.weeksLeft} 周。你现在做的这件事，预计要花几周？它排在核心功能前面吗？`))
  }
  if (input.constraints?.length) {
    questions.push(
      question(`已知约束：${input.constraints.join('；')}。哪一条真正挡在你现在这件事上？其余的先不用管。`),
    )
  }

  questions.push(question('你希望得到什么样的帮助？是「告诉我怎么做」，还是「帮我确认问题问对了没有」？'))
  base.forEach((text) => questions.push(question(text)))

  return {
    id: nextId('act'),
    kind: 'diagnose',
    trigger: '你按下了「我卡住了」。先别急着要方案，我们把卡点定位清楚。',
    questions,
    blocker,
    knowledge: matchKnowledge(`${input.doing} ${input.need}`, 2),
    // 需求边界类问题不该由 AI 决定，直接转向人工确认
    escalate: blocker === 'requirement' ? 'requirement' : undefined,
  }
}

/* ------------------------------------------------- 跑偏检查：不判断，只提问 */

export interface DriftFinding {
  id: string
  severity: 'high' | 'medium' | 'low'
  /** 涉及的地图节点 */
  nodeId?: string
  title: string
  detail: string
  /** 要问学生的话，而不是系统的结论 */
  ask: string
}

/**
 * 跑偏检查
 * 系统不武断地说「你们跑偏了」，而是把断掉的地方摆出来，再问一句学生答不上来就该自己复盘的话。
 */
export function checkDrift(
  nodes: ProjectNode[],
  boards: StateBoard[],
  decisions: Decision[] = [],
): { findings: DriftFinding[]; action: ThinkingAction } {
  const findings: DriftFinding[] = []

  const unlinked = nodes.filter((node) => node.issue === 'no-question')
  unlinked.forEach((node) => {
    findings.push({
      id: nextId('drift'),
      severity: 'high',
      nodeId: node.id,
      title: '有工作，但对应不上任何项目问题',
      detail: `${node.title}：${node.detail}`,
      ask: '这项分析想回答哪个项目问题？如果答不出来，就要重新判断它是否还值得继续。',
    })
  })

  const unsupported = nodes.filter((node) => node.issue === 'no-evidence')
  unsupported.forEach((node) => {
    findings.push({
      id: nextId('drift'),
      severity: 'high',
      nodeId: node.id,
      title: '有结论，但下面没有证据',
      detail: `${node.title}：${node.detail}`,
      ask: '要支持这条结论，最少需要哪一份证据？现在缺的是数据、方法，还是解释？',
    })
  })

  const stale = nodes.filter((node) => node.issue === 'stale')
  stale.forEach((node) => {
    findings.push({
      id: nextId('drift'),
      severity: 'medium',
      nodeId: node.id,
      title: '需求已更新，这条仍在按旧理解推进',
      detail: `${node.title}：${node.detail}`,
      ask: '按最新需求，这条问题还需要回答吗？如果需要，它的说法要怎么改？',
    })
  })

  const unconfirmed = nodes.filter((node) => node.issue === 'unconfirmed')
  unconfirmed.forEach((node) => {
    findings.push({
      id: nextId('drift'),
      severity: 'medium',
      nodeId: node.id,
      title: '关键理解尚未确认',
      detail: `${node.title}：${node.detail}`,
      ask: '你们和老师对这条理解一致吗？如果没有确认过，先把它列进要问的问题。',
    })
  })

  // 冲突：需求方结论与团队理解不一致时必须先解决，否则下面所有工作都建在错的前提上
  const conflicted = nodes.filter((node) => node.issue === 'conflict')
  conflicted.forEach((node) => {
    findings.push({
      id: nextId('drift'),
      severity: 'high',
      nodeId: node.id,
      title: '团队理解与需求方结论冲突',
      detail: `${node.title}：${node.detail}`,
      ask: '这一条与需求对接会上确认的结论对不上。你们打算改成什么？改完之后，挂在它下面的问题、假设和方法哪些要跟着作废？',
    })
  })

  // 用户任务：项目问题上游必须能指出"谁在什么场景下会用到它"
  // 已经有自己 issue 标记的节点由各自的规则负责，这里不重复报
  const userTaskIds = new Set(nodes.filter((node) => node.kind === 'usertask').map((node) => node.id))
  nodes
    .filter((node) => node.kind === 'question' && !node.issue)
    .forEach((node) => {
      if (node.from.some((from) => userTaskIds.has(from))) return
      findings.push({
        id: nextId('drift'),
        severity: 'medium',
        nodeId: node.id,
        title: '这个问题说不清使用场景',
        detail: `${node.title}：${node.detail}`,
        ask: '这个问题是谁在什么场景下会遇到的？如果两个用户任务都用不到它，它现在值得占主力时间吗？',
      })
    })

  // 评价标准：不可判定的验收标准会让后面所有工作都无法收敛
  decisions
    .filter((item) => item.kind === 'standard' && item.status !== 'confirmed')
    .forEach((item) => {
      findings.push({
        id: nextId('drift'),
        severity: 'high',
        title: '验收标准尚不可判定',
        detail: `${item.chose}——${item.why}`,
        ask: '这条标准由谁判定、用什么指标量？把它改写成"能在某个场景里被某人实际使用"这类可判定的说法。',
      })
    })

  const tasks = boards.find((board) => board.key === 'tasks')?.items ?? []
  tasks
    .filter((item) => !item.nodeId)
    .forEach((item) => {
      findings.push({
        id: nextId('drift'),
        severity: 'low',
        title: '这项任务说不清推进了哪个问题',
        detail: item.text,
        ask: '把这项任务挂到一个项目问题上；挂不上，就说明它现在不该占用主力时间。',
      })
    })

  const questions: ThinkingQuestion[] = [
    question('对照原始需求与团队理解，有没有哪一处你们其实已经改了理解，但没有写下来？'),
    ...findings.slice(0, 3).map((finding) => question(finding.ask)),
  ]

  return {
    findings,
    action: {
      id: nextId('act'),
      kind: 'align',
      trigger: `对照原始需求、当前问题、最近任务与最新证据，发现 ${findings.length} 处需要你们自己判断的地方。`,
      questions,
      knowledge: matchKnowledge('项目问题 方法 证据 可视化', 1),
    },
  }
}

/* --------------------------------------------- 下一步做什么：只给 1~3 件 */

/**
 * 不生成待办清单，只给现在最重要的 1~3 件，每一件都必须写清「为什么现在做」。
 * 这些是「建议」，学生必须判断后才会进入项目状态。
 */
export function suggestNext(
  nodes: ProjectNode[],
  boards: StateBoard[],
  decisions: Decision[] = [],
  kickoff?: Kickoff,
): Advice[] {
  const out: Advice[] = []
  const weeks = kickoff?.weeksLeft
  const weekNote = weeks === undefined ? '' : `项目还剩 ${weeks} 周。`

  const scope = boards.find((board) => board.key === 'scope')?.items ?? []
  const scopeTbd = scope.filter((item) => item.confidence === 'uncertain')
  if (scopeTbd.length) {
    out.push({
      id: nextId('adv'),
      content: `在备选方向之间二选一，再排后面两周的工作：${scopeTbd.map((item) => item.text).join('；')}`,
      rationale: `${weekNote}条目里其他工作都会随这个选择而变，它不定，排期就只能是假的。`,
      kind: 'frame',
    })
  }

  const standard = decisions.filter((item) => item.kind === 'standard' && item.status !== 'confirmed')
  if (standard.length) {
    out.push({
      id: nextId('adv'),
      content: '把验收标准改写成可判定的说法，再继续做实现。',
      rationale: `现在的标准是「${standard[0].chose.replace(/^暂以|作为验收标准$/g, '')}」——不可判定，越往后拖越难收敛。`,
      kind: 'rationale',
    })
  }

  const evidenceGap = nodes.find((node) => node.issue === 'no-evidence')
  if (evidenceGap) {
    out.push({
      id: nextId('adv'),
      content: `在写「${evidenceGap.title}」之前，先明确最少需要哪一份证据，并只做那一份。`,
      rationale: `${weekNote}这条结论现在没有证据支撑，汇报时第一个问题就会问到这里。`,
      kind: 'evidence',
    })
  }

  const orphan = nodes.find((node) => node.issue === 'no-question')
  if (orphan) {
    out.push({
      id: nextId('adv'),
      content: `给「${orphan.title}」补一句话：它回答了哪个项目问题、对应哪个用户任务；补不上就暂时冻结。`,
      rationale: `${weekNote}它已经投入了时间，但对应不上任何问题，继续投入的边际价值很低。`,
      kind: 'monitor',
    })
  }

  const userTaskIds = new Set(nodes.filter((node) => node.kind === 'usertask').map((node) => node.id))
  const orphanQuestion = nodes.find(
    (node) => node.kind === 'question' && !node.from.some((from) => userTaskIds.has(from)),
  )
  if (orphanQuestion) {
    out.push({
      id: nextId('adv'),
      content: '给说不清使用场景的那个项目问题，补上对应的用户任务；补不上就先降权。',
      rationale: `${weekNote}「${orphanQuestion.title}」目前没有用户任务指向它，无法判断它还值不值得做。`,
      kind: 'align',
    })
  }

  if (nodes.some((node) => node.issue === 'conflict' || node.issue === 'unconfirmed')) {
    out.push({
      id: nextId('adv'),
      content: '把与需求对接会结论冲突的那条「团队理解」更新掉。',
      rationale: `${weekNote}现在的问题、假设与方法都挂在这条理解下面，它是错的，下面全是错的。`,
      kind: 'frame',
    })
  }

  return out.slice(0, 3)
}

/* ----------------------------------------------------------- 项目反思 */

/** 反思要问具体的：哪个假设被推翻、哪个决定会重做、哪些工作贡献很小 */
export const reflectQuestions: string[] = [
  '这一周里，哪一个假设被数据推翻了？推翻它的是哪份证据？',
  '如果重来一次，哪一个决定你会做出不同选择？为什么？',
  '哪些工作花了不少时间，但对核心问题的贡献很小？',
  '相比上周，你们对项目的理解发生了什么改变？请用一句话写下来。',
  '有哪件事你们一直在回避，因为它不好做或者不知道该问谁？',
]
