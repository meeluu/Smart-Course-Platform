<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { useViewerStore } from '@/stores/viewer'
import type { KnowledgeLink } from '@/types/project'

/**
 * 课程知识小卡
 * ----------------------------------------------------------------------------
 * 课程资源不做一级入口。它只在项目需要时以小卡出现，并且必须带一个追问，
 * 让学生把知识转成项目判断：课程知识 → 当前项目问题 → 学生判断 → 项目节点。
 * 只「看完打勾」不算完成，写出判断才算。
 */
const props = defineProps<{ link: KnowledgeLink }>()
const emit = defineEmits<{ (event: 'answer', blockId: string, text: string): void }>()

const viewer = useViewerStore()
const draft = ref(props.link.answer ?? '')
const submitted = ref(Boolean(props.link.answer))

function submit() {
  const text = draft.value.trim()
  if (!text) return
  emit('answer', props.link.blockId, text)
  submitted.value = true
}
</script>

<template>
  <article class="kc">
    <header class="kc__head">
      <span class="kc__icon"><AppIcon name="book" :size="15" /></span>
      <div class="kc__id">
        <p class="kc__title">{{ link.title }}</p>
        <p class="kc__meta mono">p.{{ link.page }}</p>
      </div>
      <button type="button" class="kc__open" @click="viewer.openEvidence(link.blockId)">
        看原文
        <AppIcon name="external" :size="13" />
      </button>
    </header>

    <p class="kc__reason">{{ link.reason }}</p>

    <div class="kc__probe">
      <p class="kc__probe-label">
        <AppIcon name="spark" :size="13" />
        它要你回答的是
      </p>
      <p class="kc__probe-text">{{ link.probe }}</p>
    </div>

    <div class="kc__answer">
      <textarea
        v-model="draft"
        rows="2"
        placeholder="写下你们自己的判断。写不出来，说明这份材料现在还不该占用时间。"
      ></textarea>
      <div class="kc__actions">
        <span v-if="submitted" class="kc__done">
          <AppIcon name="check" :size="13" />
          已写入项目地图
        </span>
        <button type="button" class="kc__submit" :disabled="!draft.trim() || submitted" @click="submit">
          {{ submitted ? '已提交' : '写入项目状态' }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.kc {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: var(--glass);
}

.kc__head {
  display: flex;
  align-items: center;
  gap: 11px;
}

.kc__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  background: var(--accent-tint);
  color: var(--cyan);
}

.kc__id {
  flex: 1;
  min-width: 0;
}

.kc__title {
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
}

.kc__meta {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.kc__open {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-mute);
  font-size: 0.76rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur-2) var(--ease-out);
}

.kc__open:hover {
  border-color: var(--accent-line);
  color: var(--cyan);
}

.kc__reason {
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--ink-faint);
}

.kc__probe {
  padding: 12px 14px;
  border: 1px solid var(--accent-line-soft);
  border-radius: var(--r-sm);
  background: var(--accent-tint);
}

.kc__probe-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: var(--cyan);
}

.kc__probe-text {
  margin-top: 6px;
  font-size: 0.9rem;
  line-height: 1.75;
  color: var(--ink);
}

.kc__answer textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.87rem;
  line-height: 1.7;
  resize: vertical;
}

.kc__answer textarea:focus {
  outline: none;
  border-color: var(--accent-line);
}

.kc__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.kc__done {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.76rem;
  color: var(--ok);
}

.kc__submit {
  padding: 6px 14px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.kc__submit:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
</style>
