<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { blockerLabel } from '@/data/thinking'
import { useProjectStore } from '@/stores/project'

/**
 * 准备问老师 / 需求方
 * ----------------------------------------------------------------------------
 * 有些问题 AI 不应回答：需求边界、评价重点、数据能不能补。
 * 这时系统把「已经做过的工作 + 两种可能方向及其影响」整理成一段可检查的问题，
 * 学生确认后再发出。沟通不是留言，而是一次带上下文的需求澄清。
 */
const project = useProjectStore()
</script>

<template>
  <div class="teacher">
    <p class="teacher__lead">
      系统不会替你去问老师，也不会替你决定需求。它只负责把现场整理清楚，
      让老师三十秒就能看懂你在问什么。
    </p>

    <div v-if="!project.escalations.length" class="teacher__empty">
      <button type="button" class="primary" @click="project.prepareEscalation('requirement')">
        <AppIcon name="flag" :size="15" />
        整理一个要向老师确认的问题
      </button>
    </div>

    <ul v-else class="list">
      <li v-for="item in project.escalations" :key="item.id" class="esc">
        <header class="esc__head">
          <span class="chip chip--warn">{{ blockerLabel[item.kind].label }}</span>
          <span class="esc__at mono">{{ item.at }}</span>
          <span v-if="item.sentAt" class="chip chip--ok">已发送 · {{ item.sentAt }}</span>
        </header>

        <section class="esc__block">
          <p class="esc__label">我们已经做过的工作</p>
          <p class="esc__text">{{ item.done }}</p>
        </section>

        <section class="esc__block">
          <p class="esc__label">两种可能方向及其影响</p>
          <ul class="opts">
            <li v-for="option in item.options" :key="option.name">
              <span class="opts__name">{{ option.name }}</span>
              <span class="opts__impact">{{ option.impact }}</span>
            </li>
          </ul>
        </section>

        <section class="esc__block">
          <p class="esc__label">整理出的问题（可修改）</p>
          <textarea
            :value="item.question"
            rows="4"
            :readonly="Boolean(item.sentAt)"
            @input="project.updateEscalation(item.id, ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </section>

        <footer v-if="!item.sentAt" class="esc__foot">
          <label class="confirm">
            <input
              type="checkbox"
              :checked="item.confirmed"
              @change="project.confirmEscalation(item.id)"
            />
            <span>我已确认内容准确，可以发送</span>
          </label>
          <button
            type="button"
            class="primary primary--sm"
            :disabled="!item.confirmed"
            @click="project.sendEscalation(item.id)"
          >
            <AppIcon name="send" :size="14" />
            发送给老师
          </button>
        </footer>

        <p v-else class="esc__reply">
          已进入待回复。老师回复后会作为一条「已确认」的信息写进项目状态，而不是聊天记录。
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.teacher {
  display: grid;
  gap: 18px;
}

.teacher__lead {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 76ch;
}

.teacher__empty {
  display: grid;
  justify-items: start;
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
  padding: 7px 15px;
  font-size: 0.82rem;
}

.primary:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 14px;
}

.esc {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.esc__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.esc__at {
  flex: 1;
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.esc__block {
  display: grid;
  gap: 5px;
}

.esc__label {
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.esc__text {
  font-size: 0.86rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 78ch;
}

.opts {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 6px;
}

.opts li {
  display: grid;
  grid-template-columns: minmax(150px, auto) minmax(0, 1fr);
  gap: 14px;
  align-items: baseline;
  padding: 9px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
}

.opts__name {
  font-size: 0.84rem;
  color: var(--ink);
}

.opts__impact {
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--ink-mute);
}

.esc textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.87rem;
  line-height: 1.75;
  resize: vertical;
}

.esc textarea:focus {
  outline: none;
  border-color: var(--accent-line);
}

.esc__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid var(--hairline);
}

.confirm {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--ink-mute);
  cursor: pointer;
}

.confirm input {
  accent-color: var(--cyan);
}

.esc__reply {
  padding-top: 10px;
  border-top: 1px solid var(--hairline);
  font-size: 0.82rem;
  line-height: 1.75;
  color: var(--ink-faint);
}

@media (max-width: 720px) {
  .opts li {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
