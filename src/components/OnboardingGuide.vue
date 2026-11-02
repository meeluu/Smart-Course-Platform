<script setup lang="ts">
/**
 * 首次进入引导（V5-A）
 * ----------------------------------------------------------------------------
 * 规则来自 V5 计划：≤3 步、可跳过、记住跳过状态。
 *
 * 三条边界：
 *   1. 只讲「第一次用必须先做什么」，不介绍全部功能（介绍不完，也没人看）；
 *   2. 跳过与「知道了」等价：都写入 localStorage，下次不再出现；
 *   3. 不挡住页面：它是内容区顶部的一张卡，不是遮罩弹窗，下面的工作台照常可点。
 */
import { onMounted, ref } from 'vue'

/** 跳过状态只存一个布尔值，不做版本迁移：引导改版时换 key 即可重新出现一次 */
const STORAGE_KEY = 'scp.onboarding.v5.dismissed'

const STEPS = [
  {
    title: '先有一个项目',
    text: '在「工作台」里创建项目，填一句目标就够了；成员、周期这些以后随时能补。',
  },
  {
    title: '把项目拆成阶段和任务',
    text: '每个阶段写清完成标准，再拆出一件几次工作能做完的任务。没思路时可以让 AI 给候选，由你逐条确认。',
  },
  {
    title: '每做完一步，记一条',
    text: '写下做了什么、发现了什么。下次打开项目，AI 会按这些记录和已确认的材料要点给出下一步建议。',
  },
] as const

const visible = ref(false)

function alreadyDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // 隐私模式下 localStorage 可能不可读：按「没跳过」处理，关闭只在本次生效
    return false
  }
}

function dismiss(): void {
  visible.value = false
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 存不下就不存：本次已经关掉，不因为存储失败把卡片弹回来
  }
}

onMounted(() => {
  visible.value = !alreadyDismissed()
})
</script>

<template>
  <section v-if="visible" class="card onboarding" aria-labelledby="onboarding-title">
    <div class="card-h">
      <span id="onboarding-title">三步开始</span>
      <span class="tag onboarding-tag">第一次用看这里</span>
      <button class="btn quiet onboarding-skip" type="button" @click="dismiss">跳过引导</button>
    </div>
    <div class="card-b">
      <ol class="onboarding-steps">
        <li v-for="(step, index) in STEPS" :key="step.title">
          <span class="onboarding-no" aria-hidden="true">{{ index + 1 }}</span>
          <div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </div>
        </li>
      </ol>
      <div class="onboarding-actions">
        <button class="btn primary" type="button" @click="dismiss">知道了，开始</button>
        <span class="onboarding-note">这三次提示只在第一次出现，之后可以在 AI 顾问里随时问。</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.onboarding { margin-bottom: 16px; }
.onboarding-tag { background: #EEEDFE; color: #3C3489; border: 1px solid #CECBF6; }
.onboarding-skip { margin-left: auto; }
.onboarding-steps { display: grid; gap: 12px; list-style: none; }
.onboarding-steps li { display: flex; gap: 10px; align-items: flex-start; }
.onboarding-no {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #EEEDFE;
  border: 1px solid #CECBF6;
  color: #3C3489;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.onboarding-steps h3 { font-size: 13.5px; font-weight: 600; line-height: 1.5; }
.onboarding-steps p { font-size: 12.5px; color: #5f5e5a; line-height: 1.7; margin-top: 2px; }
.onboarding-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
.onboarding-note { font-size: 11.5px; color: #888780; line-height: 1.6; }
@media (max-width: 520px) {
  .onboarding-actions { align-items: stretch; flex-direction: column; }
  .onboarding-actions .btn { width: 100%; }
}
</style>
