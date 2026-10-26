# Tasks

- [x] Task 1: 创建 VVIC 共享工具模块 `scraper-scripts/vvic/vvicUtils.ts`
  - [x] SubTask 1.1: 实现 `cleanVvicImageUrl(url)` — 补全协议 `//` → `https://`，截断到图片扩展名（去除 OSS 处理参数和缩略图后缀）
  - [x] SubTask 1.2: 实现 `isUrlBlacklisted(url)` — 过滤 `main.vvic.com/img/`、`stall-recommend`、`main-download`、`/resource/img/` 等非商品图片
  - [x] SubTask 1.3: 实现 `extractBestUrlFromImg(img)` — 图片属性优先级 `big` > `mid` > `src`，结合黑名单过滤和 URL 清洗
  - [x] SubTask 1.4: 实现 `extractUrlFromImg(img)` — 图片属性优先级 `data-src` > `src`（用于详情图懒加载场景）
  - [x] SubTask 1.5: 导出 URL 黑名单常量 `URL_BLACKLIST` 和 `DETAIL_URL_BLACKLIST`

- [x] Task 2: 创建主图提取模块 `scraper-scripts/vvic/vvicGetMain.ts`
  - [x] SubTask 2.1: 实现三种 DOM 提取方法：`extractFromThumbnailContainer()`（`.thumbnail`）、`extractFromThumblist()`（`#thumblist`）、`extractFromOwlItems()`（`.owl-item`）
  - [x] SubTask 2.2: 实现重试机制：MAX_RETRIES=20, RETRY_INTERVAL=500ms
  - [x] SubTask 2.3: 实现首次发现后额外轮询：3 次，500ms 间隔
  - [x] SubTask 2.4: 使用 `tauriBridge.send('MainPic', urls)` 上报，使用 `deduplicateUrls()` 去重

- [x] Task 3: 创建详情图提取模块 `scraper-scripts/vvic/vvicGetDetail.ts`
  - [x] SubTask 3.1: 实现四种 DOM 提取方法：`extractFromItemDetailProductDesc()`（`.item-detail-product-desc`）、`extractFromRightSide()`（`.right-side`）、`extractFromInfo()`（`#info`）、`extractFromDetailDesc()`（`.detail-desc`）
  - [x] SubTask 3.2: 实现重试机制：MAX_RETRIES=20, RETRY_INTERVAL=500ms
  - [x] SubTask 3.3: 实现首次发现后额外轮询：5 次，1000ms 间隔（详情图懒加载较慢）
  - [x] SubTask 3.4: 初始化延迟 1000ms 等待懒加载元素就绪
  - [x] SubTask 3.5: 使用 `tauriBridge.send('DetailPic', urls)` 上报

- [x] Task 4: 创建 SKU 图提取模块 `scraper-scripts/vvic/vvicGetSku.ts`
  - [x] SubTask 4.1: 实现三种 DOM 提取方法：`extractFromSkuInfo()`（`#skuInfo`）、`extractFromDetailInfoLine()`（`.detail-info-line`）、`extractFromSizeContainer()`（`#size-container`）
  - [x] SubTask 4.2: 实现重试机制：MAX_RETRIES=20, RETRY_INTERVAL=500ms
  - [x] SubTask 4.3: 实现首次发现后额外轮询：3 次，500ms 间隔
  - [x] SubTask 4.4: 使用 `tauriBridge.send('SkuPic', urls)` 上报

- [x] Task 5: 创建视频提取模块 `scraper-scripts/vvic/vvicGetVideo.ts`
  - [x] SubTask 5.1: 实现 XHR/Fetch 拦截，捕获视频请求
  - [x] SubTask 5.2: 实现 DOM 检测（`<video>` 标签、`data-video-url`/`data-video`/`data-src` 属性）
  - [x] SubTask 5.3: 实现页面 JSON 解析和 Window 全局变量检测
  - [x] SubTask 5.4: 实现 Performance API 监控和 MutationObserver
  - [x] SubTask 5.5: 实现视频去重（URL + 规范化 ID 双重机制）
  - [x] SubTask 5.6: 所有视频统一分类为 `mainVideo`，通过 `tauriBridge.send('VideoUrls', videos)` 上报
  - [x] SubTask 5.7: 实现 10 轮初始检测（每秒 1 次）

- [x] Task 6: 创建标题/链接提取模块 `scraper-scripts/vvic/vvicGetHylinkTitle.ts`
  - [x] SubTask 6.1: 实现标题选择器优先级链（`.goods-title` → `.item-title` → ... → `document.title` 降级）
  - [x] SubTask 6.2: 实现商品 ID 提取（`/item/{id}` 或 `/goods/{id}`）
  - [x] SubTask 6.3: 实现商品链接清洗（保留 `{origin}/item/{id}` 格式）
  - [x] SubTask 6.4: 通过 `tauriBridge.send()` 上报 `productTitle`、`productLink`、`productId`、`visitTime`

- [x] Task 7: 创建入口脚本 `scraper-scripts/vvic/index.ts`
  - [x] SubTask 7.1: 立即执行视频拦截模块（`document_start` 需求）
  - [x] SubTask 7.2: DOM 就绪后执行主图/SKU/详情图/标题模块（后台并行运行）
  - [x] SubTask 7.3: 集成登录检测 `probeAndReportLogin()`
  - [x] SubTask 7.4: 集成完成判定 `waitForCompletion()` 数据驱动静默超时
  - [x] SubTask 7.5: iframe 防护 `if (window !== window.top) return;`
  - [x] SubTask 7.6: 异常处理：有数据则 completeTask，无数据则 failTask

- [x] Task 8: 注册构建入口 `scripts/build-scraper.mjs`
  - [x] SubTask 8.1: 在 `PLATFORMS` 对象中新增 `vvic` 条目，入口指向 `scraper-scripts/vvic/index.ts`

- [x] Task 9: 注册 VVIC 登录策略 `src-tauri/src/login/mod.rs`
  - [x] SubTask 9.1: 在 `LoginStrategyRegistry::new()` 中为 VVIC 注册 `DefaultLoginStrategy`，登录 URL 模式包含 `login.vvic.com`

# Task Dependencies
- [Task 2] depends on [Task 1] (vvicGetMain 使用 vvicUtils 的 extractBestUrlFromImg/cleanVvicImageUrl/isUrlBlacklisted)
- [Task 3] depends on [Task 1] (vvicGetDetail 使用 vvicUtils 的 extractUrlFromImg/cleanVvicImageUrl/isUrlBlacklisted)
- [Task 4] depends on [Task 1] (vvicGetSku 使用 vvicUtils 的 extractBestUrlFromImg/cleanVvicImageUrl/isUrlBlacklisted)
- [Task 7] depends on [Task 2, Task 3, Task 4, Task 5, Task 6] (index.ts 导入所有模块)
- [Task 8] depends on [Task 7] (构建入口需要 index.ts 存在)
- [Task 5] and [Task 6] are independent (可并行开发)
- [Task 9] is independent (可并行开发)
