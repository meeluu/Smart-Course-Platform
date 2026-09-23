<script setup lang="ts">
import { computed } from 'vue'
import { useWorkbenchStore } from '@/stores/workbench'

/**
 * 论文推荐卡
 * ----------------------------------------------------------------------------
 * 两种推荐方式并列，学生自己选：
 *   ① 直接打开 —— 有可靠链接就用它；没有就用「按标题检索」的链接，点开同样能看到论文
 *   ② 复制提示词 —— 粘到 GPT 里自己检索，拿到最新结果
 */
const props = withDefaults(
  defineProps<{
    title: string
    meta: string
    why?: string
    prompt: string
    /** 指向具体论文的可靠地址；缺省则走按标题检索 */
    link?: string
    /** AI 现场生成的那张卡左侧有紫色竖线 */
    accent?: boolean
  }>(),
  { accent: false },
)

const store = useWorkbenchStore()

/** 没有具体链接时，退化为按标题检索（百度学术，国内可直接访问） */
const href = computed(
  () => props.link || `https://xueshu.baidu.com/s?wd=${encodeURIComponent(props.title)}`,
)

const openLabel = computed(() => (props.link ? '打开论文链接' : '按标题检索'))
const openHint = computed(() =>
  props.link ? '已定位到具体论文，点开即读原文' : '暂无具体链接，点开搜索同样能看到相关论文',
)

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

    <div class="paper-meta">
      {{ meta }}
      <span v-if="link" class="tag" style="background:#E1F5EE;color:#0F6E56;border:1px solid #9FE1CB;margin-left:6px;">
        ① 可直接打开
      </span>
      <span v-else class="tag" style="background:#E6F1FB;color:#185FA5;border:1px solid #B5D4F4;margin-left:6px;">
        ① 按标题检索
      </span>
      <span class="tag" style="background:#EEEDFE;color:#3C3489;border:1px solid #CECBF6;margin-left:4px;">
        ② 复制提示词
      </span>
    </div>

    <div class="paper-why">
      <b>{{ accent ? 'AI 说明：' : '为什么现在查：' }}</b>
      {{ why || '已把你描述的方向和项目当前状态组合成检索提示词，复制到 GPT 检索即可得到针对性的文献列表。' }}
    </div>

    <div class="paper-actions">
      <a class="btn primary" :href="href" target="_blank" rel="noopener noreferrer" :title="openHint">
        {{ openLabel }}
      </a>
      <button class="btn" @click="copy">复制检索提示词</button>
    </div>

    <div style="font-size:11.5px;color:#888780;margin-top:8px;line-height:1.5;">
      {{ openHint }}
    </div>
  </div>
</template>
