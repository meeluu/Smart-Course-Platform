<script setup lang="ts">
import { computed } from 'vue'
import { masteryTone } from '@/data/portrait'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    confidence?: number
    evidence?: number
    compact?: boolean
  }>(),
  { compact: false },
)

const tone = computed(() => masteryTone(props.value))
</script>

<template>
  <div class="bar" :class="[`bar--${tone}`, { 'bar--compact': compact }]">
    <div class="bar__head">
      <span class="bar__label">{{ label }}</span>
      <span class="bar__value num">{{ value }}</span>
    </div>
    <div class="bar__track">
      <div class="bar__fill" :style="{ width: `${value}%` }"></div>
    </div>
    <div v-if="!compact" class="bar__foot">
      <span v-if="typeof evidence === 'number'">依据 {{ evidence }} 题</span>
      <span v-if="typeof confidence === 'number'" class="bar__conf">置信度 {{ confidence }}%</span>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: grid;
  gap: 6px;
}

.bar__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.bar__label {
  font-size: 0.88rem;
  color: var(--ink-soft);
}

.bar__value {
  font-size: 0.95rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.bar--solid .bar__value {
  color: var(--ok);
}
.bar--shaky .bar__value {
  color: var(--warn);
}
.bar--weak .bar__value {
  color: var(--risk);
}

.bar__track {
  height: 4px;
  border-radius: var(--r-pill);
  background: rgba(146, 190, 236, 0.11);
  overflow: hidden;
}

.bar__fill {
  height: 100%;
  border-radius: var(--r-pill);
  transition: width var(--dur-4) var(--ease-out);
}

.bar--solid .bar__fill {
  background: linear-gradient(90deg, rgba(67, 217, 163, 0.5), var(--ok));
}
.bar--shaky .bar__fill {
  background: linear-gradient(90deg, rgba(242, 180, 85, 0.5), var(--warn));
}
.bar--weak .bar__fill {
  background: linear-gradient(90deg, rgba(255, 122, 138, 0.5), var(--risk));
}

.bar__foot {
  display: flex;
  gap: 14px;
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.bar__conf {
  font-family: var(--font-mono);
}

.bar--compact .bar__label {
  font-size: 0.82rem;
}

.bar--compact .bar__value {
  font-size: 0.85rem;
}
</style>
