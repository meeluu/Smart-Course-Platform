import { TEMPLATES } from '@/data/topics'
import type { AiPaperDirection, PaperDirection } from '@/types/platform'

/**
 * 论文推荐的数据来源 —— 全平台唯一的出口
 * ----------------------------------------------------------------------------
 * 页面（PapersView / PaperDirectionCard）只认 PaperDirection 这个形状，
 * 不关心它从哪来。所以「换数据来源」只需要改这一个文件：
 *
 *   现在：① 取题目模板里预置的方向（9 套 × 3 条 = 27 条）
 *         ② 用项目当前里程碑拼一段检索提示词
 *
 *   接入后端后：
 *         ① GET  /api/papers?projectId=…   ← 后端拿 OpenAlex / Crossref 检索真实论文
 *         ② POST /api/papers/prompt        ← 后端调大模型生成提示词
 *
 * 接口约定见《项目交接文档》第 10 节的「需求 C」。
 *
 * 为什么①必须走真实检索、不能由模型直接写：
 * 模型会编出不存在的论文和 DOI——编号格式看着对，点开 404。
 * 「直接打开」这条路上学生一定会点，所以链接只能来自真实数据源，
 * 模型只负责挑哪几篇、以及写「为什么这几篇对你们有用」。
 */

export interface PaperQuestion {
  /** 题目，取自 TEMPLATES 的 key；自定义项目传空串 */
  topic: string
  /** 项目名称。自定义题目用它插值进通用方向 */
  projectName: string
}

/** 自定义题目的通用方向：题目是学生自己写的，模板里没有对应的专业方向 */
export function genericDirections(projectName: string): PaperDirection[] {
  return [
    {
      title: '该方向的方法综述',
      meta: 'AI 推荐检索方向 · 用提示词到 GPT 检索',
      why: '先看综述建立全局图景。',
      prompt: `请检索「${projectName}」相关方向的近年综述与代表论文：1) 主流方法分类与优缺点 2) 常用数据集 3) 开源实现。列出 5-8 篇及出处。`,
    },
    {
      title: '该方向的数据获取与预处理',
      meta: 'AI 推荐检索方向 · 用提示词到 GPT 检索',
      why: '为数据里程碑储备。',
      prompt: `请介绍「${projectName}」项目常用的数据来源、格式与预处理工具链（Python），并说明常见的数据质量问题和处理方法。`,
    },
    {
      title: '该方向的最新研究进展（2023-2025）',
      meta: 'AI 推荐检索方向 · 用提示词到 GPT 检索',
      why: '了解前沿，避免方案过时。',
      prompt: `请检索 2023-2025 年「${projectName}」方向的最新研究进展：1) 新方法与突破 2) 尚未解决的问题 3) 代表性团队。请附出处。`,
    },
  ]
}

/** ① 预置方向：题目模板里已经过设计的那几条 */
export function presetDirections(question: PaperQuestion): PaperDirection[] {
  const tpl = TEMPLATES[question.topic]
  const list = tpl ? tpl.papers : genericDirections(question.projectName)
  // 逐个复制：模板是模块级常量，不能让项目实例改到它
  return list.map((item) => ({ ...item }))
}

export interface DirectionRequest {
  /** 项目完整名称 */
  projectName: string
  /** 项目短名 */
  shortName: string
  /** 当前进行中的里程碑名 */
  currentMilestone: string
  /** 学生自己描述想了解的方向 */
  ask: string
}

/**
 * ② 现场生成：把学生的描述和项目当前阶段组合成一段检索提示词。
 * 现在只在本地拼字符串——接上后端后，这里换成 POST /api/papers/prompt。
 */
export function generateDirection(input: DirectionRequest): AiPaperDirection {
  const ask = input.ask.trim()
  const prompt =
    `我正在做「${input.projectName}」项目，目前处于「${input.currentMilestone}」阶段。` +
    `请围绕「${ask}」检索相关文献：1) 该方向的经典综述与近 3 年最新进展 ` +
    `2) 与项目当前阶段直接相关的方法细节 3) 公开数据集或开源实现。` +
    '请列出 5 篇左右代表性论文，注明作者、年份、期刊/会议和可验证的出处链接。'

  return {
    title: ask,
    meta: `AI 根据你的描述生成 · 结合「${input.shortName}」当前阶段：${input.currentMilestone}`,
    prompt,
  }
}
