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
const members = ref('3 人')
const manual = ref<string | null>(null)
const data = ref<string | null>(null)

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

function submit() {
  store.createProject({
    topic: topic.value,
    customName: customName.value,
    members: members.value,
    manual: manual.value,
    data: data.value,
  })
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
        <select v-model="members">
          <option>3 人</option>
          <option>2 人</option>
          <option>4 人</option>
          <option>5 人</option>
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
