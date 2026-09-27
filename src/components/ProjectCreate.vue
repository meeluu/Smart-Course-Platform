<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWorkbenchStore } from '@/stores/workbench'

/**
 * 创建项目
 * ----------------------------------------------------------------------------
 * 从课程题目里选一个（或自定义），填小组人数，可选上传实验手册与数据集说明，
 * 然后由 AI 生成启动步骤。字段与 mockup 的创建页一致。
 */
const store = useWorkbenchStore()

const topic = ref('')
const customName = ref('')
/** 契约 3.2：members 是数字，不再是「3 人」这类展示字符串 */
const members = ref(3)
const manual = ref<string | null>(null)
const data = ref<string | null>(null)

/** 创建失败码 → 人话。页面只看 result.ok / result.code */
const CREATE_ERROR_TEXT: Record<string, string> = {
  INVALID_INPUT: '请先选择项目题目或填写自定义名称',
  NOT_FOUND: '没有找到这个题目，请重新选择',
  STORAGE_FULL: '本地存储空间不足，项目没有保存',
}

const manualInput = ref<HTMLInputElement | null>(null)
const dataInput = ref<HTMLInputElement | null>(null)

const isCustom = computed(() => topic.value === '__custom__')

function pick(event: Event, kind: 'manual' | 'data') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (kind === 'manual') manual.value = file.name
  else data.value = file.name
}

/** 契约 3.2：createProject 用 topicId / members:number / manualName / dataName */
function submit() {
  const result = store.createProject({
    topicId: topic.value,
    customName: customName.value,
    members: members.value,
    manualName: manual.value,
    dataName: data.value,
  })

  if (!result.ok) {
    store.toast(CREATE_ERROR_TEXT[result.code] ?? '项目创建失败，请检查填写内容')
    return
  }

  // 用返回的 projectId / projectRevision 落到当前项目（store 已选中，这里只做兜底对齐）
  if (store.current?.projectId !== result.data.projectId) {
    store.selectProject(result.data.projectId)
  }
}
</script>

<template>
  <div class="create-wrap">
    <div class="create-hero">
      <h2>创建你的项目</h2>
      <p>选择题目、上传实验手册和数据集，AI 会解析内容并开始追踪你们的完成步骤</p>
    </div>

    <div class="card">
      <div class="card-b cform">
        <label>项目题目</label>
        <select v-model="topic">
          <option value="" disabled>从课程题目中选择，或选「自定义」</option>
          <option v-for="item in store.topics" :key="item" :value="item">{{ item }}</option>
          <option value="__custom__">自定义项目…</option>
        </select>

        <div v-if="isCustom">
          <label>自定义项目名称</label>
          <input v-model="customName" type="text" placeholder="输入你的项目名称" />
        </div>

        <label>小组人数</label>
        <select v-model.number="members">
          <option :value="3">3 人</option>
          <option :value="2">2 人</option>
          <option :value="4">4 人</option>
          <option :value="5">5 人</option>
        </select>

        <label>上传项目材料 <small>（AI 会解析这些内容，用于生成和追踪步骤）</small></label>
        <div class="up-grid">
          <div class="upbox" :class="{ has: manual }" @click="manualInput?.click()">
            <template v-if="manual">✓ 实验手册：{{ manual }}</template>
            <template v-else>📄 上传实验手册<br /><span style="font-size:11px;">docx / pdf / md</span></template>
          </div>
          <div class="upbox" :class="{ has: data }" @click="dataInput?.click()">
            <template v-if="data">✓ 数据集：{{ data }}</template>
            <template v-else>🗂 上传数据集说明<br /><span style="font-size:11px;">csv / zip / 说明文档</span></template>
          </div>
        </div>
        <input ref="manualInput" type="file" style="display:none" @change="pick($event, 'manual')" />
        <input ref="dataInput" type="file" style="display:none" @change="pick($event, 'data')" />

        <div class="ai-note">
          AI 提示：实验手册里的任务要求会被解析为里程碑和完成标志；数据集信息会用于追踪「数据获取与预处理」阶段的进度。也可以先创建，之后在工作台随时补传。
        </div>

        <button class="create-btn" @click="submit">创建项目，让 AI 开始追踪</button>
      </div>
    </div>
  </div>
</template>
