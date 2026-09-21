<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { decisionKindLabel } from '@/data/project'
import { useProjectStore } from '@/stores/project'

/**
 * 关键决定
 * ----------------------------------------------------------------------------
 * 学生要记录的不是每一步操作，而是会改变项目方向的关键选择。
 * 每个选择至少留下：选择了什么 / 为什么 / 依据 / 谁参与 / 是否确认。
 * 汇报时就不只能说「我们做了什么」，而要说清「为什么这么做」。
 */
defineProps<{ limit?: number }>()

const project = useProjectStore()

const STATUS: Record<string, { label: string; tone: string }> = {
  confirmed: { label: '已确认', tone: 'ok' },
  tentative: { label: '临时决定', tone: 'warn' },
  unverified: { label: '待验证', tone: 'risk' },
}

const ORIGIN: Record<string, string> = { student: '团队', ai: '系统建议', teacher: '老师' }
</script>

<template>
  <ul class="decisions">
    <li
      v-for="item in project.decisions.slice(0, limit ?? project.decisions.length)"
      :key="item.id"
      class="dec"
    >
      <header class="dec__head">
        <span class="chip" :class="item.kind === 'standard' ? 'chip--warn' : ''">
          {{ decisionKindLabel[item.kind] }}
        </span>
        <span class="dec__chose">{{ item.chose }}</span>
        <span class="chip" :class="`chip--${STATUS[item.status].tone}`">
          {{ STATUS[item.status].label }}
        </span>
        <span class="dec__at mono">{{ item.at }}</span>
      </header>

      <p class="dec__why">
        <span class="dec__label">为什么</span>
        {{ item.why }}
      </p>

      <div class="dec__basis">
        <span class="dec__label">依据</span>
        <span v-for="basis in item.basis" :key="basis" class="chip">{{ basis }}</span>
      </div>

      <div class="dec__by">
        <AppIcon name="user" :size="13" />
        <span v-for="by in item.by" :key="by" class="dec__by-item">{{ ORIGIN[by] }}</span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.decisions {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}

.dec {
  display: grid;
  gap: 9px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.dec__head {
  display: flex;
  align-items: center;
  gap: 11px;
}

.dec__chose {
  flex: 1;
  font-family: var(--font-display);
  font-size: 0.96rem;
  font-weight: 600;
  color: var(--ink);
}

.dec__at {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.dec__why {
  font-size: 0.87rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 78ch;
}

.dec__label {
  display: inline-block;
  margin-right: 7px;
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.dec__basis {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.dec__by {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.dec__by-item + .dec__by-item::before {
  content: '·';
  margin-right: 8px;
  opacity: 0.6;
}
</style>
