/**
 * 平台领域模型
 * ----------------------------------------------------------------------------
 * 术语与需求文档对齐：
 *  - 证据块（EvidenceBlock）是知识库的最小可引用单位，携带「文档 / 章节 / 页码」元数据；
 *  - 资源（Resource）是学习路径上的锚点，指向证据块，并按四种类型聚合；
 *  - 引用（Citation）是回答与画像建议回指证据块的唯一通道。
 */

/** 资源类型：课件 / 实验手册 / 项目规范 / 经验材料 */
export type ResourceKind = 'slides' | 'lab' | 'spec' | 'experience'

/** 文档类型：与资源类型一致，另有评分细则与常见问答两类内部文档 */
export type DocKind = ResourceKind | 'grading' | 'faq'

/** 证据块：知识库分块后的最小可溯源单位 */
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

/** 知识库文档 */
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
  /** 缩略图（经验材料用于卡片） */
  cover?: string
  /** 所属学期，经验材料使用 */
  term?: string
  /** 一句话说明这份材料能回答什么问题 */
  purpose: string
  blocks: EvidenceBlock[]
}

/** 学习路径上的资源锚点 */
export interface Resource {
  id: string
  kind: ResourceKind
  title: string
  docId: string
  /** 指向证据块；经验材料为整篇文档，此字段缺省 */
  blockId?: string
  /** 定位信息（页码 / 节），来自证据块 */
  page: string
  /** 这份材料在这一讲里解决什么问题 */
  purpose: string
  /** 锚点导航用的章节标签 */
  anchors: string[]
}

/** 讲次 */
export interface Lesson {
  id: string
  /** 第几讲 */
  index: number
  title: string
  date: string
  term: string
  summary: string
  /** 涉及的知识点 id */
  knowledgePoints: string[]
  resources: Resource[]
}

/** 模块 */
export interface Module {
  id: string
  index: number
  title: string
  /** 覆盖讲次，例如「第 1–4 讲」 */
  span: string
  /** 这个模块要建立什么能力 */
  thesis: string
  lessons: Lesson[]
}

/** 知识点：能力画像与资源路径之间的映射键 */
export interface KnowledgePoint {
  id: string
  name: string
  lessonId: string
  /** 掌握度偏低时建议回看的资源 */
  resourceId: string
}

/** 课程考核构成 */
export interface GradeItem {
  name: string
  weight: number
  detail: string
  /** 关联的规范证据块 */
  blockId: string
}

/** 教材与参考资料 */
export interface Reference {
  id: number
  name: string
  translateName?: string
  authors: string
  pub: string
  year: number
}

/** 授课团队 */
export interface Member {
  id: string
  name: string
  nameZh: string
  role: string
  photo: string
  email: string
  site?: string
}
