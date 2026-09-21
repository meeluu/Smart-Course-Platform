<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'
import type { Step } from '@/types/project'
import { useProjectStore } from '@/stores/project'

/**
 * 步骤卡
 * ----------------------------------------------------------------------------
 * whyNow 一直显示，不折叠：学生能不能判断"要不要现在做"，全靠这一句。
 * 折叠它就是把这套机制的意义折掉了。
 */
const props = defineProps<{ step: Step; index: number }>()

const project = useProjectStore()

const anchor = computed(() => project.anchorOf(props.step))
const anchorLabel = computed(() => (anchor.value?.key === 'toConfirm' ? '待确认事项' : '当前问题'))
const answered = computed(() => (anchor.value ? project.isAnswered(anchor.value.id) : false))

const statusText = computed(
  () => ({ todo: '待开始', doing: '进行中', done: '已完成' })[props.step.status],
)
</script>

<template>
  <article class="step" :class="`step--${props.step.status}`">
    <header class="step__head">
      <span class="step__index num">{{ String(props.index).padStart(2, '0') }}</span>
      <h3 class="step__title">{{ props.step.title }}</h3>
      <span class="step__status" :class="`step__status--${props.step.status}`">{{ statusText }}</span>
    </header>

    <div class="step__why">
      <span class="step__why-label">为什么现在做</span>
      <p class="step__why-text">{{ props.step.whyNow }}</p>
    </div>

    <div v-if="anchor" class="step__anchor">
      <span class="step__anchor-tag">{{ anchorLabel }}</span>
      <span class="step__anchor-text">{{ anchor.text }}</span>
      <span v-if="answered" class="step__anchor-done">
        <AppIcon name="check" :size="12" />
        已有结果
      </span>
    </div>

    <footer class="step__foot">
      <span class="step__resources">
        <AppIcon name="layers" :size="14" />
        {{ props.step.resources.length }} 份相关资料
      </span>
      <RouterLink :to="`/step/${props.step.id}`" class="step__go">
        {{ props.step.status === 'done' ? '查看这一步留下了什么' : '开始这一步' }}
        <AppIcon name="arrow-right" :size="14" />
      </RouterLink>
    </footer>
  </article>
</template>

<style scoped>
.step {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: var(--surface);
  transition: border-color var(--dur-2) var(--ease-out);
}

.step:hover {
  border-color: var(--hairline-hi);
}

.step--doing {
  border-color: var(--accent-line);
}

.step__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.step__index {
  font-size: 0.8rem;
  color: var(--accent-ink);
  flex: none;
}

.step__title {
  flex: 1;
  font-size: 1.02rem;
  line-height: 1.5;
  min-width: 0;
}

.step__status {
  flex: none;
  padding: 2px 9px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  font-size: 0.7rem;
  color: var(--ink-faint);
}

.step__status--doing {
  border-color: var(--accent-line);
  background: var(--accent-tint);
  color: var(--cyan);
}

.step__status--done {
  border-color: var(--ok-line);
  background: var(--ok-tint);
  color: var(--ok);
}

.step__why {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--surface-2);
}

.step__why-label {
  flex: none;
  padding-top: 1px;
  font-size: 0.72rem;
  color: var(--ink-faint);
  white-space: nowrap;
}

.step__why-text {
  font-size: 0.86rem;
  line-height: 1.8;
  color: var(--ink-soft);
}

.step__anchor {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.8rem;
}

.step__anchor-tag {
  flex: none;
  padding: 1px 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  font-size: 0.7rem;
  color: var(--ink-faint);
}

.step__anchor-text {
  color: var(--ink-mute);
}

.step__anchor-done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--ok);
}

.step__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 2px;
}

.step__resources {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.step__go {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--cyan);
}

.step__go:hover {
  color: var(--accent-press);
}
</style>
