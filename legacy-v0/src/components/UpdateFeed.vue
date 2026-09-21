<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import ConfidenceTag from './ConfidenceTag.vue'
import { updateSourceLabel } from '@/data/project'
import { useProjectStore } from '@/stores/project'

/**
 * 状态更新确认流
 * ----------------------------------------------------------------------------
 * 系统从学生本来就会产生的材料里提取「新发现 / 当前任务 / 风险 / 下一步」，
 * 但提取结果只是待办：必须由学生确认或修改，才能进入项目状态。
 * 这一步的存在，是为了让系统永远不会把推断当成事实。
 */
defineProps<{ limit?: number }>()

const project = useProjectStore()
const editing = ref<string | null>(null)
const draft = ref('')

const STATUS_LABEL: Record<string, string> = {
  pending: '待你确认',
  confirmed: '已确认',
  edited: '已修改后确认',
  rejected: '已驳回',
}

function startEdit(id: string, current: string) {
  editing.value = id
  draft.value = current
}
</script>

<template>
  <ul class="feed">
    <li
      v-for="item in project.updates.slice(0, limit ?? project.updates.length)"
      :key="item.id"
      class="up"
      :class="{ 'is-pending': item.status === 'pending' }"
    >
      <header class="up__head">
        <span class="up__source mono">{{ updateSourceLabel[item.source] }}</span>
        <span class="up__raw">{{ item.raw }}</span>
        <span class="up__at mono">{{ item.at }}</span>
      </header>

      <div class="up__grid">
        <div class="cell">
          <span class="cell__label">新发现</span>
          <p>{{ item.extracted.discovery || '—' }}</p>
        </div>
        <div class="cell">
          <span class="cell__label">当前任务</span>
          <p>{{ item.extracted.task || '—' }}</p>
        </div>
        <div class="cell">
          <span class="cell__label">风险</span>
          <p>{{ item.extracted.risk || '—' }}</p>
        </div>
        <div class="cell">
          <span class="cell__label">下一步</span>
          <p>{{ item.extracted.next || '—' }}</p>
        </div>
      </div>

      <div v-if="item.revised" class="up__revised">
        <span class="cell__label">你修改后</span>
        <p>{{ item.revised }}</p>
      </div>

      <footer class="up__foot">
        <ConfidenceTag :confidence="item.confidence" origin="ai" />
        <span class="up__status" :class="`up__status--${item.status}`">{{ STATUS_LABEL[item.status] }}</span>

        <template v-if="item.status === 'pending'">
          <button type="button" class="btn" @click="project.confirmUpdate(item.id)">
            <AppIcon name="check" :size="13" />
            确认并写入
          </button>
          <button type="button" class="btn btn--ghost" @click="startEdit(item.id, item.extracted.discovery)">
            修改后再确认
          </button>
          <button type="button" class="btn btn--ghost" @click="project.rejectUpdate(item.id)">驳回</button>
        </template>
      </footer>

      <div v-if="editing === item.id" class="up__edit">
        <textarea v-model="draft" rows="2" placeholder="按你们自己的话说一遍，再写入项目状态。"></textarea>
        <div class="up__edit-actions">
          <button type="button" class="btn btn--ghost" @click="editing = null">取消</button>
          <button
            type="button"
            class="btn"
            :disabled="!draft.trim()"
            @click="project.confirmUpdate(item.id, draft.trim()); editing = null"
          >
            确认修改并写入
          </button>
        </div>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.feed {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}

.up {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.up.is-pending {
  border-color: var(--warn-line);
  background: var(--warn-tint);
}

.up__head {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 0.78rem;
}

.up__source {
  padding: 1px 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  color: var(--ink-faint);
  font-size: 0.7rem;
}

.up__raw {
  flex: 1;
  min-width: 0;
  color: var(--ink-mute);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.up__at {
  color: var(--ink-faint);
  font-size: 0.72rem;
}

.up__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 20px;
}

.cell {
  display: grid;
  gap: 2px;
}

.cell__label {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.cell p {
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--ink-soft);
}

.up__revised {
  padding: 10px 12px;
  border: 1px solid var(--accent-line-soft);
  border-radius: var(--r-sm);
  background: var(--accent-tint);
}

.up__revised p {
  margin-top: 3px;
  font-size: 0.86rem;
  line-height: 1.75;
  color: var(--ink);
}

.up__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  padding-top: 10px;
  border-top: 1px solid var(--hairline);
}

.up__status {
  flex: 1;
  font-size: 0.78rem;
}

.up__status--pending {
  color: var(--warn);
}
.up__status--confirmed,
.up__status--edited {
  color: var(--ok);
}
.up__status--rejected {
  color: var(--ink-faint);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-sm);
  background: var(--accent-tint);
  color: var(--cyan);
  font-size: 0.78rem;
  cursor: pointer;
}

.btn--ghost {
  border-color: var(--hairline);
  background: transparent;
  color: var(--ink-mute);
}

.btn--ghost:hover {
  color: var(--ink);
}

.btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.up__edit {
  display: grid;
  gap: 8px;
}

.up__edit textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.86rem;
  line-height: 1.7;
  resize: vertical;
}

.up__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 720px) {
  .up__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
