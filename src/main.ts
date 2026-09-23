import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 界面样式：与 platform-ui-mockup(3).html 的样式表同源
import '@/styles/platform.css'

import App from './App.vue'
import { router } from './router'

const app = createApp(App)

app.use(createPinia()).use(router)

app.mount('#app')
