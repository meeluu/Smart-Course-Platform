<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { EvidenceBlock } from '@/types/course'
import { docById } from '@/data/materials'
import { docBlocks, rawOf } from '@/utils/content'
import { renderMarkdown, slugify } from '@/utils/markdown'

/**
 * 原文阅览器
 * ----------------------------------------------------------------------------
 * 两类材料两种呈现，但都保留同一件事：从「章节」能直接跳到原文位置。
 *  - 内置文档（课件 / 实验手册 / 规范 / 评分 / 问答）：按证据块呈现，就是知识库分块的样子；
 *  - 经验材料：渲染真实 markdown，按标题锚点定位。
 */
const props = defineProps<{
  docId: string
  /** 高亮的证据块，来自引用核验或资源定位 */
  focusBlockId?: string | null
  /** 锚点标签，经验材料按标题定位 */
  anchor?: string | null
}>()

const root = ref<HTMLElement | null>(null)

const doc = computed(() => docById.get(props.docId))
const blocks = computed<EvidenceBlock[]>(() => (doc.value ? docBlocks(doc.value) : []))
const isMarkdown = computed(() => doc.value?.source === 'markdown')
const html = computed(() => (isMarkdown.value && doc.value ? renderMarkdown(rawOf(doc.value)) : ''))

/** 内置文档：当前证据块 */
const activeBlock = computed(() => {
  if (!props.focusBlockId) return undefined
  return blocks.value.find((block) => block.id === props.focusBlockId)
})

/** 经验材料：把证据块标题映射成 markdown 标题锚点 */
const activeAnchor = computed(() => {
  if (isMarkdown.value) {
    if (props.anchor) return slugify(props.anchor)
    if (props.focusBlockId) {
      const block = blocks.value.find((item) => item.id === props.focusBlockId)
      if (block) return slugify(block.heading)
    }
    return null
  }
  return activeBlock.value?.id ?? null
})

async function locate() {
  await nextTick()
  const container = root.value
  if (!container || !activeAnchor.value) return

  const selector = isMarkdown.value
    ? `[id="${activeAnchor.value}"]`
    : `[data-block="${activeAnchor.value}"]`
  const target = container.querySelector<HTMLElement>(selector)
  if (!target) return

  target.scrollIntoView({ block: 'start', behavior: 'smooth' })
  target.classList.remove('anchor-hit')
  // 触发一次性高亮动画
  void target.offsetWidth
  target.classList.add('anchor-hit')
  window.setTimeout(() => target.classList.remove('anchor-hit'), 1800)
}

watch(() => [props.docId, props.focusBlockId, props.anchor], locate, { immediate: true })

function jumpTo(block: EvidenceBlock) {
  const container = root.value
  if (!container) return
  const selector = isMarkdown.value ? `[id="${slugify(block.heading)}"]` : `[data-block="${block.id}"]`
  const target = container.querySelector<HTMLElement>(selector)
  if (!target) return
  target.scrollIntoView({ block: 'start', behavior: 'smooth' })
  void target.offsetWidth
  target.classList.add('anchor-hit')
  window.setTimeout(() => target.classList.remove('anchor-hit'), 1800)
}
</script>

<template>
  <div class="viewer">
    <nav v-if="blocks.length > 1" class="viewer__outline" aria-label="章节导航">
      <button
        v-for="block in blocks"
        :key="block.id"
        type="button"
        class="viewer__outline-item"
        :class="{ 'is-active': block.id === activeAnchor }"
        @click="jumpTo(block)"
      >
        <span class="viewer__outline-page mono">{{ block.page }}</span>
        <span class="viewer__outline-label">{{ block.heading }}</span>
      </button>
    </nav>

    <div ref="root" class="viewer__body doc">
      <!-- 经验材料：真实 markdown -->
      <div v-if="isMarkdown" v-html="html"></div>

      <!-- 内置文档：知识库分块 -->
      <template v-else>
        <section
          v-for="block in blocks"
          :key="block.id"
          :data-block="block.id"
          class="block"
          :class="{ 'is-focus': block.id === focusBlockId }"
        >
          <header class="block__head">
            <h3 class="block__title">{{ block.heading }}</h3>
            <span class="block__page mono">p.{{ block.page }}</span>
          </header>
          <p class="block__text">{{ block.text }}</p>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.viewer {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.viewer__outline {
  position: sticky;
  top: 0;
  display: grid;
  gap: 2px;
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 6px;
  border-right: 1px solid var(--hairline);
}

.viewer__outline-item {
  display: grid;
  gap: 2px;
  padding: 7px 10px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-mute);
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.viewer__outline-item:hover {
  background: var(--glass);
  color: var(--ink);
}

.viewer__outline-item.is-active {
  background: var(--accent-tint);
  color: var(--cyan);
}

.viewer__outline-page {
  font-size: 0.68rem;
  color: var(--ink-faint);
}

.viewer__outline-item.is-active .viewer__outline-page {
  color: var(--accent);
}

.viewer__outline-label {
  font-size: 0.8rem;
  line-height: 1.4;
}

.viewer__body {
  min-width: 0;
}

.block {
  padding: 16px 18px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition: background var(--dur-2) var(--ease-out);
}

.block + .block {
  margin-top: 14px;
}

.block:hover {
  background: var(--glass);
}

.block.is-focus {
  border-color: var(--hairline);
  background: var(--glass);
}

.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.block__title {
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink);
}

.block__page {
  font-size: 0.72rem;
  color: var(--ink-faint);
  white-space: nowrap;
}

.block__text {
  font-size: 0.9rem;
  line-height: 1.85;
  color: var(--ink-soft);
  max-width: 74ch;
}

@media (max-width: 900px) {
  .viewer {
    grid-template-columns: minmax(0, 1fr);
  }

  .viewer__outline {
    position: static;
    display: flex;
    gap: 6px;
    overflow-x: auto;
    max-height: none;
    padding-right: 0;
    padding-bottom: 10px;
    border-right: 0;
    border-bottom: 1px solid var(--hairline);
  }

  .viewer__outline-item {
    flex: none;
  }
}
</style>
