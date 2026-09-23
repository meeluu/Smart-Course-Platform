<script setup lang="ts">
import { useWorkbenchStore } from '@/stores/workbench'

/**
 * 论文检索方向卡
 * ----------------------------------------------------------------------------
 * AI 不给现成链接，而是给「检索提示词」——复制到 GPT 里自己检索。
 * 三段结构照 mockup：标题 / 说明 / 为什么现在查 / 复制按钮。
 */
const props = withDefaults(
  defineProps<{
    title: string
    meta: string
    why?: string
    prompt: string
    /** AI 现场生成的那张卡左侧有紫色竖线 */
    accent?: boolean
  }>(),
  { accent: false },
)

const store = useWorkbenchStore()

function copy() {
  const done = () => store.toast('提示词已复制，粘贴到 GPT 即可检索')
  const fallback = () => {
    const area = document.createElement('textarea')
    area.value = props.prompt
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
      done()
    } catch {
      store.toast('复制失败，请手动选择文本')
    }
    document.body.removeChild(area)
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(props.prompt).then(done).catch(fallback)
  } else {
    fallback()
  }
}
</script>

<template>
  <div class="paper" :style="accent ? 'border-left:4px solid #534AB7;' : ''">
    <div class="paper-title">{{ title }}</div>
    <div class="paper-meta">{{ meta }}</div>
    <div class="paper-why">
      <b>{{ accent ? 'AI 说明：' : '为什么现在查：' }}</b>{{ why || '已把你描述的方向和项目当前状态组合成检索提示词，复制到 GPT 检索即可得到针对性的文献列表。' }}
    </div>
    <div class="paper-actions">
      <button class="btn primary" @click="copy">复制检索提示词</button>
    </div>
  </div>
</template>
