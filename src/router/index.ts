import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由即信息架构：一个顶部任务栏 + 三个核心视图 + 个人中心。
 * 采用 hash 模式，保证静态托管（校内服务器 / GitHub Pages）下深链接可直接打开。
 *
 * DR1 学习路径的当前状态放在 query 上（?lesson=L04&resource=L04-lab-exp4），
 * 因此「引用卡片 → 原文」与「画像建议 → 复习资源」都能生成可分享的链接。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'overview', component: () => import('@/views/OverviewView.vue') },
    { path: '/content', name: 'content', component: () => import('@/views/ContentView.vue') },
    { path: '/qa', name: 'qa', component: () => import('@/views/AskView.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 88 }
    return { top: 0 }
  },
})
