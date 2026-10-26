import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 仅在开发环境下，访问根路径且无查询参数时默认进入 docs 模式
// 生产环境不跳转，避免泄露文档面板
if (import.meta.env.DEV) {
  const params = new URLSearchParams(window.location.search)
  if (params.toString() === '') {
    window.history.replaceState({}, '', '/?mode=docs')
  }
}

const app = createApp(App)
app.mount('#app')
