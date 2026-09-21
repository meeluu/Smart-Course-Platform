<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ConfidenceTag from '@/components/ConfidenceTag.vue'
import { issueLabel } from '@/data/project'
import { useProjectStore } from '@/stores/project'
import type { NodeKind, ProjectNode } from '@/types/project'

/**
 * 项目地图
 * ----------------------------------------------------------------------------
 * 不是甘特图，也不是 Todo 清单，而是问题驱动的关系图。
 * 学生应该一眼看出三件事：用了很多方法但对应不上问题、写了结论却没有证据、
 * 需求已经改了但工作还在按旧理解做。
 */
const project = useProjectStore()

const KIND_LABEL: Record<NodeKind, string> = {
  need: '原始需求',
  usertask: '用户任务',
  understanding: '团队理解',
  question: '项目问题',
  hypothesis: '假设',
  resource: '数据 / 方法',
  evidence: '证据',
  judgement: '当前判断',
}

const ORDER: NodeKind[] = [
  'need',
  'usertask',
  'understanding',
  'question',
  'hypothesis',
  'resource',
  'evidence',
  'judgement',
]
const COL_W = 200
const ROW_H = 118

const route = useRoute()
const selected = ref<string | null>(null)

/** 支持从全局检索直接定位到某个节点 */
watch(
  () => route.query.node,
  (nodeId) => {
    if (typeof nodeId === 'string') selected.value = nodeId
  },
  { immediate: true },
)

/** 计算每个节点的坐标：按列铺开，列内按顺序向下堆叠 */
const layout = computed(() => {
  const map = new Map<string, { x: number; y: number }>()
  ORDER.forEach((kind, colIndex) => {
    project.nodes
      .filter((node) => node.kind === kind)
      .forEach((node, rowIndex) => {
        map.set(node.id, { x: colIndex * COL_W + 8, y: rowIndex * ROW_H + 46 })
      })
  })
  return map
})

const rows = computed(() =>
  Math.max(1, ...ORDER.map((kind) => project.nodes.filter((node) => node.kind === kind).length)),
)

const boardHeight = computed(() => rows.value * ROW_H + 70)
const boardWidth = computed(() => ORDER.length * COL_W + 16)

/** 连线：从上游节点右侧连到下游节点左侧 */
const edges = computed(() => {
  const list: { id: string; d: string; broken: boolean }[] = []
  project.nodes.forEach((node) => {
    const to = layout.value.get(node.id)
    if (!to) return
    node.from.forEach((fromId) => {
      const from = layout.value.get(fromId)
      if (!from) return
      const x1 = from.x + 176
      const y1 = from.y + 22
      const x2 = to.x
      const y2 = to.y + 22
      const mid = (x1 + x2) / 2
      list.push({
        id: `${fromId}-${node.id}`,
        d: `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`,
        broken: Boolean(node.issue),
      })
    })
  })
  return list
})

/** 问题标记文案与检测规则共用同一套说法，避免两处各说各话 */
const ISSUE_LABEL = issueLabel

const selectedNode = computed<ProjectNode | undefined>(() =>
  project.nodes.find((node) => node.id === selected.value),
)

function issueCount(issue: string) {
  return project.fractures.filter((node) => node.issue === issue).length
}
</script>

<template>
  <div class="map">
    <header class="intro">
      <div>
        <h1>项目地图</h1>
        <p class="intro__lead">
          从原始需求到当前判断，节点的连线就是项目的推理链。断掉的地方不需要系统下结论，
          你们自己看得见就够。
        </p>
      </div>
      <ul class="legend">
        <li><span class="dot dot--ok"></span>已确认</li>
        <li><span class="dot dot--warn"></span>只是推测</li>
        <li><span class="dot dot--risk"></span>存在问题 / 冲突</li>
      </ul>
    </header>

    <section class="fractures">
      <p class="fractures__title">
        <AppIcon name="alert" :size="15" />
        检测到 <span class="num">{{ project.fractures.length }}</span> 处逻辑断裂
      </p>
      <ul>
        <li v-for="(label, key) in ISSUE_LABEL" :key="key" :class="{ 'is-none': issueCount(key) === 0 }">
          <span class="fractures__count num">{{ issueCount(key) }}</span>
          {{ label }}
        </li>
      </ul>
      <button type="button" class="fractures__go" @click="project.openAction('drift')">
        开始跑偏检查
        <AppIcon name="arrow-right" :size="14" />
      </button>
    </section>

    <section class="board">
      <div
        class="board__canvas"
        :style="{ width: `${boardWidth}px`, height: `${boardHeight}px` }"
      >
      <svg class="board__edges" :width="boardWidth" :height="boardHeight">
        <path
          v-for="edge in edges"
          :key="edge.id"
          :d="edge.d"
          :class="{ 'is-broken': edge.broken }"
        />
      </svg>

      <div
        v-for="(kind, colIndex) in ORDER"
        :key="kind"
        class="col"
        :style="{ left: `${colIndex * COL_W + 8}px`, width: `${COL_W - 20}px` }"
      >
        <p class="col__head mono">
          {{ String(colIndex + 1).padStart(2, '0') }} · {{ KIND_LABEL[kind] }}
        </p>
      </div>

      <button
        v-for="node in project.nodes"
        :key="node.id"
        type="button"
        class="node"
        :class="[
          `node--${node.confidence}`,
          { 'is-selected': selected === node.id },
          node.issue ? `node--issue-${node.issue}` : '',
        ]"
        :style="{ left: `${layout.get(node.id)?.x ?? 0}px`, top: `${layout.get(node.id)?.y ?? 0}px` }"
        @click="selected = selected === node.id ? null : node.id"
      >
        <span class="node__title">{{ node.title }}</span>
        <span class="node__row">
          <span class="node__origin mono">{{ node.origin === 'teacher' ? '老师' : node.origin === 'ai' ? '系统' : '学生' }}</span>
          <AppIcon v-if="node.issue" name="alert" :size="12" class="node__warn" />
        </span>
      </button>
      </div>
    </section>

    <section v-if="selectedNode" class="detail">
      <header class="detail__head">
        <span class="detail__kind mono">{{ KIND_LABEL[selectedNode.kind] }}</span>
        <h2>{{ selectedNode.title }}</h2>
        <ConfidenceTag :confidence="selectedNode.confidence" :origin="selectedNode.origin" />
      </header>
      <p class="detail__text">{{ selectedNode.detail }}</p>
      <p v-if="selectedNode.issue" class="detail__issue">
        <AppIcon name="alert" :size="14" />
        {{ ISSUE_LABEL[selectedNode.issue] }}
      </p>
      <div class="detail__actions">
        <button
          v-if="selectedNode.issue"
          type="button"
          class="primary"
          @click="project.openAction(selectedNode.issue === 'no-question' ? 'drift' : 'stuck')"
        >
          {{
            selectedNode.issue === 'no-question'
              ? '检查它对应哪个项目问题'
              : selectedNode.issue === 'no-evidence'
                ? '梳理还缺哪份证据'
                : '把这条拿来和老师确认'
          }}
        </button>
      </div>
    </section>

    <p class="note">
      节点状态来自学生填写、材料提取与老师反馈。系统推断的节点会标注「系统推断」，
      在你们确认之前不会当成项目事实。
    </p>
  </div>
</template>

<style scoped>
.map {
  display: grid;
  gap: 32px;
}

.intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding-top: 8px;
}

.intro h1 {
  font-size: 1.95rem;
}

.intro__lead {
  margin-top: 12px;
  max-width: 66ch;
  font-size: 0.93rem;
  line-height: 1.85;
  color: var(--ink-soft);
}

.legend {
  display: flex;
  gap: 16px;
  list-style: none;
  padding: 0;
  font-size: 0.78rem;
  color: var(--ink-mute);
  white-space: nowrap;
}

.legend li {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.dot--ok {
  background: var(--ok);
}
.dot--warn {
  background: var(--warn);
}
.dot--risk {
  background: var(--risk);
}

/* ---------------------------------------------------------- 断裂统计 */

.fractures {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid var(--risk-line);
  border-radius: var(--r-lg);
  background: var(--risk-tint);
}

.fractures__title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--risk);
}

.fractures__title .num {
  font-size: 1.2rem;
}

.fractures ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 26px;
  font-size: 0.84rem;
  color: var(--ink-soft);
}

.fractures li {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.fractures li.is-none {
  color: var(--ink-faint);
}

.fractures__count {
  font-weight: 600;
  color: var(--ink);
}

.fractures li.is-none .fractures__count {
  color: var(--ink-faint);
}

.fractures__go {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 15px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-sm);
  background: var(--accent-tint);
  color: var(--cyan);
  font-size: 0.82rem;
  cursor: pointer;
}

/* ------------------------------------------------------------ 地图 */

.board {
  overflow-x: auto;
  border-radius: var(--r-lg);
  background: var(--surface);
}

/* 画布固定宽度，由外层负责横向滚动——否则 8 列会把容器自己撑破 */
.board__canvas {
  position: relative;
}

.board__edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.board__edges path {
  fill: none;
  stroke: var(--separator-strong);
  stroke-width: 1.5;
}

.board__edges path.is-broken {
  stroke: var(--risk-line);
  stroke-dasharray: 4 4;
}

.col {
  position: absolute;
  top: 0;
  padding-top: 14px;
}

.col__head {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
}

.node {
  position: absolute;
  display: grid;
  gap: 8px;
  width: 176px;
  padding: 11px 13px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.node:hover,
.node.is-selected {
  border-color: var(--accent-line);
}

.node--confirmed {
  box-shadow: inset 2px 0 0 0 var(--ok);
}

.node--inferred {
  box-shadow: inset 2px 0 0 0 var(--warn);
}

.node--uncertain {
  box-shadow: inset 2px 0 0 0 var(--risk);
}

.node--issue-no-question,
.node--issue-no-evidence {
  border-color: var(--risk-line);
}

.node--issue-stale,
.node--issue-unconfirmed,
.node--issue-conflict {
  border-color: var(--warn-line);
}

.node__title {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--ink);
}

.node__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.node__origin {
  font-size: 0.66rem;
  color: var(--ink-faint);
}

.node__warn {
  color: var(--risk);
}

/* ------------------------------------------------------------ 详情 */

.detail {
  display: grid;
  gap: 12px;
  padding: 20px 22px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: var(--glass);
}

.detail__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail__kind {
  font-size: 0.72rem;
  color: var(--cyan);
}

.detail__head h2 {
  flex: 1;
  font-size: 1.05rem;
}

.detail__text {
  font-size: 0.9rem;
  line-height: 1.85;
  color: var(--ink-soft);
  max-width: 80ch;
}

.detail__issue {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid var(--risk-line);
  border-radius: var(--r-sm);
  background: var(--risk-tint);
  font-size: 0.86rem;
  color: var(--risk);
}

.detail__actions {
  display: flex;
  gap: 10px;
}

.primary {
  padding: 8px 16px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.note {
  font-size: 0.78rem;
  line-height: 1.8;
  color: var(--ink-faint);
}

@media (max-width: 900px) {
  .intro {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }
}
</style>
