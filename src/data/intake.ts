import type { Confidence, Material, MaterialType, Origin, UnderstandingKey } from '@/types/project'
import { nextId } from '@/utils/id'
// 关键词表放在 JSON 里，是为了让「数据工作坊」的评估脚本能读到完全同一份规则，
// 避免评估的是一套规则、跑的是另一套。
import rules from './intakeRules.json'

/**
 * 材料整理
 * ----------------------------------------------------------------------------
 * 闭环的第一步：把学生交进来的材料整理成四块草稿。
 *
 * 这里实现的是「规则抽取」而不是模型推理：
 *  · 把材料按句切开，逐句对照四类关键词打分，归到得分最高的一块；
 *  · 每一句都带上它来自哪份材料的哪一段以及原文，因为界面上每条草稿都要能核对出处；
 *  · 抽出来的东西一律标 inferred —— 未经学生确认，它就不是项目事实。
 *
 * 演示用的三份材料带有预先整理好的结果（CURATED_DRAFTS），
 * 因为真实系统里这一步由模型完成，而演示环境下先把「应该整理成什么样子」摆出来。
 * 学生自己粘贴的材料则走上面的规则抽取。
 */

/* -------------------------------------------------------------- 文案 */

export const understandingOrder: UnderstandingKey[] = ['goal', 'deliverables', 'questions', 'toConfirm']

export const understandingMeta: Record<
  UnderstandingKey,
  { label: string; question: string; hint: string; empty: string }
> = {
  goal: {
    label: '项目目标',
    question: '最终要解决什么？',
    hint: '一句话就能说清，说不清说明还没想明白',
    empty: '材料里没有读出明确的目标。这本身就是一个需要确认的事项。',
  },
  deliverables: {
    label: '交付内容',
    question: '要交出什么东西？',
    hint: '验收时会被逐条对照的东西',
    empty: '材料里没有读出交付物。建议先和需求方确认要交什么。',
  },
  questions: {
    label: '当前问题',
    question: '现在要回答哪些具体问题？',
    hint: '每一步都要挂在其中一个上',
    empty: '还没有拆出可回答的问题。问题往往藏在需求的动词里。',
  },
  toConfirm: {
    label: '待确认事项',
    question: '还有哪些事没定？',
    hint: '这些前提不定，后面的排期就只能是假的',
    empty: '没有读出待确认事项。最好再翻一遍材料——真实项目里很少没有。',
  },
}

export const materialTypeLabel: Record<MaterialType, string> = {
  requirement: '需求说明',
  document: '项目文档',
  data: '数据说明',
  other: '其他材料',
}

/* ---------------------------------------------------------- 抽取规则 */

/** 四类关键词。这里的词表直接决定「系统读出了什么」，改动需谨慎。 */
const KEYWORDS = rules.keywords as Record<UnderstandingKey, string[]>

/** 一句话至少要命中一个词、且不短于这个长度，才值得被抽出来 */
const MIN_SENTENCE = rules.minSentence

/**
 * 按中英文句读切句。
 * 问号必须和叹号同等对待——项目材料里问号密集（「做通用还是聚焦台风？」），
 * 早先漏掉 `？` 会把一整段问题粘成一句，抽出结果和标注都没法对齐。
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[\n。；;！!？?]/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * 材料里的行首小标题（「议题 1　课题定位」「议题 3　待确认」）不是内容。
 * 它们是材料的结构标记，抽出来会让四块里塞满"课题定位"这类空条目——
 * 评估时这类误抽占了相当比例，所以在这里按「行首是常见小标题词 + 整行很短」剔掉。
 */
const HEADING_PREFIX = new RegExp(`^(${rules.headingPrefixes.join('|')})\\s*[\\s　：:]`)

function isHeading(sentence: string): boolean {
  return sentence.length <= rules.headingMaxLength && HEADING_PREFIX.test(sentence)
}

function scoreSentence(sentence: string): { key: UnderstandingKey; score: number } | undefined {
  let best: { key: UnderstandingKey; score: number } | undefined
  ;(Object.keys(KEYWORDS) as UnderstandingKey[]).forEach((key) => {
    const words = KEYWORDS[key]
    const score = words.reduce((sum, word) => sum + (sentence.includes(word) ? 1 : 0), 0)
    if (score > 0 && (!best || score > best.score)) best = { key, score }
  })
  return best
}

export interface DraftSpec {
  /** 演示数据用它固定 id，便于「已完成的步骤」等历史记录指回具体条目 */
  id?: string
  key: UnderstandingKey
  text: string
  /** 位置说明，例如「议题 2」 */
  locator: string
  /** 原文片段，界面上供学生核对 */
  quote: string
}

/**
 * 演示材料预先整理好的结果。
 * 与规则抽取走同一条出口，因此界面上看不出差别。
 */
export const CURATED_DRAFTS: Record<string, DraftSpec[]> = {
  'mat-minutes': [
    { id: 'u-goal-1', key: 'goal', text: '构建能够识别极端风浪复合事件的系统，为海上航行安全提供参考', locator: '议题 1', quote: '构建能够识别极端风浪复合事件的系统，为海上航行安全提供参考' },
    { id: 'u-goal-2', key: 'goal', text: '研究维度分两条：气候尺度的频率与强度变化，与短期业务化预报', locator: '议题 1', quote: '研究维度分为气候尺度与短期预报两条' },
    { id: 'u-del-1', key: 'deliverables', text: '可交互的离线原型系统：地图点位查询 + 时间维度演变展示', locator: '议题 4', quote: '需求方建议先做离线原型：地图点位查询 + 时间维度演变展示' },
    { id: 'u-del-2', key: 'deliverables', text: '论文正文不超过 4 页、另附 1 页参考文献，按会议论文模板排版', locator: '议题 5', quote: '论文按课程要求，正文不超过 4 页、另附 1 页参考文献，按会议论文模板排版' },
    { id: 'u-q1', key: 'questions', text: 'Q1 几十年尺度下极端风浪事件的频率、强度及其对气候变暖的响应机理', locator: '议题 2', quote: 'Q1：几十年尺度下极端风浪事件的频率、强度及其对气候变暖的响应机理' },
    { id: 'u-q2', key: 'questions', text: 'Q2 基于 GFS、ECMWF 等公开预报数据构建业务化预报系统', locator: '议题 2', quote: 'Q2：基于 GFS、ECMWF 等公开预报数据，构建业务化预报系统' },
    { id: 'u-tc-1', key: 'toConfirm', text: '范围：继续做通用极端风浪，还是收敛到台风及台风浪', locator: '议题 3', quote: '是继续做通用极端风浪（覆盖全部海域与全时段），还是收敛到台风及台风浪' },
    { id: 'u-tc-2', key: 'toConfirm', text: '验收标准：「视觉效果优于现有国际方案」由谁判定、用什么指标量', locator: '议题 3', quote: '「视觉效果优于现有国际方案」由谁判定、用什么指标量，都还没有定' },
  ],
  'mat-era5': [
    { id: 'u-tc-3', key: 'toConfirm', text: 'ERA5 空间分辨率与需求方要的公里级判断存在数量级差距，怎么处理', locator: '第 2 段', quote: '当前数据的空间分辨率与这个要求存在数量级差距' },
    { id: 'u-tc-4', key: 'toConfirm', text: 'ECMWF 预报产品的二次分发条款尚未核实，能否承诺在线实时拉取', locator: '第 4 段', quote: 'ECMWF 预报产品的二次分发条款尚未核实，需要确认后才能承诺在线实时拉取' },
  ],
  'mat-week3': [
    { id: 'u-del-3', key: 'deliverables', text: '下周先交一页结论说明（中期报告用），并开始搭地图点位查询界面', locator: '交付', quote: '下周先把中期报告要用的一页结论说明写出来，地图点位查询的界面开始搭' },
    { id: 'u-q3', key: 'questions', text: '复合事件在时间与空间上的重合尺度该如何界定', locator: '问题', quote: '复合事件在时间与空间上的重合尺度该如何界定，还没用数据定过' },
    { id: 'u-tc-5', key: 'toConfirm', text: '自研复合事件识别算法已投入约 1 周，需求对接会后是否继续', locator: '讨论', quote: '上一步投入在自研复合识别算法上的时间（约 1 周），在需求对接会后看起来需要重新评估' },
  ],
}

export interface DraftItem {
  key: UnderstandingKey
  text: string
  confidence: Confidence
  origin: Origin
  source: { materialId: string; locator: string; quote: string }
}

/**
 * 把一份材料整理成四块草稿。
 * 演示材料用预先整理的结果；学生自己粘贴的材料走规则抽取。
 */
export function extractUnderstanding(material: Material): Array<DraftItem & { id: string }> {
  const curated = CURATED_DRAFTS[material.id]
  if (curated) {
    return curated.map((spec) => ({
      id: spec.id ?? nextId('u'),
      key: spec.key,
      text: spec.text,
      confidence: 'inferred' as Confidence,
      origin: 'ai' as Origin,
      source: { materialId: material.id, locator: spec.locator, quote: spec.quote },
    }))
  }

  return splitSentences(material.text)
    .filter((sentence) => sentence.length >= MIN_SENTENCE && !isHeading(sentence))
    .map((sentence, index) => {
      const hit = scoreSentence(sentence)
      if (!hit) return undefined
      return {
        id: nextId('u'),
        key: hit.key,
        text: sentence,
        confidence: 'inferred' as Confidence,
        origin: 'ai' as Origin,
        source: { materialId: material.id, locator: `第 ${index + 1} 段`, quote: sentence },
      }
    })
    .filter((item): item is DraftItem & { id: string } => Boolean(item))
}
