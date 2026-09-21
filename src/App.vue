<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import TopBar from '@/components/TopBar.vue'
import ViewerPanel from '@/components/ViewerPanel.vue'
import { useProjectStore } from '@/stores/project'
import { useViewerStore } from '@/stores/viewer'

const project = useProjectStore()
const viewer = useViewerStore()
const route = useRoute()

// 切换页面时收起原文面板，避免遮挡新页面的第一屏
watch(
  () => route.fullPath,
  () => viewer.close(),
)
</script>

<template>
  <el-config-provider :locale="zhCn">
    <a class="skip-link" href="#main">跳到主要内容</a>

    <TopBar />

    <main id="main" class="shell">
      <RouterView v-slot="{ Component }">
        <Transition name="route" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="foot">
      <div class="foot__inner">
        <div class="foot__brand">
          <p class="foot__name">{{ project.meta.name }}</p>
          <p class="foot__meta">
            {{ project.meta.team }} · 项目当前状态　|　{{ project.meta.phase }}　|　更新于
            {{ project.meta.updatedAt }}
          </p>
        </div>
        <p class="foot__note">
          系统不替学生定答案，也不替老师确认需求。它只做三件事：把材料读成理解、把理解变成下一步、
          把下一步变成证据——每一步都必须由学生确认。当前为结构演示数据，材料整理由规则抽取完成，
          尚未接入真实模型服务。
        </p>
      </div>
    </footer>

    <ViewerPanel />
  </el-config-provider>
</template>

<style scoped>
.shell {
  max-width: var(--shell-max);
  margin: 0 auto;
  padding: 28px 24px 72px;
  min-height: calc(100vh - var(--topbar-h) - 220px);
}

.foot {
  border-top: 1px solid var(--hairline);
}

.foot__inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  max-width: var(--shell-max);
  margin: 0 auto;
  padding: 26px 24px 34px;
}

.foot__name {
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.foot__meta {
  margin-top: 5px;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.foot__note {
  max-width: 56ch;
  font-size: 0.76rem;
  line-height: 1.75;
  color: var(--ink-faint);
}

@media (max-width: 900px) {
  .shell {
    padding: 20px 16px 56px;
  }

  .foot__inner {
    flex-direction: column;
    gap: 14px;
    padding: 22px 16px 28px;
  }
}
</style>
