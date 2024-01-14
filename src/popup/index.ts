import { createApp } from 'vue'
import App from './app.vue'
import { hasCookie } from '@/utils'
import '../assets/base.scss'
import './index.scss'


createApp(App).mount('#app')

;(async function () {
  if (await hasCookie()) {
    const [ tab ] = await chrome.tabs.query({ active: true })
    if (tab && tab.url?.includes('douban.com/group/topic/')) {
      chrome.storage.local.set({ tabUrl: tab.url })
    }
    chrome.tabs.create({
      active: true,
      url: chrome.runtime.getURL('src/main/index.html')
    })
  }
})()

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`
  )
}
