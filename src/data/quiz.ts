import type { Question, QuizUnit } from '@/types/assessment'

/**
 * 在线测评题集（DR3 的输入）
 * ----------------------------------------------------------------------------
 * 题目按知识点组织，每题标注关联资源，因此测评结果可以自动聚合为能力画像，
 * 并向薄弱知识点回推 DR1 的复习路径。演示版共 3 个单元 17 题。
 */

export const quizUnits: QuizUnit[] = [
  {
    id: 'U1',
    title: '数据预处理',
    moduleId: 'M1',
    lessonIds: ['L03', 'L04'],
    knowledgePoints: ['kp-sampling', 'kp-quality-5c', 'kp-missing', 'kp-standardize', 'kp-outlier'],
    minutes: 12,
  },
  {
    id: 'U2',
    title: '分析与可视化方法',
    moduleId: 'M2',
    lessonIds: ['L05', 'L06', 'L07'],
    knowledgePoints: ['kp-spreadsheet', 'kp-distance', 'kp-kmeans', 'kp-channel', 'kp-color'],
    minutes: 11,
  },
  {
    id: 'U3',
    title: '模型与工程实践',
    moduleId: 'M3',
    lessonIds: ['L09', 'L10', 'L12', 'L13'],
    knowledgePoints: ['kp-bert-env', 'kp-finetune', 'kp-privacy', 'kp-spark'],
    minutes: 10,
  },
]

export const questions: Question[] = [
  {
    id: 'Q1',
    unitId: 'U1',
    knowledgePoint: 'kp-sampling',
    stem: '总体内部差异明显（不同年级、不同专业混在一起），为提高样本代表性，最合适的抽样方式是：',
    choices: [
      { key: 'A', text: '简单随机抽样' },
      { key: 'B', text: '分层抽样' },
      { key: 'C', text: '便利抽样' },
      { key: 'D', text: '整群抽样' },
    ],
    answer: 'B',
    explanation:
      '分层抽样适用于层内同质、层间异质的结构：既保证各层都被覆盖，又能显著降低估计方差。便利抽样无法估计抽样误差；整群抽样主要用于降低调查成本，通常以牺牲精度为代价。',
    resourceId: 'L03-lab-exp2',
  },
  {
    id: 'Q2',
    unitId: 'U1',
    knowledgePoint: 'kp-quality-5c',
    stem: '「同一事实在不同表之间互相矛盾」属于 5C 中的哪一维度？',
    choices: [
      { key: 'A', text: '完整性 Completeness' },
      { key: 'B', text: '一致性 Consistency' },
      { key: 'C', text: '时效性 Currency' },
      { key: 'D', text: '唯一性 Uniqueness' },
    ],
    answer: 'B',
    explanation:
      '一致性关注同一事实在不同字段或表之间是否互相矛盾。完整性关注字段与记录是否齐全，时效性关注数据是否仍在有效期，唯一性关注是否存在重复记录或一物多码。',
    resourceId: 'L04-slides',
  },
  {
    id: 'Q3',
    unitId: 'U1',
    knowledgePoint: 'kp-missing',
    stem: '某数值特征分布明显右偏且存在极端值，缺失约 40%。若只允许用一种简单方法填充，最合适的是：',
    choices: [
      { key: 'A', text: '均值填充' },
      { key: 'B', text: '中位数填充' },
      { key: 'C', text: '用 0 填充' },
      { key: 'D', text: '用该列的众数填充' },
    ],
    answer: 'B',
    explanation:
      '右偏且含极端值时，中位数比均值更稳健，不会被极端值拉偏。用 0 填充会把「缺失」误编码为一个真实取值，引入系统性偏差；众数用于类别型变量更合适。',
    resourceId: 'L04-lab-exp4',
  },
  {
    id: 'Q4',
    unitId: 'U1',
    knowledgePoint: 'kp-missing',
    stem: '关于多重插补（multiple imputation），下列说法正确的是：',
    choices: [
      { key: 'A', text: '它只填一次，因此速度最快' },
      { key: 'B', text: '它通过多次建模预测并重复插补，能够保留缺失带来的不确定性' },
      { key: 'C', text: '它不能用于任何连续变量' },
      { key: 'D', text: '它可以完全消除插补偏差' },
    ],
    answer: 'B',
    explanation:
      '多重插补的核心价值是把「缺失的不确定性」保留下来——生成多个完整数据集、分别分析后合并结果，因此比单次填充更诚实，代价是计算成本更高。它并不消除偏差。',
    resourceId: 'L04-lab-exp4',
  },
  {
    id: 'Q5',
    unitId: 'U1',
    knowledgePoint: 'kp-standardize',
    stem: '一份数据同时包含数值特征与类别特征，且后续要做基于距离的分析。正确的预处理是：',
    choices: [
      { key: 'A', text: '把类别按出现顺序编码为 1、2、3 后直接用于距离计算' },
      { key: 'B', text: '对数值特征做标准化，对类别特征做独热编码' },
      { key: 'C', text: '对所有特征统一做 Min-Max 归一化' },
      { key: 'D', text: '类别特征不需要任何处理' },
    ],
    answer: 'B',
    explanation:
      '对数值特征做 Z-score 标准化，避免量纲差异支配距离；对类别特征做独热编码，避免把无序类别编码成有大小关系的数值（那样会凭空引入 3 比 1「更大」的语义）。',
    resourceId: 'L04-lab-exp4',
  },
  {
    id: 'Q6',
    unitId: 'U1',
    knowledgePoint: 'kp-outlier',
    scenario: true,
    stem: '实验情境：某列「身高」同时出现 17.5 与 1.75 两种取值，且样本量很大。最合理的首步处理是：',
    choices: [
      { key: 'A', text: '直接删除这两类记录' },
      { key: 'B', text: '先判断是否为量纲不统一（米 / 厘米）造成的录入问题，再做单位统一' },
      { key: 'C', text: '用列均值替换所有异常值' },
      { key: 'D', text: '忽略，交给模型自行处理' },
    ],
    answer: 'B',
    explanation:
      '17.5 与 1.75 相差 10 倍，典型的量纲混用。这类问题属于一致性/准确性问题，应该在字段层面统一单位，而不是当作异常值删除——删除会丢掉近一半样本。',
    resourceId: 'L04-lab-exp3',
  },
  {
    id: 'Q7',
    unitId: 'U2',
    knowledgePoint: 'kp-distance',
    stem: '欧氏距离与曼哈顿距离的主要区别是：',
    choices: [
      { key: 'A', text: '欧氏距离对单个维度的大差异更敏感（平方放大），曼哈顿距离是线性惩罚' },
      { key: 'B', text: '两者在所有数据上完全等价' },
      { key: 'C', text: '曼哈顿距离不能用于连续变量' },
      { key: 'D', text: '欧氏距离只能用于二维数据' },
    ],
    answer: 'A',
    explanation:
      '欧氏距离对各维差值的平方求和，因此单个维度上的巨大差异会被放大；曼哈顿距离对差值线性累加，对极端维度更宽容。高维场景下这一区别会显著影响近邻与聚类结果。',
    resourceId: 'L06-slides',
  },
  {
    id: 'Q8',
    unitId: 'U2',
    knowledgePoint: 'kp-kmeans',
    stem: '关于 K-Means 中 k 的选择，课程要求的做法是：',
    choices: [
      { key: 'A', text: '固定取 k = 3' },
      { key: 'B', text: '先用肘部法得到候选范围，再用轮廓系数在候选中确定' },
      { key: 'C', text: '取样本量的一半' },
      { key: 'D', text: '取特征个数' },
    ],
    answer: 'B',
    explanation:
      '肘部法给出「继续增加 k 收益开始变小」的大致位置，用于缩小候选范围；轮廓系数衡量簇内紧致与簇间分离的综合质量，用于在候选中定值。两者组合比单一指标可靠。',
    resourceId: 'L06-lab-exp6',
  },
  {
    id: 'Q9',
    unitId: 'U2',
    knowledgePoint: 'kp-kmeans',
    stem: '未做标准化就直接运行 K-Means，最可能出现的后果是：',
    choices: [
      { key: 'A', text: '算法一定不收敛' },
      { key: 'B', text: '方差大的特征主导距离计算，聚类结果被该维度牵引' },
      { key: 'C', text: '结果与标准化后完全一致' },
      { key: 'D', text: '必然产生空簇' },
    ],
    answer: 'B',
    explanation:
      'K-Means 以欧氏距离最小化簇内平方和，量纲大的特征在距离中占比更高，等价于给了它更高的隐含权重。例如「年收入（万元级）」会压过「年龄（十位级）」。',
    resourceId: 'L06-slides',
  },
  {
    id: 'Q10',
    unitId: 'U2',
    knowledgePoint: 'kp-channel',
    stem: '要精确比较 8 个类别在同一指标上的数值大小，最合适的视觉通道是：',
    choices: [
      { key: 'A', text: '颜色深浅' },
      { key: 'B', text: '扇形角度' },
      { key: 'C', text: '位置（共同基线上的长度）' },
      { key: 'D', text: '面积大小' },
    ],
    answer: 'C',
    explanation:
      '人对位置差异的分辨精度最高，共同基线上的长度可以直接目测比较；角度与面积的分辨误差明显更大，不适合承担精确比较的任务。',
    resourceId: 'L07-slides',
  },
  {
    id: 'Q11',
    unitId: 'U2',
    knowledgePoint: 'kp-spreadsheet',
    stem: '用电子表格做数据处理时，课程一贯要求是：',
    choices: [
      { key: 'A', text: '直接手工修改单元格，能出结果就行' },
      { key: 'B', text: '用公式与透视表完成处理，保证过程可被复核' },
      { key: 'C', text: '先把数据整体复制一份再随意修改' },
      { key: 'D', text: '只在最后一步做一次检查' },
    ],
    answer: 'B',
    explanation:
      '手工改动无法被别人复核，数据一更新就得重做。用公式与透视表意味着处理逻辑被显式记录下来，可以被交叉验证，也可以进入后续自动化流程。',
    resourceId: 'L05-lab-exp5',
  },
  {
    id: 'Q12',
    unitId: 'U2',
    knowledgePoint: 'kp-color',
    stem: '为 6 个类别选择分类配色时，最需要保证的是：',
    choices: [
      { key: 'A', text: '颜色尽量鲜艳醒目' },
      { key: 'B', text: '类别间可区分，并通过灰度或色盲模拟检查' },
      { key: 'C', text: '一律使用连续渐变配色' },
      { key: 'D', text: '使用彩虹色系以保证数量' },
    ],
    answer: 'B',
    explanation:
      '分类配色首先要保证「每一类都能被区分」，其次要考虑色觉障碍读者与黑白打印场景，因此需要做灰度/色盲模拟检查。连续渐变适合有序或数值型变量，不适合无序类别。',
    resourceId: 'L07-lab-exp7',
  },
  {
    id: 'Q13',
    unitId: 'U3',
    knowledgePoint: 'kp-bert-env',
    stem: '第 9 讲要求交付的最小可用物是：',
    choices: [
      { key: 'A', text: '完成一次完整的模型微调' },
      { key: 'B', text: '跑通一个最小推理样例，并给出环境与依赖清单' },
      { key: 'C', text: '训练一个自定义 tokenizer' },
      { key: 'D', text: '部署一个在线推理服务' },
    ],
    answer: 'B',
    explanation:
      '第 9 讲的目标是把环境打通：能跑通最小推理样例，并交付框架版本、模型缓存路径与验证命令。先验证推理再谈微调，否则微调阶段的报错难以定位。',
    resourceId: 'L09-lab-exp9',
  },
  {
    id: 'Q14',
    unitId: 'U3',
    knowledgePoint: 'kp-finetune',
    stem: '微调一个文本分类模型后，报告结果时至少应当包含：',
    choices: [
      { key: 'A', text: '只报告训练损失曲线' },
      { key: 'B', text: '准确率与 F1，并给出错误案例分析' },
      { key: 'C', text: '只报告训练耗时' },
      { key: 'D', text: '只报告模型参数量' },
    ],
    answer: 'B',
    explanation:
      '训练损失只反映拟合过程，不能说明泛化能力。课程要求给出准确率与 F1（类别不均衡时 F1 更能说明问题），并用错误案例分析解释模型在哪类样本上失效。',
    resourceId: 'L10-lab-exp10',
  },
  {
    id: 'Q15',
    unitId: 'U3',
    knowledgePoint: 'kp-privacy',
    scenario: true,
    stem: '实验情境：为做停留点识别，需要采集同学手机的位置数据。最合规的做法是：',
    choices: [
      { key: 'A', text: '先全量采集，事后再统一匿名化' },
      { key: 'B', text: '在获得知情同意且授权可撤回的前提下，只采集分析所需字段并控制采样频率' },
      { key: 'C', text: '采集全部原始数据以备后续使用' },
      { key: 'D', text: '借用他人账号采集以避免授权流程' },
    ],
    answer: 'B',
    explanation:
      '位置数据属于个人敏感信息，必须遵循知情同意、目的限定与最小必要原则，并保证授权可撤回。先采集后匿名化已经构成了超范围收集，事后无法补救。',
    resourceId: 'L12-lab-exp11',
  },
  {
    id: 'Q16',
    unitId: 'U3',
    knowledgePoint: 'kp-spark',
    stem: '判断是否值得引入 Spark 的直接标准是：',
    choices: [
      { key: 'A', text: '数据是否为 CSV 格式' },
      { key: 'B', text: '数据量是否已超过单机可用内存' },
      { key: 'C', text: '是否使用 Python 语言' },
      { key: 'D', text: '团队人数是否超过 3 人' },
    ],
    answer: 'B',
    explanation:
      '只有单机内存装不下或单机耗时不可接受时，分布式的收益才盖得过它带来的调度与调试成本。文件格式、编程语言和团队规模都不是判断依据。',
    resourceId: 'L13-lab-exp12',
  },
  {
    id: 'Q17',
    unitId: 'U3',
    knowledgePoint: 'kp-spark',
    stem: '关于 Spark 中的缓存（cache / persist），正确的是：',
    choices: [
      { key: 'A', text: '所有中间结果都应该缓存' },
      { key: 'B', text: '只在一个数据集被反复使用时才缓存，否则可能挤占执行内存' },
      { key: 'C', text: '缓存一定能加快所有任务' },
      { key: 'D', text: '缓存会改变计算结果' },
    ],
    answer: 'B',
    explanation:
      '缓存的收益来自「同一份数据被多次使用」。盲目缓存会占用执行内存、引发溢写，反而变慢。实验 12 要求对比缓存前后的耗时，用数据说明是否值得。',
    resourceId: 'L13-lab-exp12',
  },
]

export const questionById = new Map(questions.map((q) => [q.id, q]))

export function questionsOfUnit(unitId: string): Question[] {
  return questions.filter((q) => q.unitId === unitId)
}

export function unitById(unitId: string): QuizUnit | undefined {
  return quizUnits.find((u) => u.id === unitId)
}
