# Tasks

- [x] Task 1: 创建 sinaGetMain.ts — 微博主图模块（清空 MainPic 防污染）
  - [x] SubTask 1.1: 参考 SinaGetMain.js，实现 run() 函数，发送空 MainPic 数组
  - [x] SubTask 1.2: 微博无传统主图概念，此模块职责是清空 MainPic 防止数据污染

- [x] Task 2: 创建 sinaGetDetail.ts — 微博详情图提取模块
  - [x] SubTask 2.1: 参考 SinaGetDetail.js，提取 #content/#container/#imageTextInfo-container/[class*="descV8"] 容器中的图片
  - [x] SubTask 2.2: 实现图片 URL 清洗（占位图过滤、相对协议转换、alicdn 后缀截断）
  - [x] SubTask 2.3: 实现多轮提取 + 重试等待容器渲染
  - [x] SubTask 2.4: 通过 tauriBridge.send('DetailPic', urls) 上报

- [x] Task 3: 创建 sinaGetSku.ts — 微博配图/多媒体提取模块（核心图片抓取）
  - [x] SubTask 3.1: 参考 SinaGetSku.js，定义 Woo 组件 + 文章 + 搜索页 + AI总结等 CSS 选择器
  - [x] SubTask 3.2: 实现 convertToLargeImage() 缩略图→大图还原（orj\d+/mw\d+/bmiddle/square/thumb\d+/thumbnail/small → large）
  - [x] SubTask 3.3: 实现 extractImageUrl() 过滤逻辑（data: URL、表情/emoji、黑名单后缀）
  - [x] SubTask 3.4: 实现持续扫描 + 去重（processedUrlSet），通过 tauriBridge.send('SkuPic', urls) 上报

- [x] Task 4: 创建 sinaGetVideo.ts — 微博视频提取模块
  - [x] SubTask 4.1: 参考 SinaGetVideo.js 和 tbGetVideo.ts，实现 XHR/Fetch 拦截
  - [x] SubTask 4.2: 实现 MutationObserver 监听 video 标签
  - [x] SubTask 4.3: 实现 PerformanceObserver 网络请求监控
  - [x] SubTask 4.4: 实现视频 URL 去重（normalizeVideoUrl + normalizedVideoIds）
  - [x] SubTask 4.5: 实现 JSON 数据提取（extractVideosFromPageJson + findVideosInObject）
  - [x] SubTask 4.6: 通过 tauriBridge.send('VideoUrls', videos) 上报

- [x] Task 5: 创建 sinaGetHylinkTitle.ts — 微博标题/链接/ID提取模块
  - [x] SubTask 5.1: 参考 SinaGetHylinkTitle.js，提取 document.title（去除"- 微博"后缀）
  - [x] SubTask 5.2: 从 URL 提取 productId（?id=数字 或 /u/数字）
  - [x] SubTask 5.3: 通过 tauriBridge.send 上报 productTitle/productLink/productId

- [x] Task 6: 创建 index.ts — 微博抓取脚本入口
  - [x] SubTask 6.1: 参考 taobao/index.ts 模式，导入 5 个模块的 run 函数
  - [x] SubTask 6.2: 实现 iframe 防护（window !== window.top 检查）
  - [x] SubTask 6.3: 实现时序分组：Video 模块立即启动（document_start），其余模块 DOMContentLoaded 后启动
  - [x] SubTask 6.4: 实现数据驱动完成判定（waitForCompletion + tauriBridge.completeTask）
  - [x] SubTask 6.5: 实现模块超时保护（withTimeout）

- [x] Task 7: 注册构建入口 — 修改 scripts/build-scraper.mjs
  - [x] SubTask 7.1: 在 PLATFORMS 对象中添加 sina 入口路径

- [x] Task 8: 注册登录策略 — 修改 src-tauri/src/login/mod.rs
  - [x] SubTask 8.1: 添加 sina DefaultLoginStrategy，匹配 login.sina.com.cn / passport.weibo.com

- [x] Task 9: 构建验证
  - [x] SubTask 9.1: 运行 npm run build:scraper 确认 sina.bundle.js 生成成功
  - [x] SubTask 9.2: 检查 Rust 编译通过

# Task Dependencies
- Task 1-5 可并行开发（各模块独立）
- Task 6 依赖 Task 1-5（入口文件导入各模块）
- Task 7 依赖 Task 6（需要 index.ts 存在）
- Task 8 独立于 Task 1-7
- Task 9 依赖 Task 1-8 全部完成
