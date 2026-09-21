<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ConfidenceTag from '@/components/ConfidenceTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import ResourceRow from '@/components/ResourceRow.vue'
import { useProjectStore } from '@/stores/project'

/**
 * 步骤详情
 * ----------------------------------------------------------------------------
 * 回答一个问题：这一步该怎么做，系统能帮我什么。四段：
 *  ① 为什么现在做（一直显示，不折叠）
 *  ② 这一步对应哪个问题
 *  ③ 推荐资料（每条都写清为什么对这个问题有用；资料没有「已读」状态）
 *  ④ 留下结果与证据（全系统唯一会改变项目状态的动作）
 */
const route = useRoute()
const router = useRouter()
const project = useProjectStore()

const step = computed(() => project.stepById(String(route.params.id)))

const anchor = computed(() => (step.value ? project.anchorOf(step.value) : undefined))
const anchorLabel = computed(() => (anchor.value?.key === 'toConfirm' ? '待确认事项' : '当前问题'))
const result = computed(() => (step.value ? project.resultOf(step.value.id) : undefined))

const statusText = computed(
  () => ({ todo: '待开始', doing: '进行中', done: '已完成' })[step.value?.status ?? 'todo'],
)

const form = reactive({
  didWhat: '',
  foundWhat: '',
  // 默认就选中这一步挂着的那个问题：多数情况下它就是要被推进的那一条
  solvedWhich: anchor.value?.id ?? 'none',
  stillUnsure: '',
})

const started = ref(false)
const saved = ref(false)

const ready = computed(() => form.didWhat.trim().length > 0 && form.foundWhat.trim().length > 0)

function submit() {
  if (!step.value || !ready.value) return
  project.completeStep(step.value.id, {
    didWhat: form.didWhat,
    foundWhat: form.foundWhat,
    solvedWhich: form.solvedWhich || anchor.value?.id || 'none',
    stillUnsure: form.stillUnsure,
  })
  saved.value = true
  window.setTimeout(() => void router.push({ path: '/' }), 900)
}
</script>

<template>
  <div v-if="step" class="step">
    <RouterLink to="/" class="back">
      <AppIcon name="arrow-left" :size="14" />
      回到项目当前状态
    </RouterLink>

    <!-- ------------------------------------------------------------ 步骤头 -->
    <header class="ident">
      <div class="ident__top">
        <span class="ident__status" :class="`ident__status--${step.status}`">{{ statusText }}</span>
        <span class="ident__at mono">生成于 {{ step.at }}</span>
      </div>
      <h1>{{ step.title }}</h1>

      <div class="why">
        <span class="why__label">为什么现在做</span>
        <p class="why__text">{{ step.whyNow }}</p>
      </div>
    </header>

    <!-- ------------------------------------------------------- 对应问题 -->
    <section class="zone">
      <header class="head">
        <h2>这一步对应哪个{{ anchorLabel }}</h2>
        <p class="head__note">
          挂不上问题的步骤不该占用主力时间，所以每一步都必须能指出它在推进哪一条。
        </p>
      </header>

      <div v-if="anchor" class="anchor">
        <p class="anchor__text">{{ anchor.text }}</p>
        <div class="anchor__meta">
          <ConfidenceTag :confidence="anchor.confidence" :origin="anchor.origin" />
          <span v-if="project.isAnswered(anchor.id)" class="anchor__done">
            <AppIcon name="check" :size="12" />
            已有结果落地
          </span>
        </div>
      </div>

      <p v-else class="anchor__none">
        这一条最终对应的内容已经被删掉了。请回到状态页，重新判断下一步该做什么。
      </p>
    </section>

    <!-- ------------------------------------------------------- 推荐资料 -->
    <section class="zone">
      <header class="head">
        <h2>这一步可能会用到的课程资料</h2>
        <p class="head__note">
          每条都写清了它对这个具体问题为什么有用。这里没有「已读」这个概念——
          读完资料不会改变项目状态，只有把知识用进这一步、写下结果与证据才会。
        </p>
      </header>

      <ul v-if="step.resources.length" class="resources">
        <ResourceRow
          v-for="resource in step.resources"
          :key="resource.id"
          :resource="resource"
          :step-title="step.title"
        />
      </ul>

      <p v-else class="anchor__none">
        这一步暂时没有匹配到的课程资料。如果确实需要，请回到材料与理解页补一份相关材料。
      </p>
    </section>

    <!-- --------------------------------------------------- 结果与证据 -->
    <section class="zone">
      <header class="head">
        <h2>留下结果与证据</h2>
        <p class="head__note">
          提交之后，这一步标记为已完成，项目状态会随之更新，进展记录里也会多一条。
        </p>
      </header>

      <!-- 已完成：只读展示 -->
      <div v-if="result" class="done">
        <div class="done__row">
          <p class="done__label">完成了什么</p>
          <p class="done__text">{{ result.didWhat }}</p>
        </div>
        <div class="done__row">
          <p class="done__label">发现了什么</p>
          <p class="done__text">{{ result.foundWhat }}</p>
        </div>
        <div class="done__row">
          <p class="done__label">解决了哪个问题</p>
          <p class="done__text">
            {{
              result.solvedWhich === 'none'
                ? '没有解决任何一个已确认的问题'
                : project.understandingById.get(result.solvedWhich)?.text ?? '（该条目已被删除）'
            }}
          </p>
        </div>
        <div class="done__row">
          <p class="done__label">还有什么不确定</p>
          <p class="done__text">{{ result.stillUnsure || '没有留下未确定的事' }}</p>
        </div>
        <p class="done__at mono">提交于 {{ result.at }}</p>
      </div>

      <!-- 未完成：填写 -->
      <div v-else class="form">
        <label class="field">
          <span class="field__label">完成了什么</span>
          <span class="field__hint">做了什么、做到哪一步，用具体动作写，不要写「推进了相关工作」</span>
          <textarea v-model="form.didWhat" rows="3"></textarea>
        </label>

        <label class="field">
          <span class="field__label">发现了什么</span>
          <span class="field__hint">这一条会直接写进进展记录，是给别人看的部分</span>
          <textarea v-model="form.foundWhat" rows="3"></textarea>
        </label>

        <div class="field">
          <span class="field__label">解决了哪个问题</span>
          <span class="field__hint">如果这一步没有解决任何一个已确认的问题，就如实说没有</span>
          <div class="choices">
            <button
              type="button"
              class="choice"
              :class="{ 'is-active': form.solvedWhich === (anchor?.id ?? 'none') }"
              @click="form.solvedWhich = anchor?.id ?? 'none'"
            >
              {{ anchor?.text ? anchor.text.slice(0, 40) + (anchor.text.length > 40 ? '…' : '') : '本步对应的问题' }}
            </button>
            <button
              type="button"
              class="choice"
              :class="{ 'is-active': form.solvedWhich === 'none' }"
              @click="form.solvedWhich = 'none'"
            >
              没有解决任何一个问题
            </button>
          </div>
        </div>

        <label class="field">
          <span class="field__label">还有什么不确定</span>
          <span class="field__hint">
            写下来的会变成一条「待确认事项」，并成为下一次判断下一步的依据。确定了就留空。
          </span>
          <textarea v-model="form.stillUnsure" rows="3"></textarea>
        </label>

        <div class="form__actions">
          <button
            v-if="step.status === 'todo'"
            type="button"
            class="btn"
            @click="project.startStep(step.id); started = true"
          >
            <AppIcon name="flag" :size="14" />
            {{ started ? '已标记为进行中' : '先标记为进行中' }}
          </button>
          <button type="button" class="btn btn--primary" :disabled="!ready" @click="submit">
            <AppIcon name="check" :size="14" />
            {{ saved ? '已提交，正在返回…' : '提交并更新项目状态' }}
          </button>
        </div>
      </div>
    </section>
  </div>

  <EmptyState
    v-else
    icon="flag"
    title="找不到这一步"
    description="它可能已经被重新判断下一步时替换掉了。回到项目当前状态看看现在有哪几步。"
  >
    <RouterLink to="/" class="btn btn--primary">回到项目当前状态</RouterLink>
  </EmptyState>
</template>

<style scoped>
.step {
  display: grid;
  gap: 40px;
  max-width: 1040px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  font-size: 0.82rem;
  color: var(--ink-faint);
}

.back:hover {
  color: var(--cyan);
}

/* ------------------------------------------------------------ 步骤头 */

.ident {
  display: grid;
  gap: 14px;
  padding-top: 2px;
}

.ident__top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ident__status {
  padding: 2px 10px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.ident__status--doing {
  border-color: var(--accent-line);
  background: var(--accent-tint);
  color: var(--cyan);
}

.ident__status--done {
  border-color: var(--ok-line);
  background: var(--ok-tint);
  color: var(--ok);
}

.ident__at {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.ident h1 {
  font-size: 1.7rem;
  line-height: 1.4;
  letter-spacing: -0.02em;
  max-width: 34ch;
  text-wrap: balance;
}

.why {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-md);
  background: var(--accent-tint);
}

.why__label {
  flex: none;
  padding-top: 2px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--cyan);
  white-space: nowrap;
}

.why__text {
  font-size: 0.9rem;
  line-height: 1.85;
  color: var(--ink);
}

/* ------------------------------------------------------------ 通用 */

.zone {
  display: grid;
  gap: 14px;
}

.head {
  display: grid;
  gap: 6px;
}

.head h2 {
  font-size: 1.16rem;
}

.head__note {
  font-size: 0.79rem;
  line-height: 1.75;
  color: var(--ink-faint);
  max-width: 74ch;
}

.anchor {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: var(--surface);
}

.anchor__text {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--ink);
}

.anchor__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.anchor__done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--ok);
}

.anchor__none {
  font-size: 0.84rem;
  line-height: 1.75;
  color: var(--ink-faint);
}

.resources {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}

/* ------------------------------------------------------------ 表单 */

.form {
  display: grid;
  gap: 20px;
  padding: 22px 24px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: var(--surface);
}

.field {
  display: grid;
  gap: 6px;
}

.field__label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink);
}

.field__hint {
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--ink-faint);
}

.field textarea {
  width: 100%;
  margin-top: 2px;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.88rem;
  line-height: 1.8;
  resize: vertical;
}

.field textarea:focus {
  outline: none;
  border-color: var(--accent-line);
}

.choices {
  display: grid;
  gap: 6px;
  margin-top: 2px;
}

.choice {
  padding: 10px 13px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-soft);
  font-family: var(--font-body);
  font-size: 0.85rem;
  line-height: 1.6;
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.choice:hover {
  border-color: var(--hairline-hi);
}

.choice.is-active {
  border-color: var(--accent-line);
  background: var(--accent-tint);
  color: var(--ink);
}

.form__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

/* ------------------------------------------------------------ 已完成 */

.done {
  display: grid;
  gap: 16px;
  padding: 22px 24px;
  border: 1px solid var(--ok-line);
  border-radius: var(--r-lg);
  background: var(--surface);
}

.done__row {
  display: grid;
  gap: 5px;
}

.done__label {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.done__text {
  font-size: 0.88rem;
  line-height: 1.8;
  color: var(--ink-soft);
}

.done__at {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------ 按钮 */

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink-mute);
  font-size: 0.83rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.btn:hover:not(:disabled) {
  border-color: var(--hairline-hi);
  color: var(--ink);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn--primary {
  border-color: transparent;
  background: var(--accent);
  color: var(--ink-on-accent);
  font-weight: 600;
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-press);
  color: var(--ink-on-accent);
}

@media (max-width: 720px) {
  .why {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
