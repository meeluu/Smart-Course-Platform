<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ResourceRow from '@/components/ResourceRow.vue'
import EmptyState from '@/components/EmptyState.vue'
import { allLessons, kpById, lessonById, modules, nextLesson, previousLesson } from '@/data/course'
import { resourceKindOrder, resourceKindMeta } from '@/utils/resourceMeta'
import { useCourseStore } from '@/stores/course'
import { useQaStore } from '@/stores/qa'
import { useViewerStore } from '@/stores/viewer'
import type { ResourceKind } from '@/types/course'

/**
 * 课程内容视图（DR1 学习路径视图）
 * ----------------------------------------------------------------------------
 * 左侧目录树「模块 → 讲次」，右侧按「课件 / 实验手册 / 项目规范 / 经验材料」聚合本讲资源。
 * 每条资源带类型标签、页码与定位锚点；底部给出上一讲 / 下一讲与相关问答，
 * 让复习定位从「跨目录翻文件」变成「沿路径走一步」。
 */
const route = useRoute()
const router = useRouter()
const course = useCourseStore()
const qa = useQaStore()
const viewer = useViewerStore()

const DEFAULT_LESSON = 'L04'

const filter = ref<'all' | ResourceKind>('all')
const keyword = ref('')

const activeLessonId = computed(() => {
  const fromQuery = typeof route.query.lesson === 'string' ? route.query.lesson : ''
  return lessonById.has(fromQuery) ? fromQuery : DEFAULT_LESSON
})

const activeLesson = computed(() => lessonById.get(activeLessonId.value))
const focusedResourceId = computed(() => (typeof route.query.resource === 'string' ? route.query.resource : null))

/** 目录树过滤：按讲次标题、知识点或资源标题命中 */
const tree = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return modules
  return modules
    .map((module) => ({
      ...module,
      lessons: module.lessons.filter(
        (lesson) =>
          lesson.title.toLowerCase().includes(query) ||
          lesson.summary.toLowerCase().includes(query) ||
          lesson.resources.some((resource) => resource.title.toLowerCase().includes(query)) ||
          lesson.knowledgePoints.some((kp) => (kpById.get(kp)?.name ?? '').toLowerCase().includes(query)),
      ),
    }))
    .filter((module) => module.lessons.length > 0)
})

const groups = computed(() => {
  const lesson = activeLesson.value
  if (!lesson) return []
  return resourceKindOrder
    .map((kind) => ({
      kind,
      meta: resourceKindMeta[kind],
      // 分组恒按类型切分；顶部筛选项决定显示哪些分组
      items: lesson.resources.filter((resource) => resource.kind === kind),
    }))
    .filter(
      (group) => group.items.length > 0 && (filter.value === 'all' || group.kind === filter.value),
    )
})

const counts = computed(() => {
  const lesson = activeLesson.value
  const base: Record<string, number> = { all: lesson?.resources.length ?? 0 }
  resourceKindOrder.forEach((kind) => {
    base[kind] = lesson?.resources.filter((resource) => resource.kind === kind).length ?? 0
  })
  return base
})

const relatedThreads = computed(() => qa.threads.filter((thread) => thread.lessonId === activeLessonId.value))

const prev = computed(() => previousLesson(activeLessonId.value))
const next = computed(() => nextLesson(activeLessonId.value))

function goLesson(lessonId: string, extra: Record<string, string> = {}) {
  void router.push({ path: '/content', query: { lesson: lessonId, ...extra } })
}

watch(
  activeLessonId,
  (lessonId) => {
    course.markVisited(lessonId)
    filter.value = 'all'
  },
  { immediate: true },
)

/** 从引用或画像跳进来时，把目标资源滚动到视野中 */
watch(
  [focusedResourceId, activeLessonId],
  async () => {
    if (!focusedResourceId.value) return
    await new Promise((resolve) => window.setTimeout(resolve, 60))
    const el = document.querySelector<HTMLElement>(`[data-resource="${focusedResourceId.value}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
  { immediate: true },
)

function openThread(question: string, lessonId: string) {
  void qa.ask(question, lessonId)
  void router.push({ path: '/qa', query: { lesson: lessonId } })
}
</script>

<template>
  <div class="content">
    <!-- ------------------------------------------------------------- 目录树 -->
    <aside class="rail glass--blur" aria-label="课程目录树">
      <div class="rail__head">
        <p class="label">课程目录</p>
        <p class="rail__note">
          {{ allLessons.length }} 讲 · 已学 <span class="num">{{ course.progress.visited }}</span> 讲
        </p>
        <label class="rail__search">
          <AppIcon name="search" :size="14" />
          <input v-model="keyword" type="text" placeholder="按讲次、知识点过滤" />
        </label>
      </div>

      <nav class="rail__tree">
        <div v-for="module in tree" :key="module.id" class="node">
          <div class="node__head">
            <span class="node__no mono">M{{ module.index }}</span>
            <span class="node__title">{{ module.title }}</span>
            <span class="node__span mono">{{ module.span }}</span>
          </div>
          <ul class="node__lessons">
            <li v-for="lesson in module.lessons" :key="lesson.id">
              <button
                type="button"
                class="leaf"
                :class="{ 'is-active': lesson.id === activeLessonId }"
                @click="goLesson(lesson.id)"
              >
                <span class="leaf__dot" :class="{ 'is-visited': course.visited.includes(lesson.id) }"></span>
                <span class="leaf__title">
                  <span class="leaf__no mono">{{ String(lesson.index).padStart(2, '0') }}</span>
                  {{ lesson.title }}
                </span>
                <span class="leaf__count num">{{ lesson.resources.length }}</span>
              </button>
            </li>
          </ul>
        </div>
        <EmptyState
          v-if="tree.length === 0"
          icon="search"
          title="没有匹配的讲次"
          description="换一个关键词，或者清空过滤条件查看完整目录。"
        />
      </nav>
    </aside>

    <!-- ------------------------------------------------------------- 主内容区 -->
    <section v-if="activeLesson" class="main">
      <header class="intro">
        <div class="intro__meta">
          <span class="intro__no mono">第 {{ String(activeLesson.index).padStart(2, '0') }} 讲</span>
          <span class="dot"></span>
          <span class="mono">{{ activeLesson.date }}</span>
          <span class="dot"></span>
          <span>{{ activeLesson.term }}</span>
        </div>
        <h1>{{ activeLesson.title }}</h1>
        <p class="intro__summary">{{ activeLesson.summary }}</p>

        <div class="intro__kps">
          <span class="intro__kps-label">
            <AppIcon name="target" :size="13" />
            本讲知识点
          </span>
          <span v-for="kp in activeLesson.knowledgePoints" :key="kp" class="chip">
            {{ kpById.get(kp)?.name ?? kp }}
          </span>
        </div>
      </header>

      <div class="filters" role="tablist" aria-label="资源类型筛选">
        <button
          type="button"
          class="filter"
          :class="{ 'is-active': filter === 'all' }"
          @click="filter = 'all'"
        >
          全部
          <span class="filter__count num">{{ counts.all }}</span>
        </button>
        <button
          v-for="kind in resourceKindOrder"
          :key="kind"
          type="button"
          class="filter"
          :class="{ 'is-active': filter === kind }"
          :disabled="counts[kind] === 0"
          @click="filter = kind"
        >
          <AppIcon :name="resourceKindMeta[kind].icon" :size="14" />
          {{ resourceKindMeta[kind].label }}
          <span class="filter__count num">{{ counts[kind] }}</span>
        </button>
      </div>

      <div class="groups">
        <section v-for="group in groups" :key="group.kind" class="group">
          <header class="group__head">
            <h2 class="group__title">
              <AppIcon :name="group.meta.icon" :size="15" />
              {{ group.meta.label }}
            </h2>
            <p class="group__hint">回答「{{ group.meta.question }}」</p>
          </header>
          <div class="group__rows">
            <div v-for="resource in group.items" :key="resource.id" :data-resource="resource.id">
              <ResourceRow
                :resource="resource"
                :active="resource.id === focusedResourceId"
                :focused-block-id="viewer.blockId"
              />
            </div>
          </div>
        </section>

        <EmptyState
          v-if="groups.length === 0"
          icon="filter"
          title="这一讲没有该类材料"
          description="切换到其他类型，或查看本讲的全部资源。"
        />
      </div>

      <!-- ------------------------------------------------------- 路径前进 -->
      <footer class="path">
        <div class="path__nav">
          <button
            type="button"
            class="path__step"
            :disabled="!prev"
            @click="prev && goLesson(prev.id)"
          >
            <AppIcon name="arrow-left" :size="15" />
            <span class="path__step-body">
              <span class="path__step-label">上一讲</span>
              <span class="path__step-title">{{ prev ? prev.title : '已经是第一讲' }}</span>
            </span>
          </button>
          <button
            type="button"
            class="path__step path__step--next"
            :disabled="!next"
            @click="next && goLesson(next.id)"
          >
            <span class="path__step-body">
              <span class="path__step-label">下一讲</span>
              <span class="path__step-title">{{ next ? next.title : '已经是最后一讲' }}</span>
            </span>
            <AppIcon name="arrow-right" :size="15" />
          </button>
        </div>

        <div class="path__qa">
          <p class="path__qa-head">
            <AppIcon name="chat" :size="14" />
            关于这一讲的相关问答（{{ relatedThreads.length }}）
          </p>
          <ul v-if="relatedThreads.length" class="path__qa-list">
            <li v-for="thread in relatedThreads" :key="thread.id">
              <button type="button" class="qa-link" @click="openThread(thread.question, thread.lessonId)">
                <span class="qa-link__text">{{ thread.question }}</span>
                <AppIcon name="arrow-right" :size="13" />
              </button>
            </li>
          </ul>
          <p v-else class="path__qa-empty">
            这一讲还没有问答记录。到
            <RouterLink to="/qa">智能问答</RouterLink>
            里提问，回答会带出可核验的出处。
          </p>
        </div>
      </footer>
    </section>

    <EmptyState v-else icon="book" title="这一讲不存在" description="从左侧目录重新选择一讲。" />
  </div>
</template>

<style scoped>
.content {
  display: grid;
  grid-template-columns: var(--rail-w) minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

/* ------------------------------------------------------------- 目录树 */

.rail {
  position: sticky;
  top: calc(var(--topbar-h) + 20px);
  max-height: calc(100vh - var(--topbar-h) - 44px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.rail__head {
  padding: 16px 16px 14px;
  border-bottom: 1px solid var(--hairline);
}

.rail__note {
  margin-top: 4px;
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.rail__note .num {
  color: var(--cyan);
}

.rail__search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 7px 11px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: rgba(146, 190, 236, 0.05);
  color: var(--ink-faint);
  transition: border-color var(--dur-2) var(--ease-out);
}

.rail__search:focus-within {
  border-color: rgba(53, 224, 240, 0.5);
}

.rail__search input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 0.82rem;
  font-family: var(--font-body);
}

.rail__search input::placeholder {
  color: var(--ink-faint);
}

.rail__tree {
  overflow-y: auto;
  padding: 10px 10px 16px;
}

.node + .node {
  margin-top: 10px;
}

.node__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 6px;
}

.node__no {
  font-size: 0.7rem;
  color: var(--cyan);
}

.node__title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.node__span {
  margin-left: auto;
  font-size: 0.68rem;
  color: var(--ink-faint);
}

.node__lessons {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1px;
}

.leaf {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-mute);
  font-size: 0.82rem;
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.leaf:hover {
  background: var(--glass);
  color: var(--ink);
}

.leaf.is-active {
  background: rgba(53, 224, 240, 0.11);
  color: var(--cyan);
}

.leaf__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(152, 198, 240, 0.28);
}

.leaf__dot.is-visited {
  background: var(--cyan);
}

.leaf__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaf__no {
  margin-right: 6px;
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.leaf.is-active .leaf__no {
  color: rgba(53, 224, 240, 0.75);
}

.leaf__count {
  font-size: 0.7rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------- 主区 */

.main {
  display: grid;
  gap: 26px;
  min-width: 0;
}

.intro__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--ink-faint);
}

.intro__no {
  color: var(--cyan);
  font-size: 0.86rem;
}

.intro h1 {
  margin-top: 10px;
  font-size: 1.9rem;
}

.intro__summary {
  margin-top: 12px;
  max-width: 74ch;
  font-size: 0.94rem;
  line-height: 1.9;
  color: var(--ink-soft);
}

.intro__kps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--hairline);
}

.intro__kps-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 4px;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------- 筛选 */

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--hairline);
}

.filter {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 13px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: var(--glass);
  color: var(--ink-mute);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.filter:hover:not(:disabled) {
  border-color: var(--hairline-hi);
  color: var(--ink);
}

.filter.is-active {
  border-color: rgba(53, 224, 240, 0.45);
  background: rgba(53, 224, 240, 0.12);
  color: var(--cyan);
}

.filter:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.filter__count {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.filter.is-active .filter__count {
  color: rgba(53, 224, 240, 0.8);
}

/* ------------------------------------------------------------- 分组 */

.groups {
  display: grid;
  gap: 28px;
}

.group__head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding-bottom: 10px;
}

.group__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1.02rem;
}

.group__hint {
  font-size: 0.8rem;
  color: var(--ink-faint);
}

.group__rows {
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  overflow: hidden;
}

/* ------------------------------------------------------------- 路径 */

.path {
  display: grid;
  gap: 22px;
  padding-top: 6px;
}

.path__nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.path__step {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: var(--glass);
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.path__step--next {
  justify-content: flex-end;
  text-align: right;
}

.path__step:hover:not(:disabled) {
  border-color: rgba(53, 224, 240, 0.36);
  background: var(--glass-hi);
  color: var(--ink);
}

.path__step:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.path__step-body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.path__step-label {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.path__step-title {
  font-size: 0.88rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path__qa {
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.path__qa-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.path__qa-list {
  list-style: none;
  padding: 0;
  margin-top: 12px;
  display: grid;
  gap: 2px;
}

.qa-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 9px 11px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-soft);
  font-size: 0.86rem;
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.qa-link:hover {
  background: var(--glass);
  color: var(--cyan);
}

.path__qa-empty {
  margin-top: 10px;
  font-size: 0.84rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------- 响应式 */

@media (max-width: 1140px) {
  .content {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail {
    position: static;
    max-height: none;
  }

  .rail__tree {
    max-height: 320px;
  }
}

@media (max-width: 720px) {
  .intro h1 {
    font-size: 1.5rem;
  }

  .path__nav {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
