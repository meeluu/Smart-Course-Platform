import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { EvidenceBlock, Resource } from '@/types/course'
import { docById } from '@/data/materials'
import { lessonOfResource, resourceById } from '@/data/course'
import { docBlocks, resolveEvidence } from '@/utils/content'

export type ViewerMode = 'resource' | 'evidence' | null

/**
 * 原文阅览面板
 * ----------------------------------------------------------------------------
 * 全局单例：DR1 的资源预览与 DR2 的引用核验共用同一个面板，
 * 保证两个视图指向的是同一份材料（需求文档的「资源对象统一关联」）。
 */
export const useViewerStore = defineStore('viewer', () => {
  const mode = ref<ViewerMode>(null)
  const resourceId = ref<string | null>(null)
  const blockId = ref<string | null>(null)
  /** 命中锚点，用于高亮定位 */
  const anchor = ref<string | null>(null)

  const resource = computed<Resource | undefined>(() =>
    resourceId.value ? resourceById.get(resourceId.value) : undefined,
  )

  const doc = computed(() => {
    const docId = resource.value?.docId ?? currentBlock.value?.docId
    return docId ? docById.get(docId) : undefined
  })

  const currentBlock = computed<EvidenceBlock | undefined>(() =>
    blockId.value ? resolveEvidence(blockId.value) : undefined,
  )

  /** 当前文档的全部证据块，用于章节导航 */
  const outline = computed<EvidenceBlock[]>(() => (doc.value ? docBlocks(doc.value) : []))

  const lessonId = computed(() => (resourceId.value ? lessonOfResource.get(resourceId.value) : undefined))

  const isOpen = computed(() => mode.value !== null)

  function openResource(id: string, opts: { anchor?: string } = {}) {
    const target = resourceById.get(id)
    if (!target) return
    resourceId.value = id
    blockId.value = target.blockId ?? null
    anchor.value = opts.anchor ?? null
    mode.value = 'resource'
  }

  /** 引用核验：直接跳到证据块 */
  function openEvidence(id: string, opts: { anchor?: string } = {}) {
    const block = resolveEvidence(id)
    if (!block) return
    blockId.value = block.id
    const linked = resourceId.value && resourceById.get(resourceId.value)?.docId === block.docId ? resourceId.value : null
    resourceId.value = linked
    anchor.value = opts.anchor ?? block.heading
    mode.value = 'evidence'
  }

  function setAnchor(value: string | null) {
    anchor.value = value
  }

  function close() {
    mode.value = null
    anchor.value = null
  }

  return {
    mode,
    resourceId,
    blockId,
    anchor,
    resource,
    doc,
    currentBlock,
    outline,
    lessonId,
    isOpen,
    openResource,
    openEvidence,
    setAnchor,
    close,
  }
})
