import type { KnowledgePoint, Lesson, Module, Resource, ResourceKind } from '@/types/course'
import { docById, experienceSeeds, getBlock } from './materials'

/**
 * 学习路径：模块 → 讲次 → 资源
 * ----------------------------------------------------------------------------
 * 由 16 讲的课程大纲驱动。每讲的资源从知识库中派生：
 *   - 课件   → slides#Lxx
 *   - 实验   → lab#expN
 *   - 规范   → spec#sN
 *   - 经验材料 → exp:<file>（往届真实文档）
 * 说明：页码与部分是演示用结构数据，正式版由课程资源入库脚本生成。
 */

interface LessonSeed {
  index: number
  date: string
  title: string
  summary: string
  /** 涉及的知识点 id */
  kps: string[]
  /** 本讲的实验（证据块 slug） */
  labs?: string[]
  /** 本讲关联的规范条目（证据块 slug） */
  specs?: string[]
  /** 本讲关联的往届经验材料（文件名） */
  experiences?: string[]
}

const LESSON_SEEDS: LessonSeed[] = [
  {
    index: 1,
    date: '2025-09-05',
    title: '课程实践项目介绍与项目组队',
    summary:
      '讲清课程的全部考核构成与项目时间线，随后完成选题认领与组队；本讲结束时每组必须已经在共享仓库里完成首次提交。',
    kps: ['kp-team'],
    specs: ['s1'],
    experiences: ['VAST2018', 'VAST2012'],
  },
  {
    index: 2,
    date: '2025-09-12',
    title: '项目管理工具与项目计划',
    summary: '用看板把一次课程项目拆成可交付的周任务，标注负责人与截止日期，形成后续每周对照的进度基线。',
    kps: ['kp-plan'],
    labs: ['exp1'],
    specs: ['s1'],
    experiences: ['VAST2018_2'],
  },
  {
    index: 3,
    date: '2025-09-19',
    title: '数据采样',
    summary: '从总体到样本：抽样方式的选择、样本量与偏差的权衡，以及在真实数据上判断样本是否具有代表性。',
    kps: ['kp-sampling'],
    labs: ['exp2'],
    experiences: ['VAST2014'],
  },
  {
    index: 4,
    date: '2025-09-26',
    title: '数据质量',
    summary:
      '本周是数据预处理的核心：先用 5C 维度给数据质量定性定量，再处理缺失值、异常值与编码标准化，全过程必须可复核。',
    kps: ['kp-quality-5c', 'kp-missing', 'kp-standardize', 'kp-outlier'],
    labs: ['exp3', 'exp4'],
    experiences: ['VAST2015'],
  },
  {
    index: 5,
    date: '2025-10-03',
    title: '电子表格',
    summary: '用电子表格做最轻量的探索：透视、分组聚合与快速可视化，并用公式而非手工修改保证过程可复现。',
    kps: ['kp-spreadsheet'],
    labs: ['exp5'],
  },
  {
    index: 6,
    date: '2025-10-10',
    title: '统计方法',
    summary:
      '描述与推断统计的基本口径，并引入距离度量与聚类分析：K-Means 为何必须先标准化，以及如何为 k 的选择给出依据。',
    kps: ['kp-distance', 'kp-kmeans'],
    labs: ['exp6'],
    experiences: ['business', 'VAST2019', 'VAST2016', '03-MarineNewsAwareness'],
  },
  {
    index: 7,
    date: '2025-10-17',
    title: '可视化设计',
    summary: '从数据属性出发选择视觉通道，给出坐标轴、配色与标注的三条硬规则，并为同一份数据设计可比较的两套方案。',
    kps: ['kp-channel', 'kp-color'],
    labs: ['exp7'],
    experiences: [
      '01-ClimateDataVisualization',
      '03-MarineNewsAwareness',
      '06-GutMicrobiomeAnalysis',
      'VAST2022',
      'VAST2021',
      'ChinaVis2022',
      'ChinaVis2021',
      'Nature',
      'AR',
      'VR',
    ],
  },
  {
    index: 8,
    date: '2025-10-24',
    title: '中期进展报告',
    summary: '中期检查点：提交进度、已完成实验与下一阶段计划，并现场接受一次提问，据此校正后半程的工作量分布。',
    kps: ['kp-mid'],
    labs: ['exp8'],
    specs: ['s2'],
    experiences: ['191015disscussion'],
  },
  {
    index: 9,
    date: '2025-10-31',
    title: 'BERT 实践环境配置',
    summary: '在实验环境中装好框架与预训练模型缓存，跑通最小推理样例，为后续微调实验扫清环境障碍。',
    kps: ['kp-bert-env'],
    labs: ['exp9'],
  },
  {
    index: 10,
    date: '2025-11-07',
    title: 'BERT',
    summary: '预训练语言模型的微调全流程：数据格式、训练轮次与评估口径，以文本情感分析为例走通训练、验证与推理。',
    kps: ['kp-finetune'],
    labs: ['exp10'],
    experiences: ['02-CryoEMDataAnalysis', 'CCET', 'sentiment', 'openpose'],
  },
  {
    index: 11,
    date: '2025-11-14',
    title: 'Canis / Cast / Libra',
    summary: '实验室自研组件的分工与典型用法：协同标注、任务编排与数据版本，组合成多人协作的数据分析流程。',
    kps: ['kp-tools'],
  },
  {
    index: 12,
    date: '2025-11-21',
    title: '手机移动数据采集与分析',
    summary: '移动端采集的权限、采样频率与隐私边界；在知情同意前提下完成一次小规模采集并做轨迹分析。',
    kps: ['kp-privacy'],
    labs: ['exp11'],
    experiences: ['04-InfectiousContactIdentification'],
  },
  {
    index: 13,
    date: '2025-11-28',
    title: 'SPARK',
    summary: '分布式数据处理的取舍：RDD 与 DataFrame 如何选、分区与缓存如何影响执行计划，以及什么时候不该用 Spark。',
    kps: ['kp-spark'],
    labs: ['exp12'],
    experiences: ['05-SpatialDataCrossMatching', '02-CryoEMDataAnalysis', 'GraphChallenge'],
  },
  {
    index: 14,
    date: '2025-12-05',
    title: '大项目收尾（一）',
    summary: '收口：补齐实验、整理仓库与运行说明，并按课程规范完成 4 页正文与 1 页参考文献。',
    kps: ['kp-paper'],
    specs: ['s4'],
    experiences: ['01-ClimateDataVisualization', '06-GutMicrobiomeAnalysis'],
  },
  {
    index: 15,
    date: '2025-12-12',
    title: '大项目收尾（二）',
    summary: '准备最终演示：演示脚本、备用数据与容错方案，确保现场不依赖单一网络或单一设备。',
    kps: ['kp-demo'],
    specs: ['s3'],
    experiences: ['demo_list'],
  },
  {
    index: 16,
    date: '2025-12-19',
    title: '大项目验收',
    summary: '最终验收：口头汇报、系统演示与代码质量评审，演示必须覆盖规范要求的四个模块。',
    kps: ['kp-demo'],
    specs: ['s3'],
    experiences: ['demo_list'],
  },
]

/** 知识点定义：能力画像与学习路径之间的映射键 */
export const knowledgePoints: KnowledgePoint[] = [
  { id: 'kp-team', name: '选题与组队', lessonId: 'L01', resourceId: 'L01-slides' },
  { id: 'kp-plan', name: '项目计划与里程碑', lessonId: 'L02', resourceId: 'L02-lab-exp1' },
  { id: 'kp-sampling', name: '抽样与样本代表性', lessonId: 'L03', resourceId: 'L03-lab-exp2' },
  { id: 'kp-quality-5c', name: '5C 数据质量维度', lessonId: 'L04', resourceId: 'L04-slides' },
  { id: 'kp-missing', name: '缺失值插补方法', lessonId: 'L04', resourceId: 'L04-lab-exp4' },
  { id: 'kp-standardize', name: '特征标准化与编码', lessonId: 'L04', resourceId: 'L04-lab-exp4' },
  { id: 'kp-outlier', name: '异常值检测', lessonId: 'L04', resourceId: 'L04-lab-exp3' },
  { id: 'kp-spreadsheet', name: '电子表格与透视分析', lessonId: 'L05', resourceId: 'L05-lab-exp5' },
  { id: 'kp-distance', name: '距离度量', lessonId: 'L06', resourceId: 'L06-slides' },
  { id: 'kp-kmeans', name: 'K-Means 聚类', lessonId: 'L06', resourceId: 'L06-lab-exp6' },
  { id: 'kp-channel', name: '视觉通道选择', lessonId: 'L07', resourceId: 'L07-slides' },
  { id: 'kp-color', name: '配色与可辨性', lessonId: 'L07', resourceId: 'L07-lab-exp7' },
  { id: 'kp-mid', name: '中期汇报组织', lessonId: 'L08', resourceId: 'L08-spec-s2' },
  { id: 'kp-bert-env', name: '预训练模型环境', lessonId: 'L09', resourceId: 'L09-lab-exp9' },
  { id: 'kp-finetune', name: '微调与评估口径', lessonId: 'L10', resourceId: 'L10-lab-exp10' },
  { id: 'kp-tools', name: '协同标注与数据版本', lessonId: 'L11', resourceId: 'L11-slides' },
  { id: 'kp-privacy', name: '数据采集的隐私边界', lessonId: 'L12', resourceId: 'L12-lab-exp11' },
  { id: 'kp-spark', name: 'Spark 分区与缓存', lessonId: 'L13', resourceId: 'L13-lab-exp12' },
  { id: 'kp-paper', name: '论文与参考文献规范', lessonId: 'L14', resourceId: 'L14-spec-s4' },
  { id: 'kp-demo', name: '系统演示模块完整性', lessonId: 'L16', resourceId: 'L16-spec-s3' },
]

export const kpById = new Map(knowledgePoints.map((kp) => [kp.id, kp]))

const experienceByFile = new Map(experienceSeeds.map((seed) => [seed.file, seed]))

const PURPOSE_BY_KIND: Record<ResourceKind, string> = {
  slides: '本讲概念与方法的权威表述，回答"是什么、为什么这样定"',
  lab: '动手环节的输入、步骤与验收口径，回答"具体怎么做"',
  spec: '这一阶段必须满足的硬性要求，回答"做到什么程度算合格"',
  experience: '往届同类课题的实际做法与踩坑记录',
}

const LAB_ANCHORS = ['实验目标', '实验步骤', '结果与验收']
const SPEC_ANCHORS = ['本节要点']

function buildResources(seed: LessonSeed, lessonId: string, kpNames: string[]): Resource[] {
  const id = (suffix: string) => `${lessonId}-${suffix}`
  const resources: Resource[] = []

  const slidesBlock = getBlock(`slides#L${String(seed.index).padStart(2, '0')}`)
  if (slidesBlock) {
    resources.push({
      id: id('slides'),
      kind: 'slides',
      title: `第 ${seed.index} 讲课件 · ${seed.title}`,
      docId: 'slides',
      blockId: slidesBlock.id,
      page: slidesBlock.page,
      purpose: PURPOSE_BY_KIND.slides,
      anchors: kpNames.length ? kpNames : ['本讲要点'],
    })
  }

  seed.labs?.forEach((slug) => {
    const block = getBlock(`lab#${slug}`)
    if (!block) return
    resources.push({
      id: id(`lab-${slug}`),
      kind: 'lab',
      title: block.heading,
      docId: 'lab',
      blockId: block.id,
      page: block.page,
      purpose: PURPOSE_BY_KIND.lab,
      anchors: LAB_ANCHORS,
    })
  })

  seed.specs?.forEach((slug) => {
    const block = getBlock(`spec#${slug}`)
    if (!block) return
    resources.push({
      id: id(`spec-${slug}`),
      kind: 'spec',
      title: `项目规范 · ${block.heading.replace(/^第 \d+ 节 · /, '')}`,
      docId: 'spec',
      blockId: block.id,
      page: block.page,
      purpose: PURPOSE_BY_KIND.spec,
      anchors: SPEC_ANCHORS,
    })
  })

  seed.experiences?.forEach((file) => {
    const expSeed = experienceByFile.get(file)
    if (!expSeed) return
    resources.push({
      id: id(`exp-${file}`),
      kind: 'experience',
      title: expSeed.title,
      docId: `exp:${file}`,
      page: expSeed.term,
      purpose: expSeed.purpose,
      anchors: [],
    })
  })

  return resources
}

interface ModuleSeed {
  index: number
  title: string
  thesis: string
  lessonIndexes: number[]
}

const MODULE_SEEDS: ModuleSeed[] = [
  {
    index: 1,
    title: '数据基础与质量',
    thesis: '把"数据能不能用"讲清楚：从抽样到质量维度，再到缺失、异常与标准化，全部要求过程可复核。',
    lessonIndexes: [1, 2, 3, 4],
  },
  {
    index: 2,
    title: '分析与可视化方法',
    thesis: '从统计口径走到视觉表达：先有可解释的方法，再有可比较的图形。',
    lessonIndexes: [5, 6, 7, 8],
  },
  {
    index: 3,
    title: '智能算法与工程实践',
    thesis: '把模型与数据工程接到真实算力与真实隐私约束上，重点在环境、评估与取舍。',
    lessonIndexes: [9, 10, 11, 12, 13],
  },
  {
    index: 4,
    title: '项目收尾与验收',
    thesis: '把前十三周的碎片收成一份可复现的系统与一篇可读的论文，并能在课堂上讲清楚取舍。',
    lessonIndexes: [14, 15, 16],
  },
]

export const modules: Module[] = MODULE_SEEDS.map((moduleSeed, moduleIdx) => {
  const lessons: Lesson[] = moduleSeed.lessonIndexes.map((lessonIndex) => {
    const seed = LESSON_SEEDS.find((s) => s.index === lessonIndex)!
    const lessonId = `L${String(seed.index).padStart(2, '0')}`
    const kpNames = seed.kps.map((k) => kpById.get(k)?.name ?? k)
    return {
      id: lessonId,
      index: seed.index,
      title: seed.title,
      date: seed.date,
      term: '2025 秋',
      summary: seed.summary,
      knowledgePoints: seed.kps,
      resources: buildResources(seed, lessonId, kpNames),
    }
  })

  return {
    id: `M${moduleSeed.index}`,
    index: moduleSeed.index,
    title: moduleSeed.title,
    span: `第 ${moduleSeed.lessonIndexes[0]}–${moduleSeed.lessonIndexes.at(-1)} 讲`,
    thesis: moduleSeed.thesis,
    lessons,
  }
})

/* ------------------------------------------------------------ 派生索引 */

export const allLessons: Lesson[] = modules.flatMap((m) => m.lessons)

export const lessonById = new Map(allLessons.map((lesson) => [lesson.id, lesson]))

export const resourceById = new Map(allLessons.flatMap((l) => l.resources.map((r) => [r.id, r] as const)))

/** 从资源反查所属讲次 */
export const lessonOfResource = new Map(allLessons.flatMap((l) => l.resources.map((r) => [r.id, l.id] as const)))

/** 从证据块反查资源（引用卡片回跳用） */
export const resourceByBlock = new Map(
  allLessons.flatMap((l) =>
    l.resources.filter((r) => r.blockId).map((r) => [r.blockId as string, r] as const),
  ),
)

export const previousLesson = (lessonId: string): Lesson | undefined => {
  const idx = allLessons.findIndex((l) => l.id === lessonId)
  return idx > 0 ? allLessons[idx - 1] : undefined
}

export const nextLesson = (lessonId: string): Lesson | undefined => {
  const idx = allLessons.findIndex((l) => l.id === lessonId)
  return idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : undefined
}

/** 模块内统计 */
export const courseStats = {
  moduleCount: modules.length,
  lessonCount: allLessons.length,
  resourceCount: allLessons.reduce((sum, l) => sum + l.resources.length, 0),
  docCount: docById.size,
  experienceCount: experienceSeeds.length,
}
