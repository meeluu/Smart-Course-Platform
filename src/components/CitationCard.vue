<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import type { Citation } from '@/types/qa'
import { useViewerStore } from '@/stores/viewer'
import { kindLabel } from '@/utils/resourceMeta'

/**
 * 引用卡片
 * ----------------------------------------------------------------------------
 * 每条课程证据显示「文档名 + 章节 + 页码」，点击即在原文面板中核验。
 * 这是整个平台的核心交互：结论永远牵着一根可以点开的出处线。
 */
const props = defineProps<{ citation: Citation; index: number }>()

const viewer = useViewerStore()
const tone = computed(() => (props.index % 3) + 1)

function open() {
  viewer.openEvidence(props.citation.blockId, { anchor: props.citation.heading })
}
</script>

<template>
  <button type="button" class="cite" @click="open">
    <span class="cite__no num" :class="`cite__no--${tone}`">{{ index }}</span>
    <span class="cite__body">
      <span class="cite__doc">{{ citation.docTitle }}</span>
      <span class="cite__where">
        {{ citation.heading }}
        <span class="dot"></span>
        <span class="mono">{{ citation.page }}</span>
        <span v-if="citation.resourceKind" class="cite__kind">{{ kindLabel(citation.resourceKind) }}</span>
      </span>
      <span class="cite__quote">{{ citation.quote }}</span>
    </span>
    <span class="cite__go">
      <AppIcon name="external" :size="14" />
      核验原文
    </span>
  </button>
</template>

<style scoped>
.cite {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: var(--glass);
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.cite:hover {
  border-color: rgba(53, 224, 240, 0.36);
  background: var(--glass-hi);
}

.cite__no {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  margin-top: 1px;
  border-radius: var(--r-xs);
  font-size: 0.72rem;
  font-weight: 600;
}

.cite__no--1 {
  background: rgba(53, 224, 240, 0.16);
  color: var(--cyan);
}
.cite__no--2 {
  background: rgba(74, 168, 255, 0.16);
  color: var(--azure);
}
.cite__no--3 {
  background: rgba(109, 123, 255, 0.18);
  color: #9ba6ff;
}

.cite__body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cite__doc {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ink);
}

.cite__where {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.76rem;
  color: var(--ink-mute);
}

.cite__kind {
  padding: 1px 7px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  font-size: 0.68rem;
  color: var(--ink-faint);
}

.cite__quote {
  margin-top: 3px;
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--ink-mute);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cite__go {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: center;
  font-size: 0.76rem;
  color: var(--ink-faint);
  white-space: nowrap;
  transition: color var(--dur-2) var(--ease-out);
}

.cite:hover .cite__go {
  color: var(--cyan);
}

@media (max-width: 640px) {
  .cite {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .cite__go {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
