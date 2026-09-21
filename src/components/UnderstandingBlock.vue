<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import ConfidenceTag from './ConfidenceTag.vue'
import type { UnderstandingItem, UnderstandingKey } from '@/types/project'
import { understandingMeta } from '@/data/intake'
import { useProjectStore } from '@/stores/project'

/**
 * 理解板块
 * ----------------------------------------------------------------------------
 * 四块共用同一个组件，因为它们的交互完全一样：看内容、看可信程度、看它从材料哪一段来。
 * 在材料与理解页上额外提供「确认 / 修改 / 删掉」——这三个动作是硬规则 1 的落点，
 * 没有它们，系统的推断就会变成项目事实。
 */
const props = withDefaults(
  defineProps<{
    blockKey: UnderstandingKey
    items: UnderstandingItem[]
    /** edit 出现在材料与理解页；read 出现在项目状态页 */
    mode?: 'edit' | 'read'
  }>(),
  { mode: 'read' },
)

const project = useProjectStore()
const editing = ref<string | null>(null)
const draft = ref('')
const openSource = ref<string | null>(null)

const meta = understandingMeta

function startEdit(item: UnderstandingItem) {
  editing.value = item.id
  draft.value = item.text
}

function submitEdit(id: string) {
  project.reviseItem(id, draft.value)
  editing.value = null
  draft.value = ''
}

function toggleSource(id: string) {
  openSource.value = openSource.value === id ? null : id
}
</script>

<template>
  <section class="block">
    <header class="block__head">
      <div class="block__title">
        <h2>{{ meta[props.blockKey].label }}</h2>
        <span class="block__count num">{{ props.items.length }}</span>
      </div>
      <p class="block__question">{{ meta[props.blockKey].question }}</p>
      <p class="block__hint">{{ meta[props.blockKey].hint }}</p>
    </header>

    <ul v-if="props.items.length" class="items">
      <li v-for="item in props.items" :key="item.id" class="item">
        <div class="item__main">
          <template v-if="editing === item.id">
            <textarea v-model="draft" rows="2" class="item__input"></textarea>
            <div class="item__actions">
              <button type="button" class="btn btn--primary" @click="submitEdit(item.id)">
                <AppIcon name="check" :size="13" />
                保存为我们的说法
              </button>
              <button type="button" class="btn" @click="editing = null">取消</button>
            </div>
          </template>

          <template v-else>
            <p class="item__text">{{ item.text }}</p>

            <div class="item__meta">
              <ConfidenceTag :confidence="item.confidence" :origin="item.origin" compact />
              <button
                v-if="item.source"
                type="button"
                class="item__source"
                @click="toggleSource(item.id)"
              >
                <AppIcon name="link" :size="12" />
                {{ project.materialName(item.source.materialId) || '步骤记录' }} · {{ item.source.locator }}
              </button>
            </div>

            <blockquote v-if="openSource === item.id && item.source" class="item__quote">
              {{ item.source.quote }}
            </blockquote>

            <div v-if="props.mode === 'edit' && item.confidence !== 'confirmed'" class="item__actions">
              <button type="button" class="btn btn--primary" @click="project.confirmItem(item.id)">
                <AppIcon name="check" :size="13" />
                确认
              </button>
              <button type="button" class="btn" @click="startEdit(item)">
                <AppIcon name="refresh" :size="13" />
                改一下
              </button>
              <button type="button" class="btn btn--quiet" @click="project.rejectItem(item.id)">
                <AppIcon name="close" :size="13" />
                删掉
              </button>
            </div>

            <div v-else-if="props.mode === 'edit'" class="item__actions">
              <span class="item__settled">
                <AppIcon name="check" :size="12" />
                已确认
              </span>
            </div>
          </template>
        </div>
      </li>
    </ul>

    <p v-else class="block__empty">{{ meta[props.blockKey].empty }}</p>
  </section>
</template>

<style scoped>
.block {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 20px 22px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: var(--surface);
}

.block__head {
  display: grid;
  gap: 3px;
}

.block__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.block__title h2 {
  font-size: 1rem;
}

.block__count {
  font-size: 0.9rem;
  color: var(--ink-faint);
}

.block__question {
  font-size: 0.84rem;
  color: var(--ink-soft);
}

.block__hint {
  font-size: 0.76rem;
  color: var(--ink-faint);
  line-height: 1.6;
}

.items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 2px;
}

.item {
  padding: 12px 0;
  border-top: 1px solid var(--hairline);
}

.item:first-child {
  border-top: 0;
  padding-top: 6px;
}

.item__text {
  font-size: 0.88rem;
  line-height: 1.8;
  color: var(--ink);
}

.item__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 7px;
}

.item__source {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-faint);
  font-size: 0.72rem;
  cursor: pointer;
  transition: color var(--dur-2) var(--ease-out);
}

.item__source:hover {
  color: var(--cyan);
}

.item__quote {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-left: 2px solid var(--accent-line);
  border-radius: 0 var(--r-xs) var(--r-xs) 0;
  background: var(--fill);
  font-size: 0.8rem;
  line-height: 1.75;
  color: var(--ink-mute);
}

.item__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.item__settled {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  color: var(--ok);
}

.item__input {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.88rem;
  line-height: 1.75;
  resize: vertical;
}

.item__input:focus {
  outline: none;
  border-color: var(--accent);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-mute);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.btn:hover {
  border-color: var(--hairline-hi);
  color: var(--ink);
}

.btn--primary {
  border-color: var(--accent-line);
  background: var(--accent-tint);
  color: var(--cyan);
}

.btn--primary:hover {
  background: var(--accent-tint-2);
  color: var(--cyan);
}

.btn--quiet {
  border-color: transparent;
  color: var(--ink-faint);
}

.block__empty {
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--ink-faint);
}
</style>
