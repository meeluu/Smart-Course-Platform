import type { ProjectMeta, Result, Step, StepResource, UnderstandingItem } from '@/types/project'
import type { ResourceKind } from '@/types/course'
import { docById, getBlock } from './materials'
import { nextId } from '@/utils/id'

/**
 * 步骤生成与资料推荐
 * ----------------------------------------------------------------------------
 * 这是 v1 里唯一「系统替学生想」的地方，因此约束也最硬：
 *
 *  1. 只给当前最重要的 1~3 步，不生成待办清单；
 *  2. 每一步都必须能挂到一个已确认的问题或一条待确认事项上——挂不上的不展示；
 *  3. whyNow 必须引用具体的东西（剩余周数、哪个问题没有结果、上一步留下了什么），
 *     写不出具体理由的步骤直接不产出。空泛的「建议阅读第三章」是这套机制的死法。
 *
 * 步骤的三个来源，按优先级：
 *  ① 待确认事项未定 —— 前提不定，后面的排期都是假的；
 *  ② 上一步留下的不确定 —— 它会污染后面所有结论；
 *  ③ 已确认但没有任何结果落地的问题。
 */

/* ------------------------------------------------------------ 小工具 */

const shorten = (text: string, limit = 26): string =>
  text.length > limit ? `${text.slice(0, limit)}…` : text

/** 中文按二字切分，用于判断两段文字是否在谈同一件事 */
function bigrams(text: string): Set<string> {
  const clean = text.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')
  const out = new Set<string>()
  for (let i = 0; i < clean.length - 1; i += 1) out.add(clean.slice(i, i + 2))
  return out
}

function related(a: string, b: string, threshold = 3): boolean {
  const ga = bigrams(a)
  const gb = bigrams(b)
  let hit = 0
  for (const gram of ga) if (gb.has(gram)) hit += 1
  return hit >= threshold
}

/* -------------------------------------------------------- 资料推荐 */

const USE_BY_BLOCK: Record<string, string> = {
  'slides#L01':
    '它给出课程的考核构成与项目时间线（中期在第 8 讲、验收在第 16 讲），可以用来核对你们的排期和课程节点对不对得上',
  'slides#L02':
    '它给出把项目拆成可交付周任务的口径——逐条标负责人与截止日期，每周对照一次',
  'slides#L03':
    '它讲的是从总体到样本的偏差权衡，用来判断你们手上这批数据能不能代表目标海域',
  'slides#L04':
    '它给出 5C 质量维度与三类处理动作（插补 / 异常检测 / 一致性校验），并强调任何处理都必须可复核',
  'slides#L06':
    '它说明 K-Means 以簇内平方和最小化为准则，量纲差异大的特征必须先标准化，否则方差大的维度会主导结果',
  'slides#L07':
    '它给出视觉通道的优先级（位置 > 长度 > 角度 > 面积与颜色），以及坐标轴可比、颜色可辨、标注要回答问题这三条硬规则',
  'slides#L13': '它给出是否引入分布式的判断标准——数据量是否已经超过单机可用内存',
  'slides#L15':
    '它讲最终演示的准备：演示脚本、备用数据与容错方案，核心要求是演示不依赖单一网络或单一设备',
  'slides#L16': '它列出最终验收的构成与各部分权重',
  'lab#exp1': '它给出一份可交付任务的拆法：不少于 10 条、逐条标注负责人与截止日期、并给出里程碑',
  'lab#exp2': '它的产出物是样本代表性报告——各分层分布对比加偏差说明，正好可以用来检验当前数据的代表性',
  'lab#exp3': '它要求算出 5C 各维度指标、定位缺失值与异常值，并输出结构化质量报告',
  'lab#exp4':
    '它对比均值填充、中位数填充与多重插补三种策略对后续统计结果的影响，之后再对特征做标准化',
  'lab#exp6': '它给出定 k 的具体做法：肘部法选候选值，轮廓系数定最终值，并要求解释每个簇的实际含义',
  'lab#exp7': '它要求为同一份数据设计两套视觉通道方案，并说明各自适合回答什么问题、取舍理由是什么',
  'lab#exp12': '它要求用 DataFrame 完成一次分布式聚合，并对比缓存前后的执行耗时——可以用它判断分布式到底值不值',
  'spec#s1': '它给出项目周期的硬边界（第 1 讲起、第 16 讲止）与共享仓库的提交要求',
  'spec#s2': '它列出中期检查要交的三样东西：进度说明、已完成实验清单、下一阶段计划',
  'spec#s3':
    '它把演示系统拆成四个必需模块（数据接入与预处理 / 核心算法运行入口 / 结果可视化与交互 / 可复现运行说明），缺任一项按缺项扣分',
  'spec#s4': '它给出论文的篇幅与格式要求：正文不超过 4 页、另附 1 页参考文献，且需说明数据来源与实验环境',
  'grading#g1': '它说明中期展示要选一篇与项目最相关的参考文献做 10 分钟讲解，并说明它与本项目的关系',
  'grading#g2': '它给出最终项目的分数构成：论文写作 20%、最终演示 20%、源代码质量 10%、中期检查点 5%',
  'faq#f3': '它说明演示不要求联网，但必须能在助教环境按运行说明复现，因此要准备离线可用的备用数据',
}

/** 按题材把问题接到课程材料上。顺序即优先级。 */
const TOPIC_BLOCKS: { words: string[]; blocks: string[] }[] = [
  { words: ['验收', '标准', '判定', '指标', '优于', '合格', '分数'], blocks: ['spec#s3', 'grading#g2', 'spec#s4'] },
  { words: ['范围', '收敛', '通用', '覆盖', '取舍', '二选一'], blocks: ['spec#s1', 'slides#L02'] },
  { words: ['尺度', '分辨率', '网格', '精度', '重合', '窗口', '海域'], blocks: ['slides#L03', 'lab#exp2', 'slides#L04'] },
  { words: ['统计', '频率', '强度', '分位数', '阈值', '机理', '趋势'], blocks: ['slides#L06', 'lab#exp6'] },
  { words: ['许可', '条款', '分发', '在线', '离线', '实时'], blocks: ['faq#f3', 'slides#L15'] },
  { words: ['数据', '质量', '缺失', '异常', '标准化', '来源'], blocks: ['slides#L04', 'lab#exp3', 'lab#exp4'] },
  { words: ['可视化', '地图', '演变', '展示', '界面', '交互', '通道'], blocks: ['slides#L07', 'lab#exp7'] },
  { words: ['算法', '方法', '模型', '集成', '聚类', '评估'], blocks: ['slides#L06', 'lab#exp4'] },
  { words: ['交付', '原型', '模块', '演示', '提交', '说明'], blocks: ['spec#s3', 'grading#g2'] },
  { words: ['论文', '写作', '模板', '参考文献'], blocks: ['spec#s4', 'grading#g1'] },
  { words: ['计划', '排期', '进度', '分工', '周'], blocks: ['slides#L02', 'lab#exp1'] },
  { words: ['中期', '汇报'], blocks: ['spec#s2', 'grading#g1'] },
  { words: ['性能', '内存', '分布式', '耗时', '单机'], blocks: ['slides#L13', 'lab#exp12'] },
]

const KIND_TAIL: Record<ResourceKind, string> = {
  slides: '读完对照一下你们的做法，看口径是否一致。',
  lab: '照着做一遍，它的产出物就是这一步的直接证据。',
  spec: '它是对所有组都成立的硬要求，先确认你们满足它。',
  experience: '往届组遇到过类似的问题，先看他们是怎么处理的。',
}

function resolveResource(blockId: string, question: string): StepResource | undefined {
  const block = getBlock(blockId)
  if (!block) return undefined
  const doc = docById.get(block.docId)
  if (!doc) return undefined
  const use = USE_BY_BLOCK[block.id] ?? '它是这门课里与这个方向直接相关的一份材料'
  return {
    id: nextId('res'),
    docId: block.docId,
    blockId: block.id,
    title: doc.title,
    kind: doc.kind as ResourceKind,
    page: block.page,
    whyUseful: `${use}。这一步要回答的是「${shorten(question, 30)}」，${KIND_TAIL[doc.kind as ResourceKind] ?? ''}`,
  }
}

/** 按题材检索最多 3 条课程资料，每条都写清它对这个具体问题为什么有用 */
export function resourcesFor(question: string, limit = 3): StepResource[] {
  const ranked = TOPIC_BLOCKS.map((topic) => ({
    topic,
    score: topic.words.reduce((sum, word) => sum + (question.includes(word) ? 1 : 0), 0),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  const picked: StepResource[] = []
  const seen = new Set<string>()

  ranked.forEach(({ topic }) => {
    topic.blocks.forEach((blockId) => {
      if (picked.length >= limit || seen.has(blockId)) return
      const resource = resolveResource(blockId, question)
      if (!resource) return
      seen.add(blockId)
      picked.push(resource)
    })
  })

  return picked
}

/* -------------------------------------------------------- 步骤生成 */

export interface StepInput {
  items: UnderstandingItem[]
  results: Result[]
  steps: Step[]
  meta: ProjectMeta
}

interface StepDraft {
  title: string
  whyNow: string
  /** 挂到哪一条理解上：当前问题或待确认事项 */
  questionId: string
  /** 用于检索资料的文本 */
  topic: string
}

export function suggestSteps({ items, results, steps, meta }: StepInput): Step[] {
  const weeksLeft = Math.max(0, meta.totalWeeks - meta.currentWeek)
  const byKey = (key: UnderstandingItem['key']) => items.filter((item) => item.key === key)

  const openConfirm = byKey('toConfirm').filter((item) => item.confidence !== 'confirmed')
  const questions = byKey('questions')
  const solved = new Set(results.map((result) => result.solvedWhich))
  const openQuestions = questions.filter((question) => !solved.has(question.id))
  const answered = questions.filter((question) => solved.has(question.id))

  const drafts: StepDraft[] = []

  /* ① 待确认事项未定：这是所有排期的前提 */
  if (openConfirm.length) {
    const first = openConfirm[0]
    drafts.push({
      title: `先把 ${openConfirm.length} 条待确认事项定下来`,
      whyNow: `材料里整理出 ${openConfirm.length} 条待确认事项，其中一条是「${shorten(first.text, 34)}」。项目还剩 ${weeksLeft} 周，而后面每一步都会随这些选择而变——它们不定，排期就只能是假的。`,
      questionId: first.id,
      topic: openConfirm.map((item) => item.text).join(' '),
    })
  }

  /* ② 上一步留下的不确定：它会污染后面所有结论 */
  const lastResult = results.length ? results[results.length - 1] : undefined
  const lastStep = lastResult ? steps.find((step) => step.id === lastResult.stepId) : undefined
  if (lastResult?.stillUnsure && lastStep) {
    drafts.push({
      title: '把上一步留下的不确定处理掉',
      whyNow: `上一步「${shorten(lastStep.title, 24)}」留下的不确定是「${shorten(lastResult.stillUnsure, 40)}」。它不解开，后面凡是建立在这个前提上的结论都会跟着动摇。`,
      questionId: lastStep.questionId,
      topic: `${lastResult.stillUnsure} ${questions.map((q) => q.text).join(' ')}`,
    })
  }

  /* ③ 已确认但没有任何结果落地的问题 */
  if (openQuestions.length) {
    const target = openQuestions[0]
    const answeredNote = answered.length
      ? `同一批问题里的「${shorten(answered[0].text, 24)}」已经有结果落地了，它还停在纸面上。`
      : ''
    drafts.push({
      title: `推进问题：${shorten(target.text, 30)}`,
      whyNow: `项目还剩 ${weeksLeft} 周，而已确认的当前问题里，「${shorten(target.text, 30)}」还没有任何一次结果落到它身上。${answeredNote}`,
      questionId: target.id,
      topic: target.text,
    })
  }

  /* ④ 交付内容：还没有任何进展的那一项 */
  const deliverables = byKey('deliverables')
  const touchedText = [
    ...results.map((result) => `${result.didWhat} ${result.foundWhat}`),
    ...steps.map((step) => step.title),
  ].join(' ')
  const untouched = deliverables.find((item) => !related(item.text, touchedText))
  if (untouched) {
    const anchor = openQuestions[0] ?? questions[0] ?? openConfirm[0]
    if (anchor) {
      drafts.push({
        title: `让交付内容先动起来：${shorten(untouched.text, 26)}`,
        whyNow: `交付内容「${shorten(untouched.text, 34)}」到现在还没有任何一步落到它身上，而它是验收时要逐条对照的东西。项目还剩 ${weeksLeft} 周，第一版越晚开始越赶。`,
        questionId: anchor.id,
        topic: touchedText ? `${untouched.text} ${questions.map((q) => q.text).join(' ')}` : untouched.text,
      })
    }
  }

  const existing = new Set(steps.map((step) => step.title))
  const stamp = new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  return drafts
    .filter((draft) => !existing.has(draft.title))
    .slice(0, 3)
    .map((draft) => ({
      id: nextId('step'),
      title: draft.title,
      whyNow: draft.whyNow,
      questionId: draft.questionId,
      status: 'todo' as const,
      resources: resourcesFor(draft.topic),
      at: stamp,
    }))
}
