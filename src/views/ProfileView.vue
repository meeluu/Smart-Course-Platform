<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import MasteryBar from '@/components/MasteryBar.vue'
import RadarChart from '@/components/RadarChart.vue'
import QuizRunner from '@/components/QuizRunner.vue'
import { kpById } from '@/data/course'
import { quizUnits, questionsOfUnit } from '@/data/quiz'
import { modules } from '@/data/course'
import { verdictLabel } from '@/data/portrait'
import { useAssessmentStore } from '@/stores/assessment'
import { useQaStore } from '@/stores/qa'
import type { QuizMode } from '@/types/assessment'

/**
 * 个人中心（DR3）
 * ----------------------------------------------------------------------------
 * 两个页签：测评（按单元组织，练习 / 自测两种模式）与画像（雷达图 + 知识点掌握度 +
 * 薄弱项清单 + 可执行的复习路径）。画像里的每一个薄弱项都必须能点到具体材料。
 */
const router = useRouter()
const store = useAssessmentStore()
const qa = useQaStore()

const tab = ref<'quiz' | 'portrait'>('quiz')
const showAll = ref(false)

const metrics = computed(() => [
  { key: 'acc', label: '平均正确率', value: `${store.accuracy}%`, hint: '按已提交的测评统计' },
  { key: 'done', label: '累计作答', value: `${store.answered}`, hint: '道题' },
  { key: 'min', label: '累计用时', value: `${store.minutes}`, hint: '分钟' },
  { key: 'ret', label: '检索行为', value: `${store.retrievals}`, hint: '次问答与材料定位' },
])

const weakList = computed(() => store.ranked.filter((record) => record.mastery < 80))

const visibleKnowledge = computed(() =>
  showAll.value ? store.ranked : store.ranked.filter((record) => record.mastery < 80),
)

function moduleTitle(moduleId: string) {
  return modules.find((module) => module.id === moduleId)?.title ?? moduleId
}

function lastAttempt(unitId: string) {
  return store.history.find((item) => item.unitId === unitId)
}

function startUnit(unitId: string, mode: QuizMode) {
  store.start(unitId, mode)
  tab.value = 'quiz'
}

function exitQuiz() {
  const wasSubmitted = store.submitted
  store.reset()
  if (wasSubmitted) tab.value = 'portrait'
}

function review(kpId: string) {
  const kp = kpById.get(kpId)
  if (!kp) return
  void router.push({ path: '/content', query: { lesson: kp.lessonId, resource: kp.resourceId } })
}

function practiceFor(kpId: string) {
  const unit = quizUnits.find((item) => item.knowledgePoints.includes(kpId))
  if (!unit) return
  startUnit(unit.id, 'practice')
}

function askAbout(prompt?: string, lessonId?: string) {
  if (!prompt) return
  void qa.ask(prompt, lessonId)
  void router.push({ path: '/qa', query: lessonId ? { lesson: lessonId } : {} })
}

function kpName(id: string) {
  return kpById.get(id)?.name ?? id
}

function kpLessonIndex(id: string) {
  const lessonId = kpById.get(id)?.lessonId
  if (!lessonId) return ''
  const module = modules.find((m) => m.lessons.some((lesson) => lesson.id === lessonId))
  const lesson = module?.lessons.find((item) => item.id === lessonId)
  return lesson ? `第 ${lesson.index} 讲 · ${lesson.title}` : ''
}
</script>

<template>
  <div class="profile">
    <!-- ---------------------------------------------------------- 身份与读数 -->
    <header class="me">
      <div class="me__id">
        <span class="me__avatar">DA</span>
        <div>
          <h1>个人中心</h1>
          <p class="me__sub">2023 级 · 数据科学与大数据技术　|　画像更新于 {{ store.portraitMeta.updatedAt }}</p>
        </div>
      </div>
      <dl class="me__metrics">
        <div v-for="metric in metrics" :key="metric.key" class="metric">
          <dt>{{ metric.label }}</dt>
          <dd>
            <span class="num">{{ metric.value }}</span>
            <span class="metric__hint">{{ metric.hint }}</span>
          </dd>
        </div>
      </dl>
    </header>

    <el-tabs v-model="tab" class="tabs">
      <!-- ------------------------------------------------------------ 测评 -->
      <el-tab-pane label="测评" name="quiz">
        <QuizRunner v-if="store.activeUnitId" :unit-id="store.activeUnitId" @exit="exitQuiz" />

        <template v-else>
          <section class="panel">
            <header class="panel__head">
              <h2>测评任务</h2>
              <p class="panel__note">
                按知识点组织，提交后即时生成逐题解析与知识点关联；画像会依据作答结果自动更新。
              </p>
            </header>

            <ul class="units">
              <li v-for="unit in quizUnits" :key="unit.id" class="unit">
                <div class="unit__id">
                  <p class="unit__title">{{ unit.title }}</p>
                  <p class="unit__meta">
                    {{ moduleTitle(unit.moduleId) }} · 覆盖 {{ unit.lessonIds.length }} 讲 ·
                    {{ unit.knowledgePoints.length }} 个知识点 ·
                    {{ questionsOfUnit(unit.id).length }} 道题 · 建议 {{ unit.minutes }} 分钟
                  </p>
                  <div class="unit__kps">
                    <span v-for="kp in unit.knowledgePoints" :key="kp" class="chip">{{ kpName(kp) }}</span>
                  </div>
                </div>

                <div class="unit__side">
                  <p v-if="lastAttempt(unit.id)" class="unit__last">
                    最近一次
                    <span class="num">{{ lastAttempt(unit.id)?.score }}/{{ lastAttempt(unit.id)?.total }}</span>
                    <span class="unit__at mono">{{ lastAttempt(unit.id)?.at }}</span>
                  </p>
                  <p v-else class="unit__last unit__last--none">尚未作答</p>
                  <div class="unit__actions">
                    <button type="button" class="btn btn--ghost" @click="startUnit(unit.id, 'practice')">
                      <AppIcon name="spark" :size="14" />
                      练习模式
                    </button>
                    <button type="button" class="btn" @click="startUnit(unit.id, 'exam')">
                      <AppIcon name="clock" :size="14" />
                      限时自测
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <section class="panel">
            <header class="panel__head">
              <h2>作答记录</h2>
              <p class="panel__note">共 {{ store.history.length }} 次，按时间倒序。</p>
            </header>
            <ul class="attempts">
              <li v-for="item in store.history" :key="item.id" class="attempt">
                <span class="attempt__mode" :class="`attempt__mode--${item.mode}`">
                  {{ item.mode === 'exam' ? '自测' : '练习' }}
                </span>
                <span class="attempt__unit">{{ item.unitTitle }}</span>
                <span class="attempt__score num">{{ item.score }}/{{ item.total }}</span>
                <span class="attempt__min num">{{ item.minutes }} 分钟</span>
                <span class="attempt__at mono">{{ item.at }}</span>
              </li>
            </ul>
          </section>
        </template>
      </el-tab-pane>

      <!-- ------------------------------------------------------------ 画像 -->
      <el-tab-pane label="能力画像" name="portrait">
        <section class="panel">
          <header class="panel__head">
            <h2>能力维度</h2>
            <p class="panel__note">
              由「知识点—能力维度」两层结构聚合：维度得分取自所属知识点掌握度的均值。
            </p>
          </header>
          <div class="radar-wrap">
            <RadarChart :dimensions="store.dimensions" />
            <ul class="dims">
              <li v-for="dim in store.dimensions" :key="dim.id">
                <span class="dims__score num">{{ dim.score }}</span>
                <span class="dims__body">
                  <span class="dims__name">{{ dim.name }}</span>
                  <span class="dims__note">{{ dim.note }}</span>
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section class="panel">
          <header class="panel__head">
            <h2>薄弱知识点</h2>
            <p class="panel__note">
              掌握度低于 80 的知识点。每一项都能直接跳到对应材料，或就地生成练习。
            </p>
          </header>
          <ul class="weak">
            <li v-for="record in weakList" :key="record.knowledgePoint" class="weak__item">
              <div class="weak__info">
                <p class="weak__name">
                  {{ kpName(record.knowledgePoint) }}
                  <span class="chip" :class="`chip--${record.verdict === 'weak' ? 'risk' : 'warn'}`">
                    {{ verdictLabel[record.verdict] }}
                  </span>
                </p>
                <p class="weak__path">{{ kpLessonIndex(record.knowledgePoint) }}</p>
                <MasteryBar
                  label="掌握度"
                  :value="record.mastery"
                  :confidence="record.confidence"
                  :evidence="record.evidence"
                />
              </div>
              <div class="weak__actions">
                <button type="button" class="btn btn--ghost" @click="review(record.knowledgePoint)">
                  <AppIcon name="book" :size="14" />
                  去复习
                </button>
                <button type="button" class="btn" @click="practiceFor(record.knowledgePoint)">
                  <AppIcon name="refresh" :size="14" />
                  再练一练
                </button>
              </div>
            </li>
          </ul>
        </section>

        <section class="panel">
          <header class="panel__head">
            <h2>全部知识点掌握度</h2>
            <button type="button" class="panel__toggle" @click="showAll = !showAll">
              {{ showAll ? '只看薄弱项' : `展开全部 ${store.knowledge.length} 个知识点` }}
              <AppIcon name="chevron-down" :size="14" :class="{ 'is-flip': showAll }" />
            </button>
          </header>
          <div class="grid-bars">
            <MasteryBar
              v-for="record in visibleKnowledge"
              :key="record.knowledgePoint"
              :label="kpName(record.knowledgePoint)"
              :value="record.mastery"
              :evidence="record.evidence"
              compact
            />
          </div>
        </section>

        <section class="panel">
          <header class="panel__head">
            <h2>个性化复习建议</h2>
            <p class="panel__note">
              每条建议都指向学习路径上的具体材料；「追问助手」会带着问题进入可溯源问答。
            </p>
          </header>

          <ol class="suggestions">
            <li v-for="suggestion in store.suggestions" :key="suggestion.knowledgePoint" class="suggestion">
              <header class="suggestion__head">
                <span class="suggestion__kp">{{ kpName(suggestion.knowledgePoint) }}</span>
                <span class="suggestion__mastery num">掌握度 {{ suggestion.mastery }}</span>
              </header>
              <ol class="steps">
                <li v-for="(step, i) in suggestion.steps" :key="`${step.kind}-${i}`" class="step">
                  <span class="step__no mono">{{ i + 1 }}</span>
                  <span class="step__body">
                    <span class="step__label">{{ step.label }}</span>
                    <span class="step__detail">{{ step.detail }}</span>
                  </span>
                  <button
                    v-if="step.kind === 'ask'"
                    type="button"
                    class="step__go"
                    @click="askAbout(step.prompt, step.lessonId)"
                  >
                    去提问
                  </button>
                  <button
                    v-else-if="step.kind === 'quiz'"
                    type="button"
                    class="step__go"
                    @click="practiceFor(suggestion.knowledgePoint)"
                  >
                    开始练习
                  </button>
                  <button v-else type="button" class="step__go" @click="review(suggestion.knowledgePoint)">
                    打开材料
                  </button>
                </li>
              </ol>
            </li>
          </ol>
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.profile {
  display: grid;
  gap: 28px;
}

/* ------------------------------------------------------------ 身份 */

.me {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 32px;
  align-items: center;
  padding: 22px 24px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(146, 190, 236, 0.06), rgba(146, 190, 236, 0.015));
}

.me__id {
  display: flex;
  align-items: center;
  gap: 16px;
}

.me__avatar {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: var(--r-md);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.05rem;
}

.me h1 {
  font-size: 1.5rem;
}

.me__sub {
  margin-top: 6px;
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.me__metrics {
  display: flex;
  gap: 34px;
  margin: 0;
}

.metric dt {
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.metric dd {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin: 4px 0 0;
}

.metric dd .num {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--cyan);
  line-height: 1.1;
}

.metric__hint {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------ 页签 */

.tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
}

/* ------------------------------------------------------------ 面板 */

.panel + .panel {
  margin-top: 34px;
}

.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--hairline);
}

.panel__head h2 {
  font-size: 1.16rem;
}

.panel__note {
  font-size: 0.8rem;
  color: var(--ink-faint);
  max-width: 62ch;
}

.panel__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: var(--glass);
  color: var(--ink-mute);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.panel__toggle:hover {
  color: var(--ink);
  border-color: var(--hairline-hi);
}

.panel__toggle .is-flip {
  transform: rotate(180deg);
}

/* ------------------------------------------------------------ 测评任务 */

.units {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}

.unit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  transition: border-color var(--dur-2) var(--ease-out);
}

.unit:hover {
  border-color: var(--hairline-hi);
}

.unit__title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
}

.unit__meta {
  margin-top: 6px;
  font-size: 0.79rem;
  color: var(--ink-faint);
}

.unit__kps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 11px;
}

.unit__side {
  display: grid;
  gap: 12px;
  justify-items: end;
  align-content: center;
}

.unit__last {
  font-size: 0.78rem;
  color: var(--ink-mute);
}

.unit__last .num {
  color: var(--cyan);
  font-weight: 600;
  margin-left: 4px;
}

.unit__last--none {
  color: var(--ink-faint);
}

.unit__at {
  margin-left: 8px;
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.unit__actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur-2) var(--ease-out);
}

.btn:hover {
  box-shadow: 0 0 22px -6px rgba(53, 224, 240, 0.6);
}

.btn--ghost {
  border-color: var(--hairline);
  background: var(--glass);
  color: var(--ink-soft);
  font-weight: 500;
}

.btn--ghost:hover {
  border-color: rgba(53, 224, 240, 0.4);
  background: rgba(53, 224, 240, 0.09);
  color: var(--cyan);
  box-shadow: none;
}

/* ------------------------------------------------------------ 记录 */

.attempts {
  list-style: none;
  padding: 0;
}

.attempt {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 70px 80px auto;
  align-items: center;
  gap: 16px;
  padding: 12px 6px;
  border-bottom: 1px solid var(--hairline);
  font-size: 0.84rem;
  color: var(--ink-soft);
}

.attempt__mode {
  padding: 2px 0;
  text-align: center;
  border-radius: var(--r-xs);
  font-size: 0.72rem;
}

.attempt__mode--exam {
  background: rgba(53, 224, 240, 0.13);
  color: var(--cyan);
}

.attempt__mode--practice {
  background: rgba(109, 123, 255, 0.15);
  color: #9ba6ff;
}

.attempt__score {
  font-weight: 600;
  color: var(--ink);
}

.attempt__min,
.attempt__at {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------ 画像 */

.radar-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 32px;
  align-items: center;
}

.dims {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 14px;
}

.dims li {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 14px;
  align-items: baseline;
}

.dims__score {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--cyan);
}

.dims__body {
  display: grid;
  gap: 2px;
}

.dims__name {
  font-size: 0.88rem;
  color: var(--ink);
}

.dims__note {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

/* 薄弱项 */

.weak {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}

.weak__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(146, 190, 236, 0.045), rgba(146, 190, 236, 0.012));
}

.weak__name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink);
}

.weak__path {
  margin-top: 4px;
  margin-bottom: 10px;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.weak__actions {
  display: flex;
  gap: 8px;
}

/* 全部知识点 */

.grid-bars {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 32px;
}

/* 建议 */

.suggestions {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 14px;
}

.suggestion {
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
}

.suggestion__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--hairline);
}

.suggestion__kp {
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink);
}

.suggestion__mastery {
  font-size: 0.8rem;
  color: var(--warn);
}

.steps {
  list-style: none;
  padding: 0;
  margin-top: 12px;
  display: grid;
  gap: 4px;
}

.step {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 10px 4px;
}

.step__no {
  font-size: 0.76rem;
  color: var(--cyan);
}

.step__body {
  display: grid;
  gap: 2px;
}

.step__label {
  font-size: 0.88rem;
  color: var(--ink);
}

.step__detail {
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.step__go {
  padding: 6px 13px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  color: var(--ink-soft);
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur-2) var(--ease-out);
}

.step__go:hover {
  border-color: rgba(53, 224, 240, 0.4);
  background: rgba(53, 224, 240, 0.09);
  color: var(--cyan);
}

/* ------------------------------------------------------------ 响应式 */

@media (max-width: 1080px) {
  .me {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }

  .me__metrics {
    flex-wrap: wrap;
    gap: 24px;
  }

  .radar-wrap {
    grid-template-columns: minmax(0, 1fr);
  }

  .grid-bars {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .unit,
  .weak__item {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .unit__side {
    justify-items: start;
  }

  .attempt {
    grid-template-columns: 50px minmax(0, 1fr) 60px;
    gap: 10px;
  }

  .attempt__min,
  .attempt__at {
    display: none;
  }
}
</style>
