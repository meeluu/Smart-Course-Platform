<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { thinkingLabel } from '@/data/thinking'
import { useProjectStore } from '@/stores/project'

/**
 * 下一步做什么
 * ----------------------------------------------------------------------------
 * 两条硬约束都在这里：
 *  ① 系统给建议之前，先问学生自己的判断；
 *  ② 系统给建议之后，不允许一键采用——必须选接受 / 部分接受 / 拒绝，并写下理由。
 * 这样 AI 用得越多，留下的应该是更多学生判断，而不是更少。
 */
const project = useProjectStore()

const draftReason = ref('')
const picks = ref<Record<string, { judgement?: 'accept' | 'partial' | 'reject'; reason: string; keep: string }>>({})

const chosen = computed(() => Object.values(picks.value).filter((item) => item.judgement).length)
const allChosen = computed(
  () => project.advice.length > 0 && project.advice.every((item) => picks.value[item.id]?.judgement),
)

function pick(id: string) {
  if (!picks.value[id]) picks.value[id] = { reason: '', keep: '' }
  return picks.value[id]
}

function judge(id: string, judgement: 'accept' | 'partial' | 'reject') {
  const entry = pick(id)
  entry.judgement = judgement
}

function submit(id: string) {
  const entry = pick(id)
  if (!entry.judgement || !entry.reason.trim()) return
  project.judgeAdvice(id, entry.judgement, entry.reason, entry.keep || undefined)
}
</script>

<template>
  <div class="next">
    <!-- 第一步：必须先写下自己的判断 -->
    <div v-if="!project.ownJudgement" class="pre">
      <p class="pre__lead">
        在系统给出建议之前，先写下你们团队自己的判断。
        答完这一步，你才知道系统的建议是补充还是反驳。
      </p>
      <textarea
        v-model="draftReason"
        rows="3"
        placeholder="例：我们觉得现在最该做的是先把数据范围定下来，因为后面所有工作都挂在它上面。"
      ></textarea>
      <button type="button" class="primary" :disabled="!draftReason.trim()" @click="project.commitOwnJudgement(draftReason)">
        <AppIcon name="check" :size="15" />
        记下我们的判断，再看建议
      </button>
    </div>

    <template v-else>
      <div class="own">
        <span class="own__label">你们的判断</span>
        <p class="own__text">{{ project.ownJudgement }}</p>
      </div>

      <div v-if="!project.advice.length" class="pre">
        <p class="pre__lead">好，现在看看系统只给最重要的事——最多 3 件，每件都说明为什么现在做。</p>
        <button type="button" class="primary" @click="project.loadNext()">
          <AppIcon name="spark" :size="15" />
          给我 1~3 件事
        </button>
      </div>

      <ul v-else class="advice">
        <li v-for="item in project.advice" :key="item.id" class="adv">
          <header class="adv__head">
            <span class="adv__kind">{{ thinkingLabel[item.kind] }}</span>
            <span v-if="item.judgement" class="chip" :class="item.judgement === 'reject' ? 'chip--risk' : item.judgement === 'partial' ? 'chip--warn' : 'chip--ok'">
              {{ item.judgement === 'accept' ? '已接受' : item.judgement === 'partial' ? '部分接受' : '已拒绝' }}
            </span>
          </header>
          <p class="adv__content">{{ item.content }}</p>
          <p class="adv__why">
            <AppIcon name="spark" :size="13" />
            为什么现在做：{{ item.rationale }}
          </p>

          <div v-if="!item.judgement" class="judge">
            <div class="judge__picks">
              <button type="button" class="pick" :class="{ 'is-on': pick(item.id).judgement === 'accept' }" @click="judge(item.id, 'accept')">接受</button>
              <button type="button" class="pick" :class="{ 'is-on': pick(item.id).judgement === 'partial' }" @click="judge(item.id, 'partial')">部分接受</button>
              <button type="button" class="pick" :class="{ 'is-on': pick(item.id).judgement === 'reject' }" @click="judge(item.id, 'reject')">拒绝</button>
            </div>
            <textarea
              v-if="pick(item.id).judgement"
              :value="pick(item.id).reason"
              rows="2"
              placeholder="写下理由。拒绝也要写——理由本身就是项目状态的一部分。"
              @input="pick(item.id).reason = ($event.target as HTMLTextAreaElement).value"
            ></textarea>
            <input
              v-if="pick(item.id).judgement === 'partial'"
              :value="pick(item.id).keep"
              type="text"
              placeholder="保留哪一部分？"
              @input="pick(item.id).keep = ($event.target as HTMLInputElement).value"
            />
            <button
              v-if="pick(item.id).judgement"
              type="button"
              class="primary primary--sm"
              :disabled="!pick(item.id).reason.trim()"
              @click="submit(item.id)"
            >
              提交判断
            </button>
          </div>

          <div v-else-if="item.reason" class="adv__verdict">
            <span class="adv__verdict-label">你们的理由</span>
            <p>{{ item.reason }}</p>
            <p v-if="item.keep" class="adv__keep">保留：{{ item.keep }}</p>
          </div>
        </li>
      </ul>

      <p v-if="project.advice.length" class="progress-note">
        已处理 <span class="num">{{ chosen }}</span> / {{ project.advice.length }}
        <span v-if="allChosen">　全部判断完毕，这些理由已经写进项目状态。</span>
      </p>
    </template>
  </div>
</template>

<style scoped>
.next {
  display: grid;
  gap: 18px;
}

.pre {
  display: grid;
  gap: 14px;
  justify-items: start;
}

.pre__lead {
  font-size: 0.92rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 74ch;
}

.pre textarea,
.judge textarea,
.judge input {
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

.pre textarea:focus,
.judge textarea:focus,
.judge input:focus {
  outline: none;
  border-color: var(--accent-line);
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}

.primary--sm {
  padding: 6px 14px;
  font-size: 0.8rem;
  align-self: start;
}

.primary:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.own {
  padding: 14px 16px;
  border: 1px solid var(--accent-line-soft);
  border-radius: var(--r-md);
  background: var(--accent-tint);
}

.own__label {
  font-size: 0.74rem;
  color: var(--cyan);
}

.own__text {
  margin-top: 6px;
  font-size: 0.92rem;
  line-height: 1.8;
  color: var(--ink);
}

.advice {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 14px;
}

.adv {
  display: grid;
  gap: 9px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.adv__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.adv__kind {
  font-size: 0.7rem;
  color: var(--ink-faint);
}

.adv__content {
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.6;
  color: var(--ink);
}

.adv__why {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 0.84rem;
  line-height: 1.75;
  color: var(--ink-mute);
}

.judge {
  display: grid;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--hairline);
}

.judge__picks {
  display: flex;
  gap: 8px;
}

.pick {
  padding: 7px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: var(--glass);
  color: var(--ink-mute);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.pick:hover {
  color: var(--ink);
  border-color: var(--hairline-hi);
}

.pick.is-on {
  border-color: var(--accent-line);
  background: var(--accent-tint);
  color: var(--cyan);
}

.adv__verdict {
  padding-top: 10px;
  border-top: 1px solid var(--hairline);
  font-size: 0.85rem;
  line-height: 1.75;
  color: var(--ink-soft);
}

.adv__verdict-label {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.adv__keep {
  margin-top: 4px;
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.progress-note {
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.progress-note .num {
  color: var(--cyan);
  font-weight: 600;
}
</style>
