# Tasks

- [x] Task 1: 创建 gfGetMain.ts — 闲鱼主图提取模块
  - [x] 实现 `extractMainImagesFromDOM()`: 从 `[class*="item-main-window-list-item"] img` 提取 src
  - [x] 实现 `extractBestUrlFromImg()`: 补 https 前缀、正则去缩略图后缀 `/(.(?:jpg|png|jpeg|gif|bmp|heic|webp))[_?].*$/i`
  - [x] 实现 `cleanUrl()`: 去除查询参数
  - [x] 实现 `processUrls()`: 清洗 + 过滤(.svg/黑名单) + 去重
  - [x] 实现 `run()`: MAX_RETRIES=100, RETRY_INTERVAL=500ms 轮询 + MAX_EXTRA_FETCHES=3 额外提取，通过 tauriBridge.send('MainPic', urls) 上报

- [x] Task 2: 创建 gfGetDetail.ts — 闲鱼详情图提取模块
  - [x] 实现 `isValidDetailImageUrl()`: 排除 data URI/blank.gif/placeholder，验证图片扩展名和 http(s) 协议
  - [x] 实现 `processGoofishUrl()`: 补 https、去查询参数、正则去缩略图后缀
  - [x] 实现 `extractImagesFromDOM()`: 从 `[class*="feeds-image"]` 容器提取 img（排除 `.icon-img`），支持 iframe 穿透
  - [x] 实现 `run()`: MAX_RETRIES=40, RETRY_INTERVAL=800ms 轮询，通过 tauriBridge.send('DetailPic', urls) 上报

- [x] Task 3: 创建 gfGetSku.ts — 闲鱼 SKU 图提取模块（防污染）
  - [x] 实现 `run()`: 直接发送 `tauriBridge.send('SkuPic', [])`，闲鱼无 SKU 图

- [x] Task 4: 创建 gfGetVideo.ts — 闲鱼视频提取模块
  - [x] 实现视频 URL 去重: `normalizeVideoUrl()` + `isVideoDuplicate()`
  - [x] 实现视频分类: `isLikelyMainVideo()` / `isMainVideoUrl()` / `classifyAndProcessVideo()`
  - [x] 实现 `interceptXHR()`: 拦截 XMLHttpRequest，捕获视频 URL 和 JSON 响应中的视频
  - [x] 实现 `interceptFetch()`: 拦截 fetch，捕获视频 URL 和 JSON/Text 响应中的视频
  - [x] 实现 `monitorNetworkRequests()`: Performance API rAF 循环检查 resource 条目
  - [x] 实现 `setupMutationObserver()`: 监听 video/source 元素插入和 src/data-src 属性变化
  - [x] 实现 `extractVideosFromDOMElements()`: 扫描 video + source 元素，支持 iframe 穿透和 Shadow DOM 穿透
  - [x] 实现 `extractVideosFromPageJson()`: 从 script 标签提取 JSON 中的视频 URL
  - [x] 实现 `checkWindowForVideos()`: 检查 window 全局变量中的视频数据
  - [x] 实现 `onVideoFound()`: 去重后通过 tauriBridge.send('VideoUrls', videos) 上报
  - [x] 实现 `run()`: 初始化所有拦截和监听，启动定时检测（20 次，每次 1 秒）

- [x] Task 5: 创建 gfGetHylinkTitle.ts — 闲鱼标题/链接/商品ID提取模块
  - [x] 定义 `DEFAULT_TITLES` 常量: 排除"闲鱼"、"goofish"、"商品详情"等默认标题
  - [x] 实现 `isDefaultTitle()`: 判断标题是否为默认/通用标题
  - [x] 实现 `waitForTitle()`: 最多等待 15 秒（300ms 轮询 + MutationObserver 监听 title 变化）
  - [x] 实现 `extractProductId()`: 从 URL 参数 `id=` 提取商品 ID
  - [x] 实现 `run()`: 等待标题加载 → 提取标题/链接/商品ID → 通过 tauriBridge.send 分别上报

- [x] Task 6: 创建 index.ts — 闲鱼入口编排
  - [x] 定义 `GOOFISH_LOGIN_SELECTORS`: 闲鱼登录检测选择器
  - [x] 实现视频模块立即启动（document_start 阶段）
  - [x] 实现 DOMContentLoaded 后登录检测 + 4 模块并行运行 + 数据静默完成判定
  - [x] 复用淘宝入口的 `waitTaskCompletion` / `withTimeout` / `setupCaptchaWatcher` 模式

- [x] Task 7: 注册构建入口 — 修改 scripts/build-scraper.mjs
  - [x] 在 PLATFORMS 对象中添加 `goofish: resolve(projectRoot, 'scraper-scripts/goofish/index.ts')`
  - [x] 验证构建产出 `dist-scripts/goofish.bundle.js`

# Task Dependencies
- Task 1 ~ Task 5 之间无依赖，可并行开发
- Task 6 依赖 Task 1 ~ Task 5（需要导入各模块的 run 函数）
- Task 7 依赖 Task 6（需要入口文件存在才能构建）
