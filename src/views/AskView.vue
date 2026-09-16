<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AnswerBubble from '@/components/AnswerBubble.vue'
import { questionTypeLabel, suggestedQuestions } from '@/data/qa'
import { allLessons, lessonById } from '@/data/course'
import { useQaStore } from '@/stores/qa'
import { useAssessmentStore } from '@/stores/assessment'

/**
 * 智能问答视图（DR2）
 * ----------------------------------------------------------------------------
 * 居中对话流，左侧按学习单元归档历史问答。回答正文之外必须同时呈现三样东西：
 * 问题类型、逐条引用、以及证据不足时的明确说明——缺任何一样都不是本平台的回答。
 */
const route = useRoute()
const qa = useQaStore()
const assessment = useAssessmentStore()

const draft = ref('')
const stream = ref<HTMLElement | null>(null)

const activeLesson = computed(() => lessonById.get(qa.activeLessonId))

const types = computed(() => [
  { key: 'explore' as const, ...questionTypeLabel.explore, tone: 'explore' },
  { key: 'retrieve' as const, ...questionTypeLabel.retrieve, tone: 'retrieve' },
  { key: 'composite' as const, ...questionTypeLabel.composite, tone: 'composite' },
])

async function scrollToEnd() {
  await nextTick()
  const el = stream.value
  if (el) el.scrollTop = el.scrollHeight
}

async function send(question?: string) {
  const text = (question ?? draft.value).trim()
  if (!text) return
  draft.value = ''
  assessment.countRetrieval()
  await qa.ask(text)
  await scrollToEnd()
}

function onComposerKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}

watch(
  () => route.query.lesson,
  (lessonId) => {
    if (typeof lessonId === 'string' && lessonById.has(lessonId)) qa.setLesson(lessonId)
  },
  { immediate: true },
)

watch(() => qa.turns.length, scrollToEnd)
</script>

<template>
  <div class="ask">
    <!-- ---------------------------------------------------------- 历史归档 -->
    <aside class="archive" aria-label="历史问答归档">
      <header class="archive__head">
        <p class="label">历史问答</p>
        <p class="archive__note">按学习单元归档，便于复习复用</p>
      </header>

      <div class="archive__body">
        <section v-for="group in qa.grouped" :key="group.lessonId" class="arc-group">
          <p class="arc-group__head">
            <span class="mono">第 {{ String(group.lesson?.index ?? 0).padStart(2, '0') }} 讲</span>
            <span class="arc-group__title">{{ group.lesson?.title }}</span>
          </p>
          <ul>
            <li v-for="thread in group.items" :key="thread.id">
              <button type="button" class="arc-item" @click="qa.replay(thread)">
                <span class="arc-item__q">{{ thread.question }}</span>
                <span class="arc-item__meta">
                  <span class="arc-item__type" :class="`arc-item__type--${thread.type}`">
                    {{ questionTypeLabel[thread.type].label }}
                  </span>
                  <span class="arc-item__at mono">{{ thread.at }}</span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </aside>

    <!-- ------------------------------------------------------------ 对话区 -->
    <section class="stream-wrap">
      <header class="stream-head">
        <div class="stream-head__title">
          <h1>课程内可溯源问答</h1>
          <p class="stream-head__sub">
            回答只以课程知识库为证据来源：课件、实验手册、项目规范、评分细则与往届经验材料。
            每条关键结论都标注文档与章节页码，证据不足时会明确说明。
          </p>
        </div>
        <div class="stream-head__types">
          <span v-for="type in types" :key="type.key" class="ttype" :class="`ttype--${type.tone}`">
            {{ type.label }}
            <span class="ttype__hint">{{ type.hint }}</span>
          </span>
        </div>
      </header>

      <div ref="stream" class="stream">
        <!-- 空态：建议问题 -->
        <div v-if="!qa.hasConversation" class="start">
          <p class="start__title">从这些问题开始，或者直接问你在材料里找不到的东西</p>
          <div class="start__list">
            <button
              v-for="question in suggestedQuestions"
              :key="question"
              type="button"
              class="start__item"
              @click="send(question)"
            >
              <AppIcon name="spark" :size="15" />
              <span>{{ question }}</span>
              <AppIcon name="arrow-right" :size="14" class="start__go" />
            </button>
          </div>
          <p class="start__foot">
            试试问一个课程材料里没有的东西，例如「本课程使用的向量数据库是哪个版本」——
            平台会告诉你在材料里找不到依据，而不是编一个答案。
          </p>
        </div>

        <template v-else>
          <div v-for="turn in qa.turns" :key="turn.id">
            <article v-if="turn.role === 'user'" class="mine">
              <p class="mine__text">{{ turn.text }}</p>
              <span class="mine__at mono">{{ turn.at }}</span>
            </article>

            <div v-else-if="turn.pending" class="thinking">
              <span class="thinking__dot"></span>
              <span class="thinking__dot"></span>
              <span class="thinking__dot"></span>
              <span class="thinking__text">正在课程知识库中检索证据并重排序…</span>
            </div>

            <AnswerBubble v-else-if="turn.answer" :answer="turn.answer" @follow="send" />
          </div>
        </template>
      </div>

      <!-- ------------------------------------------------------------ 输入 -->
      <div class="composer">
        <div class="composer__ctx">
          <AppIcon name="bookmark" :size="14" />
          <span>本次提问归档到</span>
          <el-select
            v-model="qa.activeLessonId"
            size="small"
            style="width: 220px"
            placeholder="选择学习单元"
          >
            <el-option
              v-for="lesson in allLessons"
              :key="lesson.id"
              :value="lesson.id"
              :label="`第 ${lesson.index} 讲 · ${lesson.title}`"
            />
          </el-select>
          <span v-if="activeLesson" class="composer__ctx-hint">
            当前上下文：{{ activeLesson.knowledgePoints.length }} 个知识点
          </span>
        </div>

        <div class="composer__box">
          <textarea
            v-model="draft"
            rows="2"
            placeholder="用自然语言提问，例如：最终项目提交的系统演示需要包含哪些模块？"
            @keydown="onComposerKeydown"
          ></textarea>
          <div class="composer__actions">
            <button v-if="qa.hasConversation" type="button" class="composer__ghost" @click="qa.reset()">
              清空对话
            </button>
            <button type="button" class="composer__send" :disabled="!draft.trim() || qa.pending" @click="send()">
              <AppIcon name="send" :size="15" />
              发送
            </button>
          </div>
        </div>
        <p class="composer__note">
          Enter 发送 · Shift + Enter 换行　|　回答中的引用可点击，直接在右侧核验原文
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ask {
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

/* ---------------------------------------------------------- 历史归档 */

.archive {
  position: sticky;
  top: calc(var(--topbar-h) + 20px);
  max-height: calc(100vh - var(--topbar-h) - 44px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.archive__head {
  padding: 16px;
  border-bottom: 1px solid var(--hairline);
}

.archive__note {
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.archive__body {
  overflow-y: auto;
  padding: 10px;
}

.arc-group + .arc-group {
  margin-top: 12px;
}

.arc-group__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 8px 5px;
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.arc-group__title {
  color: var(--ink-mute);
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arc-group ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1px;
}

.arc-item {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 8px 9px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-2) var(--ease-out);
}

.arc-item:hover {
  background: var(--glass);
}

.arc-item__q {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.arc-item:hover .arc-item__q {
  color: var(--ink);
}

.arc-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.arc-item__type {
  padding: 1px 7px;
  border-radius: var(--r-pill);
  font-size: 0.66rem;
}

.arc-item__type--explore {
  background: rgba(109, 123, 255, 0.16);
  color: #9ba6ff;
}
.arc-item__type--retrieve {
  background: rgba(53, 224, 240, 0.14);
  color: var(--cyan);
}
.arc-item__type--composite {
  background: rgba(67, 217, 163, 0.14);
  color: var(--ok);
}

.arc-item__at {
  font-size: 0.66rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------ 对话区 */

.stream-wrap {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 22px;
  min-width: 0;
}

.stream-head {
  display: grid;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--hairline);
}

.stream-head__title h1 {
  font-size: 1.7rem;
}

.stream-head__sub {
  margin-top: 10px;
  max-width: 76ch;
  font-size: 0.9rem;
  line-height: 1.85;
  color: var(--ink-mute);
}

.stream-head__types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ttype {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--hairline);
  font-size: 0.78rem;
}

.ttype--explore {
  color: #9ba6ff;
  border-color: rgba(109, 123, 255, 0.32);
}
.ttype--retrieve {
  color: var(--cyan);
  border-color: rgba(53, 224, 240, 0.32);
}
.ttype--composite {
  color: var(--ok);
  border-color: rgba(67, 217, 163, 0.32);
}

.ttype__hint {
  color: var(--ink-faint);
  font-size: 0.72rem;
}

.stream {
  display: grid;
  gap: 20px;
  align-content: start;
  max-width: 880px;
  min-height: 320px;
}

/* 空态 */

.start {
  display: grid;
  gap: 16px;
  padding: 28px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(146, 190, 236, 0.055), rgba(146, 190, 236, 0.015));
}

.start__title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
}

.start__list {
  display: grid;
  gap: 2px;
}

.start__item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-soft);
  font-size: 0.89rem;
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.start__item:hover {
  background: var(--glass-hi);
  color: var(--ink);
}

.start__go {
  margin-left: auto;
  opacity: 0;
  color: var(--cyan);
  transition: all var(--dur-2) var(--ease-out);
}

.start__item:hover .start__go {
  opacity: 1;
  transform: translateX(3px);
}

.start__foot {
  padding-top: 4px;
  border-top: 1px solid var(--hairline);
  font-size: 0.8rem;
  line-height: 1.8;
  color: var(--ink-faint);
}

/* 我的提问 */

.mine {
  display: grid;
  justify-items: end;
  gap: 5px;
  margin-left: auto;
  max-width: 620px;
}

.mine__text {
  padding: 12px 16px;
  border: 1px solid rgba(53, 224, 240, 0.28);
  border-radius: var(--r-md) var(--r-md) 4px var(--r-md);
  background: rgba(53, 224, 240, 0.1);
  color: var(--ink);
  font-size: 0.92rem;
  line-height: 1.7;
}

.mine__at {
  font-size: 0.7rem;
  color: var(--ink-faint);
}

/* 检索中 */

.thinking {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
}

.thinking__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--cyan);
  animation: pulse 1.1s var(--ease-in-out) infinite;
}

.thinking__dot:nth-child(2) {
  animation-delay: 140ms;
}
.thinking__dot:nth-child(3) {
  animation-delay: 280ms;
}

.thinking__text {
  margin-left: 6px;
  font-size: 0.82rem;
  color: var(--ink-mute);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

/* ------------------------------------------------------------ 输入 */

.composer {
  display: grid;
  gap: 10px;
  padding-top: 4px;
}

.composer__ctx {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.composer__ctx-hint {
  color: var(--ink-mute);
}

.composer__box {
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: rgba(146, 190, 236, 0.05);
  padding: 12px 14px;
  transition: border-color var(--dur-2) var(--ease-out);
}

.composer__box:focus-within {
  border-color: rgba(53, 224, 240, 0.42);
}

.composer__box textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.92rem;
  line-height: 1.7;
  resize: vertical;
}

.composer__box textarea::placeholder {
  color: var(--ink-faint);
}

.composer__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.composer__ghost {
  padding: 7px 13px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-faint);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color var(--dur-2) var(--ease-out);
}

.composer__ghost:hover {
  color: var(--ink-soft);
}

.composer__send {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.composer__send:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.composer__send:not(:disabled):hover {
  box-shadow: 0 0 24px -6px rgba(53, 224, 240, 0.65);
}

.composer__note {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------ 响应式 */

@media (max-width: 1080px) {
  .ask {
    grid-template-columns: minmax(0, 1fr);
  }

  .archive {
    position: static;
    max-height: none;
  }

  .archive__body {
    max-height: 260px;
  }
}

@media (max-width: 720px) {
  .stream-head__title h1 {
    font-size: 1.35rem;
  }

  .composer__ctx {
    flex-wrap: wrap;
  }
}
</style>
