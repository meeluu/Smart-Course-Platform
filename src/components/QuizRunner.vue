<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { kpById } from '@/data/course'
import { useAssessmentStore } from '@/stores/assessment'
import type { Question } from '@/types/assessment'

/**
 * 在线测评
 * ----------------------------------------------------------------------------
 * 两种模式：练习模式选完即给解析（用于边学边测），自测模式统一交卷（用于评估）。
 * 交卷后逐题给出解析与关联知识点，并把薄弱知识点回推到 DR1 的资源路径。
 */
defineProps<{ unitId: string }>()
const emit = defineEmits<{ (event: 'exit'): void }>()

const router = useRouter()
const store = useAssessmentStore()

const index = ref(0)
const startedAt = Date.now()
const tick = window.setInterval(() => {
  elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
}, 1000)
const elapsed = ref(0)
onUnmounted(() => window.clearInterval(tick))

const questions = computed<Question[]>(() =>
  store.activeQuestions.length ? store.activeQuestions : [],
)
const current = computed(() => questions.value[index.value])
const picked = computed(() => (current.value ? store.answers[current.value.id] : undefined))
const revealed = computed(() => store.mode === 'practice' && picked.value !== undefined)
const isCorrect = computed(() => current.value && picked.value === current.value.answer)

const progress = computed(() => ({
  done: store.answeredCount,
  total: questions.value.length,
}))

const clock = computed(() => {
  const m = String(Math.floor(elapsed.value / 60)).padStart(2, '0')
  const s = String(elapsed.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

function kpName(id: string) {
  return kpById.get(id)?.name ?? id
}

function goReview(lessonId?: string, resourceId?: string) {
  const query: Record<string, string> = {}
  if (lessonId) query.lesson = lessonId
  if (resourceId) query.resource = resourceId
  void router.push({ path: '/content', query })
}

function submit() {
  store.finish()
  index.value = 0
}
</script>

<template>
  <section class="quiz">
    <header class="quiz__head">
      <div>
        <p class="quiz__unit">
          {{ store.activeUnit?.title }}
          <span class="chip" :class="store.mode === 'practice' ? 'chip--lit' : ''">
            {{ store.mode === 'practice' ? '练习模式 · 即时解析' : '自测模式 · 统一评分' }}
          </span>
        </p>
        <p class="quiz__meta">
          覆盖 {{ store.activeUnit?.lessonIds.length }} 讲 ·
          {{ store.activeUnit?.knowledgePoints.length }} 个知识点 ·
          {{ questions.length }} 道题
        </p>
      </div>
      <div class="quiz__readout">
        <span class="quiz__clock mono">
          <AppIcon name="clock" :size="13" />
          {{ clock }}
        </span>
        <span class="quiz__done num">{{ progress.done }}/{{ progress.total }}</span>
        <button type="button" class="quiz__exit" @click="emit('exit')">退出测评</button>
      </div>
    </header>

    <nav class="quiz__pager" aria-label="题目导航">
      <button
        v-for="(question, i) in questions"
        :key="question.id"
        type="button"
        class="pager"
        :class="{
          'is-current': i === index,
          'is-done': store.answers[question.id] !== undefined,
          'is-right': store.submitted && store.answers[question.id] === question.answer,
          'is-wrong': store.submitted && store.answers[question.id] !== question.answer,
        }"
        @click="index = i"
      >
        {{ i + 1 }}
      </button>
    </nav>

    <template v-if="current">
      <article class="q">
        <header class="q__head">
          <span class="q__no mono">Q{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="chip">{{ kpName(current.knowledgePoint) }}</span>
          <span v-if="current.scenario" class="chip chip--warn">实验情境题</span>
        </header>
        <p class="q__stem">{{ current.stem }}</p>

        <div class="q__choices">
          <button
            v-for="choice in current.choices"
            :key="choice.key"
            type="button"
            class="choice"
            :class="{
              'is-picked': picked === choice.key,
              'is-right': revealed && choice.key === current.answer,
              'is-wrong': revealed && picked === choice.key && choice.key !== current.answer,
            }"
            @click="store.choose(current.id, choice.key)"
          >
            <span class="choice__key mono">{{ choice.key }}</span>
            <span class="choice__text">{{ choice.text }}</span>
            <AppIcon
              v-if="revealed && choice.key === current.answer"
              name="check"
              :size="15"
              class="choice__mark"
            />
          </button>
        </div>

        <!-- 练习模式即时解析 -->
        <div v-if="revealed" class="explain" :class="isCorrect ? 'is-right' : 'is-wrong'">
          <p class="explain__head">
            <AppIcon :name="isCorrect ? 'check' : 'alert'" :size="15" />
            {{ isCorrect ? '回答正确' : `回答错误，正确选项是 ${current.answer}` }}
          </p>
          <p class="explain__text">{{ current.explanation }}</p>
          <div class="explain__foot">
            <span class="explain__kp">
              关联知识点：<strong>{{ kpName(current.knowledgePoint) }}</strong>
            </span>
            <button
              v-if="current.resourceId"
              type="button"
              class="explain__go"
              @click="goReview(kpById.get(current.knowledgePoint)?.lessonId, current.resourceId)"
            >
              去复习这份材料
              <AppIcon name="arrow-right" :size="13" />
            </button>
          </div>
        </div>
      </article>

      <footer class="quiz__foot">
        <button type="button" class="nav-btn" :disabled="index === 0" @click="index -= 1">
          <AppIcon name="arrow-left" :size="14" />上一题
        </button>

        <div class="quiz__foot-right">
          <button
            v-if="index < questions.length - 1"
            type="button"
            class="nav-btn"
            @click="index += 1"
          >
            下一题<AppIcon name="arrow-right" :size="14" />
          </button>
          <button v-else-if="!store.submitted" type="button" class="submit" @click="submit">
            交卷并生成画像
          </button>
        </div>
      </footer>
    </template>

    <!-- 交卷结果 -->
    <section v-if="store.submitted" class="result">
      <header class="result__head">
        <p class="result__score">
          <span class="num">{{ store.score }}</span>
          <span class="result__total">/ {{ questions.length }}</span>
        </p>
        <div class="result__meta">
          <p class="result__title">本次测评已计入能力画像</p>
          <p class="result__sub">
            用时 {{ clock }} · {{ store.answeredCount }} 题作答 ·
            逐题解析与知识点关联见下方
          </p>
        </div>
        <button type="button" class="submit" @click="emit('exit')">查看能力画像</button>
      </header>

      <ul class="result__list">
        <li v-for="(question, i) in questions" :key="question.id" class="review">
          <div class="review__head">
            <span
              class="review__mark"
              :class="store.answers[question.id] === question.answer ? 'is-right' : 'is-wrong'"
            >
              <AppIcon :name="store.answers[question.id] === question.answer ? 'check' : 'close'" :size="13" />
            </span>
            <button type="button" class="review__stem" @click="index = i">
              {{ i + 1 }}. {{ question.stem }}
            </button>
            <span class="chip">{{ kpName(question.knowledgePoint) }}</span>
          </div>
          <p class="review__line">
            你的选择：<strong>{{ store.answers[question.id] ?? '未作答' }}</strong>
            　正确选项：<strong class="review__right">{{ question.answer }}</strong>
          </p>
          <p class="review__exp">{{ question.explanation }}</p>
          <button
            v-if="question.resourceId"
            type="button"
            class="explain__go"
            @click="goReview(kpById.get(question.knowledgePoint)?.lessonId, question.resourceId)"
          >
            去复习这份材料
            <AppIcon name="arrow-right" :size="13" />
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.quiz {
  display: grid;
  gap: 22px;
}

.quiz__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--hairline);
}

.quiz__unit {
  display: flex;
  align-items: center;
  gap: 11px;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink);
}

.quiz__meta {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--ink-faint);
}

.quiz__readout {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quiz__clock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  font-size: 0.78rem;
  color: var(--ink-mute);
}

.quiz__done {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--cyan);
}

.quiz__exit {
  padding: 6px 13px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-mute);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.quiz__exit:hover {
  background: var(--glass-hi);
  color: var(--ink);
}

/* ------------------------------------------------------------ 题目导航 */

.quiz__pager {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pager {
  width: 32px;
  height: 32px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-mute);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.pager:hover {
  color: var(--ink);
  border-color: var(--hairline-hi);
}

.pager.is-done {
  color: var(--cyan);
}

.pager.is-current {
  border-color: rgba(53, 224, 240, 0.6);
  background: rgba(53, 224, 240, 0.14);
  color: var(--cyan);
}

.pager.is-right {
  border-color: rgba(67, 217, 163, 0.5);
  color: var(--ok);
}

.pager.is-wrong {
  border-color: rgba(255, 122, 138, 0.5);
  color: var(--risk);
}

/* ------------------------------------------------------------ 题目 */

.q {
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(146, 190, 236, 0.05), rgba(146, 190, 236, 0.015));
}

.q__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.q__no {
  font-size: 0.8rem;
  color: var(--cyan);
}

.q__stem {
  font-size: 1.02rem;
  line-height: 1.85;
  color: var(--ink);
  max-width: 76ch;
}

.q__choices {
  display: grid;
  gap: 8px;
}

.choice {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: rgba(146, 190, 236, 0.035);
  color: var(--ink-soft);
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.choice:hover {
  border-color: var(--hairline-hi);
  background: var(--glass-hi);
  color: var(--ink);
}

.choice.is-picked {
  border-color: rgba(53, 224, 240, 0.5);
  background: rgba(53, 224, 240, 0.1);
  color: var(--ink);
}

.choice.is-right {
  border-color: rgba(67, 217, 163, 0.55);
  background: rgba(67, 217, 163, 0.1);
}

.choice.is-wrong {
  border-color: rgba(255, 122, 138, 0.5);
  background: rgba(255, 122, 138, 0.09);
}

.choice__key {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--r-xs);
  background: var(--glass);
  border: 1px solid var(--hairline);
  font-size: 0.76rem;
  color: var(--ink-mute);
}

.choice.is-picked .choice__key {
  border-color: rgba(53, 224, 240, 0.5);
  color: var(--cyan);
}

.choice.is-right .choice__key {
  border-color: rgba(67, 217, 163, 0.5);
  color: var(--ok);
}

.choice.is-wrong .choice__key {
  border-color: rgba(255, 122, 138, 0.5);
  color: var(--risk);
}

.choice__mark {
  color: var(--ok);
}

/* ------------------------------------------------------------ 解析 */

.explain {
  display: grid;
  gap: 9px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: var(--glass);
}

.explain.is-right {
  border-color: rgba(67, 217, 163, 0.34);
}

.explain.is-wrong {
  border-color: rgba(255, 122, 138, 0.34);
}

.explain__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
}

.explain.is-right .explain__head {
  color: var(--ok);
}

.explain.is-wrong .explain__head {
  color: var(--risk);
}

.explain__text {
  font-size: 0.88rem;
  line-height: 1.85;
  color: var(--ink-soft);
  max-width: 76ch;
}

.explain__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 9px;
  border-top: 1px solid var(--hairline);
  font-size: 0.8rem;
  color: var(--ink-mute);
}

.explain__go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(53, 224, 240, 0.36);
  border-radius: var(--r-sm);
  background: rgba(53, 224, 240, 0.08);
  color: var(--cyan);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.explain__go:hover {
  background: rgba(53, 224, 240, 0.16);
}

/* ------------------------------------------------------------ 底部 */

.quiz__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.quiz__foot-right {
  display: flex;
  gap: 10px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 15px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-soft);
  font-size: 0.84rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.nav-btn:hover:not(:disabled) {
  border-color: var(--hairline-hi);
  color: var(--ink);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.submit {
  padding: 9px 20px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.submit:hover {
  box-shadow: 0 0 24px -6px rgba(53, 224, 240, 0.65);
}

/* ------------------------------------------------------------ 结果 */

.result {
  display: grid;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--hairline);
}

.result__head {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  border: 1px solid rgba(53, 224, 240, 0.28);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(53, 224, 240, 0.09), rgba(53, 224, 240, 0.02));
}

.result__score {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.result__score .num {
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--cyan);
  line-height: 1;
}

.result__total {
  font-size: 1rem;
  color: var(--ink-faint);
}

.result__meta {
  flex: 1;
}

.result__title {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}

.result__sub {
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--ink-mute);
}

.result__list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}

.review {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.review__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.review__mark {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  border-radius: var(--r-xs);
}

.review__mark.is-right {
  background: rgba(67, 217, 163, 0.16);
  color: var(--ok);
}

.review__mark.is-wrong {
  background: rgba(255, 122, 138, 0.16);
  color: var(--risk);
}

.review__stem {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font-size: 0.88rem;
  text-align: left;
  cursor: pointer;
}

.review__stem:hover {
  color: var(--cyan);
}

.review__line {
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.review__right {
  color: var(--ok);
}

.review__exp {
  font-size: 0.84rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 76ch;
}

@media (max-width: 720px) {
  .quiz__head,
  .result__head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .q {
    padding: 18px;
  }
}
</style>
