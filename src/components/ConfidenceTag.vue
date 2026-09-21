<script setup lang="ts">
import { computed } from 'vue'
import type { Confidence, Origin } from '@/types/project'

/**
 * 可信度标记
 * ----------------------------------------------------------------------------
 * 系统里每一条状态都必须带它。没有这一层，AI 的推断迟早会被当成项目事实。
 */
const props = defineProps<{ confidence: Confidence; origin?: Origin; compact?: boolean }>()

const meta = computed(() => {
  const table: Record<Confidence, { label: string; icon: string; tone: string; hint: string }> = {
    confirmed: { label: '已确认', icon: 'check', tone: 'ok', hint: '由学生或老师明确确认过，可以当作项目事实' },
    inferred: { label: '系统推断', icon: 'spark', tone: 'warn', hint: '系统从材料里读出来的，等你们确认' },
    uncertain: { label: '待确认', icon: 'alert', tone: 'risk', hint: '还没有答案，它会成为判断下一步时的前提' },
  }
  return table[props.confidence]
})

/** 系统产生的内容不必再标一次「系统」——「系统推断」已经说明来源了 */
const originLabel = computed(() => {
  if (!props.origin || props.origin === 'ai') return ''
  return { student: '学生', ai: '系统', teacher: '老师' }[props.origin]
})
</script>

<template>
  <span class="tag" :class="`tag--${meta.tone}`" :title="meta.hint">
    {{ meta.label }}
    <span v-if="originLabel && !compact" class="tag__origin">{{ originLabel }}</span>
  </span>
</template>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  font-size: 0.7rem;
  white-space: nowrap;
}

.tag--ok {
  border-color: var(--ok-line);
  background: var(--ok-tint);
  color: var(--ok);
}

.tag--warn {
  border-color: var(--warn-line);
  background: var(--warn-tint);
  color: var(--warn);
}

.tag--risk {
  border-color: var(--risk-line);
  background: var(--risk-tint);
  color: var(--risk);
}

.tag__origin {
  padding-left: 5px;
  border-left: 1px solid currentColor;
  opacity: 0.72;
  font-size: 0.66rem;
}
</style>
