import type { EvidenceBlock, MaterialDoc, Reference, Member, GradeItem } from '@/types/course'

/**
 * 课程知识库（证据底座）
 * ----------------------------------------------------------------------------
 * 本文件是 DR1 / DR2 / DR3 共同的数据来源：
 *   - 学习路径（DR1）按讲次聚合资源，资源指向这里的证据块；
 *   - 可溯源问答（DR2）只允许从这个知识库检索证据；
 *   - 能力画像（DR3）的「去复习」按钮回跳到这里的证据块。
 *
 * 说明：课件 / 实验手册 / 项目规范 / 评分细则 / 常见问答为内置证据块；
 *      经验材料为往届项目真实文档（src/content/experience 下的 markdown），
 *      其章节在运行时由标题解析得到。
 */

const slidePage = (n: number) => `${(n - 1) * 18 + 1}–${n * 18}`
const labPage = (n: number) => `${(n - 1) * 14 + 1}–${n * 14}`

function authored(
  docId: string,
  rows: Array<[slug: string, heading: string, page: string, text: string]>,
): EvidenceBlock[] {
  return rows.map(([slug, heading, page, text]) => ({ id: `${docId}#${slug}`, docId, heading, page, text }))
}

/* ------------------------------------------------------------------ 课件 */

const slidesBlocks = authored('slides', [
  [
    'L01',
    '第 1 讲 · 课程实践项目介绍与项目组队',
    slidePage(1),
    '本讲给出课程的全部考核构成与项目时间线：中期检查安排在第 8 讲，最终提交与验收在第 16 讲。学生以 4~6 人一组，从当学期选题清单中认领一个课题，并在组内指定组长、明确分工。',
  ],
  [
    'L02',
    '第 2 讲 · 项目管理工具与项目计划',
    slidePage(2),
    '用看板与里程碑把一次课程项目拆分为可交付的周任务。要求每组在第 2 讲结束前提交项目计划表，逐条标注负责人与截止日期，后续每周对照计划做一次进度检查。',
  ],
  [
    'L03',
    '第 3 讲 · 数据采样',
    slidePage(3),
    '从总体到样本：概率抽样与非概率抽样的适用场景，样本量与偏差之间的权衡。实践环节要求在真实数据集上复现一次分层抽样，并给出样本代表性检查结论。',
  ],
  [
    'L04',
    '第 4 讲 · 数据质量',
    slidePage(4),
    '5C 数据质量维度——完整性 Completeness、一致性 Consistency、准确性 Accuracy、时效性 Currency、唯一性 Uniqueness。本讲覆盖三类处理动作：缺失值插补、异常值检测与一致性校验，并强调任何处理都必须可复核。',
  ],
  [
    'L05',
    '第 5 讲 · 电子表格',
    slidePage(5),
    '以电子表格作为最轻量的数据探索工具：透视、分组聚合与快速可视化。本讲的一贯要求是用公式与透视而不是手工修改单元格，从而保证处理过程可以被别人复现。',
  ],
  [
    'L06',
    '第 6 讲 · 统计方法',
    slidePage(6),
    '描述统计与推断统计的基本口径。本讲引入距离度量与聚类分析：K-Means 以欧氏距离最小化簇内平方和为准则，因此必须先对量纲差异大的特征做标准化，否则方差大的维度会主导聚类结果。',
  ],
  [
    'L07',
    '第 7 讲 · 可视化设计',
    slidePage(7),
    '从数据属性出发选择视觉通道：位置优于长度，长度优于角度，角度优于面积与颜色深浅。本讲给出三条硬规则——坐标轴必须可比、颜色必须可辨、标注必须回答"这张图在说什么"。',
  ],
  [
    'L08',
    '第 8 讲 · 中期进展报告',
    slidePage(8),
    '中期检查点。每组需提交当前进度、已完成的实验清单与下一阶段计划，并进行 10 分钟汇报与 5 分钟提问。中期检查点单独计分，缺席需在一周内补做。',
  ],
  [
    'L09',
    '第 9 讲 · BERT 实践环境配置',
    slidePage(9),
    '在实验环境中完成深度学习框架与预训练模型的安装与缓存配置，并跑通一个最小推理样例，作为后续微调实验的前置条件。',
  ],
  [
    'L10',
    '第 10 讲 · BERT',
    slidePage(10),
    '预训练语言模型在文本任务上的微调流程：数据格式、训练轮次与评估口径。本讲以文本情感分析为例，完整走通训练、验证与推理三个环节。',
  ],
  [
    'L11',
    '第 11 讲 · Canis / Cast / Libra',
    slidePage(11),
    '实验室自研可视化与数据管理系统三个组件的分工与典型用法：Canis 负责协同标注，Cast 负责任务编排，Libra 负责数据版本管理。三者组合用于多人协作的数据分析流程。',
  ],
  [
    'L12',
    '第 12 讲 · 手机移动数据采集与分析',
    slidePage(12),
    '移动端数据采集的权限、采样频率与隐私边界。要求在获得知情同意的前提下完成一次小规模采集，并据此做停留点识别与轨迹可视化。',
  ],
  [
    'L13',
    '第 13 讲 · SPARK',
    slidePage(13),
    '用 Spark 完成分布式数据处理：RDD 与 DataFrame 的取舍、分区策略与缓存对执行计划的影响。判断是否用 Spark 的标准是数据量是否已超过单机可用内存。',
  ],
  [
    'L14',
    '第 14 讲 · 大项目收尾（一）',
    slidePage(14),
    '收口阶段：补齐未完成的实验、整理代码仓库与运行说明，并按课程论文规范完成 4 页正文与 1 页参考文献。',
  ],
  [
    'L15',
    '第 15 讲 · 大项目收尾（二）',
    slidePage(15),
    '准备最终演示：编写演示脚本、准备备用数据与现场演示的容错方案，确保演示不依赖单一网络或单一设备。',
  ],
  [
    'L16',
    '第 16 讲 · 大项目验收',
    slidePage(16),
    '最终验收：口头汇报、系统演示与代码质量评审。成绩构成为论文写作 20%、最终演示 20%、代码质量 10%、中期检查点 5%。',
  ],
])

/* -------------------------------------------------------------- 实验手册 */

const labBlocks = authored('lab', [
  ['exp1', '实验 1 · 项目计划制定', labPage(1), '使用看板工具把项目拆分为不少于 10 个可交付任务，逐条标注负责人与截止日期，并给出里程碑。'],
  ['exp2', '实验 2 · 数据采样实践', labPage(2), '对给定数据集完成一次分层抽样，输出样本代表性报告，包含各分层分布对比与偏差说明。'],
  ['exp3', '实验 3 · 数据质量检查', labPage(3), '计算 5C 各维度指标，定位缺失值与异常值，输出结构化质量报告。'],
  [
    'exp4',
    '实验 4 · 缺失值处理与标准化',
    labPage(4),
    '对同一份含缺失特征的数据分别采用均值填充、中位数填充与多重插补三种策略，比较其对后续统计结果的影响；随后对数值特征做 Z-score 标准化，对类别特征做独热编码。',
  ],
  ['exp5', '实验 5 · 电子表格分析', labPage(5), '用透视表完成分组聚合，并用独立公式交叉验证结果，确认处理过程可被他人复现。'],
  [
    'exp6',
    '实验 6 · 聚类分析',
    labPage(6),
    '在标准化后的特征上运行 K-Means：用肘部法确定候选 k，用轮廓系数在候选值中选择最终 k，并解释每个簇的实际含义。',
  ],
  ['exp7', '实验 7 · 可视化设计', labPage(7), '为同一份数据设计两种不同视觉通道的图表方案，说明各自适合回答什么问题以及取舍理由。'],
  ['exp8', '实验 8 · 中期检查', labPage(8), '提交中期材料，完成组内互评与进度复核。'],
  ['exp9', '实验 9 · BERT 环境与推理', labPage(9), '配置实验环境并跑通最小推理样例，输出环境与依赖清单。'],
  ['exp10', '实验 10 · 文本分类微调', labPage(10), '完成一次微调训练，报告准确率与 F1，并给出错误案例分析。'],
  ['exp11', '实验 11 · 移动数据轨迹分析', labPage(11), '对采集到的轨迹数据做停留点识别与可视化，说明采样频率对结果的影响。'],
  ['exp12', '实验 12 · Spark 数据处理', labPage(12), '用 DataFrame 完成一次分布式聚合，并对比缓存前后的执行耗时。'],
])

/* -------------------------------------------------------------- 项目规范 */

const specBlocks = authored('spec', [
  [
    's1',
    '第 1 节 · 项目选题与组队',
    '1–3',
    '每组 4~6 人，从当学期选题清单中认领一个课题，组内指定组长并明确分工。项目周期自第 1 讲起、至第 16 讲止，全程在共享仓库中提交代码与文档。',
  ],
  [
    's2',
    '第 2 节 · 中期检查与汇报',
    '4–6',
    '第 8 讲进行中期检查，需提交进度说明、已完成实验清单与下一阶段计划，并进行 10 分钟汇报与 5 分钟提问。中期检查点占最终成绩的 5%。',
  ],
  [
    's3',
    '第 3 节 · 系统演示与提交要求',
    '7–12',
    '最终提交的系统演示必须完整包含四个模块：① 数据接入与预处理；② 核心算法或模型的运行入口；③ 结果可视化与交互；④ 可复现的运行说明（环境、依赖、启动命令）。缺少任一模块，将在演示环节按缺项扣分。',
  ],
  [
    's4',
    '第 4 节 · 论文与参考文献规范',
    '13–16',
    '正文不超过 4 页，另附 1 页参考文献。引用格式统一采用会议论文模板，需在方法部分说明数据来源与实验环境。论文按个人提交，需标注个人贡献部分。',
  ],
])

/* -------------------------------------------------------------- 评分细则 */

const gradingBlocks = authored('grading', [
  ['g1', '中期展示 · 15%', '1', '选择与你的项目最相关的一篇参考文献做 10 分钟讲解，需说明它与本项目的关系。'],
  ['g2', '最终项目 · 55%', '2–4', '论文写作 20%（≤4 页正文 + 1 页参考文献）、最终演示 20%（口头 + Demo）、源代码质量 10%、中期检查点 5%。'],
  ['g3', '课堂参与 · 25%', '5–6', '课堂讨论 5%，作业 20%，包含 6 次个人作业与 6 次小组作业。'],
  ['g4', '同伴互评 · 5%', '7', '组内互评，按实际贡献度分配，用于校正个人得分。'],
  ['g5', '组长加分 · 5%', '8', '每位组长在最终成绩上获得 5% 的加分，用于补偿协调成本。'],
])

/* -------------------------------------------------------------- 常见问答 */

const faqBlocks = authored('faq', [
  ['f1', '项目最晚什么时候提交？', '1', '最终提交与验收安排在第 16 讲课堂演示时完成，逾期不再接受补交。'],
  ['f2', '组队人数有硬性要求吗？', '2', '建议 4~6 人。少于 4 人需在选题时提交书面分工方案，说明如何覆盖全部工作包。'],
  ['f3', '演示系统必须联网吗？', '3', '不要求联网，但必须能够在助教环境中按运行说明复现；演示前需准备离线可用的备用数据。'],
  ['f4', '论文可以写小组共同内容吗？', '4', '论文按个人提交。可以使用小组共同成果，但必须明确标注个人贡献部分，避免雷同。'],
  ['f5', '中期检查缺席会怎样？', '5', '中期检查点占 5%。缺席需在课后一周内补做汇报，逾期计零分。'],
  ['f6', '找不到合适的参考文献怎么办？', '6', '可以在智能问答中提问，平台会从课件与往届经验材料中检索相关方向与选题参考。'],
])

/* ------------------------------------------------------- 往届经验材料 */

export interface ExperienceSeed {
  file: string
  title: string
  term: string
  /** 从中能学到什么 */
  purpose: string
  /** 关联讲次 */
  lessonIds: string[]
}

export const experienceSeeds: ExperienceSeed[] = [
  {
    file: '01-ClimateDataVisualization',
    title: 'IEEE 2026 SciVis Contest 海洋大气气候数据可视分析系统',
    term: '2025 秋',
    purpose: '超大规模科学数据（万级网格 × 90 层深度）的可视化方案选型与任务拆解',
    lessonIds: ['L07', 'L14'],
  },
  {
    file: '02-CryoEMDataAnalysis',
    title: '基于华为昇腾算力底座与计图框架的冷冻电镜数据分析大模型',
    term: '2025 秋',
    purpose: '国产算力框架下的大模型训练工程与效能优化思路',
    lessonIds: ['L10', 'L13'],
  },
  {
    file: '03-MarineNewsAwareness',
    title: '融合知识图谱与时序分析的海洋新闻态势感知系统',
    term: '2025 秋',
    purpose: '多源异构数据的融合建模与态势可视化',
    lessonIds: ['L06', 'L07'],
  },
  {
    file: '04-InfectiousContactIdentification',
    title: '基于实时位置数据的传染病密接个体识别系统',
    term: '2025 秋',
    purpose: '时空数据的隐私边界处理与规则建模',
    lessonIds: ['L12'],
  },
  {
    file: '05-SpatialDataCrossMatching',
    title: '大规模空间数据交叉匹配数据处理系统',
    term: '2025 秋',
    purpose: '大规模数据的索引与分区策略，Spark 场景下的性能取舍',
    lessonIds: ['L13'],
  },
  {
    file: '06-GutMicrobiomeAnalysis',
    title: '人类肠道微生物数据资源库与多维智能分析平台',
    term: '2025 秋',
    purpose: '领域数据库设计与多维分析的界面组织',
    lessonIds: ['L07', 'L14'],
  },
  { file: 'VAST2022', title: 'VAST Challenge 2022', term: '2022 秋', purpose: '多任务组合型竞赛的答题组织与证据呈现', lessonIds: ['L07', 'L14'] },
  { file: 'VAST2021', title: 'VAST Challenge 2021', term: '2021 秋', purpose: '城市与网络数据的可视分析完整流程', lessonIds: ['L07'] },
  { file: 'ChinaVis2022', title: 'ChinaVis Challenge 2022', term: '2022 秋', purpose: '国内可视分析竞赛的题目结构与评审偏好', lessonIds: ['L07'] },
  { file: 'GraphChallenge', title: 'Graph Challenge', term: '2022 秋', purpose: '图数据的高性能处理与实现路径', lessonIds: ['L13'] },
  { file: 'CCET', title: 'Classification in Cryo-Electron Tomograms', term: '2022 秋', purpose: '三维生物影像的分类任务与评估口径', lessonIds: ['L10'] },
  { file: 'ChinaVis2021', title: 'ChinaVis Challenge 2021', term: '2021 秋', purpose: '竞赛数据整理与可视化叙事', lessonIds: ['L07'] },
  { file: 'VAST2019', title: 'VAST Challenge 2019 - MC2', term: '2020 秋', purpose: '多源数据融合的分析线索组织', lessonIds: ['L06'] },
  { file: 'VAST2018', title: 'VAST Challenge 2018 - MC1', term: '2020 秋', purpose: '组队协作与任务分工的早期范例', lessonIds: ['L01', 'L02'] },
  { file: 'VAST2018_2', title: 'VAST Challenge 2018 - MC2', term: '2020 秋', purpose: '同一赛季不同题目的方案对比', lessonIds: ['L02'] },
  { file: 'Nature', title: 'Visual Analytics for Nature Images', term: '2020 秋', purpose: '自然图像分析中的数据组织方式', lessonIds: ['L07'] },
  { file: 'VAST2012', title: 'VAST Challenge 2012 - MC1', term: '2019 秋', purpose: '经典题目的问题拆解参考', lessonIds: ['L01'] },
  { file: 'VAST2014', title: 'VAST Challenge 2014 - MC2', term: '2019 秋', purpose: '数据分析流程的完整记录范例', lessonIds: ['L03'] },
  { file: 'VAST2015', title: 'VAST Challenge 2015 - MC1', term: '2019 秋', purpose: '数据质量问题的实际处理过程', lessonIds: ['L04'] },
  { file: 'VAST2016', title: 'VAST Challenge 2016 - MC2', term: '2019 秋', purpose: '统计方法在真实数据上的应用', lessonIds: ['L06'] },
  { file: 'AR', title: 'Visual Exploration in AR', term: '2019 秋', purpose: '增强现实场景下的交互设计', lessonIds: ['L07'] },
  { file: 'VR', title: 'Visual Exploration in VR', term: '2019 秋', purpose: '虚拟现实中的空间数据呈现', lessonIds: ['L07'] },
  { file: 'business', title: 'Visual Analytics + Business', term: '2019 秋', purpose: '商业数据的聚类与可视化结合范例', lessonIds: ['L06', 'L07'] },
  { file: 'sentiment', title: 'Sentiment Analysis', term: '2020 秋', purpose: '文本情感分析的建模与评估', lessonIds: ['L10'] },
  { file: 'openpose', title: 'Openpose: 2D pose estimation from single image', term: '2019 秋', purpose: '姿态估计任务的数据准备与误差分析', lessonIds: ['L10'] },
  { file: 'demo_list', title: '项目视频演示清单', term: '2023 秋', purpose: '最终演示的内容组织与脚本范例', lessonIds: ['L15', 'L16'] },
  { file: '191015disscussion', title: '2019 年 10 月 15 日课堂讨论', term: '2019 秋', purpose: '课堂讨论的组织形式与记录方式', lessonIds: ['L08'] },
]

const experienceDocs: MaterialDoc[] = experienceSeeds.map((seed) => ({
  docId: `exp:${seed.file}`,
  title: seed.title,
  kind: 'experience',
  owner: '往届课程组',
  version: '结项版',
  updatedAt: seed.term,
  source: 'markdown',
  file: seed.file,
  term: seed.term,
  purpose: seed.purpose,
  blocks: [],
}))

/* ------------------------------------------------------------ 汇总导出 */

export const materialDocs: MaterialDoc[] = [
  {
    docId: 'slides',
    title: '《大数据分析实践》课件',
    kind: 'slides',
    owner: '课程组',
    version: 'v2025.3',
    updatedAt: '2025-12-19',
    source: 'authored',
    purpose: '概念、方法与课堂案例的权威表述',
    blocks: slidesBlocks,
  },
  {
    docId: 'lab',
    title: '《大数据分析实践》实验手册',
    kind: 'lab',
    owner: '实验教学组',
    version: 'v2025.3',
    updatedAt: '2025-12-19',
    source: 'authored',
    purpose: '每个实验的输入、步骤与验收口径',
    blocks: labBlocks,
  },
  {
    docId: 'spec',
    title: '《课程项目规范》',
    kind: 'spec',
    owner: '课程组',
    version: 'v2025.1',
    updatedAt: '2025-09-05',
    source: 'authored',
    purpose: '选题、中期检查、系统演示与论文的硬性要求',
    blocks: specBlocks,
  },
  {
    docId: 'grading',
    title: '《课程评分细则》',
    kind: 'grading',
    owner: '课程组',
    version: 'v2025.1',
    updatedAt: '2025-09-05',
    source: 'authored',
    purpose: '各项成绩的构成与权重',
    blocks: gradingBlocks,
  },
  {
    docId: 'faq',
    title: '《课程常见问答》',
    kind: 'faq',
    owner: '助教团队',
    version: 'v2025.2',
    updatedAt: '2025-10-17',
    source: 'authored',
    purpose: '高频问题的沉淀与复用',
    blocks: faqBlocks,
  },
  ...experienceDocs,
]

export const docById = new Map(materialDocs.map((doc) => [doc.docId, doc]))

const authoredBlockIndex = new Map<string, EvidenceBlock>(
  materialDocs.flatMap((doc) => doc.blocks.map((block) => [block.id, block] as const)),
)

/** 取一条内置证据块 */
export function getBlock(blockId: string): EvidenceBlock | undefined {
  return authoredBlockIndex.get(blockId)
}

/* ------------------------------------------------------- 课程公开信息 */

export const members: Member[] = [
  {
    id: 'zengqiong',
    name: 'Qiong Zeng',
    nameZh: '曾琼',
    role: '课程负责人 · 副教授',
    photo: '/images/zengqiong.png',
    email: 'qiong.zn@sdu.edu.cn',
    site: 'https://qiongzn.github.io',
  },
  {
    id: 'luanjunfeng',
    name: 'Junfeng Luan',
    nameZh: '栾俊峰',
    role: '主讲教师 · 教授',
    photo: '/images/luanjunfeng.jpg',
    email: 'testluanjunfeng@gmail.com',
    site: 'https://www.cs.sdu.edu.cn/info/1071/2806.htm',
  },
  {
    id: 'xiduan',
    name: 'Xi Duan',
    nameZh: '段希',
    role: '助教 · 博士生',
    photo: '/images/xiduan.jpg',
    email: 'duanximail@gmail.com',
    site: 'https://chiefmoo.github.io',
  },
  {
    id: 'zhiyuanmeng',
    name: 'Zhiyuan Meng',
    nameZh: '孟志远',
    role: '助教 · 研究生',
    photo: '/images/zhiyuanmeng.png',
    email: '1154101777@qq.com',
    site: 'https://github.com/AmesHolland',
  },
]

export const gradeItems: GradeItem[] = [
  { name: '中期展示', weight: 15, detail: '选择与项目最相关的一篇参考文献做 10 分钟讲解', blockId: 'grading#g1' },
  { name: '最终项目 · 论文写作', weight: 20, detail: '≤4 页正文 + 1 页参考文献，按会议模板排版', blockId: 'grading#g2' },
  { name: '最终项目 · 最终演示', weight: 20, detail: '口头汇报 + 系统 Demo，需覆盖四个必需模块', blockId: 'grading#g2' },
  { name: '最终项目 · 源代码质量', weight: 10, detail: '可读性、可复现性与仓库组织', blockId: 'grading#g2' },
  { name: '最终项目 · 中期检查点', weight: 5, detail: '进度、已完成实验与下一阶段计划', blockId: 'grading#g2' },
  { name: '课堂参与', weight: 25, detail: '课堂讨论 5% + 作业 20%（6 次个人 + 6 次小组）', blockId: 'grading#g3' },
  { name: '同伴互评', weight: 5, detail: '组内按实际贡献度分配', blockId: 'grading#g4' },
  { name: '组长加分', weight: 5, detail: '补偿协调成本，计入最终成绩', blockId: 'grading#g5' },
]

export const references: Reference[] = [
  {
    id: 0,
    name: 'Mastering the Information Age — Solving Problems with Visual Analytics',
    authors: 'Daniel Keim, Jörn Kohlhammer, Geoffrey Ellis, Florian Mansmann',
    pub: 'Eurographics Association',
    year: 2010,
  },
  {
    id: 1,
    name: 'Introduction to Data Mining',
    translateName: '数据挖掘导论（完整版）',
    authors: 'Pang-Ning Tan, Michael Steinbach, Vipin Kumar',
    pub: '人民邮电出版社',
    year: 2011,
  },
  {
    id: 2,
    name: 'Mining of Massive Datasets',
    translateName: '大数据：互联网大规模数据挖掘与分布式处理',
    authors: 'Jure Leskovec, Anand Rajaraman, Jeffrey David Ullman',
    pub: '人民邮电出版社',
    year: 2012,
  },
  {
    id: 3,
    name: 'Interactive Data Visualization for the Web',
    translateName: '数据可视化实战：使用 D3 设计交互式图表',
    authors: 'Scott Murray',
    pub: '人民邮电出版社',
    year: 2013,
  },
  {
    id: 4,
    name: '数据可视化',
    authors: '陈为, 沈则潜',
    pub: '电子工业出版社',
    year: 2013,
  },
  {
    id: 5,
    name: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: 'Patrick Lewis, Ethan Perez, Aleksandra Piktus, et al.',
    pub: 'NeurIPS',
    year: 2020,
  },
]
