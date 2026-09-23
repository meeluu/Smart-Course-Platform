import type { EvidenceBlock, MaterialDoc } from '@/types/course'
import { docById, materialDocs } from '@/data/materials'
import { extractHeadings, firstParagraph, sectionText } from './markdown'

/**
 * 课程材料正文装载
 * ----------------------------------------------------------------------------
 * 经验材料是往届真实文档，体积合计不足 100 KB，且是平台「检索—引用—预览」
 * 链路的核心语料，因此这里一次性装载原文，换取同步、无闪烁的检索与预览。
 */

const rawModules = import.meta.glob('../content/experience/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const rawByFile = new Map<string, string>(
  Object.entries(rawModules).map(([path, raw]) => [path.replace(/^.*\//, '').replace(/\.md$/, ''), raw]),
)

/** 取文档原文（内置文档返回空串） */
export function rawOf(doc: MaterialDoc): string {
  if (doc.source !== 'markdown' || !doc.file) return ''
  return rawByFile.get(doc.file) ?? ''
}

const blockCache = new Map<string, EvidenceBlock[]>()

/**
 * 把文档切成证据块。
 * 内置文档直接用预置证据块；经验材料按 markdown 标题切分，页码位置记为「第 n 节」。
 */
export function docBlocks(doc: MaterialDoc): EvidenceBlock[] {
  if (doc.source === 'authored') return doc.blocks

  const cached = blockCache.get(doc.docId)
  if (cached) return cached

  const raw = rawOf(doc)
  const headings = extractHeadings(raw)
  const blocks: EvidenceBlock[] = headings.length
    ? headings.map((heading, index) => ({
        id: `${doc.docId}#${heading.id}`,
        docId: doc.docId,
        heading: heading.label,
        page: `第 ${index + 1} 节`,
        text: sectionText(raw, headings, index),
      }))
    : [
        {
          id: doc.docId,
          docId: doc.docId,
          heading: '全文',
          page: '整篇',
          text: firstParagraph(raw),
        },
      ]

  blockCache.set(doc.docId, blocks)
  return blocks
}

/** 全部证据块（知识库全景，供检索与统计使用） */
export const allBlocks: EvidenceBlock[] = materialDocs.flatMap((doc) => docBlocks(doc))

const blockIndex = new Map<string, EvidenceBlock>(allBlocks.map((block) => [block.id, block]))

/**
 * 解析一条证据引用。
 * 传入证据块 id 时精确命中；传入文档 id 时回落到该文档的首个证据块。
 */
export function resolveEvidence(idOrDocId: string): EvidenceBlock | undefined {
  const direct = blockIndex.get(idOrDocId)
  if (direct) return direct

  const doc = docById.get(idOrDocId)
  if (!doc) return undefined
  return docBlocks(doc)[0]
}

/** 文档的章节（用于资源详情里的锚点导航） */
export function docOutline(docId: string): EvidenceBlock[] {
  const doc = docById.get(docId)
  return doc ? docBlocks(doc) : []
}

/** 按关键词在知识库中检索证据块，返回命中片段 */
export function searchBlocks(keyword: string, limit = 20): Array<{ block: EvidenceBlock; doc: MaterialDoc }> {
  const q = keyword.trim().toLowerCase()
  if (!q) return []
  const hits: Array<{ block: EvidenceBlock; doc: MaterialDoc; score: number }> = []

  materialDocs.forEach((doc) => {
    if (doc.kind === 'experience') {
      if (doc.title.toLowerCase().includes(q) || doc.purpose.toLowerCase().includes(q)) {
        hits.push({ block: docBlocks(doc)[0], doc, score: 3 })
      }
      return
    }
    docBlocks(doc).forEach((block) => {
      let score = 0
      if (block.heading.toLowerCase().includes(q)) score += 3
      if (block.text.toLowerCase().includes(q)) score += 1
      if (score > 0) hits.push({ block, doc, score })
    })
  })

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ block, doc }) => ({ block, doc }))
}
