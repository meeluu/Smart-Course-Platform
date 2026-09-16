<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { courseStats, modules } from '@/data/course'
import { gradeItems, members, references } from '@/data/materials'
import { useCourseStore } from '@/stores/course'
import { useQaStore } from '@/stores/qa'
import { useViewerStore } from '@/stores/viewer'
import { useAssessmentStore } from '@/stores/assessment'

/**
 * 课程概览
 * ----------------------------------------------------------------------------
 * 第一屏就把产品机制演示出来：学（资源路径）— 问（可溯源问答）— 测（能力画像）
 * 三层不是三张卡片，而是一条会被画出来的闭环，每一环都带真实读数并可直接进入。
 */
const router = useRouter()
const course = useCourseStore()
const qa = useQaStore()
const viewer = useViewerStore()
const assessment = useAssessmentStore()

/** 闭环连接线的一次性绘制动画 */
const drawn = ref(false)
onMounted(() => {
  window.setTimeout(() => (drawn.value = true), 120)
})

const loop = computed(() => [
  {
    key: 'learn',
    icon: 'book',
    title: '学 · 学习路径',
    readout: `${courseStats.lessonCount} 讲`,
    unit: `${courseStats.resourceCount} 个资源锚点`,
    detail: '课件、实验手册、项目规范与往届经验材料按「模块—讲次」聚合，每一讲都能一站定位。',
    action: '进入课程内容',
    to: '/content',
    requirement: 'DR1',
  },
  {
    key: 'ask',
    icon: 'chat',
    title: '问 · 可溯源问答',
    readout: `${courseStats.docCount} 份`,
    unit: '课程文档作为唯一证据',
    detail: '回答只建立在课程知识库之上，每条关键结论都标注文档、章节与页码，点击即可核验原文。',
    action: '进入智能问答',
    to: '/qa',
    requirement: 'DR2',
  },
  {
    key: 'test',
    icon: 'target',
    title: '测 · 能力画像',
    readout: `${assessment.accuracy}%`,
    unit: `基于 ${assessment.answered} 道作答`,
    detail: '测评按知识点聚合为能力画像，薄弱项直接映射回学习路径，并给出可执行的复习顺序。',
    action: '进入能力画像',
    to: '/profile',
    requirement: 'DR3',
  },
])

const lastLesson = computed(() => course.lastLesson)

const gradeTotal = computed(() => gradeItems.reduce((sum, item) => sum + item.weight, 0))
const gradeTone = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

function openContent(lessonId: string) {
  void router.push({ path: '/content', query: { lesson: lessonId } })
}

function openGrade(blockId: string) {
  viewer.openEvidence(blockId)
}

const qaCount = computed(() => qa.threads.length)
</script>

<template>
  <div class="overview">
    <!-- ---------------------------------------------------- 课程身份与继续学习 -->
    <section class="ident">
      <div class="ident__main">
        <h1>《大数据分析实践》智慧课程平台</h1>
        <p class="ident__lead">
          以课程资源为证据底座，把「学—问—测」串成一条可核验的学习闭环：沿学习路径定位材料、
          在课程内提问并核验出处、用细粒度能力画像决定下一步复习什么。
        </p>
        <div class="ident__tags">
          <span class="chip chip--lit">
            <AppIcon name="check" :size="12" />国家级一流本科课程
          </span>
          <span class="chip">2025 秋季学期</span>
          <span class="chip">面向 4~6 人学生团队</span>
          <span class="chip">课程知识库 {{ courseStats.docCount }} 份 · 证据块已入库</span>
        </div>
      </div>

      <RouterLink v-if="lastLesson" to="/content" class="resume">
        <span class="resume__label">继续学习</span>
        <span class="resume__title">第 {{ String(lastLesson.index).padStart(2, '0') }} 讲 · {{ lastLesson.title }}</span>
        <span class="resume__meta">{{ lastLesson.date }} · {{ lastLesson.resources.length }} 份材料</span>
        <span class="resume__go">
          打开这一讲
          <AppIcon name="arrow-right" :size="15" />
        </span>
      </RouterLink>
    </section>

    <!-- ------------------------------------------------------------ 学习闭环 -->
    <section class="loop" :class="{ 'is-drawn': drawn }">
      <div v-for="(item, index) in loop" :key="item.key" class="loop__cell">
        <RouterLink :to="item.to" class="loop__node">
          <span class="loop__icon"><AppIcon :name="item.icon" :size="18" /></span>
          <span class="loop__req mono">{{ item.requirement }}</span>
          <h3 class="loop__title">{{ item.title }}</h3>
          <p class="loop__readout">
            <span class="num">{{ item.readout }}</span>
            <span class="loop__unit">{{ item.unit }}</span>
          </p>
          <p class="loop__detail">{{ item.detail }}</p>
          <span class="loop__action">
            {{ item.action }}
            <AppIcon name="arrow-right" :size="14" />
          </span>
        </RouterLink>
        <span v-if="index < loop.length - 1" class="loop__link" aria-hidden="true">
          <span class="loop__line"></span>
        </span>
      </div>
    </section>

    <!-- ------------------------------------------------------- 目标与教学要求 -->
    <section class="two-col">
      <div>
        <h2>课程定位</h2>
        <p>
          本课程围绕交互式数据处理与分析的需求开展教学，构建集数据管理、数据分析、数据挖掘、
          数据可视化与人机交互于一体的完整知识体系。课程以实验项目驱动，在真实数据与真实算力上
          完成一个完整课题。
        </p>
        <p>
          面向实践类课程中「知识理解、实验执行、项目协作」相互衔接的特点，本平台只做三件事，
          但每一件都做透：沿学习路径组织课程资源（DR1）、提供课程内可溯源问答（DR2）、
          提供细粒度能力诊断与反馈（DR3）。
        </p>
      </div>
      <div>
        <h2>教学要求</h2>
        <ol class="req">
          <li><strong>工程知识</strong>：具备数据挖掘与数据可视化的理论基础，能开发大数据应用系统。</li>
          <li><strong>综合应用</strong>：理解数据管理、分析、挖掘、可视化与人机交互之间的关系，能把握整体架构。</li>
          <li><strong>研究能力</strong>：通过实践项目提高提出问题、解决问题与分析问题的能力，期末提交研究短文。</li>
          <li><strong>沟通能力</strong>：通过分组交流、课堂汇报与报告撰写，在学期中与学期末各汇报一次进展。</li>
        </ol>
      </div>
    </section>

    <!-- ------------------------------------------------------------ 教学大纲 -->
    <section class="syllabus">
      <header class="section-head">
        <h2>教学大纲</h2>
        <p class="section-head__note">
          共 {{ courseStats.moduleCount }} 个模块 / {{ courseStats.lessonCount }} 讲，点击任意一讲直接进入其资源聚合视图。
        </p>
      </header>

      <div v-for="module in modules" :key="module.id" class="module">
        <div class="module__head">
          <span class="module__no mono">M{{ module.index }}</span>
          <div class="module__id">
            <h3>{{ module.title }}</h3>
            <p>{{ module.thesis }}</p>
          </div>
          <span class="module__span">{{ module.span }}</span>
        </div>
        <ul class="lessons">
          <li v-for="lesson in module.lessons" :key="lesson.id">
            <button type="button" class="lesson" @click="openContent(lesson.id)">
              <span class="lesson__no mono">{{ String(lesson.index).padStart(2, '0') }}</span>
              <span class="lesson__date mono">{{ lesson.date.slice(5) }}</span>
              <span class="lesson__title">{{ lesson.title }}</span>
              <span class="lesson__count num">{{ lesson.resources.length }} 份</span>
              <AppIcon name="arrow-right" :size="14" class="lesson__arrow" />
            </button>
          </li>
        </ul>
      </div>
    </section>

    <!-- ------------------------------------------------------------ 考核构成 -->
    <section class="grading">
      <header class="section-head">
        <h2>考核构成</h2>
        <p class="section-head__note">合计 {{ gradeTotal }}%。点击任意一项可展开评分细则的原文证据。</p>
      </header>

      <div class="stack" role="img" :aria-label="`考核构成堆叠图，共 ${gradeTotal}%`">
        <span
          v-for="(item, index) in gradeItems"
          :key="item.name"
          class="stack__seg"
          :class="`stack__seg--${gradeTone[index]}`"
          :style="{ flexGrow: item.weight }"
          :title="`${item.name} ${item.weight}%`"
        >
          <span class="stack__num num">{{ item.weight }}</span>
        </span>
      </div>

      <ul class="grades">
        <li v-for="(item, index) in gradeItems" :key="item.name">
          <button type="button" class="grade" @click="openGrade(item.blockId)">
            <span class="grade__dot" :class="`grade__dot--${gradeTone[index]}`"></span>
            <span class="grade__name">{{ item.name }}</span>
            <span class="grade__weight num">{{ item.weight }}%</span>
            <span class="grade__detail">{{ item.detail }}</span>
            <AppIcon name="external" :size="13" class="grade__go" />
          </button>
        </li>
      </ul>
    </section>

    <!-- ------------------------------------------------------------ 授课团队 -->
    <section class="team">
      <header class="section-head">
        <h2>授课教师与助教</h2>
        <p class="section-head__note">课程材料与规范由课程组维护，经验材料来自往届课程组结项文档。</p>
      </header>
      <div class="team__grid">
        <article v-for="member in members" :key="member.id" class="member">
          <img :src="member.photo" :alt="member.nameZh" class="member__photo" loading="lazy" />
          <div class="member__id">
            <p class="member__name">{{ member.nameZh }} <span class="member__en">{{ member.name }}</span></p>
            <p class="member__role">{{ member.role }}</p>
            <div class="member__links">
              <a :href="`mailto:${member.email}`" class="member__link">
                <AppIcon name="send" :size="13" />邮件
              </a>
              <a v-if="member.site" :href="member.site" target="_blank" rel="noopener" class="member__link">
                <AppIcon name="external" :size="13" />主页
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ------------------------------------------------------------ 参考资料 -->
    <section class="refs">
      <header class="section-head">
        <h2>教材与参考资料</h2>
        <p class="section-head__note">共 {{ references.length }} 项，包含可视分析基础、数据挖掘与检索增强生成方向。</p>
      </header>
      <ol class="refs__list">
        <li v-for="(ref, index) in references" :key="ref.id">
          <span class="refs__no mono">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="refs__body">
            <p class="refs__name">
              {{ ref.name }}
              <span v-if="ref.translateName" class="refs__cn">（{{ ref.translateName }}）</span>
            </p>
            <p class="refs__meta">{{ ref.authors }} · {{ ref.pub }} · {{ ref.year }}</p>
          </div>
        </li>
      </ol>
    </section>

    <p class="stamp">
      知识库 {{ courseStats.docCount }} 份文档 · {{ courseStats.resourceCount }} 个资源锚点 ·
      历史问答 {{ qaCount }} 条已归档
    </p>
  </div>
</template>

<style scoped>
.overview {
  display: grid;
  gap: 56px;
}

/* ------------------------------------------------------------ 身份 */

.ident {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 40px;
  align-items: end;
  padding-top: 18px;
}

.ident h1 {
  font-size: 2.5rem;
  letter-spacing: -0.03em;
  max-width: 22ch;
}

.ident__lead {
  margin-top: 16px;
  max-width: 62ch;
  font-size: 0.98rem;
  line-height: 1.85;
  color: var(--ink-soft);
}

.ident__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}

.resume {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  border: 1px solid rgba(53, 224, 240, 0.28);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(53, 224, 240, 0.1), rgba(53, 224, 240, 0.03));
  color: var(--ink);
  transition:
    border-color var(--dur-2) var(--ease-out),
    transform var(--dur-2) var(--ease-out);
}

.resume:hover {
  border-color: rgba(53, 224, 240, 0.5);
  transform: translateY(-2px);
  color: var(--ink);
}

.resume__label {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--cyan);
}

.resume__title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.45;
}

.resume__meta {
  font-size: 0.78rem;
  color: var(--ink-mute);
}

.resume__go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 0.82rem;
  color: var(--cyan);
}

/* ------------------------------------------------------------ 闭环 */

.loop {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
}

.loop__cell {
  position: relative;
  display: flex;
}

.loop__node {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 22px 24px;
  border: 1px solid var(--hairline);
  background: linear-gradient(180deg, rgba(146, 190, 236, 0.055), rgba(146, 190, 236, 0.015));
  color: var(--ink);
  transition: background var(--dur-2) var(--ease-out);
}

.loop__cell:first-child .loop__node {
  border-radius: var(--r-lg) 0 0 var(--r-lg);
}

.loop__cell:last-child .loop__node {
  border-radius: 0 var(--r-lg) var(--r-lg) 0;
}

.loop__node:hover {
  background: linear-gradient(180deg, rgba(53, 224, 240, 0.1), rgba(53, 224, 240, 0.03));
  color: var(--ink);
}

.loop__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-sm);
  background: rgba(53, 224, 240, 0.13);
  color: var(--cyan);
}

.loop__req {
  justify-self: start;
  font-size: 0.68rem;
  color: var(--ink-faint);
}

.loop__title {
  font-size: 1.1rem;
}

.loop__readout {
  display: flex;
  align-items: baseline;
  gap: 9px;
}

.loop__readout .num {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--cyan);
  line-height: 1.1;
}

.loop__unit {
  font-size: 0.78rem;
  color: var(--ink-mute);
}

.loop__detail {
  font-size: 0.85rem;
  line-height: 1.75;
  color: var(--ink-mute);
}

.loop__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.loop__node:hover .loop__action {
  color: var(--cyan);
}

/* 连接线：进入视口后一次性画出 */
.loop__link {
  display: grid;
  place-items: center;
  width: 0;
  position: relative;
  z-index: 2;
}

.loop__line {
  position: absolute;
  width: 26px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(53, 224, 240, 0.6), transparent);
  transform: scaleX(0);
  transition: transform var(--dur-4) var(--ease-out);
}

.loop.is-drawn .loop__line {
  transform: scaleX(1);
}

.loop__cell:nth-child(2) .loop__line {
  transition-delay: 320ms;
}

/* ------------------------------------------------------------ 两栏 */

.two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 48px;
}

.two-col h2 {
  margin-bottom: 16px;
}

.two-col p + p {
  margin-top: 12px;
}

.two-col p {
  font-size: 0.92rem;
  line-height: 1.9;
  color: var(--ink-soft);
}

.req {
  display: grid;
  gap: 12px;
  padding-left: 0;
  list-style: none;
  counter-reset: req;
}

.req li {
  position: relative;
  padding-left: 34px;
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--ink-soft);
  counter-increment: req;
}

.req li::before {
  content: counter(req, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: 2px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--cyan);
}

.req strong {
  color: var(--ink);
}

/* ------------------------------------------------------------ 区块头 */

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--hairline);
}

.section-head__note {
  font-size: 0.8rem;
  color: var(--ink-faint);
  max-width: 56ch;
}

/* ------------------------------------------------------------ 大纲 */

.module + .module {
  margin-top: 26px;
}

.module__head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 4px 10px;
}

.module__no {
  font-size: 0.8rem;
  color: var(--cyan);
  padding-top: 4px;
}

.module__id h3 {
  font-size: 1.05rem;
}

.module__id p {
  margin-top: 5px;
  font-size: 0.84rem;
  line-height: 1.7;
  color: var(--ink-mute);
  max-width: 78ch;
}

.module__span {
  margin-left: auto;
  padding-top: 4px;
  font-size: 0.78rem;
  color: var(--ink-faint);
  white-space: nowrap;
}

.lessons {
  list-style: none;
  padding: 0;
  border-top: 1px solid var(--hairline);
}

.lesson {
  display: grid;
  grid-template-columns: 34px 52px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 12px 10px 12px 4px;
  border: 0;
  border-bottom: 1px solid var(--hairline);
  background: transparent;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.lesson:hover {
  background: var(--glass);
  color: var(--ink);
}

.lesson__no {
  font-size: 0.82rem;
  color: var(--cyan);
}

.lesson__date {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.lesson__title {
  font-size: 0.91rem;
}

.lesson__count {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.lesson__arrow {
  color: var(--ink-faint);
  opacity: 0;
  transition: all var(--dur-2) var(--ease-out);
}

.lesson:hover .lesson__arrow {
  opacity: 1;
  color: var(--cyan);
  transform: translateX(3px);
}

/* ------------------------------------------------------------ 考核 */

.stack {
  display: flex;
  gap: 3px;
  height: 34px;
  margin-top: 18px;
}

.stack__seg {
  display: grid;
  place-items: center;
  border-radius: var(--r-xs);
  min-width: 26px;
  transition: filter var(--dur-2) var(--ease-out);
}

.stack__seg:hover {
  filter: brightness(1.28);
}

.stack__num {
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(4, 8, 15, 0.82);
}

.stack__seg--a {
  background: linear-gradient(180deg, #6ff0fa, #35e0f0);
}
.stack__seg--b {
  background: linear-gradient(180deg, #7cc4ff, #4aa8ff);
}
.stack__seg--c {
  background: linear-gradient(180deg, #96a2ff, #6d7bff);
}
.stack__seg--d {
  background: linear-gradient(180deg, #93e8c8, #43d9a3);
}
.stack__seg--e {
  background: linear-gradient(180deg, #f6cd8c, #f2b455);
}
.stack__seg--f {
  background: linear-gradient(180deg, #ffa3ae, #ff7a8a);
}
.stack__seg--g {
  background: linear-gradient(180deg, #9fb6d4, #7d94b0);
}
.stack__seg--h {
  background: linear-gradient(180deg, #b9a6ff, #8d78f0);
}

.grades {
  list-style: none;
  padding: 0;
  margin-top: 14px;
}

.grade {
  display: grid;
  grid-template-columns: 10px 210px 52px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 11px 6px;
  border: 0;
  border-bottom: 1px solid var(--hairline);
  background: transparent;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-2) var(--ease-out);
}

.grade:hover {
  background: var(--glass);
}

.grade__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.grade__dot--a {
  background: #35e0f0;
}
.grade__dot--b {
  background: #4aa8ff;
}
.grade__dot--c {
  background: #6d7bff;
}
.grade__dot--d {
  background: #43d9a3;
}
.grade__dot--e {
  background: #f2b455;
}
.grade__dot--f {
  background: #ff7a8a;
}
.grade__dot--g {
  background: #7d94b0;
}
.grade__dot--h {
  background: #8d78f0;
}

.grade__name {
  font-size: 0.88rem;
  color: var(--ink);
}

.grade__weight {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--cyan);
}

.grade__detail {
  font-size: 0.82rem;
  color: var(--ink-mute);
}

.grade__go {
  color: var(--ink-faint);
  opacity: 0;
  transition: opacity var(--dur-2) var(--ease-out);
}

.grade:hover .grade__go {
  opacity: 1;
  color: var(--cyan);
}

/* ------------------------------------------------------------ 团队 */

.team__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
  margin-top: 22px;
}

.member {
  display: grid;
  gap: 12px;
}

.member__photo {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  filter: saturate(0.92) contrast(1.02);
}

.member__name {
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink);
}

.member__en {
  margin-left: 6px;
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--ink-faint);
}

.member__role {
  margin-top: 3px;
  font-size: 0.8rem;
  color: var(--ink-mute);
}

.member__links {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.member__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.member__link:hover {
  color: var(--cyan);
}

/* ------------------------------------------------------------ 参考 */

.refs__list {
  list-style: none;
  padding: 0;
  margin-top: 10px;
}

.refs__list li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 14px;
  padding: 13px 4px;
  border-bottom: 1px solid var(--hairline);
}

.refs__no {
  font-size: 0.76rem;
  color: var(--cyan);
  padding-top: 3px;
}

.refs__name {
  font-size: 0.9rem;
  color: var(--ink);
  line-height: 1.6;
}

.refs__cn {
  color: var(--ink-mute);
}

.refs__meta {
  margin-top: 4px;
  font-size: 0.79rem;
  color: var(--ink-faint);
}

.stamp {
  padding-top: 8px;
  font-size: 0.76rem;
  color: var(--ink-faint);
  font-family: var(--font-mono);
}

/* ------------------------------------------------------------ 响应式 */

@media (max-width: 1180px) {
  .ident {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .ident h1 {
    font-size: 2.1rem;
  }

  .team__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .loop {
    grid-template-columns: minmax(0, 1fr);
  }

  .loop__cell:first-child .loop__node,
  .loop__cell:last-child .loop__node {
    border-radius: var(--r-lg);
  }

  .loop__link {
    display: none;
  }

  .loop__cell + .loop__cell {
    margin-top: 12px;
  }

  .two-col {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }
}

@media (max-width: 760px) {
  .overview {
    gap: 40px;
  }

  .ident h1 {
    font-size: 1.7rem;
  }

  .lesson {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
  }

  .lesson__date,
  .lesson__count {
    display: none;
  }

  .grade {
    grid-template-columns: 10px minmax(0, 1fr) 46px;
    gap: 10px;
  }

  .grade__detail,
  .grade__go {
    display: none;
  }

  .team__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-head {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
