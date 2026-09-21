<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { ThinkingQuestion } from '@/types/project'

/**
 * 追问清单
 * ----------------------------------------------------------------------------
 * 系统的产出是问题，不是答案。学生写下的回答会成为项目状态的一部分——
 * AI 用得越多，留下的应该是更多学生自己的判断。
 */
defineProps<{
  questions: ThinkingQuestion[]
  /** 是否允许直接写入项目状态 */
  committable?: boolean
}>()

const emit = defineEmits<{
  (event: 'answer', id: string, text: string): void
  (event: 'commit', text: string): void
}>()
</script>

<template>
  <ol class="qs">
    <li v-for="(item, index) in questions" :key="item.id" class="q">
      <span class="q__no mono">{{ String(index + 1).padStart(2, '0') }}</span>
      <div class="q__body">
        <p class="q__text">{{ item.text }}</p>
        <textarea
          :value="item.answer"
          rows="2"
          placeholder="写下你们的回答…"
          @input="emit('answer', item.id, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <button
          v-if="committable && item.answer && !item.committed"
          type="button"
          class="q__commit"
          @click="emit('commit', item.answer!)"
        >
          <AppIcon name="check" :size="13" />
          写入项目状态
        </button>
        <span v-else-if="item.committed" class="q__done">
          <AppIcon name="check" :size="13" />
          已写入项目状态
        </span>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.qs {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 14px;
}

.q {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 12px;
}

.q__no {
  font-size: 0.76rem;
  color: var(--cyan);
  padding-top: 3px;
}

.q__body {
  display: grid;
  gap: 8px;
}

.q__text {
  font-size: 0.92rem;
  line-height: 1.8;
  color: var(--ink);
  max-width: 74ch;
}

.q__body textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.86rem;
  line-height: 1.7;
  resize: vertical;
}

.q__body textarea:focus {
  outline: none;
  border-color: var(--accent-line);
}

.q__commit {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-sm);
  background: var(--accent-tint);
  color: var(--cyan);
  font-size: 0.78rem;
  cursor: pointer;
}

.q__done {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--ok);
}
</style>
