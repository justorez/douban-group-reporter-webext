import { createApp } from 'vue'
import App from './app.vue'
import '../assets/base.scss'
import './index.scss'

createApp(App).mount('#app')

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`
  )
}