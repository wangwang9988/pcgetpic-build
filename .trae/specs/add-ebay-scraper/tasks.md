# Tasks

- [x] Task 1: 创建 eBay 主图提取模块 `scraper-scripts/ebay/ebayGetMain.ts`
  - [x] 实现 `extractMainImagesFromScriptTag()`：从 `$M_96613636_C` 提取 `PICTURE.mediaList[].image.zoomImg.URL` 和 `originalImg.URL`
  - [x] 实现备用正则提取：匹配 `i.ebayimg.com/images/g/{id}/s-l1600.webp` 和 `cloudfront.net` CDN URL
  - [x] 实现全页面搜索兜底：对 `document.documentElement.innerHTML` 全局匹配
  - [x] 实现轮询重试逻辑（MAX_RETRIES + RETRY_INTERVAL）和额外抓取轮次
  - [x] 通过 `tauriBridge.send('MainPic', urls)` 上报数据

- [x] Task 2: 创建 eBay 详情图提取模块 `scraper-scripts/ebay/ebayGetDetail.ts`
  - [x] 实现双模式架构：主页面模式 + iframe 模式（`ebaydesc.com`/`epprod.com`）
  - [x] 主页面模式：扫描详情容器（`.tabs__content`、`[data-testid="d-item-description"]`、`#viTabs_0_is`、`.x-about-this-item`）
  - [x] iframe 模式：提取 `<img>` 元素 URL，通过 `postMessage` 发送给父页面
  - [x] 实现 URL 清洗：过滤无效图片、去除反引号、`//` 前缀补全 `https:`
  - [x] 实现多轮提取（EXTRACTION_PASSES=3，间隔 2s）
  - [x] 通过 `tauriBridge.send('DetailPic', urls)` 上报数据

- [x] Task 3: 创建 eBay SKU 图提取模块 `scraper-scripts/ebay/ebayGetSku.ts`
  - [x] 实现核心方法 `extractEbaySkuImagesFromScript()`：从 `$M_96613636_C` 提取 MSKU 模块
  - [x] 提取 `menuItemPictureIndexMap`（SKU 到图片索引映射）
  - [x] 解析 `mediaList`：按 `MediaItemBaseType` 拆分，优先级 `zoomImg.URL` > `originalImg.URL` > `thumbnail.URL`
  - [x] eBay 官方图归一化为 `s-l1600.webp`，第三方 CDN 图保留原 URL
  - [x] 实现备用路径：从 `__ICE_APP_CONTEXT__` 的 `loaderData.home.data.res.skuBase.props[].values[].image` 提取
  - [x] 通过 `tauriBridge.send('SkuPic', urls)` 上报数据

- [x] Task 4: 创建 eBay 视频提取模块 `scraper-scripts/ebay/ebayGetVideo.ts`
  - [x] 实现 `extractEbayVideosFromScript()`：从 `$M_96613636_C` 提取 `playlistMap`（HLS/DASH URL）
  - [x] 实现直接匹配 `video.ebaycdn.net/videos/v1/{id}/playlist.{m3u8|mpd}`
  - [x] 实现 `videoId` 提取并构造视频 URL
  - [x] 实现 XHR/Fetch 拦截和 Performance API 监控
  - [x] 实现 MutationObserver 检测动态 `<video>` 元素
  - [x] 实现视频去重（`normalizeVideoUrl` 提取 eBay videoId）
  - [x] 通过 `tauriBridge.send('VideoUrls', videos)` 上报数据

- [x] Task 5: 创建 eBay 标题/链接/商品ID提取模块 `scraper-scripts/ebay/ebayGetHylinkTitle.ts`
  - [x] 实现三级标题提取：script 标签 → DOM 选择器 → document.title
  - [x] 实现 script 标签提取：`TITLE.mainTitle.textSpans[0].text`
  - [x] 实现 DOM 选择器提取：`h1.x-item-title__mainTitle`、`h1[itemprop="name"]` 等
  - [x] 实现 `document.title` 清理（去除 ` | eBay`、` - eBay` 后缀）
  - [x] 实现商品 ID 提取：URL 路径 `/itm/{numericId}`
  - [x] 实现 URL 清洗：`origin/itm/{productId}`
  - [x] 通过 `tauriBridge.send` 上报 `productTitle`、`productLink`、`productId`

- [x] Task 6: 创建 eBay 入口脚本 `scraper-scripts/ebay/index.ts`
  - [x] 导入并编排 5 个子模块
  - [x] 视频模块立即执行（document_start 时序）
  - [x] 其他模块 DOM 就绪后并行执行（带超时保护）
  - [x] 实现 iframe 防护（仅 Detail 模块允许 iframe 执行）
  - [x] 实现数据驱动完成判定（`waitForCompletion`）
  - [x] 实现异常处理（有数据时 completeTask，无数据时 failTask）

- [x] Task 7: 注册 eBay 构建入口到 `scripts/build-scraper.mjs`
  - [x] 在 `PLATFORMS` 对象中添加 `ebay: resolve(projectRoot, 'scraper-scripts/ebay/index.ts')`

- [x] Task 8: 创建 eBay 登录策略 `src-tauri/src/login/ebay.rs` 并注册
  - [x] 实现 `EbayLoginStrategy` trait：检测 `signin.ebay.com`、`login.ebay.com` 登录页
  - [x] 实现 `extract_product_id`：从 URL 提取 `/itm/{id}`
  - [x] 在 `src-tauri/src/login/mod.rs` 中注册 eBay 策略

- [x] Task 9: 构建验证
  - [x] 运行 `node scripts/build-scraper.mjs` 确认 `ebay.bundle.js` 生成成功
  - [x] 确认 Rust 编译通过

# Task Dependencies
- Task 6 依赖 Task 1-5（入口脚本需要导入子模块）
- Task 7 依赖 Task 6（构建入口需要 index.ts 存在）
- Task 9 依赖 Task 7 和 Task 8（构建验证需要所有代码就位）
- Task 1-5 可并行开发
- Task 8 与 Task 1-6 可并行开发
