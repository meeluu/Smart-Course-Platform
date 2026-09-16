import type { DocKind, ResourceKind } from '@/types/course'

/** 四类资源的展示元数据：顺序即学习路径上的阅读顺序 */
export const resourceKindMeta: Record<
  ResourceKind,
  { label: string; icon: string; hint: string; question: string }
> = {
  slides: {
    label: '课件',
    icon: 'slides',
    hint: '概念与方法的权威表述',
    question: '它是什么、为什么这样定',
  },
  lab: {
    label: '实验手册',
    icon: 'lab',
    hint: '动手步骤与验收口径',
    question: '具体该怎么做',
  },
  spec: {
    label: '项目规范',
    icon: 'spec',
    hint: '这一阶段必须满足的硬性要求',
    question: '做到什么程度算合格',
  },
  experience: {
    label: '经验材料',
    icon: 'layers',
    hint: '往届同类课题的实际做法',
    question: '别人是怎么做的',
  },
}

export const resourceKindOrder: ResourceKind[] = ['slides', 'lab', 'spec', 'experience']

export const docKindMeta: Record<DocKind, { label: string; icon: string }> = {
  ...resourceKindMeta,
  grading: { label: '评分细则', icon: 'check', hint: '成绩构成', question: '分数怎么算' },
  faq: { label: '常见问答', icon: 'chat', hint: '高频问题沉淀', question: '这个问题问过吗' },
}

export function kindLabel(kind?: string): string {
  if (!kind) return '材料'
  return (docKindMeta as Record<string, { label: string } | undefined>)[kind]?.label ?? '材料'
}

export function kindIcon(kind?: string): string {
  if (!kind) return 'page'
  return (docKindMeta as Record<string, { icon: string } | undefined>)[kind]?.icon ?? 'page'
}
