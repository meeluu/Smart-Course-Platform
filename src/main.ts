import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElConfigProvider, ElOption, ElSelect, ElTabPane, ElTabs } from 'element-plus'

// 第三方样式（顺序在应用样式之前，便于覆盖）
// 字体统一走系统栈（-apple-system / SF Pro / 苹方），不再加载外部字体
import 'element-plus/dist/index.css'
import 'katex/dist/katex.min.css'

import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/element.css'

import App from './App.vue'
import { router } from './router'

/**
 * 按需注册 Element Plus 组件
 * ----------------------------------------------------------------------------
 * 平台目前只用到 Tabs / TabPane / Select / Option 四个组件，逐组件注册
 * （每个组件都是带 install 的插件）可以避免把整个组件库打进首屏。
 * 后续新增组件时在这里补一行即可；语言包经 ElConfigProvider 全局注入。
 */
const app = createApp(App)

app.use(createPinia()).use(router)
app.use(ElConfigProvider).use(ElTabs).use(ElTabPane).use(ElSelect).use(ElOption)

app.mount('#app')
