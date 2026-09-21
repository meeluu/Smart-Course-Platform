<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import StepCard from '@/components/StepCard.vue'
import UnderstandingBlock from '@/components/UnderstandingBlock.vue'
import { understandingOrder } from '@/data/intake'
import { useProjectStore } from '@/stores/project'

/**
 * 项目当前状态
 * ----------------------------------------------------------------------------
 * 首页只回答两个问题：我们现在做到哪了、接下来做什么。
 * 因此只有三段：状态四块、接下来最重要的 1~3 步、进展记录。
 */
const project = useProjectStore()

const notice = ref('')

const steps = computed(() => project.activeSteps)

function refresh() {
  const added = project.refreshNext()
  notice.value = added ? `新增 ${added} 步` : '按现在掌握的情况，没有新的建议'
  window.setTimeout(() => (notice.value = ''), 2800)
}
</script>

<template>
  <div class="state">
    <!-- ---------------------------------------------------------- 项目身份 -->
    <section class="ident">
      <div class="ident__main">
        <p class="ident__meta mono">
          {{ project.meta.team }} · {{ project.meta.id }} · 更新于 {{ project.meta.updatedAt }}
        </p>
        <h1>{{ project.meta.shortName }}</h1>
        <p class="ident__source">{{ project.meta.source }}</p>
        <p class="ident__phase">{{ project.meta.phase }}</p>
        <ul class="members">
          <li v-for="member in project.meta.members" :key="member.name">
            <span class="members__name">{{ member.name }}</span>
            <span class="members__role">{{ member.role }}</span>
          </li>
        </ul>
      </div>

      <div class="ident__side">
        <div class="tally">
          <span class="tally__num num num--accent">{{ project.weeksLeft }}</span>
          <span class="tally__unit">周剩余</span>
          <span class="tally__of">/ 共 {{ project.meta.totalWeeks }} 周</span>
        </div>

        <RouterLink v-if="project.pendingItems.length" to="/materials" class="pending">
          <AppIcon name="alert" :size="15" />
          <span>
            有 <strong>{{ project.pendingItems.length }}</strong> 条内容还是系统推断
          </span>
          <span class="pending__go">
            去确认
            <AppIcon name="arrow-right" :size="13" />
          </span>
        </RouterLink>
        <p v-else class="pending pending--clear">
          <AppIcon name="check" :size="15" />
          <span>四块状态都已由你们确认</span>
        </p>
      </div>
    </section>

    <!-- ------------------------------------------------------- 状态四块 -->
    <section class="boards">
      <header class="head">
        <h2>项目当前状态</h2>
        <p class="head__note">
          四块内容由材料整理而来。凡是没有经过你们确认的，都标着「系统推断」——它还不是项目事实。
        </p>
      </header>

      <div class="boards__grid">
        <UnderstandingBlock
          v-for="key in understandingOrder"
          :key="key"
          :block-key="key"
          :items="project.byKey(key)"
          mode="read"
        />
      </div>
    </section>

    <!-- --------------------------------------------------------- 下一步 -->
    <section class="next">
      <header class="head">
        <h2>接下来最重要的 {{ steps.length }} 步</h2>
        <div class="head__side">
          <span v-if="notice" class="head__notice">{{ notice }}</span>
          <button type="button" class="head__action" @click="refresh">
            <AppIcon name="refresh" :size="14" />
            重新判断下一步
          </button>
        </div>
      </header>
      <p class="head__note">
        每一步都写清了为什么现在做，并且挂在具体的问题上。系统不会一次给一长串待办——
        给不出理由的建议，也不会出现在这里。
      </p>

      <div v-if="steps.length" class="next__list">
        <StepCard v-for="(step, index) in steps" :key="step.id" :step="step" :index="index + 1" />
      </div>

      <EmptyState
        v-else
        icon="flag"
        title="当前没有待推进的步骤"
        description="这通常意味着四块状态还没有确认，或者所有问题都已经有结果落地了。先把待确认事项定下来，再回来看看。"
      />
    </section>

    <!-- ------------------------------------------------------- 进展记录 -->
    <section class="log">
      <header class="head">
        <h2>进展记录</h2>
        <p class="head__note">
          每一步完成后留下的结果与证据，以及项目状态因此发生的变化。这里是全系统唯一会改变状态的地方。
        </p>
      </header>

      <ol v-if="project.progress.length" class="feed">
        <li v-for="entry in project.progress" :key="entry.id" class="feed__item">
          <div class="feed__rail">
            <span class="feed__dot"></span>
          </div>
          <div class="feed__body">
            <p class="feed__at mono">{{ entry.at }}</p>
            <h3 class="feed__title">{{ entry.stepTitle }}</h3>
            <p class="feed__summary">{{ entry.summary }}</p>
            <ul class="feed__changes">
              <li v-for="change in entry.changes" :key="change">
                <AppIcon name="arrow-right" :size="12" />
                <span>{{ change }}</span>
              </li>
            </ul>
            <RouterLink :to="`/step/${entry.stepId}`" class="feed__link">
              查看这一步
              <AppIcon name="arrow-right" :size="13" />
            </RouterLink>
          </div>
        </li>
      </ol>

      <p v-else class="feed__none">还没有任何一步完成。完成第一步之后，这里会记下它改变了什么。</p>
    </section>
  </div>
</template>

<style scoped>
.state {
  display: grid;
  gap: 48px;
}

/* ------------------------------------------------------------ 身份 */

.ident {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 40px;
  align-items: end;
  padding-top: 14px;
}

.ident__meta {
  font-size: 0.76rem;
  color: var(--cyan);
}

.ident h1 {
  margin-top: 12px;
  font-size: 2rem;
  letter-spacing: -0.03em;
  max-width: 30ch;
  text-wrap: balance;
}

.ident__source {
  margin-top: 9px;
  font-size: 0.82rem;
  color: var(--cyan);
}

.ident__phase {
  margin-top: 10px;
  font-size: 0.86rem;
  color: var(--ink-mute);
}

.members {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin-top: 18px;
  padding: 0;
}

.members li {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  padding: 4px 11px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: var(--glass);
  font-size: 0.78rem;
}

.members__name {
  color: var(--ink);
}

.members__role {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.ident__side {
  display: grid;
  gap: 14px;
  justify-items: end;
}

.tally {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.tally__num {
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--accent-ink);
}

.tally__unit {
  font-size: 0.86rem;
  color: var(--ink-mute);
}

.tally__of {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.pending {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--warn-line);
  border-radius: var(--r-sm);
  background: var(--warn-tint);
  color: var(--warn);
  font-size: 0.82rem;
}

.pending--clear {
  border-color: var(--ok-line);
  background: var(--ok-tint);
  color: var(--ok);
}

.pending__go {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  padding-left: 10px;
  border-left: 1px solid currentColor;
  opacity: 0.85;
}

/* ------------------------------------------------------------ 通用 */

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
}

.head h2 {
  font-size: 1.22rem;
}

.head__note {
  font-size: 0.79rem;
  line-height: 1.75;
  color: var(--ink-faint);
  max-width: 68ch;
  margin-bottom: 18px;
}

.next .head__note {
  margin-top: -8px;
}

.head__side {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

.head__notice {
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.head__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink-mute);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.head__action:hover:not(:disabled) {
  border-color: var(--accent-line);
  color: var(--cyan);
}

.head__action:disabled {
  opacity: 0.55;
  cursor: default;
}

/* ------------------------------------------------------------ 状态四块 */

.boards__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 12px;
}

/* ------------------------------------------------------------ 步骤 */

.next__list {
  display: grid;
  gap: 12px;
}

/* ------------------------------------------------------------ 进展 */

.feed {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0;
}

.feed__item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 16px;
}

.feed__rail {
  display: flex;
  justify-content: center;
  padding-top: 6px;
}

.feed__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.feed__item:not(:last-child) .feed__rail {
  position: relative;
}

.feed__item:not(:last-child) .feed__rail::after {
  content: '';
  position: absolute;
  top: 18px;
  bottom: -6px;
  left: 50%;
  width: 1px;
  background: var(--hairline);
}

.feed__body {
  display: grid;
  gap: 7px;
  padding-bottom: 28px;
}

.feed__at {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.feed__title {
  font-size: 0.98rem;
  line-height: 1.5;
}

.feed__summary {
  font-size: 0.86rem;
  line-height: 1.8;
  color: var(--ink-soft);
  max-width: 74ch;
}

.feed__changes {
  list-style: none;
  padding: 12px 14px;
  margin: 2px 0 0;
  display: grid;
  gap: 7px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  max-width: 78ch;
}

.feed__changes li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--ink-mute);
}

.feed__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  justify-self: start;
  font-size: 0.79rem;
  color: var(--cyan);
}

.feed__none {
  font-size: 0.86rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------ 响应式 */

@media (max-width: 1180px) {
  .ident {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .ident h1 {
    font-size: 1.8rem;
  }

  .ident__side {
    justify-items: start;
  }
}

@media (max-width: 980px) {
  .boards__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 680px) {
  .state {
    gap: 36px;
  }
}
</style>
