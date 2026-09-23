/**
 * 课程资料库领域模型
 * ----------------------------------------------------------------------------
 * v1 里课程知识只出现在一个地方：步骤详情页的「推荐资料」。
 * 所以这里只保留资料库自身需要的两个概念：
 *  - 证据块（EvidenceBlock）是最小可引用单位，携带「文档 / 章节 / 页码」；
 *  - 文档（MaterialDoc）是资料的载体，内置证据块或由真实 markdown 解析得到。
 */

/** 资源类型：课件 / 实验手册 / 项目规范 / 经验材料 */
export type ResourceKind = 'slides' | 'lab' | 'spec' | 'experience'

/** 文档类型：与资源类型一致，另有评分细则与常见问答两类内部文档 */
export type DocKind = ResourceKind | 'grading' | 'faq'

/** 证据块：资料分块后的最小可引用单位 */
export interface EvidenceBlock {
  id: string
  /** 所属文档 */
  docId: string
  /** 章节标题，例如「第 4 讲 · 数据质量」 */
  heading: string
  /** 页码范围，例如「55–72」 */
  page: string
  /** 证据正文 */
  text: string
}

/** 资料库文档 */
export interface MaterialDoc {
  docId: string
  title: string
  kind: DocKind
  /** 立卷人 */
  owner: string
  version: string
  updatedAt: string
  /** authored = 内置证据块；markdown = 由真实 md 文件在运行时解析章节 */
  source: 'authored' | 'markdown'
  /** markdown 文档在 src/content/experience 下的相对路径 */
  file?: string
  /** 所属学期，经验材料使用 */
  term?: string
  /** 一句话说明这份材料能回答什么问题 */
  purpose: string
  blocks: EvidenceBlock[]
}

/* ----------------------------------------------------- 课程公开信息 */

/**
 * 授课团队 / 考核构成 / 教材与参考书。
 * v1 没有对应的页面，但内容仍然有效，保留在资料库里供后续学期使用；
 * 目前没有页面引用，构建时会被 tree-shaking 去掉。
 */

export interface GradeItem {
  name: string
  weight: number
  detail: string
  /** 关联的规范证据块 */
  blockId: string
}

export interface Reference {
  id: number
  name: string
  translateName?: string
  authors: string
  pub: string
  year: number
}

export interface Member {
  id: string
  name: string
  nameZh: string
  role: string
  photo: string
  email: string
  site?: string
}
