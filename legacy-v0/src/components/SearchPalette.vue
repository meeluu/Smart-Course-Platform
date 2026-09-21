<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useCourseStore } from '@/stores/course'
import { useViewerStore } from '@/stores/viewer'
import { useProjectStore, type ActionKey } from '@/stores/project'
import { searchBlocks } from '@/utils/content'
import { kindLabel } from '@/utils/resourceMeta'

/**
 * 全局检索
 * ----------------------------------------------------------------------------
 * 一次检索三类对象：项目地图节点、关键决定、课程知识。
 * 课程知识只作为「可能相关的材料」出现，点开是原文核验，不会直接给答案。
 */
const router = useRouter()
const course = useCourseStore()
const viewer = useViewerStore()
const project = useProjectStore()

const keyword = ref('')
const cursor = ref(0)
const input = ref<HTMLInputElement | null>(null)

interface Hit {
  id: string
  group: 'action' | 'node' | 'decision' | 'knowledge'
  icon: string
  title: string
  meta: string
  run: () => void
}

const QUICK_ACTIONS: { key: ActionKey; label: string; icon: string }[] = [
  { key: 'stuck', label: '我卡住了', icon: 'compass' },
  { key: 'drift', label: '检查我们有没有跑偏', icon: 'split' },
  { key: 'next', label: '下一步做什么', icon: 'flag' },
  { key: 'teacher', label: '准备问老师', icon: 'send' },
]

const results = computed<Hit[]>(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return []
  const hits: Hit[] = []

  project.nodes
    .filter((node) => `${node.title} ${node.detail}`.toLowerCase().includes(query))
    .slice(0, 5)
    .forEach((node) =>
      hits.push({
        id: `node-${node.id}`,
        group: 'node',
        icon: 'graph',
        title: node.title,
        meta: `项目地图 · ${node.detail.slice(0, 30)}…`,
        run: () => void router.push({ path: '/map', query: { node: node.id } }),
      }),
    )

  project.decisions
    .filter((item) => `${item.chose} ${item.why}`.toLowerCase().includes(query))
    .slice(0, 4)
    .forEach((item) =>
      hits.push({
        id: `dec-${item.id}`,
        group: 'decision',
        icon: 'check',
        title: item.chose,
        meta: `关键决定 · ${item.why.slice(0, 30)}…`,
        run: () => void router.push({ path: '/log' }),
      }),
    )

  searchBlocks(query, 8).forEach(({ block, doc }) =>
    hits.push({
      id: `kb-${block.id}`,
      group: 'knowledge',
      icon: 'book',
      title: doc.kind === 'experience' ? doc.title : block.heading,
      meta: `${kindLabel(doc.kind)} · ${doc.title} · p.${block.page}`,
      run: () => viewer.openEvidence(block.id),
    }),
  )

  return hits
})

const GROUPS: { key: Hit['group']; label: string }[] = [
  { key: 'node', label: '项目地图' },
  { key: 'decision', label: '关键决定' },
  { key: 'knowledge', label: '课程知识' },
]

const groups = computed(() =>
  GROUPS.map((entry) => ({ ...entry, items: results.value.filter((hit) => hit.group === entry.key) })).filter(
    (entry) => entry.items.length > 0,
  ),
)

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

function runAction(key: ActionKey) {
  project.openAction(key)
  close()
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

watch(keyword, () => (cursor.value = 0))

watch(
  () => course.paletteOpen,
  async (open) => {
    if (!open) return
    await nextTick()
    input.value?.focus()
  },
)
</script>

<template>
  <Transition name="fade">
    <div v-if="course.paletteOpen" class="scrim" @click.self="close">
      <div class="palette glass--blur" role="dialog" aria-label="全局检索">
        <div class="palette__input">
          <AppIcon name="search" :size="17" />
          <input
            ref="input"
            v-model="keyword"
            type="text"
            placeholder="检索项目地图节点、关键决定与课程知识…"
            autocomplete="off"
          />
          <button type="button" class="palette__close" aria-label="关闭" @click="close">
            <AppIcon name="close" :size="15" />
          </button>
        </div>

        <div class="palette__body">
          <template v-if="!keyword.trim()">
            <section class="group">
              <p class="label">直接开始</p>
              <button
                v-for="action in QUICK_ACTIONS"
                :key="action.key"
                type="button"
                class="hit"
                @click="runAction(action.key)"
              >
                <AppIcon :name="action.icon" :size="15" />
                <span class="hit__title">{{ action.label }}</span>
              </button>
            </section>
          </template>

          <template v-else-if="flat.length === 0">
            <p class="palette__none">项目状态与课程材料里都没有匹配的内容。</p>
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
  background: var(--scrim);
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

.palette__input input:focus {
  outline: none;
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
  background: var(--accent-tint);
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
