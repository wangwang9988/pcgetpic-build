# 搜款网 (VVIC) 抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688 等平台的抓取脚本，但搜款网（vvic.com）平台尚未实现 `scraper-scripts/vvic/` 目录下的抓取模块。前端平台识别（`PLATFORM_PATTERNS`/`registry.ts`）和 Rust 端 `Platform::Vvic` 枚举均已就绪，缺少的是核心抓取逻辑和构建注册。

## What Changes
- 新增 `scraper-scripts/vvic/` 目录，包含 6 个模块文件：`index.ts`、`vvicGetMain.ts`、`vvicGetDetail.ts`、`vvicGetSku.ts`、`vvicGetVideo.ts`、`vvicGetHylinkTitle.ts`
- 在 `scripts/build-scraper.mjs` 中注册 `vvic` 平台入口
- 在 `src-tauri/src/login/mod.rs` 中为 VVIC 注册 `DefaultLoginStrategy`

## Impact
- Affected specs: 抓取脚本体系、构建系统、登录策略注册
- Affected code: `scraper-scripts/vvic/`（新增）、`scripts/build-scraper.mjs`（修改）、`src-tauri/src/login/mod.rs`（修改）

## ADDED Requirements

### Requirement: VVIC 主图提取 (vvicGetMain)
系统 SHALL 从搜款网商品页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### Scenario: 主图提取成功
- **WHEN** Worker 窗口加载 vvic.com 商品详情页
- **THEN** 脚本通过 `.thumbnail`、`#thumblist`、`.owl-item` 三个容器提取 `<img>` 元素
- **AND** 图片属性优先级为 `big` > `mid` > `src`（`big` 为原图属性）
- **AND** URL 清洗：补全 `//` → `https://`，截断到图片扩展名（去除 `_400x400.jpg`、`?x-oss-process=...` 等后缀）
- **AND** 过滤黑名单 URL（`main.vvic.com/img/`、`stall-recommend`、`main-download`、`/resource/img/`）
- **AND** 去重后通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: 主图容器延迟渲染
- **WHEN** 首次扫描未找到图片容器
- **THEN** 以 500ms 间隔重试，最多 20 次
- **AND** 首次找到后额外轮询 3 次（500ms 间隔）捕获延迟加载图片

### Requirement: VVIC 详情图提取 (vvicGetDetail)
系统 SHALL 从搜款网商品页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### Scenario: 详情图提取成功
- **WHEN** Worker 窗口加载 vvic.com 商品详情页
- **THEN** 脚本通过 `.item-detail-product-desc`、`.right-side`、`#info`、`.detail-desc` 四个容器提取 `<img>` 元素
- **AND** 图片属性优先级为 `data-src` > `src`（详情图使用懒加载，`data-src` 为真实 URL）
- **AND** URL 清洗逻辑同主图，额外过滤 `/img/none.` 懒加载占位图
- **AND** 去重后通过 `tauriBridge.send('DetailPic', urls)` 上报

#### Scenario: 详情图延迟渲染
- **WHEN** 首次扫描未找到详情图容器
- **THEN** 以 500ms 间隔重试，最多 20 次
- **AND** 首次找到后额外轮询 5 次（1000ms 间隔，详情图懒加载较慢）
- **AND** 初始化时延迟 1000ms 等待懒加载元素就绪

### Requirement: VVIC SKU 图提取 (vvicGetSku)
系统 SHALL 从搜款网商品页提取 SKU 图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### Scenario: SKU 图提取成功
- **WHEN** Worker 窗口加载 vvic.com 商品详情页
- **THEN** 脚本通过 `#skuInfo`、`.detail-info-line`、`#size-container` 三个容器提取 `<img>` 元素
- **AND** 图片属性优先级为 `big` > `mid` > `src`
- **AND** URL 清洗逻辑同主图，额外过滤 `https://img2.vvic.com/resource/img/pc/icons/df-icon.png`
- **AND** 去重后通过 `tauriBridge.send('SkuPic', urls)` 上报

#### Scenario: SKU 图延迟渲染
- **WHEN** 首次扫描未找到 SKU 图容器
- **THEN** 以 500ms 间隔重试，最多 20 次
- **AND** 首次找到后额外轮询 3 次（500ms 间隔）

### Requirement: VVIC 视频提取 (vvicGetVideo)
系统 SHALL 从搜款网商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videos)` 上报。

#### Scenario: 视频提取成功
- **WHEN** Worker 窗口加载 vvic.com 商品详情页
- **THEN** 脚本在 `document_start` 阶段启动，拦截 XHR/Fetch 网络请求
- **AND** 通过 DOM 检测（`<video>` 标签、`data-video-url`/`data-video`/`data-src` 属性）、页面 JSON 解析、Performance API 监控、MutationObserver 多渠道检测视频
- **AND** 所有视频统一分类为 `mainVideo`（VVIC 无详情视频区分）
- **AND** 视频去重基于 URL + 规范化 ID 双重机制
- **AND** 通过 `tauriBridge.send('VideoUrls', videos)` 上报，格式为 `{ url, type, timestamp, pageUrl }`

#### Scenario: 视频初始检测
- **WHEN** 页面 DOM 就绪后
- **THEN** 执行 10 轮初始检测（每秒 1 次），覆盖 DOM/JSON/Window 全渠道

### Requirement: VVIC 标题/链接提取 (vvicGetHylinkTitle)
系统 SHALL 从搜款网商品页提取商品标题、链接和 ID，通过 `tauriBridge.send()` 上报。

#### Scenario: 标题提取成功
- **WHEN** Worker 窗口加载 vvic.com 商品详情页
- **THEN** 脚本按优先级尝试 `.goods-title`、`.item-title`、`.product-title`、`.goods-name`、`.detail-title`、`h1.title`、`.main-title`、`[class*="goodsTitle"]`、`[class*="itemTitle"]` 选择器
- **AND** 降级使用 `document.title`（去除"搜款网"/"vvic"后缀）
- **AND** 商品 ID 从 URL 提取（`/item/{id}` 或 `/goods/{id}` 格式）
- **AND** 商品链接清洗为 `{origin}/item/{id}` 格式
- **AND** 通过 `tauriBridge.send('productTitle', title)`、`tauriBridge.send('productLink', url)`、`tauriBridge.send('productId', id)`、`tauriBridge.send('visitTime', time)` 上报

### Requirement: VVIC 入口脚本 (index.ts)
系统 SHALL 提供搜款网统一入口脚本，编排各模块执行时序。

#### Scenario: 入口脚本启动
- **WHEN** Rust 端注入 `vvic.bundle.js`
- **THEN** 入口脚本立即执行视频拦截模块（`document_start` 阶段需求）
- **AND** 等待 DOM 就绪后执行主图/SKU/详情图/标题模块
- **AND** 登录检测使用 `probeAndReportLogin()`，无平台特有登录选择器
- **AND** 完成判定使用 `waitForCompletion()` 数据驱动静默超时机制
- **AND** iframe 防护：`if (window !== window.top) return;`

### Requirement: 构建注册
系统 SHALL 将 VVIC 平台注册到构建脚本中。

#### Scenario: 构建注册
- **WHEN** 执行 `build-scraper.mjs` 构建脚本
- **THEN** `vvic` 平台被构建为 `dist-scripts/vvic.bundle.js` IIFE 格式

### Requirement: 登录策略注册
系统 SHALL 为 VVIC 注册默认登录策略。

#### Scenario: 登录策略注册
- **WHEN** Rust 后端初始化 `LoginStrategyRegistry`
- **THEN** VVIC 平台使用 `DefaultLoginStrategy`，登录 URL 模式包含 `login.vvic.com`

## MODIFIED Requirements

### Requirement: 构建脚本 (build-scraper.mjs)
在 `PLATFORMS` 对象中新增 `vvic` 条目，入口指向 `scraper-scripts/vvic/index.ts`。

## REMOVED Requirements
无
