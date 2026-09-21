<script setup lang="ts">
import { reactive } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import KnowledgeCard from '@/components/KnowledgeCard.vue'
import ThinkingQuestions from '@/components/ThinkingQuestions.vue'
import { blockerLabel } from '@/data/thinking'
import { useProjectStore } from '@/stores/project'

/**
 * 我卡住了
 * ----------------------------------------------------------------------------
 * 学生不面对空聊天框。先补足背景（在做什么、想回答什么、试过什么、看到什么、
 * 想要什么帮助），系统再判断卡点在需求 / 数据 / 方法 / 结果解释 / 协作，
 * 据此决定给课程知识、继续追问，还是建议去找老师。
 */
const project = useProjectStore()

const form = reactive({ doing: '', question: '', tried: '', saw: '', need: '' })

const PLACEHOLDER: Record<keyof typeof form, string> = {
  doing: '例：在调 ParaView 的体绘制参数',
  question: '例：Q1 区域增温差异',
  tried: '例：换了 3 组传输函数，降低了采样步长',
  saw: '例：帧率够了，但温度分层看不出来',
  need: '例：想知道是不是可视化方法本身选错了',
}

const FIELDS: { key: keyof typeof form; label: string; hint: string }[] = [
  { key: 'doing', label: '我现在在做什么', hint: '一句话说清手上这件事' },
  { key: 'question', label: '它想回答哪个项目问题', hint: '答不出来就写「没想清楚」——这本身就是线索' },
  { key: 'tried', label: '已经试过什么', hint: '做过哪些尝试、用了哪些参数' },
  { key: 'saw', label: '看到了什么结果', hint: '具体现象，而不是「效果不好」' },
  { key: 'need', label: '希望得到什么帮助', hint: '要方案，还是要有人帮你确认问题问对了没有' },
]

const filled = () => Object.values(form).some((value) => value.trim().length > 0)
</script>

<template>
  <!-- 第一步：补背景 -->
  <div v-if="!project.thinking" class="stuck">
    <p class="stuck__lead">
      先别急着要方案。把背景写清楚，卡点往往就自己浮出来了。
    </p>
    <div class="fields">
      <label v-for="field in FIELDS" :key="field.key" class="field">
        <span class="field__label">{{ field.label }}</span>
        <span class="field__hint">{{ field.hint }}</span>
        <textarea v-model="form[field.key]" rows="2" :placeholder="PLACEHOLDER[field.key]"></textarea>
      </label>
    </div>
    <button type="button" class="primary" :disabled="!filled()" @click="project.submitStuck({ ...form })">
      <AppIcon name="compass" :size="15" />
      帮我定位卡点
    </button>
  </div>

  <!-- 第二步：诊断结果 -->
  <div v-else class="diag">
    <p class="diag__trigger">{{ project.thinking.trigger }}</p>

    <div v-if="project.thinking.blocker" class="diag__blocker">
      <span class="chip chip--lit">{{ blockerLabel[project.thinking.blocker].label }}</span>
      <span class="diag__hint">{{ blockerLabel[project.thinking.blocker].hint }}</span>
      <span v-if="blockerLabel[project.thinking.blocker].toTeacher" class="chip chip--warn">
        建议转向人工确认
      </span>
    </div>

    <ThinkingQuestions
      :questions="project.thinking.questions"
      :committable="true"
      @answer="project.answerQuestion"
      @commit="project.commitOwnJudgement"
    />

    <section v-if="project.thinking.knowledge?.length" class="diag__knowledge">
      <p class="diag__section">可能相关的课程知识（只关联，不替你回答）</p>
      <KnowledgeCard
        v-for="link in project.thinking.knowledge"
        :key="link.blockId"
        :link="link"
        @answer="project.answerKnowledge"
      />
    </section>
  </div>
</template>

<style scoped>
.stuck,
.diag {
  display: grid;
  gap: 18px;
}

.stuck__lead {
  font-size: 0.92rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 72ch;
}

.fields {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 4px;
}

.field__label {
  font-size: 0.88rem;
  color: var(--ink);
  font-weight: 500;
}

.field__hint {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.field textarea {
  margin-top: 4px;
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

.field textarea:focus {
  outline: none;
  border-color: var(--accent-line);
}

.primary {
  justify-self: start;
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

.primary:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.diag__trigger {
  padding: 12px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
  font-size: 0.9rem;
  line-height: 1.75;
  color: var(--ink);
}

.diag__blocker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.diag__hint {
  font-size: 0.8rem;
  color: var(--ink-faint);
}

.diag__knowledge {
  display: grid;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px solid var(--hairline);
}

.diag__section {
  font-size: 0.8rem;
  color: var(--ink-mute);
}
</style>
