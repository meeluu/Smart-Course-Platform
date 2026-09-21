<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { StepResource } from '@/types/project'
import { useViewerStore } from '@/stores/viewer'
import { kindIcon, kindLabel } from '@/utils/resourceMeta'

/**
 * 推荐资料行
 * ----------------------------------------------------------------------------
 * 每条资料都要写清「为什么它对这个具体问题有用」，这句话由生成步骤时一并算出，
 * 说的是当前这一步在问什么，而不是泛泛的「这一章很相关」。
 *
 * 注意这里没有「已读」：读完资料不会改变任何状态，只有完成步骤、写下结果与证据才会。
 */
const props = defineProps<{ resource: StepResource; stepTitle: string }>()

const viewer = useViewerStore()

function open() {
  viewer.open({
    docId: props.resource.docId,
    blockId: props.resource.blockId,
    anchor: props.resource.blockId ? undefined : props.resource.title,
    caption: props.resource.page,
    reason: `这条资料是系统为「${props.stepTitle}」推荐的。请核对它是否真的对得上你们现在的问题。`,
    kind: props.resource.kind,
  })
}
</script>

<template>
  <li class="res">
    <div class="res__head">
      <span class="res__kind">
        <AppIcon :name="kindIcon(props.resource.kind)" :size="14" />
        {{ kindLabel(props.resource.kind) }}
      </span>
      <span class="res__page mono">{{ props.resource.page }}</span>
    </div>

    <p class="res__title">{{ props.resource.title }}</p>

    <div class="res__why">
      <span class="res__why-label">为什么有用</span>
      <p class="res__why-text">{{ props.resource.whyUseful }}</p>
    </div>

    <button type="button" class="res__open" @click="open">
      看原文
      <AppIcon name="arrow-right" :size="14" />
    </button>
  </li>
</template>

<style scoped>
.res {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: var(--surface);
}

.res__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.res__kind {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.res__page {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.res__title {
  font-family: var(--font-display);
  font-size: 0.94rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--ink);
}

.res__why {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
}

.res__why-label {
  font-size: 0.7rem;
  color: var(--ink-faint);
}

.res__why-text {
  font-size: 0.84rem;
  line-height: 1.75;
  color: var(--ink-soft);
}

.res__open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  justify-self: start;
  padding: 6px 13px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-sm);
  background: var(--accent-tint);
  color: var(--cyan);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.res__open:hover {
  background: var(--accent-tint-2);
}
</style>
