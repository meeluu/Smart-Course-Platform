import type { Citation, QaRule, QuestionType, Thread } from '@/types/qa'
import type { EvidenceBlock } from '@/types/course'
import { docById, experienceSeeds } from './materials'
import { lessonOfResource, resourceByBlock } from './course'
import { resolveEvidence } from '@/utils/content'

/**
 * 课程内可溯源问答（DR2）的演示知识层
 * ----------------------------------------------------------------------------
 * 阶段一的问答由本地规则驱动：按关键词完成「任务识别 → 证据装配 → 受控生成」，
 * 回答正文里的每一个关键结论都对应下方一条可核验引用。
 * 正式版将这里的规则替换为「混合检索 + 重排序 + 受控生成」的后端接口，
 * 前端契约（Answer / Citation）保持不变。
 */

function buildCitations(ids: string[]): Citation[] {
  return ids
    .map((id) => resolveEvidence(id))
    .filter((block): block is EvidenceBlock => Boolean(block))
    .map((block) => {
      const doc = docById.get(block.docId)
      const resource = resourceByBlock.get(block.id)
      const lessonId =
        (resource && lessonOfResource.get(resource.id)) ??
        experienceSeeds.find((seed) => `exp:${seed.file}` === block.docId)?.lessonIds[0]

      return {
        blockId: block.id,
        docId: block.docId,
        docTitle: doc?.title ?? block.docId,
        heading: block.heading,
        page: block.page,
        quote: block.text,
        lessonId,
        resourceId: resource?.id,
        resourceKind: resource?.kind,
      }
    })
}

interface RuleSeed {
  id: string
  match: string[]
  type: QuestionType
  body: string
  blocks: string[]
  followUps: string[]
}

const RULES: RuleSeed[] = [
  {
    id: 'demo-modules',
    match: ['系统演示', '演示需要', '演示要求', '演示包含', '演示模块', '演示要包含', 'demo 包含'],
    type: 'composite',
    body: `《课程项目规范》第 3 节规定的最终演示，必须完整包含四个模块：

1. **数据接入与预处理** —— 能说明数据从哪来、经过哪些清洗与变换；
2. **核心算法或模型的运行入口** —— 现场可运行，不依赖临时手工改数据；
3. **结果可视化与交互** —— 结果能被看懂，且至少包含一个可操作的交互；
4. **可复现的运行说明** —— 环境、依赖、启动命令三件套齐全。

规范同时写明：**缺少任一模块，将在演示环节按缺项扣分**（见引用 1）。演示部分在总成绩中占 20%，与口头讲解合并计入（见引用 2）。

需要区分的是，这条问的是"系统演示"，论文的页数与参考文献另见规范第 4 节。`,
    blocks: ['spec#s3', 'grading#g2'],
    followUps: ['论文的字数和参考文献有什么要求？', '中期检查需要提交什么？', '演示必须联网吗？'],
  },
  {
    id: 'grading',
    match: ['评分细则', '评分', '成绩构成', '占多少', '占比', '权重', '多少分', '组长的加分'],
    type: 'retrieve',
    body: `课程总成绩由五部分构成（见引用 1–4）：

| 项目 | 权重 | 说明 |
| --- | --- | --- |
| 中期展示 | 15% | 选一篇与项目最相关的参考文献做 10 分钟讲解 |
| 最终项目 | 55% | 论文 20% + 演示 20% + 代码质量 10% + 中期检查点 5% |
| 课堂参与 | 25% | 课堂讨论 5% + 作业 20%（6 次个人 + 6 次小组） |
| 同伴互评 | 5% | 组内按实际贡献度分配 |

另有**组长加分 5%**，用于补偿协调成本（见引用 5）。

要特别注意：55% 的"最终项目"内部还有四个子项，**论文、演示、代码、中期检查点缺一不可**。`,
    blocks: ['grading#g1', 'grading#g2', 'grading#g3', 'grading#g4', 'grading#g5'],
    followUps: ['系统演示必须包含哪些模块？', '中期检查的流程是什么？', '作业一共交几次？'],
  },
  {
    id: 'kmeans-review',
    match: ['k-means', 'kmeans', 'k 均值', '聚类', 'cluster'],
    type: 'explore',
    body: `按学习路径，「K-Means 聚类」这一节落在 **第 6 讲 · 统计方法**。建议按下面顺序重新走一遍：

1. 先看第 6 讲课件，重点是**为什么聚类之前必须先做标准化**——K-Means 以欧氏距离最小化簇内平方和，量纲差异会让方差大的维度独占主导权（见引用 1）；
2. 再打开实验 6，用肘部法选候选 k、用轮廓系数定最终 k，并解释每个簇的含义（见引用 2）；
3. 最后读往届的《Visual Analytics + Business》，它把聚类结果直接接到了可视化叙事上（见引用 3）。

如果你复盘时卡住的是"距离度量怎么选"而不是"k 怎么定"，说明问题在第 6 讲课件的前半部分，而不在实验环节。`,
    blocks: ['slides#L06', 'lab#exp6', 'exp:business'],
    followUps: ['为什么要先标准化再做聚类？', '数据预处理应该按什么顺序复习？', '肘部法和轮廓系数有什么区别？'],
  },
  {
    id: 'quality-5c',
    match: ['5c', '数据质量', '质量维度', '完整性', '一致性', '唯一性'],
    type: 'retrieve',
    body: `课程采用的 5C 数据质量维度定义如下（见引用 1）：

- **完整性 Completeness** —— 应有的字段和记录是否齐全，缺失比例是多少；
- **一致性 Consistency** —— 同一事实在不同字段/表之间是否互相矛盾；
- **准确性 Accuracy** —— 取值是否落在物理或业务上合理的范围内；
- **时效性 Currency** —— 数据是否仍在有效期内，更新频率是否满足分析需求；
- **唯一性 Uniqueness** —— 是否存在重复记录或一物多码。

课件把处理动作归为三类：**缺失值插补、异常值检测、一致性校验**。配套的实验 3 要求先算出这五个维度的指标，再决定处理策略，而不是上来就删数据。`,
    blocks: ['slides#L04', 'lab#exp3'],
    followUps: ['缺失值有哪些插补方法？', '怎么判断数据里有异常值？', '数据质量检查要交什么？'],
  },
  {
    id: 'missing-values',
    match: ['缺失值', '插补', '填充', '空值', '缺失'],
    type: 'composite',
    body: `先把概念说清楚：插补不是"把空填上"，而是在**偏差**与**样本损失**之间做取舍。

课程实验对同一份含缺失特征的数据要求对比三种策略（见引用 1）：

- **均值填充** —— 实现最简，但会压缩方差，且在数据非随机缺失时引入明显偏差；
- **中位数填充** —— 对偏态分布与极端值更稳健，代价是丢失了分布形状信息；
- **多重插补** —— 用其他变量建模预测缺失值并重复多次，能保留不确定性，计算成本最高。

判断顺序建议是：**先判断缺失机制（完全随机 / 随机 / 非随机），再选策略**；如果某特征的缺失比例过高，删除该特征往往比插补更诚实（见引用 2）。

实验中还要求记录每一步变换——因为插补会改变后续所有统计量，过程不可复核就无法解释结论。`,
    blocks: ['lab#exp4', 'slides#L04'],
    followUps: ['标准化和归一化有什么区别？', '5C 数据质量维度分别是什么？', '数据预处理应该按什么顺序复习？'],
  },
  {
    id: 'standardize',
    match: ['标准化', '归一化', 'z-score', '编码', '独热', 'one-hot', '量纲'],
    type: 'composite',
    body: `**标准化**（Z-score，$x' = (x-\\mu)/\\sigma$）把特征变换到均值 0、方差 1；**归一化**（Min-Max）则压缩到固定区间 $[0,1]$。两者都不是为了"让数据好看"，而是为了让**基于距离的方法不被量纲支配**。

课件里明确讲到：K-Means 以欧氏距离最小化簇内平方和，因此量纲差异大的特征必须先标准化，否则方差大的维度会主导聚类结果（见引用 1）。

配套实验要求同时完成两件事（见引用 2）：

1. 对**数值特征**做 Z-score 标准化；
2. 对**类别特征**做独热编码，避免把无序类别编码成有大小关系的数值。

一个常见的坑：标准化参数必须只用训练集拟合，再作用到验证集与测试集，否则会引入信息泄漏。`,
    blocks: ['slides#L06', 'lab#exp4'],
    followUps: ['缺失值有哪些插补方法？', '为什么聚类之前要标准化？', '独热编码和标签编码该怎么选？'],
  },
  {
    id: 'preprocess-path',
    match: ['数据预处理', '预处理', '怎么复习', '复习路径', '复习顺序'],
    type: 'explore',
    body: `「数据预处理」不是一个单独的讲次，它跨了第 3 讲和第 4 讲。按学习路径推荐的复习顺序是：

1. **第 3 讲课件 + 实验 2** —— 先解决"样本能不能代表总体"，采样偏差是后面所有处理都救不回来的问题；
2. **第 4 讲课件** —— 用 5C 维度给数据质量定性定量（见引用 1）；
3. **实验 3** —— 亲手算一遍质量指标、定位缺失与异常（见引用 2）；
4. **实验 4** —— 缺失值三种插补策略对比 + 标准化与独热编码（见引用 3）；
5. 最后进入「数据预处理」单元测评，用题目反向确认哪一步还没吃透。

如果在第 4 步发现自己分不清"该插补还是该删除"，回到第 4 讲课件的缺失机制那一节即可。`,
    blocks: ['slides#L04', 'lab#exp3', 'lab#exp4'],
    followUps: ['缺失值有哪些插补方法？', '数据质量检查要交什么？', '去「数据预处理」单元做一次测评'],
  },
  {
    id: 'midterm',
    match: ['中期', '进展报告', '中期检查'],
    type: 'retrieve',
    body: `中期检查安排在第 8 讲，要求与计分如下（见引用 1）：

- **提交**：当前进度说明、已完成的实验清单、下一阶段计划；
- **汇报**：10 分钟讲解 + 5 分钟提问；
- **计分**：作为"最终项目"下的子项，占最终成绩 **5%**（见引用 2）。

规范写明缺席需在课后一周内补做，逾期计零分。第 8 讲课件中还有中期检查的评分视角说明（见引用 3）。

一个实用建议：进度说明里最好把"未完成的实验"一并列出并给出补齐时间，这比只报喜更容易通过提问环节。`,
    blocks: ['spec#s2', 'grading#g2', 'slides#L08'],
    followUps: ['最终演示必须包含哪些模块？', '论文有什么格式要求？', '中期缺席了怎么办？'],
  },
  {
    id: 'paper',
    match: ['论文', '参考文献', '页数', '格式要求', '排版'],
    type: 'retrieve',
    body: `论文写作规范（见引用 1）：

- 正文**不超过 4 页**，另附 **1 页参考文献**；
- 引用格式统一采用会议论文模板；
- 方法部分需说明**数据来源**与**实验环境**；
- 论文**按个人提交**，可以使用小组共同成果，但必须标注个人贡献部分。

这一项在最终项目中占 **20%**，与演示同为 20%，是权重最高的单项之一（见引用 2）。`,
    blocks: ['spec#s4', 'grading#g2'],
    followUps: ['系统演示必须包含哪些模块？', '参考文献找不到怎么办？', '评分细则里代码质量占多少？'],
  },
  {
    id: 'team',
    match: ['组队', '几人', '人数', '队长', '组长', '分组'],
    type: 'retrieve',
    body: `组队要求：**每组 4~6 人**，从当学期选题清单中认领一个课题，组内指定组长并明确分工；项目周期自第 1 讲起、至第 16 讲止，全程在共享仓库中提交（见引用 1）。

少于 4 人时，需要在选题阶段提交书面分工方案，说明如何覆盖全部工作包（见引用 2）。

组长会获得 **5% 的加分**，用于补偿协调成本（见引用 3）。`,
    blocks: ['spec#s1', 'faq#f2', 'grading#g5'],
    followUps: ['评分细则是什么？', '项目计划表要包含什么？', '项目最晚什么时候提交？'],
  },
  {
    id: 'spark',
    match: ['spark', '分布式', '分区', '缓存', 'rdd', 'dataframe'],
    type: 'composite',
    body: `第 13 讲的核心判断标准只有一条：**数据量是否已经超过单机可用内存**。没超过就不必引入分布式，分布式带来的调度与调试成本会盖过收益（见引用 1）。

课件给出的取舍线索：

- **RDD 与 DataFrame** —— 需要自定义低层算子时用 RDD；绝大多数结构化聚合用 DataFrame，因为能被 Catalyst 优化；
- **分区** —— 分区过少会并行度不足，过多则调度开销与 shuffle 代价上升；
- **缓存** —— 只在**一个数据集被反复使用**时缓存；盲目 cache 会挤占执行内存，反而变慢。

实验 12 要求用 DataFrame 完成一次分布式聚合，并**对比缓存前后的耗时**，用数据而不是感觉来说明缓存是否值得（见引用 2）。

往届有大规模空间数据交叉匹配的经验材料，可以直接参考它的分区策略（见引用 3）。`,
    blocks: ['slides#L13', 'lab#exp12', 'exp:05-SpatialDataCrossMatching'],
    followUps: ['手机采集的数据有什么隐私要求？', 'BERT 实验环境怎么配？', '聚类之前为什么要标准化？'],
  },
  {
    id: 'bert-env',
    match: ['环境配置', 'bert 环境', '预训练模型', '环境怎么', '依赖装不上', '缓存配置'],
    type: 'retrieve',
    body: `第 9 讲的目标只有一个：**在实验环境中跑通一个最小推理样例**，作为后面微调实验的前置条件（见引用 1）。

要求交付的是**环境与依赖清单**，具体包含：

- 深度学习框架的版本；
- 预训练模型的来源与本地缓存路径；
- 验证用的最小推理命令及其输出。

实验手册强调先验证推理再谈微调——如果最小样例都跑不通，微调阶段的报错会难以定位（见引用 2）。

往届有在国产算力框架上做大模型训练的经验材料，环境踩坑部分可以直接参考（见引用 3）。`,
    blocks: ['slides#L09', 'lab#exp9', 'exp:02-CryoEMDataAnalysis'],
    followUps: ['微调的评估指标怎么定？', 'Spark 什么时候该用？', '去第 9 讲看课件'],
  },
  {
    id: 'privacy',
    match: ['隐私', '手机数据', '采集权限', '轨迹', '知情同意', '脱敏'],
    type: 'composite',
    body: `移动数据采集的边界由三件事共同决定：**权限、采样频率、隐私**（见引用 1）。

- **权限** —— 只能采集明确授权的字段，且授权必须可撤回；
- **采样频率** —— 频率越高轨迹越精确，但可推断的个人信息也越多，需要在分析目标与隐私之间取平衡；
- **隐私** —— 位置数据属于个人敏感信息，做停留点识别与可视化时需要考虑聚合或扰动。

实验 11 要求在**获得知情同意**的前提下完成小规模采集，并分析**采样频率对停留点识别结果的影响**（见引用 2）——这一步本身就是在让你亲手体会精度与隐私的取舍。

往届《基于实时位置数据的传染病密接个体识别系统》给出了规则建模与隐私处理的完整做法（见引用 3）。`,
    blocks: ['slides#L12', 'lab#exp11', 'exp:04-InfectiousContactIdentification'],
    followUps: ['Spark 在什么情况下才该用？', '可视化设计的三条硬规则是什么？', '数据质量怎么检查？'],
  },
  {
    id: 'vis-design',
    match: ['可视化', '图表', '配色', '视觉通道', '画图', '坐标轴'],
    type: 'composite',
    body: `第 7 讲给出的选择顺序是：**位置优于长度，长度优于角度，角度优于面积与颜色深浅**——因为人对位置差异的分辨能力最强（见引用 1）。

三条硬规则：

1. **坐标轴必须可比** —— 同一张图内不做双轴任意缩放，避免制造不存在的相关性；
2. **颜色必须可辨** —— 分类色不超过 6 种，且需通过灰度或色盲模拟检查；
3. **标注必须回答"这张图在说什么"** —— 标题写结论，而不是写变量名。

实验 7 要求对同一份数据做两套不同视觉通道的方案，并说明各自适合回答什么问题（见引用 2）。这比"把图画得好看"更接近训练目标。`,
    blocks: ['slides#L07', 'lab#exp7'],
    followUps: ['配色怎么保证可辨性？', 'K-Means 的结果怎么做可视化？', '往届可视化项目有哪些？'],
  },
  {
    id: 'spreadsheet',
    match: ['电子表格', 'excel', '透视表', '透视'],
    type: 'retrieve',
    body: `电子表格在本课程里的定位是**最轻量的探索工具**：做透视、分组聚合与快速可视化（见引用 1）。

第 5 讲的一贯要求是：**用公式与透视，而不是手工修改单元格**。原因很直接——手工改动无法被别人复核，一旦数据更新就要重做一遍，也无法进入后续的自动化流程。

实验 5 的验收口径因此包含一条：用独立公式**交叉验证**透视表的结果（见引用 2）。`,
    blocks: ['slides#L05', 'lab#exp5'],
    followUps: ['数据质量怎么检查？', '抽样怎么保证代表性？', '评分细则是什么？'],
  },
  {
    id: 'sampling',
    match: ['抽样', '采样', '样本', '代表性', '分层'],
    type: 'composite',
    body: `抽样要解决的是"**样本能不能代表总体**"（见引用 1）：

- **概率抽样**（简单随机、分层、整群）—— 每个个体有已知的被选概率，可以估计抽样误差，适用于需要推断总体的场景；
- **非概率抽样**（便利、判断、配额）—— 成本低，但无法给出误差范围，不能直接用于推断。

实践中的两个决定点：**样本量**与**偏差**。样本量放大只能降低随机误差，无法修正系统性偏差——如果抽样框本身漏掉了一类人群，样本再大也是错的。

实验 2 要求在真实数据集上完成一次分层抽样，并输出**样本代表性报告**，包含各分层的分布对比与偏差说明（见引用 2）。`,
    blocks: ['slides#L03', 'lab#exp2'],
    followUps: ['5C 数据质量维度是什么？', '缺失值该怎么处理？', '去第 3 讲看课件'],
  },
  {
    id: 'tools',
    match: ['canis', 'cast', 'libra', '协同标注', '数据版本', '任务编排'],
    type: 'retrieve',
    body: `第 11 讲介绍实验室自研的三个组件及其分工（见引用 1）：

- **Canis** —— 负责**协同标注**，支持多人同时标注并处理冲突；
- **Cast** —— 负责**任务编排**，把标注、计算、评估串成可复跑的流程；
- **Libra** —— 负责**数据版本**，让每一次分析都能追溯到具体的数据快照。

三者组合起来解决的是多人协作中的一致性问题：谁标了什么、用的哪份数据、流程跑到哪一步，都能被回答。`,
    blocks: ['slides#L11'],
    followUps: ['Spark 什么时候该用？', '系统演示要包含哪些模块？', '去第 11 讲看课件'],
  },
]

/** 越界提问：课程材料中确实没有的内容，必须诚实说明而不是脑补 */
const OUT_OF_SCOPE = [
  '向量数据库',
  '大模型版本',
  'gpt',
  'langchain',
  'docker',
  'kubernetes',
  'k8s',
  '微服务',
  '大模型参数量',
]

const FALLBACK_FOLLOWUPS = ['系统演示必须包含哪些模块？', '评分细则是什么？', '数据预处理应该按什么顺序复习？']

export const suggestedQuestions = [
  '最终项目提交的系统演示需要包含哪些模块？',
  'K-Means 聚类这一节我该按什么顺序复习？',
  '5C 数据质量维度分别是什么？',
  '系统演示和论文分别占多少分？',
  '缺失值有哪些插补方法？',
  '中期检查需要提交什么？',
]

export interface QaOutcome {
  type: QuestionType
  body: string
  citations: Citation[]
  insufficient?: boolean
  gapNote?: string
  followUps: string[]
  /** 命中的规则，用于界面提示 */
  ruleId: string
}

/** 任务识别 + 证据装配 + 受控生成（本地演示版） */
export function answer(question: string): QaOutcome {
  const text = question.toLowerCase().trim()

  const rule = RULES.find((r) => r.match.some((kw) => text.includes(kw.toLowerCase())))
  if (rule) {
    return {
      type: rule.type,
      body: rule.body,
      citations: buildCitations(rule.blocks),
      followUps: rule.followUps,
      ruleId: rule.id,
    }
  }

  const outOfScope = OUT_OF_SCOPE.find((kw) => text.includes(kw))
  if (outOfScope) {
    return {
      type: 'retrieve',
      body: '',
      citations: [],
      insufficient: true,
      gapNote: `课程材料中暂未找到足够依据。我检索了课件、实验手册、项目规范与往届经验材料，都没有出现与「${outOfScope}」相关的课程内容——这类环境或工具选型不在本课程的知识库范围内，我不会用通用知识替你补全。建议先向助教确认课程是否指定了相关技术栈。`,
      followUps: FALLBACK_FOLLOWUPS,
      ruleId: 'out-of-scope',
    }
  }

  return {
    type: 'explore',
    body: '',
    citations: [],
    insufficient: true,
    gapNote:
      '课程材料中暂未找到足够依据。这次提问没有命中课件、实验手册、项目规范或往届经验材料中的明确内容，因此我不给出结论。可以换一种问法，或者直接告诉我你正在看哪一讲，我帮你定位到具体章节。',
    followUps: FALLBACK_FOLLOWUPS,
    ruleId: 'fallback',
  }
}

/** 历史问答归档（按学习单元），演示数据 */
export const seedThreads: Thread[] = [
  { id: 't1', lessonId: 'L04', question: '5C 数据质量维度分别是什么？', type: 'retrieve', at: '2025-09-27 21:40', turns: 2 },
  { id: 't2', lessonId: 'L04', question: '缺失值该插补还是直接删掉？', type: 'composite', at: '2025-09-28 10:12', turns: 4 },
  { id: 't3', lessonId: 'L06', question: 'K-Means 这一节我该按什么顺序复习？', type: 'explore', at: '2025-10-11 15:03', turns: 2 },
  { id: 't4', lessonId: 'L06', question: '为什么聚类之前一定要标准化？', type: 'composite', at: '2025-10-11 15:26', turns: 2 },
  { id: 't5', lessonId: 'L08', question: '中期检查需要提交什么？', type: 'retrieve', at: '2025-10-20 09:31', turns: 1 },
  { id: 't6', lessonId: 'L13', question: '什么时候才值得上 Spark？', type: 'composite', at: '2025-11-25 20:47', turns: 3 },
  { id: 't7', lessonId: 'L16', question: '系统演示必须包含哪四个模块？', type: 'composite', at: '2025-12-14 14:08', turns: 2 },
  { id: 't8', lessonId: 'L14', question: '论文的页数和参考文献有什么要求？', type: 'retrieve', at: '2025-12-06 19:22', turns: 1 },
]

export const questionTypeLabel: Record<QuestionType, { label: string; hint: string }> = {
  explore: { label: '探索型', hint: '找学习入口与路径' },
  retrieve: { label: '检索型', hint: '精确课程事实与材料定位' },
  composite: { label: '复合型', hint: '概念解释 + 场景判断' },
}
