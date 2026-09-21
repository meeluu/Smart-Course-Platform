<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useProjectStore } from '@/stores/project'

/**
 * 顶部任务栏
 * ----------------------------------------------------------------------------
 * v1 只有两个主入口：项目当前状态、材料与理解。
 * 「待你处理」是唯一需要被一直看见的数字——它数的是未经确认的系统推断。
 */
const route = useRoute()
const project = useProjectStore()

const NAV = [
  { to: '/', label: '项目当前状态', icon: 'gauge' },
  { to: '/materials', label: '材料与理解', icon: 'layers' },
]

const activePath = computed(() => route.path)

function isActive(to: string) {
  return to === '/' ? activePath.value === '/' : activePath.value.startsWith(to)
}
</script>

<template>
  <header class="bar glass--blur">
    <div class="bar__inner">
      <RouterLink to="/" class="brand" aria-label="回到项目当前状态">
        <span class="brand__mark">
          <AppIcon name="route" :size="18" />
        </span>
        <span class="brand__text">
          <span class="brand__name">{{ project.meta.shortName }}</span>
          <span class="brand__sub">{{ project.meta.team }} · 第 {{ project.meta.currentWeek }} 周</span>
        </span>
      </RouterLink>

      <nav class="nav" aria-label="主导航">
        <RouterLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="nav__item"
          :class="{ 'is-active': isActive(item.to) }"
        >
          <AppIcon :name="item.icon" :size="16" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="tools">
        <RouterLink
          v-if="project.pendingItems.length"
          to="/materials"
          class="readout"
          :title="`${project.pendingItems.length} 条内容还是系统推断，等你确认`"
        >
          <span class="readout__label">待你确认</span>
          <span class="readout__value num">{{ project.pendingItems.length }}</span>
          <span class="readout__total">条</span>
        </RouterLink>
        <span v-else class="readout readout--clear">
          <AppIcon name="check" :size="14" />
          <span class="readout__label">理解已全部确认</span>
        </span>

        <RouterLink to="/materials" class="me" aria-label="材料与理解">
          <AppIcon name="user" :size="16" />
          <span class="me__name">{{ project.meta.members.length }} 人 · {{ project.meta.phase }}</span>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: var(--z-topbar);
  border-bottom: 1px solid var(--hairline);
}

.bar__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: var(--shell-max);
  height: var(--topbar-h);
  margin: 0 auto;
  padding: 0 24px;
}

/* ---------------------------------------------------------------- 品牌 */

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
  flex: none;
}

.brand:hover {
  color: var(--ink);
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
}

.brand__text {
  display: grid;
  line-height: 1.15;
}

.brand__name {
  font-family: var(--font-display);
  font-size: 0.94rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.brand__sub {
  font-size: 0.68rem;
  color: var(--ink-faint);
  letter-spacing: 0.04em;
}

/* ---------------------------------------------------------------- 导航 */

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nav__item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  border-radius: var(--r-pill);
  color: var(--ink-mute);
  font-size: 0.86rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--dur-2) var(--ease-out);
}

.nav__item:hover {
  background: var(--glass);
  color: var(--ink);
}

.nav__item.is-active {
  background: var(--accent-tint);
  color: var(--cyan);
}

/* ---------------------------------------------------------------- 工具 */

.tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.readout {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 5px 11px;
  border: 1px solid var(--warn-line);
  border-radius: var(--r-pill);
  background: var(--warn-tint);
}

.readout--clear {
  align-items: center;
  gap: 6px;
  border-color: var(--ok-line);
  background: var(--ok-tint);
  color: var(--ok);
}

.readout__label {
  font-size: 0.7rem;
  color: var(--ink-faint);
  margin-right: 2px;
}

.readout--clear .readout__label {
  color: var(--ok);
}

.readout__value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--warn);
}

.readout__total {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.me {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 13px 6px 10px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: var(--glass);
  color: var(--ink-soft);
  font-size: 0.82rem;
  transition: all var(--dur-2) var(--ease-out);
}

.me:hover {
  border-color: var(--hairline-hi);
  color: var(--ink);
}

.me__name {
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .me__name {
    display: none;
  }
}

@media (max-width: 900px) {
  .bar__inner {
    height: auto;
    flex-wrap: wrap;
    gap: 12px;
    padding: 10px 16px;
  }

  .nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .readout {
    display: none;
  }
}
</style>
