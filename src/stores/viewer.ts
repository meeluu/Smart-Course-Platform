import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { EvidenceBlock, ResourceKind } from '@/types/course'
import { docById } from '@/data/materials'
import { docBlocks, resolveEvidence } from '@/utils/content'

/**
 * 原文阅览面板
 * ----------------------------------------------------------------------------
 * v1 里只有一个入口：步骤详情页的「推荐资料」，点开看原文。
 * 面板只持有「看哪份文档、定位到哪一节」，文案由打开它的地方给出。
 */
export const useViewerStore = defineStore('viewer', () => {
  const docId = ref<string | null>(null)
  const blockId = ref<string | null>(null)
  /** 命中锚点，用于在正文中高亮定位 */
  const anchor = ref<string | null>(null)
  /** 打开它的理由：步骤标题 + 这一步在问什么 */
  const reason = ref<string | null>(null)
  /** 面板头部的一行说明：资料类型 + 页码 */
  const caption = ref<string | null>(null)
  const kind = ref<ResourceKind | null>(null)

  const doc = computed(() => (docId.value ? docById.get(docId.value) : undefined))

  const currentBlock = computed<EvidenceBlock | undefined>(() =>
    blockId.value ? resolveEvidence(blockId.value) : undefined,
  )

  /** 当前文档的全部章节，用于面板内的跳转 */
  const outline = computed<EvidenceBlock[]>(() => (doc.value ? docBlocks(doc.value) : []))

  const isOpen = computed(() => Boolean(docId.value))

  function open(input: {
    docId: string
    blockId?: string
    anchor?: string
    caption?: string
    reason?: string
    kind?: ResourceKind
  }) {
    if (!docById.has(input.docId)) return
    docId.value = input.docId
    blockId.value = input.blockId ?? null
    anchor.value = input.anchor ?? null
    caption.value = input.caption ?? null
    reason.value = input.reason ?? null
    kind.value = input.kind ?? null
  }

  function close() {
    docId.value = null
    blockId.value = null
    anchor.value = null
    reason.value = null
    caption.value = null
    kind.value = null
  }

  return {
    docId,
    blockId,
    anchor,
    reason,
    caption,
    kind,
    doc,
    currentBlock,
    outline,
    isOpen,
    open,
    close,
  }
})
