import { createApp } from 'vue'
import '../assets/base.scss'
import './index.scss'
import App from './app.vue'

createApp(App).mount('#app')

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`
  )
}