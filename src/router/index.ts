import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * v1 只有三个页面，路由即信息架构：
 *   /            项目现在是什么状态、接下来做什么
 *   /materials   材料交进来之后，系统读出了什么、学生确认了什么
 *   /step/:id    这一步该怎么做：对应哪个问题、推荐什么资料、留下什么证据
 *
 * 采用 hash 模式，保证静态托管下深链接可直接打开。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'state', component: () => import('@/views/StateView.vue') },
    { path: '/materials', name: 'materials', component: () => import('@/views/MaterialsView.vue') },
    { path: '/step/:id', name: 'step', component: () => import('@/views/StepView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 88 }
    return { top: 0 }
  },
})
