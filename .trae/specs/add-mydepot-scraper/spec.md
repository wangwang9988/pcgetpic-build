# MyDepot 平台抓取脚本 Spec

## Why
项目已实现淘宝、京东、亚马逊等 10 个平台的抓取脚本，但 MyDepot 平台（Shopify 电商站点）的 `scraper-scripts/mydepot/` 目录完全缺失。Rust 层平台识别和前端平台 Handler 已就绪，需要补齐核心的 DOM 抓取脚本，使 MyDepot 平台商品页的图片、视频、标题等数据能被正确提取。

## What Changes
- 新建 `scraper-scripts/mydepot/` 目录，包含 6 个 TypeScript 文件（index + 5 个子模块）
- 将 `GetPic/entrypoints/modules/mydepot/` 下的 5 个浏览器插件脚本转换为 Tauri WebView 注入脚本
- 在 `scripts/build-scraper.mjs` 中注册 mydepot 平台入口
- 核心转换：`browser.runtime.sendMessage({ action: 'setStorage', key, value })` → `tauriBridge.send(key, value)`
- 移除插件特有的生命周期管理（页面可见性/焦点/不活动定时器/SPA 导航检测），由 Rust 端 Worker 状态机统一管理
- 保留核心 DOM 提取逻辑和 Shopify URL 清洗规则（UUID/数字尺寸/文字尺寸后缀剥离）
- 严格对齐 `docs/平台抓取脚本开发指南.md` 的最佳实践模式

## Impact
- Affected specs: 无破坏性变更，纯新增功能
- Affected code:
  - `scraper-scripts/mydepot/` (新建 6 个文件)
  - `scripts/build-scraper.mjs` (添加 1 行)
  - `src-tauri/src/login/mod.rs` (可选：注册 DefaultLoginStrategy)

## ADDED Requirements

### Requirement: MyDepot 主图提取
系统 SHALL 从 MyDepot 商品页的 `.productView-images-wrapper`、`.productView-thumbnail-wrapper` 和全局 `.productView-thumbnail-link` 三个 DOM 容器提取主图 URL，并通过 `tauriBridge.send('MainPic', urls)` 上报。

#### Scenario: 成功提取主图
- **WHEN** MyDepot 商品页加载完成且存在 `.productView-thumbnail-link` 元素
- **THEN** 从 `data-image`、`img[src]`、`img[srcset]`、`.media[data-fancybox]` 的 `href` 属性提取图片 URL
- **AND** 对每个 URL 执行 Shopify 清洗（移除 UUID 后缀、数字尺寸后缀 `_1024x1024`、文字尺寸后缀 `_large` 等，移除查询参数，补全 `https:` 协议前缀）
- **AND** 优先使用 `shared/utils.ts` 的 `cleanImageUrl()` 做通用清洗，MyDepot 特有的 Shopify 后缀剥离作为平台补充清洗
- **AND** 使用 `deduplicateUrls()` 去重
- **AND** 通过 `tauriBridge.send('MainPic', cleanedUrls)` 上报去重后的 URL 列表

#### Scenario: 主图提取执行流程（对齐开发指南 GetMain 模式）
- **WHEN** `run()` 被调用
- **THEN** 先 `tauriBridge.send('MainPic', [])` 初始空上报
- **AND** 循环重试（MAX_RETRIES × RETRY_INTERVAL），每轮调用 `gatherAllImages()`
- **AND** 获取到图片后执行额外抓取（MAX_EXTRA_FETCHES × RETRY_INTERVAL），合并去重
- **AND** 最终 `tauriBridge.send('MainPic', images)` 上报
- **AND** 使用共享 `sleep` 而非本地定义

### Requirement: MyDepot 详情图提取
系统 SHALL 从 MyDepot 商品页的 `.custom-image-container`、`.image-wrapper` 和商品描述区域提取详情图 URL，并通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### Scenario: 成功提取详情图
- **WHEN** MyDepot 商品页加载完成且存在详情图容器
- **THEN** 从 `.custom-image-container img`、`.image-wrapper img`、`#product-description img`、`.product-description img` 提取图片 URL
- **AND** 对每个 URL 执行 Shopify 清洗规则
- **AND** 通过 `tauriBridge.send('DetailPic', cleanedUrls)` 上报

#### Scenario: 详情图提取执行流程（对齐开发指南 GetDetail 模式）
- **WHEN** `run()` 被调用
- **THEN** 先 `tauriBridge.send('DetailPic', [])` 初始空上报
- **AND** 重试等待容器出现（MAX_CONTAINER_RETRIES）
- **AND** 多轮提取（EXTRACTION_PASSES），每轮扫描容器内 img 标签
- **AND** 最终上报 DetailPic
- **AND** 【可选】注册 MutationObserver 持续监听详情区域变化，发现新图片时增量上报

### Requirement: MyDepot SKU 图提取
系统 SHALL 从 MyDepot 商品页的 `<script>` 标签中解析 `initData.productVariants[].image.src` 提取 SKU 图片 URL，并通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### Scenario: 成功从 script 标签提取 SKU 图
- **WHEN** 页面包含 `initData` 和 `productVariants` 的 script 标签
- **THEN** 尝试 JSON 解析 `initData` 对象，遍历 `productVariants` 数组提取 `image.src`
- **AND** 若 JSON 解析失败，使用正则 `/"image"\s*:\s*\{\s*"src"\s*:\s*"([^"]+)"/g` 备用提取
- **AND** 通过 `tauriBridge.send('SkuPic', cleanedUrls)` 上报

#### Scenario: SKU 图提取执行流程（对齐开发指南 GetSku 模式）
- **WHEN** `run()` 被调用
- **THEN** 先 `tauriBridge.send('SkuPic', [])` 初始空上报
- **AND** 首轮扫描 `extractFromScript()`
- **AND** 注册 MutationObserver 精确监听 SKU 相关容器（而非 document.body），监听 attributes 变化（src, data-src 等）
- **AND** 轮询兜底：首轮无结果时启动定时轮询
- **AND** **返回清理函数** `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }`，同时清理 Observer 和定时器

### Requirement: MyDepot 视频提取
系统 SHALL 从 MyDepot 商品页通过多手段提取视频 URL，包括 XHR/Fetch 拦截、Performance API 增量监控、MutationObserver、页面内嵌 JSON 提取、DOM 扫描等，并通过 `tauriBridge.send('VideoUrls', videoObjects)` 上报。

#### Scenario: 视频提取立即启动层（对齐开发指南 GetVideo 必备策略）
- **WHEN** `run()` 被调用（在 index.ts 的 `main()` 中立即执行，不等待 DOMContentLoaded）
- **THEN** 启动 XHR 拦截（劫持 `XMLHttpRequest.prototype.send`）
- **AND** 启动 Fetch 拦截（劫持 `window.fetch`）
- **AND** 启动 Performance API 增量监控（`performance.getEntriesByType('resource')` + 游标 + `requestAnimationFrame` 循环）

#### Scenario: 视频提取 DOMContentLoaded 后启动层
- **WHEN** DOM 加载完成
- **THEN** 注册 MutationObserver 监听 `<video>` 和 `<script>` 新增
- **AND** 延时梯度扫描（1s/3s/5s/10s）：提取页面内嵌 JSON、检查 window 全局变量、扫描视频容器 DOM
- **AND** 首次执行时模拟用户交互触发懒加载
- **AND** 可选：iframe 内视频提取、整页正则扫描

#### Scenario: 视频分类与上报
- **WHEN** 发现视频 URL
- **THEN** 实现 `isMainVideoUrl()` 区分主图视频（main）和详情视频（detail）
- **AND** 双重去重：原始 URL 集合 + 归一化视频 ID 集合
- **AND** 视频上报格式：`{ url, type: 'main'|'detail', timestamp, pageUrl }`
- **AND** 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写

### Requirement: MyDepot 标题/链接/商品ID/访问时间提取
系统 SHALL 从 MyDepot 商品页提取商品标题、链接、ID 和访问时间，分别通过 `tauriBridge.send` 上报。

#### Scenario: 成功提取标题、链接、商品ID和访问时间
- **WHEN** 页面包含商品信息
- **THEN** 标题优先从 `h1`、`.productView-title`、`document.title`、`og:title` 提取，并清洗 MyDepot 后缀
- **AND** 链接取 `location.origin + location.pathname`（去除查询参数）
- **AND** 商品 ID 优先从 URL `variant` 参数提取，其次从 `/products/{handle}` 路径提取
- **AND** 访问时间格式为 `YYYY-MM-DD HH:mm`（**必须包含**）
- **AND** 分别通过 `tauriBridge.send('productTitle', title)`、`tauriBridge.send('productLink', link)`、`tauriBridge.send('productId', id)`、`tauriBridge.send('visitTime', visitTime)` 上报

#### Scenario: HylinkTitle 执行流程（对齐开发指南 GetHylinkTitle 模式）
- **WHEN** `run()` 被调用
- **THEN** 先清空旧数据：`tauriBridge.send('productTitle', '')` / `productLink` / `productId`
- **AND** 等待动态内容加载（`waitForDynamicContent`）
- **AND** 提取四字段并一次性上报

### Requirement: MyDepot 入口脚本编排
系统 SHALL 提供 `scraper-scripts/mydepot/index.ts` 入口文件，严格遵循开发指南的标准模板。

#### Scenario: 入口脚本启动
- **WHEN** mydepot.bundle.js 被注入到 WebView
- **THEN** `if (window !== window.top) return;` 防止 iframe 重复注入
- **AND** 立即启动视频拦截模块 `runVideo()`（不等待 DOMContentLoaded）
- **AND** 在 DOMContentLoaded 后执行 `runModulesOnIdle()`：
  1. `probeAndReportLogin(LOGIN_SELECTORS)` 登录探测（MyDepot 通常无需登录，选择器数组可为空）
  2. `tauriBridge.resetUploadedDataFlag()`
  3. `simulateScroll()` 触发懒加载
  4. `setupCaptchaWatcher()` 验证码监控（MyDepot 无验证码，`CAPTCHA_SELECTORS` 为空数组）
  5. 四个模块（Main/Sku/Detail/HylinkTitle）`forEach` 后台并行，每个模块有 `withTimeout` 15s 超时保护
  6. 模块若返回 cleanup function，推入 `cleanupFns` 数组
  7. 立即启动 `waitTaskCompletion()` 数据静默判定，与模块后台并行运行
- **AND** `waitTaskCompletion` 完成后统一调用 `cleanupFns` 清理各模块资源
- **AND** 完成后调用 `tauriBridge.completeTask(workerId)`
- **AND** 异常降级：有数据则 `completeTask`，无数据则 `failTask`

### Requirement: 构建脚本注册
系统 SHALL 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中注册 mydepot 入口。

#### Scenario: 构建成功
- **WHEN** 执行 `node scripts/build-scraper.mjs`
- **THEN** 成功生成 `dist-scripts/mydepot.bundle.js`

### Requirement: 共享工具函数使用
系统 SHALL 严格使用 `shared/utils.ts` 中的共享函数，禁止在子模块中重复定义本地版本。

#### Scenario: 共享函数使用规范
- **WHEN** 子模块需要延时功能
- **THEN** 使用 `import { sleep } from '../shared/utils'`，禁止定义本地 `sleep` 函数
- **AND** URL 清洗优先使用 `cleanImageUrl()` 和 `deduplicateUrls()`
- **AND** 仅在平台有特殊清洗需求时（如 Shopify UUID 后缀、数字尺寸后缀）才在模块内自定义补充清洗逻辑

## MODIFIED Requirements
无修改已有需求。

## REMOVED Requirements
无移除需求。
