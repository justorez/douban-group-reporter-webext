import axios, { AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'

export interface Reason {
    index?: number
    id: number | string
    name: string
    type: number | string
    desc: string
    category?: string
    subs?: Reason[]
}

export interface Comment {
    id: string
    authorId: string
    username: string
    profile: string
    img: string
    content: string
    hidden: boolean
}

export default class SDK {
    url: string
    topicId: string
    groupId: string
    /**
     * Cookie flag for api-report
     */
    ck: string
    service: AxiosInstance
    keywords: string[]
    comments: Comment[]
    reasons: Reason[]
    totalPage: number

    constructor(url: string, cookie: string) {
        this.url = url
        this.topicId = this.basename(url)
        this.groupId = ''
        this.ck = this.parseCookie(cookie)['ck']
        this.service = axios.create({
            baseURL: 'https://www.douban.com',
            // headers: {} // 无需修改，自动携带 cookie
            withCredentials: true,
            timeout: 8000,
            responseType: 'text'
        })
        this.service.interceptors.response.use(null, () => {
            // const data = error.response.data
            // console.error(data) // 豆瓣报错会响应一个网页
            return Promise.reject('请求失败')
        })
        this.comments = []
        this.totalPage = 1 // 评论总页数
        this.reasons = []
        this.keywords = []
    }

    basename(url: string | undefined) {
        if (!url) return ''
        return new URL(url).pathname.split('/').filter(x => x).pop() || ''
    }

    /**
     * 抓取帖子评论和规定的举报理由
     */
    async init() {
        await this.fetchComments()
        await this.fetchReasons()
        return {
            reasons: this.reasons,
            comments: this.comments,
            totalPage: this.totalPage
        }
    }

    setKeywords(s: string) {
        this.keywords = s?.trim().split(/\s+/)
    }

    clearKeywords() {
        this.keywords = []
    }

    parse(html: string) {
        const $ = cheerio.load(html)
        const groupUrl = $('.side-reg .title a').attr('href')
        this.groupId = this.basename(groupUrl)
        console.log(groupUrl, this.groupId)
        this.totalPage = Number($('.thispage').attr('data-total-page') || 1)
        return $('#comments .comment-item.reply-item')
            .map((_, el) => {
                const node = $(el)
                return {
                    id: node.attr('id') || '',
                    authorId: node.attr('data-author-id') || '',
                    username: node
                        .find('.reply-doc .bg-img-green a')
                        .text()
                        .trim() || '',
                    profile: node
                        .find('.reply-doc .bg-img-green a')
                        .attr('href') || '',
                    img: node
                        .find('.reply-doc .cmt-img img')
                        .attr('data-photo-url') || '',
                    content: node
                        .find('.reply-content')
                        .text()
                        .replace(/\s+/g, ''),
                    hidden: node.find('.reply-hidden').length > 0
                }
            })
            .toArray()
            .filter(x => !x.hidden)
    }

    parseCookie(str: string) {
        const cookies:Record<string, string> = {}
        str && str.split(';').forEach(item => {
            const cookiePair = item.split('=')
            const key = decodeURIComponent(cookiePair[0].trim())
            const value = cookiePair.length > 1 ? decodeURIComponent(cookiePair[1]) : ''
            cookies[key] = value
        })
        return cookies
    }

    async fetchComments(newUrl?: string) {
        if (newUrl) {
            this.url = newUrl
            this.topicId = this.basename(newUrl)
        }
        const { data: html } = await this.service.get(this.url)
        this.comments = this.parse(html)
        return this.comments
    }

    async fetchReasons() {
        const { data } = await this.service.get(
            `https://m.douban.com/rexxar/api/v2/group/${this.groupId}/report_reasons`,
            { responseType: 'json' }
        )
        // 保留层级
        this.reasons = data.douban_reasons.map((item: Reason) => {
            item.type = item.id
            return item
        })
    }

    async getComments() {
        if (!this.comments) await this.fetchComments()
        return this.comments.filter(({ username, content }) => {
            return (
                !(this.keywords && this.keywords.length) ||
                this.keywords.includes(username) ||
                this.keywords.some((k) => content.includes(k))
            )
        })
    }

    async reportOne(commentId: string, reason: Reason) {
        const params = {
            topic_id: this.topicId,
            comment_id: commentId,
            type: reason.type || reason.id,
            reason: reason.name,
            ck: this.ck
        }
        const res = await this.service.post(
            `/j/group/${this.groupId}/member_report`,
            params,
            { responseType: 'json' }
        )
        return res.data
    }
}