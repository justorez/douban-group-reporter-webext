<script setup lang="ts">
import SDK, { Comment, Reason } from './sdk'
import { getHeaderCookie } from '@/utils';

let sdk: SDK
let comments: Comment[] = [] // 当前页全部评论
let reasonMap: Record<string, Reason> = {}
let currentUrl = ''
const url = ref('')
const initBtnLoading = ref(false)
const list = ref<Comment[]>([]) // 当前展示的评论
const reasons = ref<Reason[]>([])
const myReasonId = ref('')
const totalPage = ref(0)
const currentPage = ref(1)
const keyword = ref('')

onMounted(async () => {
    url.value = (await chrome.storage.local.get('tabUrl')).tabUrl || ''
    chrome.storage.local.remove('tabUrl')
    if (url.value) {
        init()
    }
})

async function init() {
    if (!url.value) return alert('请输入帖子地址')

    // 暂存 url，被清空依然保证可以翻页
    const urlObj = new URL(url.value)
    currentUrl = urlObj.origin + urlObj.pathname

    // reset
    comments = []
    list.value = []
    totalPage.value = 0
    keyword.value = ''
    reasons.value = []
    reasonMap = {}
    myReasonId.value = ''

    initBtnLoading.value = true
    const cookies = await getHeaderCookie()
    sdk = new SDK(url.value, cookies)
    const data = await sdk.init()
    initBtnLoading.value = false
    
    comments = data.comments
    list.value = data.comments
    totalPage.value = data.totalPage
    reasons.value = data.reasons
    data.reasons.forEach(x => {
        if (!x.subs) reasonMap[x.id] = {...x}
        else x.subs.forEach(s => reasonMap[s.id] = {...s})
    })
}

async function goPage(page: number) {
    if (page === currentPage.value) return
    currentPage.value = page
    const start = (page - 1) * 100
    const newUrl = start > 0 ? `${currentUrl}?start=${start}` : currentUrl
    console.log(`跳转到第${page}页：`, newUrl)

    comments = []
    list.value = []
    keyword.value = ''
    
    comments = await sdk.fetchComments(newUrl)
    list.value = comments
}

watch(keyword, (val) => {
    let keys = val.trim().split(/\s+/)
    list.value = []
    list.value = keys.length
        ? comments.filter(({ username, content }) => {
            return keys.includes(username) ||
                keys.some(k => content.includes(k))
        })
        : comments
})

const progress = reactive({
    total: 0,
    done: 0
})
const progressPercent = computed(() => {
    return Number(progress.done / progress.total * 100).toFixed(1) + '%'
})
const reportButtonText = computed(() => {
    if (progress.total > 0) return ''
    return keyword.value ? '举报搜索到的评论' : '举报全部评论'
})
async function submit() {
    if (!myReasonId.value) return alert('请选择举报原因')
    if (progress.total > 0) return

    progress.total = list.value.length
    const reason = reasonMap[myReasonId.value]
    for (const cmt of list.value) {
        try {
            await sdk.reportOne(cmt.id, reason)
        } catch (err) {
            alert('Cookie 貌似过期了，请重新登录豆瓣并刷新插件页面')
            progress.total = 0
            progress.done = 0
            return
        }
        
        progress.done++
        console.log(`[已举报] [${reason.name}]`, cmt.username, cmt.profile, cmt.content)
        await new Promise((r) => setTimeout(r, 800))
    }

    progress.total = 0
    progress.done = 0
    setTimeout(() => alert('举报完毕'), 800)
}
</script>

<template id="tpl">
    <!-- 帖子地址输入栏 -->
    <div class="mb-5 flex w-1/2">
        <input
            v-model="url"
            class="input-box"
            type="text"
            placeholder="请输入帖子地址"
        />
        <button
            class="btn btn-success text-white ml-2"
            :disabled="initBtnLoading"
            @click="init"
        >
            <span v-show="initBtnLoading" class="loading loading-spinner"></span>
            解析
        </button>
    </div>

    <!-- 搜索和工具栏 -->
    <Transition name="fade-down">
        <div 
            v-if="totalPage"
            class="mb-5 flex w-1/2" 
        >
            <input
                v-model="keyword"
                class="input-box"
                type="search"
                placeholder="搜索用户和评论，多个关键字空格隔开"
                title="多个关键字空格隔开，用户名全文匹配，评论模糊匹配"
            />
            <select v-model="myReasonId" class="w-1/3 ml-2 opacity-100 rounded-md border-0 p-2 text-gray-600 outline-none ring-1 ring-inset ring-gray-300 focus:ring-green-500">
                <option class="text-gray-400" value="" disabled selected>请选择举报原因</option>
                <template v-for="reason in reasons">
                    <optgroup v-if="reason.subs" :key="reason.name" :label="reason.name">
                        <option 
                            v-for="item in reason.subs"
                            :key="item.id"
                            :value="item.id"
                        >{{ item.name }}</option>
                    </optgroup>
                    <option 
                        v-else
                        :key="reason.id"
                        :value="reason.id"
                    >{{ reason.name }}</option>
                </template>
            </select>
            <button 
                :id="progress.total ? 'reporting' : ''"
                class="btn btn-success text-white w-1/4 ml-2"
                @click="submit"
            >
                {{ reportButtonText }}

                <!-- 举报进度条 -->
                <template v-if="progress.total">
                    <span :style="{ width: progressPercent }"></span>
                    <span>{{ `举报中：${progress.done}/${progress.total}` }}</span>
                </template>
            </button>
        </div>
    </Transition>

    <!-- 分页 -->
    <div class="w-1/2 mb-1">
        <button
            v-for="i in totalPage"
            :key="i"
            :title="`第${i}页`"
            class="btn btn-sm btn-square mr-3 mb-3 text-gray-500"
            :class="{'btn-success text-white': currentPage === i}"
            @click="goPage(i)"
        >
            {{ i }}
        </button>
    </div>

    <!-- 评论列表 -->
    <div 
        v-if="totalPage"
        class="w-1/2 flex border-b border-black font-black pb-1"
    >
        <span class="w-1/4">用户名</span>
        <span class="flex-1">评论内容</span>
    </div>
    <div class="w-1/2 pt-2 pb-5 flex-1 overflow-y-auto">
        <div 
            v-for="cmt in list" 
            :key="cmt.id"
            class="mb-1 flex"
        >
            <a 
                class="text-green-600 hover:underline w-1/4 flex-shrink-0"
                :href="cmt.profile" 
                target="_blank"
            >
                {{ cmt.username }}
            </a>
            <span class="flex-1 text-gray-700">
                <a 
                    v-if="cmt.img" 
                    :href="cmt.img" 
                    target="_blank"
                    class="text-blue-500 hover:underline mr-1"
                >
                    [ 点击查看评论图片 ]
                </a>
                <span class="break-words">{{ cmt.content }}</span>
            </span>
        </div>
    </div>
</template>

<style scoped>
    .input-box {
        @apply input input-bordered focus:outline-none flex-1 focus:border-green-500;
    }

    .fade-down-enter-active,
    .fade-down-leave-active {
        transition: all 0.3s ease-out;
    }
    .fade-down-enter-from,
    .fade-down-leave-to {
        transform: translateY(-20px);
        opacity: 0;
    }
    
    #reporting {
        position: relative;
        border-color: #dcdde1;
        background-color: #dcdde1;
        overflow: hidden;
    }
    #reporting span:nth-child(1) {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 1;
        background-color: #1cad70;
        transition: all .5s;
    }
    #reporting span:nth-child(2) {
        position: relative;
        z-index: 5;
        transition: all .5s;
    }
</style>