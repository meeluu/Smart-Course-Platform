<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useCourseStore } from '@/stores/course'
import { useViewerStore } from '@/stores/viewer'
import { useQaStore } from '@/stores/qa'
import { allLessons } from '@/data/course'
import { searchBlocks } from '@/utils/content'
import { kindLabel } from '@/utils/resourceMeta'

/**
 * 全局搜索
 * ----------------------------------------------------------------------------
 * 同时检索三类对象：学习路径（讲次与资源）、课程证据（知识库分块）、历史问答。
 * 结果按对象类型分组，回车执行第一项。
 */
const router = useRouter()
const course = useCourseStore()
const viewer = useViewerStore()
const qa = useQaStore()

const keyword = ref('')
const cursor = ref(0)
const input = ref<HTMLInputElement | null>(null)

interface Hit {
  id: string
  group: 'par' | 'material' | 'evidence' | 'thread'
  icon: string
  title: string
  meta: string
  run: () => void
}

const QUICK_QUESTIONS = [
  '最终项目提交的系统演示需要包含哪些模块？',
  '5C 数据质量维度分别是什么？',
  'K-Means 聚类这一节我该按什么顺序复习？',
]

const RECENT_LESSONS = ['L04', 'L06', 'L13']

const recentLessons = computed(() =>
  RECENT_LESSONS.map((id) => allLessons.find((lesson) => lesson.id === id)).filter(
    (lesson): lesson is (typeof allLessons)[number] => Boolean(lesson),
  ),
)

const results = computed<Hit[]>(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return []
  const hits: Hit[] = []

  // 学习路径：讲次
  allLessons
    .filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(query) ||
        lesson.summary.toLowerCase().includes(query) ||
        `第 ${lesson.index} 讲`.includes(query),
    )
    .slice(0, 4)
    .forEach((lesson) =>
      hits.push({
        id: `lesson-${lesson.id}`,
        group: 'par',
        icon: 'route',
        title: `第 ${lesson.index} 讲 · ${lesson.title}`,
        meta: `${lesson.date} · ${lesson.resources.length} 份材料`,
        run: () => void router.push({ path: '/content', query: { lesson: lesson.id } }),
      }),
    )

  // 学习路径：资源
  allLessons
    .flatMap((lesson) => lesson.resources.map((resource) => ({ lesson, resource })))
    .filter(
      ({ resource }) =>
        resource.title.toLowerCase().includes(query) || resource.purpose.toLowerCase().includes(query),
    )
    .slice(0, 6)
    .forEach(({ lesson, resource }) =>
      hits.push({
        id: `res-${resource.id}`,
        group: 'material',
        icon: 'page',
        title: resource.title,
        meta: `${kindLabel(resource.kind)} · 第 ${lesson.index} 讲 · p.${resource.page}`,
        run: () => void router.push({ path: '/content', query: { lesson: lesson.id, resource: resource.id } }),
      }),
    )

  // 课程证据：知识库分块
  searchBlocks(query, 8).forEach(({ block, doc }) => {
    if (doc.kind === 'experience') {
      hits.push({
        id: `doc-${doc.docId}`,
        group: 'evidence',
        icon: 'layers',
        title: doc.title,
        meta: `经验材料 · ${doc.term ?? ''} · ${doc.purpose}`,
        run: () => viewer.openEvidence(doc.docId),
      })
      return
    }
    hits.push({
      id: `block-${block.id}`,
      group: 'evidence',
      icon: 'anchor',
      title: block.heading,
      meta: `${doc.title} · p.${block.page}`,
      run: () => viewer.openEvidence(block.id),
    })
  })

  // 历史问答
  qa.threads
    .filter((thread) => thread.question.toLowerCase().includes(query))
    .slice(0, 4)
    .forEach((thread) =>
      hits.push({
        id: `thread-${thread.id}`,
        group: 'thread',
        icon: 'chat',
        title: thread.question,
        meta: `历史问答 · ${thread.at}`,
        run: () => {
          qa.replay(thread)
          void router.push({ path: '/qa', query: { lesson: thread.lessonId } })
        },
      }),
    )

  return hits
})

const groups = computed(() => {
  const order: Array<{ key: Hit['group']; label: string }> = [
    { key: 'par', label: '学习路径' },
    { key: 'material', label: '课程材料' },
    { key: 'evidence', label: '课程证据' },
    { key: 'thread', label: '历史问答' },
  ]
  return order
    .map((entry) => ({ ...entry, items: results.value.filter((hit) => hit.group === entry.key) }))
    .filter((entry) => entry.items.length > 0)
})

const flat = computed(() => groups.value.flatMap((group) => group.items))

function close() {
  course.closePalette()
  keyword.value = ''
  cursor.value = 0
}

function run(hit?: Hit) {
  const target = hit ?? flat.value[cursor.value]
  if (!target) return
  target.run()
  close()
}

function move(step: number) {
  const size = flat.value.length
  if (!size) return
  cursor.value = (cursor.value + step + size) % size
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    run()
  }
}

watch(keyword, () => {
  cursor.value = 0
})

watch(
  () => course.paletteOpen,
  async (open) => {
    if (!open) return
    await nextTick()
    input.value?.focus()
  },
)

function quickAsk(question: string) {
  void qa.ask(question)
  void router.push({ path: '/qa' })
  close()
}

function goLesson(lessonId: string) {
  void router.push({ path: '/content', query: { lesson: lessonId } })
  close()
}
</script>

<template>
  <Transition name="fade">
    <div v-if="course.paletteOpen" class="scrim" @click.self="close">
      <div class="palette glass--blur" role="dialog" aria-label="全局搜索" @keydown="onKeydown">
        <div class="palette__input">
          <AppIcon name="search" :size="17" />
          <input
            ref="input"
            v-model="keyword"
            type="text"
            placeholder="检索讲次、课件、实验手册、规范、经验材料与历史问答…"
            autocomplete="off"
          />
          <button type="button" class="palette__close" aria-label="关闭" @click="close">
            <AppIcon name="close" :size="15" />
          </button>
        </div>

        <div class="palette__body">
          <!-- 未输入：给出最近讲次与常见提问 -->
          <template v-if="!keyword.trim()">
            <section class="group">
              <p class="label">继续学习</p>
              <button
                v-for="item in recentLessons"
                :key="item.id"
                type="button"
                class="hit"
                @click="goLesson(item.id)"
              >
                <AppIcon name="clock" :size="15" />
                <span class="hit__title">第 {{ item.index }} 讲 · {{ item.title }}</span>
              </button>
            </section>

            <section class="group">
              <p class="label">可以这样问</p>
              <button
                v-for="question in QUICK_QUESTIONS"
                :key="question"
                type="button"
                class="hit"
                @click="quickAsk(question)"
              >
                <AppIcon name="spark" :size="15" />
                <span class="hit__title">{{ question }}</span>
              </button>
            </section>
          </template>

          <template v-else-if="flat.length === 0">
            <p class="palette__none">课程材料中未找到与该关键词相关的内容。</p>
          </template>

          <template v-else>
            <section v-for="group in groups" :key="group.key" class="group">
              <p class="label">{{ group.label }}</p>
              <button
                v-for="hit in group.items"
                :key="hit.id"
                type="button"
                class="hit"
                :class="{ 'is-cursor': flat[cursor]?.id === hit.id }"
                @mouseenter="cursor = flat.findIndex((item) => item.id === hit.id)"
                @click="run(hit)"
              >
                <AppIcon :name="hit.icon" :size="15" />
                <span class="hit__body">
                  <span class="hit__title">{{ hit.title }}</span>
                  <span class="hit__meta">{{ hit.meta }}</span>
                </span>
              </button>
            </section>
          </template>
        </div>

        <footer class="palette__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 打开</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  justify-content: center;
  padding-top: 12vh;
  background: rgba(4, 8, 15, 0.66);
}

.palette {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(680px, 92vw);
  max-height: 70vh;
  border: 1px solid var(--hairline-hi);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.palette__input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--hairline);
  color: var(--ink-faint);
}

.palette__input input {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 0.95rem;
  font-family: var(--font-body);
}

.palette__input input::placeholder {
  color: var(--ink-faint);
}

.palette__close {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-xs);
  background: var(--glass);
  color: var(--ink-mute);
  cursor: pointer;
}

.palette__body {
  overflow-y: auto;
  padding: 10px 10px 16px;
}

.group + .group {
  margin-top: 12px;
}

.group .label {
  display: block;
  padding: 8px 10px 6px;
}

.hit {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  width: 100%;
  padding: 9px 11px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-1) var(--ease-out);
}

.hit.is-cursor {
  background: rgba(53, 224, 240, 0.1);
  color: var(--ink);
}

.hit__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.hit__title {
  font-size: 0.88rem;
  line-height: 1.45;
}

.hit__meta {
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.palette__none {
  padding: 28px 14px;
  text-align: center;
  color: var(--ink-mute);
  font-size: 0.88rem;
}

.palette__foot {
  display: flex;
  gap: 18px;
  padding: 11px 18px;
  border-top: 1px solid var(--hairline);
  font-size: 0.74rem;
  color: var(--ink-faint);
}

kbd {
  padding: 1px 6px;
  margin-right: 3px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-xs);
  font-family: var(--font-mono);
  font-size: 0.68rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--dur-2) var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
