<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'
import StuckAction from './actions/StuckAction.vue'
import DriftAction from './actions/DriftAction.vue'
import NextAction from './actions/NextAction.vue'
import TeacherAction from './actions/TeacherAction.vue'
import { useProjectStore, type ActionKey } from '@/stores/project'

/**
 * 推进动作面板
 * ----------------------------------------------------------------------------
 * 四个直接动作是学生每天的入口。它们都收敛为同一件事：
 * 让系统先判断此刻该让学生想什么，而不是直接给答案。
 */
const project = useProjectStore()

const META: Record<ActionKey, { title: string; sub: string; icon: string }> = {
  stuck: { title: '我卡住了', sub: '先补背景，再定位卡点是需求、数据、方法还是协作', icon: 'compass' },
  drift: { title: '检查我们有没有跑偏', sub: '对照需求、问题、任务与证据，看逻辑断在哪', icon: 'split' },
  next: { title: '下一步做什么', sub: '只给最重要的 1~3 件，每件说明为什么现在做', icon: 'flag' },
  teacher: { title: '准备问老师 / 需求方', sub: '把已有工作和两种方向整理成可检查的问题', icon: 'send' },
}

const meta = computed(() => (project.action ? META[project.action] : null))

/** Esc 关闭：抽屉类浮层的原生预期 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && project.action) project.closeAction()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="ap">
    <div v-if="project.action" class="scrim" @click.self="project.closeAction()">
      <aside class="ap glass--blur" role="dialog" :aria-label="meta?.title">
        <header class="ap__head">
          <span class="ap__icon"><AppIcon :name="meta?.icon ?? 'spark'" :size="17" /></span>
          <div class="ap__id">
            <h2>{{ meta?.title }}</h2>
            <p>{{ meta?.sub }}</p>
          </div>
          <button type="button" class="ap__close" aria-label="关闭" @click="project.closeAction()">
            <AppIcon name="close" :size="16" />
          </button>
        </header>

        <div class="ap__body">
          <StuckAction v-if="project.action === 'stuck'" />
          <DriftAction v-else-if="project.action === 'drift'" />
          <NextAction v-else-if="project.action === 'next'" />
          <TeacherAction v-else-if="project.action === 'teacher'" />
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  justify-content: flex-end;
  background: var(--scrim);
}

.ap {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(680px, 96vw);
  height: 100vh;
  border-left: 1px solid var(--hairline-hi);
}

.ap__head {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 20px 24px 18px;
  border-bottom: 1px solid var(--hairline);
}

.ap__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--r-sm);
  background: var(--accent-tint);
  color: var(--cyan);
  flex: none;
}

.ap__id h2 {
  font-size: 1.12rem;
  padding-right: 30px;
}

.ap__id p {
  margin-top: 4px;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--ink-faint);
  max-width: 52ch;
}

.ap__close {
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
}

.ap__close:hover {
  background: var(--glass-hi);
  color: var(--ink);
}

.ap__body {
  overflow-y: auto;
  padding: 22px 24px 48px;
}

.ap-enter-active,
.ap-leave-active {
  transition: opacity var(--dur-2) var(--ease-out);
}

.ap-enter-active .ap,
.ap-leave-active .ap {
  transition: transform var(--dur-3) var(--ease-out);
}

.ap-enter-from,
.ap-leave-to {
  opacity: 0;
}

.ap-enter-from .ap,
.ap-leave-to .ap {
  transform: translateX(30px);
}
</style>
