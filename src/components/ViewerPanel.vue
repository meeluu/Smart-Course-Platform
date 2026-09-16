<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import DocViewer from './DocViewer.vue'
import { useViewerStore } from '@/stores/viewer'
import { kindLabel } from '@/utils/resourceMeta'
import { lessonById } from '@/data/course'

/**
 * 全局原文面板
 * ----------------------------------------------------------------------------
 * DR1 的资源预览与 DR2 的引用核验共用，保证两个视图指向同一份材料。
 * 只在内容确实从它下面滚过时使用玻璃与模糊。
 */
const viewer = useViewerStore()
const router = useRouter()

const doc = computed(() => viewer.doc)
const title = computed(() => viewer.resource?.title ?? viewer.currentBlock?.heading ?? doc.value?.title ?? '')
const kind = computed(() => viewer.resource?.kind ?? doc.value?.kind)
const lesson = computed(() => (viewer.lessonId ? lessonById.get(viewer.lessonId) : undefined))

function goToLesson() {
  if (!viewer.lessonId) return
  const query: Record<string, string> = { lesson: viewer.lessonId }
  if (viewer.resourceId) query.resource = viewer.resourceId
  if (viewer.anchor) query.anchor = viewer.anchor
  void router.push({ path: '/content', query })
  viewer.close()
}
</script>

<template>
  <Transition name="panel">
    <aside v-if="viewer.isOpen && doc" class="panel glass--blur" aria-label="原文阅览">
      <header class="panel__head">
        <div class="panel__meta">
          <span class="chip chip--lit">
            <AppIcon name="anchor" :size="13" />
            {{ kindLabel(kind) }}
          </span>
          <span v-if="doc.version" class="panel__version mono">{{ doc.version }}</span>
        </div>
        <h2 class="panel__title">{{ title }}</h2>
        <p class="panel__sub">
          {{ doc.title }}
          <span v-if="lesson"> · 归属第 {{ lesson.index }} 讲</span>
          <span v-if="viewer.resource?.page"> · 页码 {{ viewer.resource.page }}</span>
        </p>
        <button type="button" class="panel__close" aria-label="关闭" @click="viewer.close()">
          <AppIcon name="close" :size="16" />
        </button>
      </header>

      <div class="panel__body">
        <DocViewer
          :doc-id="doc.docId"
          :focus-block-id="viewer.blockId"
          :anchor="viewer.anchor"
        />
      </div>

      <footer v-if="lesson" class="panel__foot">
        <p class="panel__foot-note">
          <AppIcon name="link" :size="14" />
          这份材料在学习路径上属于「{{ lesson.title }}」
        </p>
        <button type="button" class="panel__action" @click="goToLesson">
          在课程内容中打开
          <AppIcon name="arrow-right" :size="14" />
        </button>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
.panel {
  position: fixed;
  top: 0;
  right: 0;
  z-index: var(--z-overlay);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(620px, 94vw);
  height: 100vh;
  border-left: 1px solid var(--hairline);
}

.panel__head {
  position: relative;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--hairline);
}

.panel__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.panel__version {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.panel__title {
  font-size: 1.16rem;
  line-height: 1.4;
  padding-right: 36px;
}

.panel__sub {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--ink-mute);
}

.panel__close {
  position: absolute;
  top: 20px;
  right: 20px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-mute);
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.panel__close:hover {
  background: var(--glass-hi);
  color: var(--ink);
}

.panel__body {
  overflow-y: auto;
  padding: 20px 24px 32px;
}

.panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  border-top: 1px solid var(--hairline);
}

.panel__foot-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--ink-mute);
}

.panel__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(53, 224, 240, 0.4);
  border-radius: var(--r-sm);
  background: rgba(53, 224, 240, 0.1);
  color: var(--cyan);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.panel__action:hover {
  background: rgba(53, 224, 240, 0.18);
}

.panel-enter-active,
.panel-leave-active {
  transition:
    transform var(--dur-3) var(--ease-out),
    opacity var(--dur-3) var(--ease-out);
}

.panel-enter-from,
.panel-leave-to {
  transform: translateX(24px);
  opacity: 0;
}

@media (max-width: 720px) {
  .panel {
    width: 100vw;
  }
}
</style>
