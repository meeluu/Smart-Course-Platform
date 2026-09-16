<script setup lang="ts">
import { RouterView } from 'vue-router'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import TopBar from '@/components/TopBar.vue'
import SearchPalette from '@/components/SearchPalette.vue'
import ViewerPanel from '@/components/ViewerPanel.vue'
import { courseStats } from '@/data/course'
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
          <p class="foot__name">《大数据分析实践》智慧课程平台</p>
          <p class="foot__meta">
            山东大学 · 计算机科学与技术学院　|　国家级一流本科课程　|　课程知识库
            {{ courseStats.docCount }} 份文档 / {{ courseStats.resourceCount }} 个资源锚点
          </p>
        </div>
        <p class="foot__note">
          当前为阶段一静态骨架：课程材料已按证据块入库，问答与能力画像为本地演示逻辑，
          尚未接入检索与模型服务。
        </p>
      </div>
    </footer>

    <ViewerPanel />
    <SearchPalette />
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
  max-width: 52ch;
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
