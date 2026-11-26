import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { applyDocument } from './i18n'

// 挂载前同步 <html lang> 与 <title>，避免首屏闪错语言
applyDocument()

createApp(App).use(createPinia()).mount('#app')
