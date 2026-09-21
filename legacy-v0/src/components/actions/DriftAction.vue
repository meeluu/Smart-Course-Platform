<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import KnowledgeCard from '@/components/KnowledgeCard.vue'
import ThinkingQuestions from '@/components/ThinkingQuestions.vue'
import { useProjectStore } from '@/stores/project'

/**
 * 检查我们有没有跑偏
 * ----------------------------------------------------------------------------
 * 系统不武断地说「你们跑偏了」。它对照原始需求、当前问题、最近任务与最新证据，
 * 把断掉的地方摆出来，再问一句学生答不上来就该自己复盘的话。
 */
const project = useProjectStore()

const toneMap = { high: 'risk', medium: 'warn', low: 'info' } as const
</script>

<template>
  <div class="drift">
    <div v-if="!project.findings.length" class="drift__intro">
      <p class="drift__lead">
        对照原始需求、当前问题、最近任务与最新证据，看看项目逻辑有没有断掉。
      </p>
      <button type="button" class="primary" @click="project.runDrift()">
        <AppIcon name="compass" :size="15" />
        开始检查
      </button>
    </div>

    <template v-else>
      <p class="drift__count">
        发现 <span class="num">{{ project.findings.length }}</span> 处需要你们自己判断的地方。
        系统不给结论，只把问题摆出来。
      </p>

      <ul class="findings">
        <li v-for="finding in project.findings" :key="finding.id" class="finding">
          <span class="finding__sev" :class="`finding__sev--${toneMap[finding.severity]}`">
            {{ finding.severity === 'high' ? '需要现在处理' : finding.severity === 'medium' ? '需要本周处理' : '可以顺手处理' }}
          </span>
          <p class="finding__title">{{ finding.title }}</p>
          <p class="finding__detail">{{ finding.detail }}</p>
          <p class="finding__ask">
            <AppIcon name="spark" :size="13" />
            {{ finding.ask }}
          </p>
        </li>
      </ul>

      <section v-if="project.thinking" class="drift__qs">
        <p class="drift__section">把回答写下来——写不出来的那一条，就是下一步要补的</p>
        <ThinkingQuestions
          :questions="project.thinking.questions"
          :committable="true"
          @answer="project.answerQuestion"
          @commit="project.commitOwnJudgement"
        />
      </section>

      <section v-if="project.thinking?.knowledge?.length" class="drift__knowledge">
        <KnowledgeCard
          v-for="link in project.thinking.knowledge"
          :key="link.blockId"
          :link="link"
          @answer="project.answerKnowledge"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.drift {
  display: grid;
  gap: 18px;
}

.drift__lead {
  font-size: 0.92rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 72ch;
}

.drift__intro {
  display: grid;
  gap: 16px;
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

.drift__count {
  font-size: 0.88rem;
  color: var(--ink-soft);
  line-height: 1.8;
}

.drift__count .num {
  color: var(--cyan);
  font-weight: 600;
}

.findings {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}

.finding {
  display: grid;
  gap: 6px;
  padding: 15px 17px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.finding__sev {
  justify-self: start;
  padding: 1px 8px;
  border-radius: var(--r-pill);
  font-size: 0.7rem;
}

.finding__sev--risk {
  background: var(--risk-tint);
  color: var(--risk);
}

.finding__sev--warn {
  background: var(--warn-tint);
  color: var(--warn);
}

.finding__sev--info {
  background: var(--fill-2);
  color: var(--ink-mute);
}

.finding__title {
  font-family: var(--font-display);
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ink);
}

.finding__detail {
  font-size: 0.83rem;
  line-height: 1.75;
  color: var(--ink-mute);
  max-width: 76ch;
}

.finding__ask {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 2px;
  font-size: 0.86rem;
  line-height: 1.7;
  color: var(--cyan);
}

.drift__qs,
.drift__knowledge {
  display: grid;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--hairline);
}

.drift__section {
  font-size: 0.8rem;
  color: var(--ink-mute);
}
</style>
