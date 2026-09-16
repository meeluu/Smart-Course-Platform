<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import type { Resource } from '@/types/course'
import { useViewerStore } from '@/stores/viewer'
import { resourceKindMeta } from '@/utils/resourceMeta'

/**
 * 资源行
 * ----------------------------------------------------------------------------
 * 学习路径上的一个锚点：类型标签 + 标题 + 页码 + 它解决什么问题，
 * 右侧给出「定位」（打开原文并跳到该章节）与「核验」两个动作。
 * 用行组而不是同尺寸卡片网格，保持信息密度并避免卡片化的默认形态。
 */
const props = withDefaults(
  defineProps<{
    resource: Resource
    active?: boolean
    /** 是否处于引用核验上下文，用于强调出处 */
    focusedBlockId?: string | null
  }>(),
  { active: false, focusedBlockId: null },
)

const viewer = useViewerStore()
const meta = computed(() => resourceKindMeta[props.resource.kind])

function open(anchor?: string) {
  viewer.openResource(props.resource.id, anchor ? { anchor } : {})
}
</script>

<template>
  <article class="row" :class="{ 'is-active': active }">
    <span class="row__kind">
      <AppIcon :name="meta.icon" :size="15" />
    </span>

    <div class="row__main">
      <h4 class="row__title">
        {{ resource.title }}
        <span v-if="resource.blockId && resource.blockId === focusedBlockId" class="chip chip--lit">
          当前引用
        </span>
      </h4>
      <p class="row__purpose">{{ resource.purpose }}</p>

      <div class="row__meta">
        <span class="chip">{{ meta.label }}</span>
        <span class="row__page mono">{{ resource.page }}</span>
        <template v-if="resource.anchors.length">
          <span class="dot"></span>
          <button
            v-for="anchor in resource.anchors.slice(0, 3)"
            :key="anchor"
            type="button"
            class="row__anchor"
            @click="open(anchor)"
          >
            <AppIcon name="anchor" :size="12" />
            {{ anchor }}
          </button>
          <span v-if="resource.anchors.length > 3" class="row__more num">
            +{{ resource.anchors.length - 3 }}
          </span>
        </template>
      </div>
    </div>

    <div class="row__actions">
      <button type="button" class="row__btn" @click="open()">
        <AppIcon name="page" :size="14" />
        预览
      </button>
      <button
        v-if="resource.blockId"
        type="button"
        class="row__btn row__btn--ghost"
        @click="viewer.openEvidence(resource.blockId, { anchor: resource.anchors[0] })"
      >
        定位
      </button>
    </div>
  </article>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 15px 18px;
  border-bottom: 1px solid var(--hairline);
  transition: background var(--dur-2) var(--ease-out);
}

.row:last-child {
  border-bottom: 0;
}

.row:hover,
.row.is-active {
  background: var(--glass);
}

.row.is-active {
  box-shadow: inset 2px 0 0 0 var(--cyan);
}

.row__kind {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--cyan);
}

.row.is-active .row__kind {
  border-color: rgba(53, 224, 240, 0.4);
  background: rgba(53, 224, 240, 0.12);
}

.row__main {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.row__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  font-family: var(--font-display);
  font-size: 0.93rem;
  font-weight: 600;
  line-height: 1.45;
}

.row__purpose {
  font-size: 0.83rem;
  line-height: 1.7;
  color: var(--ink-mute);
  max-width: 70ch;
}

.row__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 3px;
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.row__page {
  font-size: 0.74rem;
}

.row__anchor {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink-mute);
  font-size: 0.72rem;
  cursor: pointer;
  transition: all var(--dur-1) var(--ease-out);
}

.row__anchor:hover {
  border-color: rgba(53, 224, 240, 0.4);
  background: rgba(53, 224, 240, 0.09);
  color: var(--cyan);
}

.row__more {
  font-size: 0.72rem;
}

.row__actions {
  display: flex;
  gap: 7px;
  align-self: center;
}

.row__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-soft);
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur-2) var(--ease-out);
}

.row__btn:hover {
  border-color: var(--hairline-hi);
  background: var(--glass-hi);
  color: var(--ink);
}

.row__btn--ghost {
  background: transparent;
  color: var(--ink-faint);
}

.row__btn--ghost:hover {
  color: var(--cyan);
  border-color: rgba(53, 224, 240, 0.36);
}

@media (max-width: 780px) {
  .row {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
  }

  .row__kind {
    width: 30px;
    height: 30px;
  }

  .row__actions {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
