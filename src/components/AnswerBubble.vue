<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import CitationCard from './CitationCard.vue'
import type { Answer } from '@/types/qa'
import { questionTypeLabel } from '@/data/qa'
import { renderMarkdown } from '@/utils/markdown'

/**
 * 助手回答
 * ----------------------------------------------------------------------------
 * 回答问题只是正文的一半，另一半是：问题类型、逐条引用、以及证据不足时的诚实说明。
 * 证据不足时不给结论，只说明检索范围与缺口。
 */
const props = defineProps<{ answer: Answer }>()

const meta = computed(() => questionTypeLabel[props.answer.type])
const body = computed(() => renderMarkdown(props.answer.body))
const emit = defineEmits<{ (event: 'follow', question: string): void }>()
</script>

<template>
  <article class="answer" :class="{ 'is-gap': answer.insufficient }">
    <header class="answer__head">
      <span class="answer__avatar">
        <AppIcon :name="answer.insufficient ? 'alert' : 'spark'" :size="15" />
      </span>
      <div class="answer__id">
        <span class="answer__type" :class="`answer__type--${answer.type}`">{{ meta.label }}</span>
        <span class="answer__hint">{{ answer.insufficient ? '证据不足时明确说明' : meta.hint }}</span>
      </div>
    </header>

    <!-- 证据不足：不生成貌似合理的结论 -->
    <div v-if="answer.insufficient" class="gap">
      <p class="gap__title">课程材料中暂未找到足够依据</p>
      <p class="gap__text">{{ answer.gapNote }}</p>
    </div>

    <template v-else>
      <div class="answer__body doc" v-html="body"></div>

      <section v-if="answer.citations.length" class="cites">
        <p class="cites__head">
          <AppIcon name="link" :size="14" />
          课程证据 {{ answer.citations.length }} 条 · 点击可核验原文
        </p>
        <div class="cites__list">
          <CitationCard
            v-for="(citation, index) in answer.citations"
            :key="citation.blockId"
            :citation="citation"
            :index="index + 1"
          />
        </div>
      </section>
    </template>

    <footer v-if="answer.followUps.length" class="follow">
      <span class="follow__label">接着问</span>
      <button
        v-for="question in answer.followUps"
        :key="question"
        type="button"
        class="follow__item"
        @click="emit('follow', question)"
      >
        {{ question }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.answer {
  display: grid;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(146, 190, 236, 0.06), rgba(146, 190, 236, 0.02));
}

.answer__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.answer__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  background: rgba(53, 224, 240, 0.13);
  color: var(--cyan);
}

.answer.is-gap .answer__avatar {
  background: rgba(242, 180, 85, 0.14);
  color: var(--warn);
}

.answer__id {
  display: flex;
  align-items: center;
  gap: 9px;
}

.answer__type {
  padding: 2px 9px;
  border-radius: var(--r-pill);
  font-size: 0.74rem;
  font-weight: 500;
}

.answer__type--explore {
  background: rgba(109, 123, 255, 0.16);
  color: #9ba6ff;
}

.answer__type--retrieve {
  background: rgba(53, 224, 240, 0.14);
  color: var(--cyan);
}

.answer__type--composite {
  background: rgba(67, 217, 163, 0.14);
  color: var(--ok);
}

.answer__hint {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.answer__body {
  font-size: 0.92rem;
}

.gap {
  padding: 14px 16px;
  border: 1px solid rgba(242, 180, 85, 0.3);
  border-radius: var(--r-md);
  background: rgba(242, 180, 85, 0.07);
}

.gap__title {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--warn);
  font-size: 0.9rem;
}

.gap__text {
  margin-top: 6px;
  font-size: 0.86rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 74ch;
}

.cites {
  display: grid;
  gap: 9px;
}

.cites__head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.cites__list {
  display: grid;
  gap: 8px;
}

.follow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}

.follow__label {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.follow__item {
  padding: 6px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink-soft);
  font-size: 0.79rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.follow__item:hover {
  border-color: rgba(53, 224, 240, 0.4);
  background: rgba(53, 224, 240, 0.09);
  color: var(--cyan);
}
</style>
