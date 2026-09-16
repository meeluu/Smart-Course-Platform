<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useCourseStore } from '@/stores/course'

/**
 * 顶部任务栏（始终悬浮）
 * ----------------------------------------------------------------------------
 * 平台标识 + 四个主入口 + 全局搜索 + 个人入口。
 * 玻璃与模糊只出现在这里：内容是真实从它下面滚过去的。
 */
const route = useRoute()
const course = useCourseStore()

const NAV = [
  { to: '/', label: '课程概览', icon: 'route' },
  { to: '/content', label: '课程内容', icon: 'book' },
  { to: '/qa', label: '智能问答', icon: 'chat' },
  { to: '/profile', label: '能力画像', icon: 'target' },
]

const activePath = computed(() => route.path)

function isActive(to: string) {
  return to === '/' ? activePath.value === '/' : activePath.value.startsWith(to)
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    course.openPalette()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="bar glass--blur">
    <div class="bar__inner">
      <RouterLink to="/" class="brand" aria-label="返回课程概览">
        <span class="brand__mark">
          <AppIcon name="route" :size="18" />
        </span>
        <span class="brand__text">
          <span class="brand__name">大数据分析实践</span>
          <span class="brand__sub">智慧课程平台</span>
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
        <button type="button" class="search" @click="course.openPalette()">
          <AppIcon name="search" :size="15" />
          <span class="search__hint">检索资源与历史问答</span>
          <kbd class="search__kbd">Ctrl K</kbd>
        </button>

        <span class="readout" :title="`已访问 ${course.progress.visited} / ${course.progress.total} 讲`">
          <span class="readout__label">已学</span>
          <span class="readout__value num">{{ course.progress.visited }}</span>
          <span class="readout__total num">/{{ course.progress.total }}</span>
        </span>

        <button type="button" class="icon-btn" aria-label="通知">
          <AppIcon name="bell" :size="16" />
        </button>

        <RouterLink to="/profile" class="me" aria-label="个人中心">
          <AppIcon name="user" :size="16" />
          <span class="me__name">2023 级 · 本科生</span>
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
  background: rgba(53, 224, 240, 0.11);
  color: var(--cyan);
}

/* ---------------------------------------------------------------- 工具 */

.tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.search {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: 220px;
  padding: 7px 10px 7px 11px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-faint);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.search:hover {
  border-color: var(--hairline-hi);
  background: var(--glass-hi);
  color: var(--ink-mute);
}

.search__hint {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search__kbd {
  padding: 1px 6px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-xs);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  color: var(--ink-faint);
}

.readout {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 5px 11px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: var(--glass);
}

.readout__label {
  font-size: 0.7rem;
  color: var(--ink-faint);
  margin-right: 2px;
}

.readout__value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--cyan);
}

.readout__total {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-mute);
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.icon-btn:hover {
  background: var(--glass-hi);
  color: var(--ink);
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
  .search {
    width: 40px;
    padding: 7px;
    justify-content: center;
  }

  .search__hint,
  .search__kbd {
    display: none;
  }

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
