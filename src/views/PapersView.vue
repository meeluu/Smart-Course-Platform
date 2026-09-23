<script setup lang="ts">
import { computed, ref } from 'vue'
import PaperDirectionCard from '@/components/PaperDirectionCard.vue'
import { useWorkbenchStore } from '@/stores/workbench'

/**
 * 论文推荐
 * ----------------------------------------------------------------------------
 * 项目初期，AI 不给现成链接，而是给「检索提示词」——
 * 复制到 GPT 里自己检索，既拿到最新结果，也练了检索能力。
 */
const store = useWorkbenchStore()
const ask = ref('')

const project = computed(() => store.current)

const banner = computed(() => {
  if (!project.value) {
    return '<b>还没有项目。</b>请先到「工作台」创建项目，AI 会为你的项目生成独立的论文检索推荐。'
  }
  return (
    '<b>项目初期，AI 不给现成链接，而是给你「检索提示词」：</b>' +
    '复制提示词到 GPT 里自己检索文献——既拿到最新结果，也练了检索能力。' +
    `以下是 AI 为「${project.value.short}」项目启动阶段推荐的检索方向（每个项目独立推荐）。`
  )
})

function submit() {
  store.askPaperAi(ask.value)
  ask.value = ''
}
</script>

<template>
  <div class="mode-banner" v-html="banner"></div>

  <div v-if="project">
    <div class="card" style="margin-bottom:16px;">
      <div class="card-h">
        让 AI 为你推荐
        <span class="tag" style="background:#EEEDFE;color:#3C3489;border:1px solid #CECBF6;">
          接入 AI · 结合当前项目状态
        </span>
      </div>
      <div class="card-b">
        <div style="font-size:12.5px;color:#888780;margin-bottom:10px;line-height:1.6;">
          描述你想了解的方向或遇到的问题，AI 会结合「{{ project.short }}」项目的当前进度，生成专属的检索提示词。
        </div>
        <div class="chat-input" style="margin-top:0;">
          <input
            v-model="ask"
            :placeholder="`如：想了解「${project.short}」中某个方法或数据处理问题…`"
            @keydown.enter="submit"
          />
          <button class="btn primary" @click="submit">生成推荐</button>
        </div>
      </div>
    </div>

    <PaperDirectionCard
      v-for="(item, index) in project.aiPapers"
      :key="`ai-${index}`"
      :title="item.title"
      :meta="item.meta"
      :prompt="item.prompt"
      accent
    />

    <PaperDirectionCard
      v-for="(item, index) in project.papers"
      :key="`p-${index}`"
      :title="item.title"
      :meta="item.meta"
      :why="item.why"
      :prompt="item.prompt"
    />
  </div>
</template>
