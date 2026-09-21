<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'
import DocViewer from './DocViewer.vue'
import { useViewerStore } from '@/stores/viewer'
import { kindLabel } from '@/utils/resourceMeta'

/**
 * 原文阅览面板
 * ----------------------------------------------------------------------------
 * 步骤详情页的推荐资料点开后走这里。面板只做一件事：把材料的原文摆出来，
 * 让学生核对系统推荐它时说的那句「为什么有用」是不是成立。
 */
const viewer = useViewerStore()

const doc = computed(() => viewer.doc)
const title = computed(
  () => viewer.currentBlock?.heading ?? doc.value?.title ?? '',
)

/** Esc 关闭：抽屉类浮层的原生预期 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && viewer.isOpen) viewer.close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="panel">
    <aside v-if="viewer.isOpen && doc" class="panel glass--blur" aria-label="原文阅览">
      <header class="panel__head">
        <div class="panel__meta">
          <span class="chip chip--lit">
            <AppIcon name="anchor" :size="13" />
            {{ kindLabel(viewer.kind ?? doc.kind) }}
          </span>
          <span v-if="viewer.caption" class="panel__caption mono">{{ viewer.caption }}</span>
        </div>
        <h2 class="panel__title">{{ title }}</h2>
        <p class="panel__sub">{{ doc.title }}</p>
        <button type="button" class="panel__close" aria-label="关闭" @click="viewer.close()">
          <AppIcon name="close" :size="16" />
        </button>
      </header>

      <div class="panel__body">
        <DocViewer :doc-id="doc.docId" :focus-block-id="viewer.blockId" :anchor="viewer.anchor" />
      </div>

      <footer v-if="viewer.reason" class="panel__foot">
        <p class="panel__foot-note">
          <AppIcon name="link" :size="14" />
          {{ viewer.reason }}
        </p>
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

.panel__caption {
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
  padding: 14px 24px;
  border-top: 1px solid var(--hairline);
}

.panel__foot-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--ink-mute);
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
