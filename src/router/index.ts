import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 两个页签，与 mockup 的导航一致：
 *   /        工作台（创建项目 + 三栏工作台）
 *   /papers  论文推荐（检索提示词）
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'workbench', component: () => import('@/views/WorkbenchView.vue') },
    { path: '/papers', name: 'papers', component: () => import('@/views/PapersView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
