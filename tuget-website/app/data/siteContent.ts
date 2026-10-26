import type { LocaleCode } from '~/config/i18n'
import type { FaqItem } from '~/components/FaqSection.vue'

export interface HomePlatformEntry {
  name: string
  desc: string
  keywords: string[]
  to: string
}

export interface ClientPlatformEntry {
  name: string
  desc: string
  to: string
}

export interface ClientCoreFeature {
  num: string
  title: string
  desc: string
}

export const HOME_PLATFORM_ENTRIES: Record<LocaleCode, HomePlatformEntry[]> = {
  'zh-CN': [
    {
      name: '1688 商品图片与视频下载',
      desc: '滑块验证码前台人工解锁协同，主图 / 颜色SKU图 / 详情长图 / 主图视频分类批量导出。',
      keywords: ['1688图片批量下载', '详情长图提取', '滑块验证'],
      to: '/platforms/1688/',
    },
    {
      name: '淘宝天猫素材提取',
      desc: '适配动态加载与风控验证，高分辨率原图直接提取，颜色规格图自动归整。',
      keywords: ['淘宝图片批量下载', 'SKU图一键下载', '主图视频'],
      to: '/platforms/taobao/',
    },
    {
      name: '京东商品原图还原',
      desc: 'n0 原图算法还原，SKU 规格图分类导出，详情长图与主图视频一并保存。',
      keywords: ['京东原图下载', 'SKU图提取', '详情长图保存'],
      to: '/platforms/jd/',
    },
    {
      name: '唯品会详情图抓取',
      desc: '特卖详情长图完整抓取，沙箱环境内完整渲染，前台验证协同不中断。',
      keywords: ['唯品会图片下载', '详情图抓取', '图片批量保存'],
      to: '/platforms/vip/',
    },
    {
      name: '拼多多素材批量归档',
      desc: '瀑布流穿透加载，轮播图 / SKU图 / 详情长图智能解析一键归档。',
      keywords: ['拼多多轮播图提取', '详情长图下载', '素材归档'],
      to: '/platforms/pdd/',
    },
    {
      name: '网页视频与音频嗅探',
      desc: '底层网络监听通道，MP4 高清视频、网页背景音频与 m3u8 切片流媒体离线保存。',
      keywords: ['网页视频嗅探', 'm3u8下载电脑版', '流媒体提取'],
      to: '/scenarios/media-sniffer/',
    },
    {
      name: '电商美工归档工作流',
      desc: '对比逐张右键另存为与任务队列批量下载的效率差异，搭建本地自动化素材库。',
      keywords: ['电商美工批量下载', '网店图片批量保存', '素材归档'],
      to: '/solutions/ecommerce-designer/',
    },
  ],
  'zh-TW': [
    {
      name: '1688 商品圖片與影片下載',
      desc: '滑塊驗證碼前台人工解鎖協同，主圖 / 顏色SKU圖 / 詳情長圖 / 主圖影片分類批次匯出。',
      keywords: ['1688圖片批次下載', '詳情長圖提取', '滑塊驗證'],
      to: '/platforms/1688/',
    },
    {
      name: '淘寶天貓素材提取',
      desc: '適配動態載入與風控驗證，高解析度原圖直接提取，顏色規格圖自動歸整。',
      keywords: ['淘寶圖片批次下載', 'SKU圖一鍵下載', '主圖影片'],
      to: '/platforms/taobao/',
    },
    {
      name: '京東商品原圖還原',
      desc: 'n0 原圖演算法還原，SKU 規格圖分類匯出，詳情長圖與主圖影片一併儲存。',
      keywords: ['京東原圖下載', 'SKU圖提取', '詳情長圖儲存'],
      to: '/platforms/jd/',
    },
    {
      name: '唯品會詳情圖抓取',
      desc: '特賣詳情長圖完整抓取，沙箱環境內完整渲染，前台驗證協同不中斷。',
      keywords: ['唯品會圖片下載', '詳情圖抓取', '圖片批次儲存'],
      to: '/platforms/vip/',
    },
    {
      name: '拼多多素材批次歸檔',
      desc: '瀑布流穿透載入，輪播圖 / SKU圖 / 詳情長圖智慧解析一鍵歸檔。',
      keywords: ['拼多多輪播圖提取', '詳情長圖下載', '素材歸檔'],
      to: '/platforms/pdd/',
    },
    {
      name: '網頁影片與音訊嗅探',
      desc: '底層網路監聽通道，MP4 高畫質影片、網頁背景音訊與 m3u8 切片串流媒體離線儲存。',
      keywords: ['網頁影片嗅探', 'm3u8下載電腦版', '串流媒體提取'],
      to: '/scenarios/media-sniffer/',
    },
    {
      name: '電商美工歸檔工作流',
      desc: '對比逐張右鍵另存新檔與任務佇列批次下載的效率差異，搭建本機自動化素材庫。',
      keywords: ['電商美工批次下載', '網店圖片批次儲存', '素材歸檔'],
      to: '/solutions/ecommerce-designer/',
    },
  ],
  'en-US': [
    {
      name: '1688 Product Image & Video Downloader',
      desc: 'Pass slider captchas with foreground window collaboration and export main images, SKU variants, detail long images, and videos.',
      keywords: ['1688 Image Downloader', 'Detail Long Images', 'Slider Captcha Bypass'],
      to: '/platforms/1688/',
    },
    {
      name: 'Taobao & Tmall Asset Extractor',
      desc: 'Adapted for dynamic rendering and verification walls—extract uncompressed original images and organized SKU color galleries.',
      keywords: ['Taobao Image Downloader', 'SKU Variant Export', 'Product Video'],
      to: '/platforms/taobao/',
    },
    {
      name: 'JD.com Original Image Restorer',
      desc: 'Automatically restores n0 full-resolution originals, exports SKU variant images, and saves detail long images & videos.',
      keywords: ['JD Original Image', 'SKU Extractor', 'Long Image Saver'],
      to: '/platforms/jd/',
    },
    {
      name: 'Vipshop Detail Page Capture',
      desc: 'Full-page rendering inside an isolated Chromium sandbox to capture flash-sale detail long images without interruption.',
      keywords: ['Vipshop Downloader', 'Detail Page Capture', 'Bulk Image Save'],
      to: '/platforms/vip/',
    },
    {
      name: 'Pinduoduo Bulk Asset Archiver',
      desc: 'Penetrates waterfall lazy-loading to parse and archive carousel galleries, SKU images, and detail long images in one click.',
      keywords: ['Pinduoduo Carousel', 'Detail Long Image', 'Asset Archiver'],
      to: '/platforms/pdd/',
    },
    {
      name: 'Web Video & Audio Stream Sniffer',
      desc: 'Network-layer media listener that captures HD MP4 videos, background audio, and m3u8 HLS segmented streams for offline use.',
      keywords: ['Web Video Sniffer', 'm3u8 Downloader PC', 'HLS Stream Saver'],
      to: '/scenarios/media-sniffer/',
    },
    {
      name: 'E-Commerce Designer Workflow',
      desc: 'Replace repetitive right-click saving with automated task queues and structured local product asset folders.',
      keywords: ['E-Commerce Batch Save', 'Catalog Archiving', 'Designer Workflow'],
      to: '/solutions/ecommerce-designer/',
    },
  ],
}

export const HOME_FAQS: Record<LocaleCode, FaqItem[]> = {
  'zh-CN': [
    {
      question: 'TuGet（图个吉利）客户端与传统下载工具有什么区别？',
      answer: 'TuGet 专为高频深度采集设计，内置完整独立的 Chromium 浏览器渲染沙箱与网络监听机制。相比传统工具容易因页面动态加载或风控验证中断，TuGet 能直接提取高分辨率原图并实时捕获音视频及流媒体切片，且支持在遭遇滑块验证码或登录墙时前台协助解锁。',
    },
    {
      question: '免费体验的范围是什么？激活后解锁哪些功能？',
      answer: 'TuGet 客户端提供不限时免费体验，您可以无限制添加网址、解析页面以及预览提取到的图片与视频素材；当您需要执行批量下载保存到本地、复制高清图片或导出原始图片链接等核心操作时，需输入授权激活码完成激活。',
    },
    {
      question: '遇到 1688、唯品会等需要滑块验证码或登录的网页怎么办？',
      answer: 'TuGet 内置了独立 Chromium 运行实例。当目标网站弹出滑块验证码或需要验证身份时，系统支持将窗口切至前台供您人工完成一次性滑动解锁或扫码登录，完成后采集任务即刻无缝恢复，有效应对严格风控拦截。',
    },
    {
      question: 'TuGet（图个吉利）支持哪些媒体格式的嗅探与提取？',
      answer: '支持全网主流网页媒体资源：包括但不限于电商主图、SKU 规格图、详情长图等高清晰图片，以及常规 MP4 音视频、网页背景音频和由 m3u8 索引驱动的切片视频流，帮助您完整归档多媒体内容。',
    },
    {
      question: '采集下载的文件保存在哪里？数据是否安全？',
      answer: '非常安全。TuGet 坚持数据本地化原则，采集的素材文件及任务记录均保存在本地硬盘，绝不上传云端。网络交互公开透明：客户端会访问采集目标网站，并与官方服务进行授权验证和启动运行统计；官网提供订单购买服务与基础访问统计。详细信息交互范围见隐私保护政策。',
    },
    {
      question: '客户端支持哪些操作系统版本？如何安装？',
      answer: '支持 64 位的 Windows 10（1809 及以上版本）以及 Windows 11 操作系统。推荐直接从微软官方应用商店（Microsoft Store）一键安装，享受平台数字签名保障与便捷版本更新。',
    },
  ],
  'zh-TW': [
    {
      question: 'TuGet（圖個吉利）用戶端與傳統下載工具有什麼區別？',
      answer: 'TuGet 專為高頻深度採集設計，內建完整獨立的 Chromium 瀏覽器渲染沙箱與網路監聽機制。相比傳統工具容易因頁面動態載入或風控驗證中斷，TuGet 能直接提取高解析度原圖並即時捕獲音訊影片及串流媒體切片，且支援在遭遇滑塊驗證碼或登入牆時前台協助解鎖。',
    },
    {
      question: '免費體驗的範圍是什麼？啟用後解鎖哪些功能？',
      answer: 'TuGet 用戶端提供不限時免費體驗，您可以無限制新增網址、解析頁面以及預覽提取到的圖片與影片素材；當您需要執行批次下載儲存到本機、複製高畫質圖片或匯出原始圖片連結等核心操作時，需輸入授權啟用碼完成啟用。',
    },
    {
      question: '遇到 1688、唯品會等需要滑塊驗證碼或登入的網頁怎麼辦？',
      answer: 'TuGet 內建了獨立 Chromium 執行實例。當目標網站彈出滑塊驗證碼或需要驗證身分時，系統支援將視窗切至前台供您人工完成一次性滑動解鎖或掃碼登入，完成後採集任務即刻無縫恢復，有效應對嚴格風控攔截。',
    },
    {
      question: 'TuGet（圖個吉利）支援哪些媒體格式的嗅探與提取？',
      answer: '支援全網主流網頁媒體資源：包括但不限於電商主圖、SKU 規格圖、詳情長圖等高清晰圖片，以及常規 MP4 音訊影片、網頁背景音訊和由 m3u8 索引驅動的切片影片流，幫助您完整歸檔多媒體內容。',
    },
    {
      question: '採集下載的檔案儲存在哪裡？資料是否安全？',
      answer: '非常安全。TuGet 堅持資料本機化原則，採集的素材檔案及任務紀錄均儲存在本機硬碟，絕不上傳雲端。網路互動公開透明：用戶端會存取採集目標網站，並與官方服務進行授權驗證和啟動執行統計；官網提供訂單購買服務與基礎存取統計。詳細資訊互動範圍見隱私權保護政策。',
    },
    {
      question: '用戶端支援哪些作業系統版本？如何安裝？',
      answer: '支援 64 位元的 Windows 10（1809 及以上版本）以及 Windows 11 作業系統。推薦直接從微軟官方應用商店（Microsoft Store）一鍵安裝，享受平台數位簽章保障與便捷版本更新。',
    },
  ],
  'en-US': [
    {
      question: 'How does TuGet Desktop differ from traditional browser extensions or downloaders?',
      answer: 'TuGet is engineered for high-volume deep capture with a bundled, isolated Chromium rendering sandbox and network-layer sniffer. Unlike browser extensions that break on dynamic lazy-loading or anti-bot captchas, TuGet extracts uncompressed original images, captures MP4/m3u8 streams in real time, and lets you unlock slider captchas in a foreground window without aborting your queue.',
    },
    {
      question: 'What is included in the free trial, and what does activation unlock?',
      answer: 'TuGet Desktop offers an unlimited-time free trial: you can freely submit URLs, parse pages, and preview all extracted images and videos. Entering a TGTU license code unlocks batch downloading to your local disk, copying HD images, and exporting raw asset URLs.',
    },
    {
      question: 'What happens when 1688, Taobao, or Vipshop prompts a slider captcha or login wall?',
      answer: 'Because TuGet runs a real Chromium instance, it can bring the browser window to the foreground whenever a verification prompt appears. Once you complete the slider or QR login once, the background capture queue resumes automatically.',
    },
    {
      question: 'Which image, video, and stream formats does TuGet support?',
      answer: 'TuGet supports e-commerce main galleries, SKU variant images, and detail long images (JPG, PNG, WebP, AVIF), as well as standard MP4 videos, webpage background audio, and m3u8 HLS segmented video streams (automatically merged into complete video files).',
    },
    {
      question: 'Where are downloaded files stored, and is my data private?',
      answer: 'All captured images, videos, and task histories are stored 100% on your local hard drive and are never uploaded to any cloud. Network requests are limited to fetching the webpages you submit, verifying your license, and sending anonymous startup/heartbeat diagnostics.',
    },
    {
      question: 'Which Windows versions are supported and how do I install TuGet?',
      answer: 'TuGet supports 64-bit Windows 10 (version 1809 or later) and Windows 11. We recommend one-click installation via the official Microsoft Store for digital signature protection and automatic updates.',
    },
  ],
}

export const CLIENT_CORE_FEATURES: Record<LocaleCode, ClientCoreFeature[]> = {
  'zh-CN': [
    {
      num: '01',
      title: '独立沙箱，不影响日常上网浏览',
      desc: '拥有专属的 Chromium 运行实例与独立内存管理。采集高负荷页面时独立隔离运行，不抢占或干扰日常个人浏览器的使用。',
    },
    {
      num: '02',
      title: '多任务排队队列与失败智能重试',
      desc: '支持批量导入多条网页链接建立任务队列。按预设并发度有序调度渲染与下载，网络异常波动的请求支持智能重试机制。',
    },
    {
      num: '03',
      title: '真实视口模拟与动态 Lazyload 穿透',
      desc: '智能模拟用户视口向下滚动与微交互，触发网页内动态脚本加载全部瀑布流素材，避免由于懒加载造成的图片遗漏。',
    },
    {
      num: '04',
      title: '全格式多媒体与高清无损捕获',
      desc: '支持 JPG、PNG、WebP、AVIF 等位图，以及 MP4 网页视频与 m3u8 切片流媒体文件，保持原始画质规格完整提取。',
    },
    {
      num: '05',
      title: '本地结构化分类与规范命名归档',
      desc: '按任务标题与页面信息自动建立独立本地子文件夹，清洗 Windows 系统非法字符，素材归纳清晰便于查阅调用。',
    },
    {
      num: '06',
      title: 'Windows 10 / 11 深度性能调优',
      desc: '针对 64 位 Windows 系统环境优化并发调度与磁盘读写性能，启动快速，内存开销可控，长时间批量任务稳定运行。',
    },
  ],
  'zh-TW': [
    {
      num: '01',
      title: '獨立沙箱，不影響日常上網瀏覽',
      desc: '擁有專屬的 Chromium 執行實例與獨立記憶體管理。採集高負荷頁面時獨立隔離執行，不搶佔或干擾日常個人瀏覽器的使用。',
    },
    {
      num: '02',
      title: '多任務排隊佇列與失敗智慧重試',
      desc: '支援批次匯入多條網頁連結建立任務佇列。按預設並行度有序調度渲染與下載，網路異常波動的請求支援智慧重試機制。',
    },
    {
      num: '03',
      title: '真實視口模擬與動態 Lazyload 穿透',
      desc: '智慧模擬使用者視口向下捲動與微互動，觸發網頁內動態腳本載入全部瀑布流素材，避免由於懶載入造成的圖片遺漏。',
    },
    {
      num: '04',
      title: '全格式多媒體與高畫質無損捕獲',
      desc: '支援 JPG、PNG、WebP、AVIF 等點陣圖，以及 MP4 網頁影片與 m3u8 切片串流媒體檔案，保持原始畫質規格完整提取。',
    },
    {
      num: '05',
      title: '本機結構化分類與規範命名歸檔',
      desc: '按任務標題與頁面資訊自動建立獨立本機子資料夾，清洗 Windows 系統非法字元，素材歸納清晰便於查閱調用。',
    },
    {
      num: '06',
      title: 'Windows 10 / 11 深度效能調優',
      desc: '針對 64 位元 Windows 系統環境最佳化並行調度與磁碟讀寫效能，啟動快速，記憶體開銷可控，長時間批次任務穩定執行。',
    },
  ],
  'en-US': [
    {
      num: '01',
      title: 'Isolated Sandbox Without Disrupting Daily Browsing',
      desc: 'Runs its own dedicated Chromium instance and memory space so heavy batch captures never slow down or interfere with your personal browser.',
    },
    {
      num: '02',
      title: 'Multi-Task Queuing & Smart Retry',
      desc: 'Import dozens of URLs to build an ordered capture queue with configurable concurrency and automatic retry on transient network drops.',
    },
    {
      num: '03',
      title: 'Viewport Simulation & Lazy-Load Penetration',
      desc: 'Simulates natural viewport scrolling and micro-interactions to trigger frontend lazy-load scripts and capture every waterfall image.',
    },
    {
      num: '04',
      title: 'All-Format Lossless Media Capture',
      desc: 'Extracts JPG, PNG, WebP, and AVIF images alongside MP4 videos and m3u8 HLS segmented streams in their original uncompressed quality.',
    },
    {
      num: '05',
      title: 'Structured Local Folders & Clean Filenames',
      desc: 'Automatically creates sub-folders by page/product title and sanitizes illegal Windows filename characters for ready-to-use archives.',
    },
    {
      num: '06',
      title: 'Tuned for 64-Bit Windows 10 / 11',
      desc: 'Optimized for concurrent scheduling and disk I/O on modern Windows systems—fast startup, bounded memory usage, and rock-solid long runs.',
    },
  ],
}

export const CLIENT_PLATFORM_ENTRIES: Record<LocaleCode, ClientPlatformEntry[]> = {
  'zh-CN': [
    { name: '1688 商品素材', desc: '滑块验证协同与详情长图提取', to: '/platforms/1688/' },
    { name: '淘宝天猫素材', desc: '原图提取与 SKU 图自动归整', to: '/platforms/taobao/' },
    { name: '京东商品素材', desc: 'n0 原图还原与规格图导出', to: '/platforms/jd/' },
    { name: '唯品会素材', desc: '沙箱渲染解析与详情长图抓取', to: '/platforms/vip/' },
    { name: '拼多多素材', desc: '轮播图与长图一键归档', to: '/platforms/pdd/' },
    { name: '网页音视频嗅探', desc: 'MP4 与 m3u8 切片流媒体保存', to: '/scenarios/media-sniffer/' },
    { name: '电商美工工作流', desc: '批量采集整理与本地归档方案', to: '/solutions/ecommerce-designer/' },
  ],
  'zh-TW': [
    { name: '1688 商品素材', desc: '滑塊驗證協同與詳情長圖提取', to: '/platforms/1688/' },
    { name: '淘寶天貓素材', desc: '原圖提取與 SKU 圖自動歸整', to: '/platforms/taobao/' },
    { name: '京東商品素材', desc: 'n0 原圖還原與規格圖匯出', to: '/platforms/jd/' },
    { name: '唯品會素材', desc: '沙箱渲染解析與詳情長圖抓取', to: '/platforms/vip/' },
    { name: '拼多多素材', desc: '輪播圖與長圖一鍵歸檔', to: '/platforms/pdd/' },
    { name: '網頁音訊影片嗅探', desc: 'MP4 與 m3u8 切片串流媒體儲存', to: '/scenarios/media-sniffer/' },
    { name: '電商美工工作流', desc: '批次採集整理與本機歸檔方案', to: '/solutions/ecommerce-designer/' },
  ],
  'en-US': [
    { name: '1688 Product Assets', desc: 'Slider captcha unlock & detail long images', to: '/platforms/1688/' },
    { name: 'Taobao & Tmall Assets', desc: 'Original image extraction & SKU sorting', to: '/platforms/taobao/' },
    { name: 'JD.com Product Assets', desc: 'n0 original image restoration & SKU export', to: '/platforms/jd/' },
    { name: 'Vipshop Assets', desc: 'Sandboxed rendering & detail long images', to: '/platforms/vip/' },
    { name: 'Pinduoduo Assets', desc: 'One-click carousel & long image archiving', to: '/platforms/pdd/' },
    { name: 'Web Video & Audio Sniffer', desc: 'Save MP4 videos & m3u8 HLS streams', to: '/scenarios/media-sniffer/' },
    { name: 'E-Commerce Workflow', desc: 'Batch capture & structured local archiving', to: '/solutions/ecommerce-designer/' },
  ],
}

export const CLIENT_FAQS: Record<LocaleCode, FaqItem[]> = {
  'zh-CN': [
    {
      question: 'TuGet 客户端是否需要电脑提前安装 Chrome 浏览器？',
      answer: '不需要。TuGet 客户端自带独立的 Chromium 渲染引擎运行沙箱，不依赖您电脑上是否安装了其他第三方浏览器，安装后开箱即用。',
    },
    {
      question: '客户端的免费体验范围是什么？如何解锁完整功能？',
      answer: 'TuGet 客户端提供不限时免费体验，支持添加链接、网页解析及素材预览。当您需要执行批量下载保存至本地磁盘、复制高清图片或复制图片原始链接时，只需在客户端输入激活码即可完成授权激活。',
    },
    {
      question: '在采集过程中遇到需要滑块验证或登录的网页怎么办？',
      answer: 'TuGet 内置完整的 Chromium 实例，当目标网页弹出滑块验证码或需要身份核验时，客户端支持切换真实窗口至前台供您人工一次性滑动解锁或扫码登录，完成后采集任务即刻无缝继续。',
    },
    {
      question: '通过微软应用商店安装有什么优势？如何更新？',
      answer: '通过微软官方应用商店（Microsoft Store）分发，经过平台数字安全签名与沙箱审查，安装纯净可靠。后续客户端桌面核心软件版本由微软商店提供便捷的升级支持，无需手动寻找安装包；提取解析规则随软件版本迭代持续优化与维护。',
    },
  ],
  'zh-TW': [
    {
      question: 'TuGet 用戶端是否需要電腦提前安裝 Chrome 瀏覽器？',
      answer: '不需要。TuGet 用戶端自帶獨立的 Chromium 渲染引擎執行沙箱，不依賴您電腦上是否安裝了其他第三方瀏覽器，安裝後開箱即用。',
    },
    {
      question: '用戶端的免費體驗範圍是什麼？如何解鎖完整功能？',
      answer: 'TuGet 用戶端提供不限時免費體驗，支援新增連結、網頁解析及素材預覽。當您需要執行批次下載儲存至本機磁碟、複製高畫質圖片或複製圖片原始連結時，只需在用戶端輸入啟用碼即可完成授權啟用。',
    },
    {
      question: '在採集過程中遇到需要滑塊驗證或登入的網頁怎麼辦？',
      answer: 'TuGet 內建完整的 Chromium 實例，當目標網頁彈出滑塊驗證碼或需要身分核驗時，用戶端支援切換真實視窗至前台供您人工一次性滑動解鎖或掃碼登入，完成後採集任務即刻無縫繼續。',
    },
    {
      question: '透過微軟應用商店安裝有什麼優勢？如何更新？',
      answer: '透過微軟官方應用商店（Microsoft Store）分發，經過平台數位安全簽章與沙箱審查，安裝純淨可靠。後續用戶端桌面核心軟體版本由微軟商店提供便捷的升級支援，無需手動尋找安裝包；提取解析規則隨軟體版本迭代持續最佳化與維護。',
    },
  ],
  'en-US': [
    {
      question: 'Does TuGet Desktop require Google Chrome to be pre-installed on my PC?',
      answer: 'No. TuGet Desktop bundles its own self-contained Chromium rendering engine sandbox and works out of the box regardless of which browser you use on your computer.',
    },
    {
      question: 'What is included in the free trial and how do I unlock full features?',
      answer: 'TuGet offers an unlimited free trial for adding URLs, parsing pages, and previewing captured images and videos. When you need to batch-download files to your disk, copy HD images, or export original URLs, simply enter a TGTU activation code in the client.',
    },
    {
      question: 'How does the client handle pages that require slider captchas or login?',
      answer: 'When a target page displays a slider captcha or login prompt, TuGet can bring its real Chromium window to the foreground so you can complete the verification once. Your queued tasks then resume automatically.',
    },
    {
      question: 'What are the benefits of installing from the Microsoft Store?',
      answer: 'Microsoft Store distribution guarantees official digital signatures, clean sandboxing without bundled adware, and seamless background version updates.',
    },
  ],
}

export const DOWNLOAD_FAQS: Record<LocaleCode, FaqItem[]> = {
  'zh-CN': [
    {
      question: '为什么优先推荐通过微软应用商店（Microsoft Store）安装 TuGet？',
      answer: '微软应用商店具备严格的应用安全审查机制与官方数字签名，确保软件安装包纯净可靠，无任何恶意广告与软件捆绑。此外，后续客户端桌面软件版本更新由微软商店提供便捷的升级渠道，免去手动寻找安装包的繁琐；提取解析规则将随软件版本迭代持续维护升级。',
    },
    {
      question: '安装 TuGet Desktop 需要什么样的电脑配置？',
      answer: 'TuGet 针对 64 位 Windows 10 (1809 及以上版本) 与 Windows 11 进行了深度性能调优。建议配备 4GB 以上运行内存以及 500MB 以上空余磁盘空间用于临时渲染与缓存。',
    },
    {
      question: '安装 TuGet 客户端是否需要先安装 Chrome 浏览器？',
      answer: '不需要。TuGet 客户端自带独立的 Chromium 渲染沙箱与网络监听底层，开箱即用，不依赖您电脑上是否安装了其他第三方浏览器。',
    },
    {
      question: '在公司内网或没有微软商店环境的电脑上如何安装？',
      answer: '企业客户或内网隔离环境若无法直接访问 Microsoft Store，可点击页面上的“下载独立 EXE 安装包 (64位)”获取官方离线安装包，或联系官方技术支持邮箱 service@yueding168.com 获取部署协助。',
    },
  ],
  'zh-TW': [
    {
      question: '為什麼優先推薦透過微軟應用商店（Microsoft Store）安裝 TuGet？',
      answer: '微軟應用商店具備嚴格的應用安全審查機制與官方數位簽章，確保軟體安裝包純淨可靠，無任何惡意廣告與軟體綑綁。此外，後續用戶端桌面軟體版本更新由微軟商店提供便捷的升級管道，免去手動尋找安裝包的繁瑣；提取解析規則將隨軟體版本迭代持續維護升級。',
    },
    {
      question: '安裝 TuGet Desktop 需要什麼樣的電腦配置？',
      answer: 'TuGet 針對 64 位元 Windows 10 (1809 及以上版本) 與 Windows 11 進行了深度效能調優。建議配備 4GB 以上執行記憶體以及 500MB 以上可用磁碟空間用於暫存渲染與快取。',
    },
    {
      question: '安裝 TuGet 用戶端是否需要先安裝 Chrome 瀏覽器？',
      answer: '不需要。TuGet 用戶端自帶獨立的 Chromium 渲染沙箱與網路監聽底層，開箱即用，不依賴您電腦上是否安裝了其他第三方瀏覽器。',
    },
    {
      question: '在公司內網或沒有微軟商店環境的電腦上如何安裝？',
      answer: '企業客戶或無法存取 Microsoft Store 的環境，可點擊頁面上的「下載獨立 EXE 安裝包 (64位元)」取得官方離線安裝包，或聯絡官方技術支援信箱 service@yueding168.com 取得部署協助。',
    },
  ],
  'en-US': [
    {
      question: 'Why is installing via the Microsoft Store recommended?',
      answer: 'The Microsoft Store enforces strict security verification and official digital signatures, ensuring a clean installation with zero adware or bundled software, plus effortless automatic version updates.',
    },
    {
      question: 'What are the hardware requirements for TuGet Desktop?',
      answer: 'TuGet is optimized for 64-bit Windows 10 (version 1809+) and Windows 11. We recommend at least 4 GB of RAM and 500 MB of free disk space for temporary rendering cache.',
    },
    {
      question: 'Do I need to install Chrome before installing TuGet?',
      answer: 'No. TuGet Desktop includes its own isolated Chromium rendering sandbox and network listener out of the box.',
    },
    {
      question: 'How can I install TuGet on a PC without Microsoft Store access?',
      answer: 'If your network or enterprise environment cannot access the Microsoft Store, click "Download Standalone EXE (64-bit)" on this page to get the official offline installer, or contact service@yueding168.com for assistance.',
    },
  ],
}
