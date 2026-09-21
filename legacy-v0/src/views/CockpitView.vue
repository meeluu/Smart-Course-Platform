<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfidenceTag from '@/components/ConfidenceTag.vue'
import UpdateFeed from '@/components/UpdateFeed.vue'
import DecisionList from '@/components/DecisionList.vue'
import { useProjectStore, type ActionKey } from '@/stores/project'

/**
 * 项目驾驶舱
 * ----------------------------------------------------------------------------
 * 首页不是课程首页，而是当前项目的状态。只回答四件事：
 * 做到哪里、什么地方有风险、哪 1~3 件事最值得先做、哪些问题需要找人确认。
 * 下面是四个直接动作——学生不需要面对一个空的聊天框。
 */
const project = useProjectStore()

const ACTIONS: { key: ActionKey; label: string; sub: string; icon: string }[] = [
  { key: 'stuck', label: '我卡住了', sub: '先补背景，再定位卡点', icon: 'compass' },
  { key: 'drift', label: '检查我们有没有跑偏', sub: '看项目逻辑断在哪', icon: 'split' },
  { key: 'next', label: '下一步做什么', sub: '只给最重要的 1~3 件', icon: 'flag' },
  { key: 'teacher', label: '准备问老师', sub: '整理成可检查的问题', icon: 'send' },
]

/** 范围统计：明确不做的事项数量，与"要做"同等重要 */
const scopeStats = computed(() => {
  const items = project.findBoard('scope')?.items ?? []
  return {
    total: items.length,
    out: items.filter((item) => item.text.startsWith('不做')).length,
    tbd: items.filter((item) => item.confidence === 'uncertain').length,
  }
})

const fractureStats = computed(() => ({
  high: project.fractures.filter((node) => node.issue === 'no-question' || node.issue === 'no-evidence').length,
  other: project.fractures.length - project.fractures.filter((node) => node.issue === 'no-question' || node.issue === 'no-evidence').length,
}))
</script>

<template>
  <div class="cockpit">
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

      <dl class="tally">
        <div>
          <dt>剩余周数</dt>
          <dd>
            <span class="num num--accent">{{ project.weeksLeft }}</span> 周
            <span class="tally__of">/ {{ project.meta.totalWeeks }}</span>
          </dd>
        </div>
        <div>
          <dt>项目地图断裂</dt>
          <dd><span class="num num--risk">{{ project.fractures.length }}</span> 处</dd>
        </div>
        <div>
          <dt>明确不做</dt>
          <dd>
            <span class="num">{{ scopeStats.out }}</span> 项
            <span v-if="scopeStats.tbd" class="tally__of">· {{ scopeStats.tbd }} 项待定</span>
          </dd>
        </div>
        <div>
          <dt>待你确认的状态更新</dt>
          <dd><span class="num num--warn">{{ project.pendingUpdates.length }}</span> 条</dd>
        </div>
        <div>
          <dt>待判断的建议</dt>
          <dd><span class="num">{{ project.unjudgedAdvice.length }}</span> 条</dd>
        </div>
        <div>
          <dt>待确认的问题</dt>
          <dd><span class="num">{{ project.openEscalations.length }}</span> 个</dd>
        </div>
      </dl>
    </section>

    <!-- ------------------------------------------------------------ 现实约束 -->
    <section class="constraints">
      <div class="constraints__cell">
        <p class="constraints__label">需求方要的粒度</p>
        <p class="constraints__value">{{ project.kickoff.dataNeed }}</p>
      </div>
      <div class="constraints__gap" aria-hidden="true">
        <AppIcon name="split" :size="16" />
      </div>
      <div class="constraints__cell">
        <p class="constraints__label">我们手上的数据</p>
        <p class="constraints__value">{{ project.kickoff.dataHave }}</p>
      </div>
      <div class="constraints__cell constraints__cell--right">
        <p class="constraints__label">剩余 {{ project.weeksLeft }} 周里必须完成的</p>
        <ul class="constraints__list">
          <li v-for="feature in project.kickoff.coreFeatures" :key="feature">{{ feature }}</li>
        </ul>
      </div>
    </section>

    <!-- ------------------------------------------------------ 需要你处理的事 -->
    <section class="attention">
      <header class="head">
        <h2>此刻最需要你处理的事</h2>
        <p class="head__note">
          系统只负责把断掉的地方摆出来。判断仍然是你们自己的，所以这里不放“一键修复”。
        </p>
      </header>
      <ul v-if="project.attention.length" class="att">
        <li v-for="item in project.attention" :key="item.key" class="att__item" :class="`att__item--${item.tone}`">
          <span class="att__label">{{ item.label }}</span>
          <span class="att__detail">{{ item.detail }}</span>
        </li>
      </ul>
      <p v-else class="att__none">目前没有待处理项。可以去做一次反思，或补一次状态更新。</p>
    </section>

    <!-- ------------------------------------------------------------ 四个动作 -->
    <section class="actions">
      <button
        v-for="action in ACTIONS"
        :key="action.key"
        type="button"
        class="act"
        @click="project.openAction(action.key)"
      >
        <span class="act__icon"><AppIcon :name="action.icon" :size="18" /></span>
        <span class="act__body">
          <span class="act__label">{{ action.label }}</span>
          <span class="act__sub">{{ action.sub }}</span>
        </span>
        <AppIcon name="arrow-right" :size="15" class="act__go" />
      </button>
    </section>

    <!-- ------------------------------------------------------------ 状态板 -->
    <section class="boards">
      <header class="head">
        <h2>项目当前状态</h2>
        <p class="head__note">
          七项状态回答七个问题。每条都标注可信程度——系统推断的内容不会当成项目事实。
        </p>
      </header>

      <div class="boards__grid">
        <article v-for="board in project.boards" :key="board.key" class="board">
          <header class="board__head">
            <span class="board__key mono">{{ board.key }}</span>
            <h3 class="board__q">{{ board.question }}</h3>
          </header>
          <ul v-if="board.items.length" class="board__items">
            <li v-for="item in board.items" :key="item.id">
              <p class="board__text">{{ item.text }}</p>
              <ConfidenceTag :confidence="item.confidence" :origin="item.origin" compact />
            </li>
          </ul>
          <p v-else class="board__empty">还没有内容。它往往正是项目现在最不确定的地方。</p>
        </article>
      </div>
    </section>

    <!-- ------------------------------------------------------- 更新与决定 -->
    <section class="two">
      <div>
        <header class="head">
          <h2>状态更新</h2>
          <RouterLink to="/log" class="head__link">全部记录 <AppIcon name="arrow-right" :size="13" /></RouterLink>
        </header>
        <UpdateFeed :limit="2" />
      </div>
      <div>
        <header class="head">
          <h2>关键决定</h2>
          <RouterLink to="/log" class="head__link">全部决定 <AppIcon name="arrow-right" :size="13" /></RouterLink>
        </header>
        <DecisionList :limit="2" />
      </div>
    </section>

    <p class="stamp">
      项目地图断裂中 <span class="num">{{ fractureStats.high }}</span> 处属于「有工作没问题」或「有结论没证据」，
      这类问题会直接削弱中期与最终答辩。
    </p>

  </div>
</template>

<style scoped>
.cockpit {
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

.tally {
  display: grid;
  grid-template-columns: repeat(2, minmax(148px, 1fr));
  gap: 18px 30px;
  margin: 0;
}

.tally div {
  border-top: 1px solid var(--hairline);
  padding-top: 10px;
}

.tally dt {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.tally dd {
  margin: 5px 0 0;
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.tally .num {
  font-size: 1.7rem;
  font-weight: 600;
  color: var(--ink);
  margin-right: 4px;
}

.tally .num--risk {
  color: var(--risk);
}

.tally .num--warn {
  color: var(--warn);
}

/* ------------------------------------------------------------ 约束 */

.constraints {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 24px;
  align-items: start;
  padding: 20px 22px;
  border-radius: var(--r-lg);
  background: var(--surface);
}

.constraints__label {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.constraints__value {
  margin-top: 6px;
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--ink);
}

.constraints__gap {
  align-self: center;
  color: var(--warn);
}

.constraints__cell--right {
  padding-left: 24px;
  border-left: 1px solid var(--separator);
}

.constraints__list {
  list-style: none;
  padding: 0;
  margin-top: 6px;
  display: grid;
  gap: 4px;
}

.constraints__list li {
  position: relative;
  padding-left: 14px;
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--ink-soft);
}

.constraints__list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.tally__of {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.num--accent {
  color: var(--accent-ink);
}

/* ------------------------------------------------------------ 处理项 */

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.head h2 {
  font-size: 1.22rem;
}

.head__note {
  font-size: 0.79rem;
  color: var(--ink-faint);
  max-width: 62ch;
}

.head__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.head__link:hover {
  color: var(--cyan);
}

.att {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 2px;
}

.att__item {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  align-items: baseline;
  padding: 12px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--glass);
}

.att__item--risk {
  border-color: var(--risk-line);
}

.att__item--warn {
  border-color: var(--warn-line);
}

.att__label {
  font-size: 0.84rem;
  color: var(--ink);
}

.att__item--risk .att__label {
  color: var(--risk);
}

.att__item--warn .att__label {
  color: var(--warn);
}

.att__detail {
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.att__none {
  font-size: 0.86rem;
  color: var(--ink-faint);
}

/* ------------------------------------------------------------ 动作 */

.actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.act {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, var(--fill), var(--fill));
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.act:hover {
  border-color: var(--accent-line);
  background: linear-gradient(180deg, var(--accent-tint), var(--accent-tint));
}

.act__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: var(--r-sm);
  background: var(--accent-tint);
  color: var(--cyan);
  flex: none;
}

.act__body {
  display: grid;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.act__label {
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.35;
}

.act__sub {
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--ink-mute);
}

.act__go {
  color: var(--ink-faint);
  flex: none;
  transition: all var(--dur-2) var(--ease-out);
}

.act:hover .act__go {
  color: var(--cyan);
  transform: translateX(3px);
}

/* ------------------------------------------------------------ 状态板 */

.boards__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--hairline);
}

.board {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 20px 22px;
  background: var(--surface-2);
}

.board__head {
  display: grid;
  gap: 4px;
}

.board__key {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.board__q {
  font-size: 0.92rem;
  color: var(--ink-soft);
  font-weight: 500;
}

.board__items {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}

.board__items li {
  display: grid;
  gap: 5px;
}

.board__text {
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--ink);
}

.board__empty {
  font-size: 0.82rem;
  color: var(--ink-faint);
  line-height: 1.7;
}

/* ------------------------------------------------------------ 两栏 */

.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 44px;
}

.stamp {
  padding-top: 6px;
  font-size: 0.78rem;
  line-height: 1.8;
  color: var(--ink-faint);
}

.stamp .num {
  color: var(--risk);
  font-weight: 600;
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

  .actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .boards__grid,
  .two {
    grid-template-columns: minmax(0, 1fr);
  }

  .constraints {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .constraints__gap {
    display: none;
  }

  .constraints__cell--right {
    padding-left: 0;
    padding-top: 16px;
    border-left: 0;
    border-top: 1px solid var(--separator);
  }

  .two {
    gap: 32px;
  }

  .att__item {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}

@media (max-width: 680px) {
  .actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .cockpit {
    gap: 36px;
  }
}
</style>
