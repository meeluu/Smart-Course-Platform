<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import UnderstandingBlock from '@/components/UnderstandingBlock.vue'
import type { MaterialType } from '@/types/project'
import { materialTypeLabel, understandingOrder } from '@/data/intake'
import { useProjectStore } from '@/stores/project'

/**
 * 材料与理解
 * ----------------------------------------------------------------------------
 * 整个系统的入口。学生刚拿到项目时手上只有材料，没有结论，
 * 所以这里不要求他们回答任何问题——先交材料，系统先读，他们只做确认与改写。
 *
 * 三条硬规则在这一页上都能看见：
 *  1. 系统读出来的东西一律先标「系统推断」，确认之后才算项目事实；
 *  2. 每条都标可信程度，并且能点开看它来自哪份材料的哪一段；
 *  3. 没有全部确认之前，系统不会拿这份理解去判断下一步。
 */
const project = useProjectStore()

const TYPES: MaterialType[] = ['requirement', 'document', 'data', 'other']

const adding = ref(false)
const justOrganized = ref(0)
const form = reactive<{ name: string; type: MaterialType; text: string }>({
  name: '',
  type: 'requirement',
  text: '',
})

const canAdd = computed(() => form.name.trim().length > 0 && form.text.trim().length > 0)
const organizedCount = computed(() => project.materials.filter((item) => item.organizedAt).length)
const allConfirmed = computed(
  () => project.understanding.length > 0 && project.pendingItems.length === 0,
)

function resetForm() {
  form.name = ''
  form.type = 'requirement'
  form.text = ''
}

function add() {
  if (!canAdd.value) return
  project.addMaterial(form)
  resetForm()
  adding.value = false
}

function organize() {
  const added = project.organize()
  justOrganized.value = added
  window.setTimeout(() => (justOrganized.value = 0), 2600)
}

/** 材料摘录：先压掉换行，否则多行材料在列表里会串成一段没有停顿的长文 */
function excerpt(text: string, limit = 92) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > limit ? `${flat.slice(0, limit)}…` : flat
}
</script>

<template>
  <div class="mat">
    <header class="intro">
      <h1>材料与理解</h1>
      <p class="intro__lead">
        把与项目有关的材料交进来——需求说明、项目文档、数据说明都算。系统会先读一遍，
        把原始材料整理成四块：项目目标、交付内容、当前问题、待确认事项。
        你们要做的不是从头回答，而是逐条确认或改写——<strong
          >系统读出来的东西，不经过你们确认就不会成为项目事实。</strong>
      </p>
    </header>

    <!-- ---------------------------------------------------------- 材料区 -->
    <section class="zone">
      <header class="head">
        <div class="head__main">
          <h2>材料</h2>
          <p class="head__note">
            已交 {{ project.materials.length }} 份，其中 {{ organizedCount }} 份已整理。
          </p>
        </div>
        <div class="head__tools">
          <button
            v-if="project.unorganizedMaterials.length"
            type="button"
            class="btn btn--primary"
            @click="organize"
          >
            <AppIcon name="spark" :size="14" />
            整理成项目理解
          </button>
          <span v-else-if="justOrganized" class="organized">
            <AppIcon name="check" :size="14" />
            整理出 {{ justOrganized }} 条
          </span>
          <button v-else type="button" class="btn" @click="adding = !adding">
            <AppIcon :name="adding ? 'close' : 'list'" :size="14" />
            {{ adding ? '收起' : '再交一份' }}
          </button>
        </div>
      </header>

      <ul class="mats">
        <li v-for="material in project.materials" :key="material.id" class="mat-item">
          <div class="mat-item__top">
            <span class="mat-item__type">{{ materialTypeLabel[material.type] }}</span>
            <span class="mat-item__name">{{ material.name }}</span>
            <span v-if="material.organizedAt" class="mat-item__done">
              <AppIcon name="check" :size="12" />
              已整理
            </span>
            <span v-else class="mat-item__todo">待整理</span>
          </div>
          <p class="mat-item__meta mono">
            {{ material.uploadedAt }}
            <template v-if="material.note"> · {{ material.note }}</template>
          </p>
          <p class="mat-item__excerpt">{{ excerpt(material.text) }}</p>
        </li>

        <li v-if="adding" class="compose">
          <label class="field">
            <span class="field__label">这份材料叫什么</span>
            <input v-model="form.name" type="text" placeholder="例：需求对接会纪要、数据说明（摘录）" />
          </label>

          <div class="field">
            <span class="field__label">它属于哪一类</span>
            <div class="segmented">
              <button
                v-for="type in TYPES"
                :key="type"
                type="button"
                class="segmented__item"
                :class="{ 'is-active': form.type === type }"
                @click="form.type = type"
              >
                {{ materialTypeLabel[type] }}
              </button>
            </div>
          </div>

          <label class="field">
            <span class="field__label">正文</span>
            <span class="field__hint">
              这一版先支持直接粘贴文本。上传 PDF / Word 并抽取正文，需要额外的解析库，留到下一版。
            </span>
            <textarea v-model="form.text" rows="7" placeholder="把材料内容粘贴到这里"></textarea>
          </label>

          <div class="compose__actions">
            <button type="button" class="btn" @click="adding = false">取消</button>
            <button type="button" class="btn btn--primary" :disabled="!canAdd" @click="add">
              <AppIcon name="check" :size="14" />
              交进来
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- ------------------------------------------------------ 整理结果区 -->
    <section class="zone">
      <header class="head">
        <div class="head__main">
          <h2>系统读出了什么</h2>
          <p class="head__note">
            每一条都能点开看它来自哪份材料的哪一段。确认 = 同意这个说法；改一下 = 换成你们自己的说法；
            删掉 = 系统读错了。
          </p>
        </div>
        <div class="head__tools">
          <span v-if="project.pendingItems.length" class="pending">
            还有 <strong>{{ project.pendingItems.length }}</strong> 条没确认
          </span>
          <button
            v-if="project.pendingItems.length > 1"
            type="button"
            class="btn"
            @click="project.confirmAll()"
          >
            全部确认
          </button>
        </div>
      </header>

      <template v-if="project.understanding.length">
        <div class="boards__grid">
          <UnderstandingBlock
            v-for="key in understandingOrder"
            :key="key"
            :block-key="key"
            :items="project.byKey(key)"
            mode="edit"
          />
        </div>

        <div class="gate" :class="{ 'gate--open': allConfirmed }">
          <template v-if="allConfirmed">
            <AppIcon name="check" :size="16" />
            <p>
              四块状态都经过你们确认了。系统现在可以基于这份理解判断下一步该做什么。
            </p>
            <RouterLink to="/" class="gate__go">
              去看接下来最重要的几步
              <AppIcon name="arrow-right" :size="14" />
            </RouterLink>
          </template>
          <template v-else>
            <AppIcon name="alert" :size="16" />
            <p>
              还有 {{ project.pendingItems.length }} 条内容只是系统的推断。全部确认之前，
              系统不会基于这份理解判断下一步——它不想把猜的东西当成你们的项目事实。
            </p>
          </template>
        </div>
      </template>

      <EmptyState
        v-else
        icon="layers"
        title="还没有整理出内容"
        description="先交一份材料，再点「整理成项目理解」。整理用的材料越实在，读出来的东西就越有用。"
      />
    </section>

    <p class="note">
      这一版的整理由规则抽取完成（按关键词把材料里的句子归到四块），因此读漏是正常的——
      发现少了什么，直接点「再交一份」补一份材料，或者把短缺的内容在对应板块里补上。
    </p>
  </div>
</template>

<style scoped>
.mat {
  display: grid;
  gap: 40px;
  max-width: 1120px;
}

.intro {
  padding-top: 8px;
}

.intro h1 {
  font-size: 1.95rem;
}

.intro__lead {
  margin-top: 12px;
  max-width: 78ch;
  font-size: 0.93rem;
  line-height: 1.9;
  color: var(--ink-soft);
}

/* ------------------------------------------------------------ 通用 */

.zone {
  display: grid;
  gap: 14px;
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.head__main {
  display: grid;
  gap: 5px;
}

.head h2 {
  font-size: 1.22rem;
}

.head__note {
  font-size: 0.79rem;
  line-height: 1.75;
  color: var(--ink-faint);
  max-width: 70ch;
}

.head__tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.pending {
  font-size: 0.78rem;
  color: var(--warn);
}

.organized {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--ok);
}

/* ------------------------------------------------------------ 材料 */

.mats {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--hairline);
}

.mat-item {
  display: grid;
  gap: 5px;
  padding: 16px 18px;
  background: var(--surface);
}

.mat-item__top {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.mat-item__type {
  flex: none;
  padding: 1px 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  font-size: 0.7rem;
  color: var(--ink-faint);
}

.mat-item__name {
  font-family: var(--font-display);
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--ink);
}

.mat-item__done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--ok);
}

.mat-item__todo {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--warn);
}

.mat-item__meta {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.mat-item__excerpt {
  font-size: 0.82rem;
  line-height: 1.75;
  color: var(--ink-mute);
}

/* ------------------------------------------------------------ 添加 */

.compose {
  display: grid;
  gap: 16px;
  padding: 20px 22px;
  background: var(--surface-2);
}

.field {
  display: grid;
  gap: 6px;
}

.field__label {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ink);
}

.field__hint {
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--ink-faint);
}

.field input,
.field textarea {
  width: 100%;
  margin-top: 2px;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.88rem;
  line-height: 1.75;
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--accent-line);
}

.segmented {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  justify-self: start;
}

.segmented__item {
  padding: 6px 14px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  color: var(--ink-mute);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-out);
}

.segmented__item:hover {
  color: var(--ink);
}

.segmented__item.is-active {
  background: var(--surface);
  color: var(--cyan);
  box-shadow: var(--shadow-1);
}

.compose__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* ------------------------------------------------------------ 结果区 */

.boards__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 12px;
}

.gate {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--warn-line);
  border-radius: var(--r-md);
  background: var(--warn-tint);
  color: var(--warn);
  font-size: 0.84rem;
  line-height: 1.7;
}

.gate--open {
  border-color: var(--ok-line);
  background: var(--ok-tint);
  color: var(--ok);
}

.gate__go {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  flex: none;
  padding: 6px 13px;
  border: 1px solid var(--ok-line);
  border-radius: var(--r-sm);
  color: var(--ok);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
}

.note {
  font-size: 0.78rem;
  line-height: 1.85;
  color: var(--ink-faint);
  max-width: 84ch;
}

/* ------------------------------------------------------------ 按钮 */

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 15px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink-mute);
  font-size: 0.82rem;
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
  border-color: var(--accent-line);
  background: var(--accent-tint);
  color: var(--cyan);
  font-weight: 500;
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-tint-2);
  color: var(--cyan);
}

@media (max-width: 980px) {
  .boards__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .head {
    flex-direction: column;
    align-items: stretch;
  }

  .gate {
    flex-wrap: wrap;
  }

  .gate__go {
    margin-left: 0;
  }
}
</style>
