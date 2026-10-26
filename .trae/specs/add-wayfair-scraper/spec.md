# Wayfair 抓取脚本 Spec

## Why
项目已实现淘宝、京东等平台的抓取脚本，但缺少 Wayfair 平台支持。Wayfair 是美国家居电商巨头，其商品页面结构独特（Next.js SSR、`__NEXT_DATA__` JSON、`srcset` 响应式图片、Shadow DOM 视频嵌入），需要专门的抓取脚本适配。参考 `GetPic/entrypoints/modules/wayfair/` 下的 5 个模块脚本，将其移植为 Tauri WebView 注入的 IIFE 脚本。

## What Changes
- 新增 `scraper-scripts/wayfair/` 目录，包含 6 个 TypeScript 文件：
  - `index.ts` — 入口编排（登录检测、验证码监控、模块调度、完成判定）
  - `wfGetMain.ts` — 主图提取（3 策略并行：ProductDetailImageCarousel / MediaTray / WaymoreModulesContainer）
  - `wfGetDetail.ts` — 详情图提取（highlights 区域 + WaymoreModulesContainer 区域）
  - `wfGetSku.ts` — SKU 图提取（全量 img 扫描 + srcset 宽度阈值过滤 ≥700w）
  - `wfGetVideo.ts` — 视频提取（`__NEXT_DATA__` JSON 解析 + XHR/Fetch 拦截 + DOM video 元素 + Shadow DOM 穿透）
  - `wfGetHylinkTitle.ts` — 标题/链接/商品ID 提取（document.title 等待 + piid 参数 / -w{sku}.html 路径提取）
- 修改 `scripts/build-scraper.mjs`：注册 `wayfair` 入口

## Impact
- Affected specs: scraper-scripts 模块体系
- Affected code:
  - `scraper-scripts/wayfair/` (新增 6 文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
- 不影响已有平台功能，纯增量

## ADDED Requirements

### Requirement: Wayfair 主图提取 (wfGetMain)
系统 SHALL 从 Wayfair 商品页面提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### Scenario: 新版 ProductDetailImageCarousel 结构
- **WHEN** 页面包含 `.ProductDetailImageCarousel-carouselItem` 元素
- **THEN** 从每个 carouselItem 中优先提取 `img[data-hb-id="FixedImage"]`，降级 `img[data-hb-id="FluidImage"]`，再降级任意 `img`；从 `srcset` 取最大尺寸 URL

#### Scenario: MediaTray 结构
- **WHEN** 页面包含 `[data-name="MediaTray"]` 容器
- **THEN** 提取其中 `img[data-hb-id="FluidImage"]`、`[data-hb-id="Carousel.Item"] img`、`[data-test-id*="mainImageCarousel"] img` 的 srcset 最大尺寸 URL

#### Scenario: WaymoreModulesContainer 品牌展示图
- **WHEN** 页面包含 `.WaymoreModulesContainer-modules` 容器
- **THEN** 提取 `.WaymoreBlock-media img`、`img.ImageComponent-image`、`img[data-codeception-id="ImageComponent"]` 及 `video[poster]` 封面图

#### Scenario: 小图过滤
- **WHEN** srcset 宽度描述符 < 400w
- **THEN** 跳过该图片（避免抓取缩略图）

#### Scenario: URL 清洗
- **WHEN** 提取到图片 URL
- **THEN** 去除查询参数，过滤 `.svg` 文件和黑名单 URL，去重后上报

### Requirement: Wayfair 详情图提取 (wfGetDetail)
系统 SHALL 从 Wayfair 商品页面的品牌详情区域提取图片 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### Scenario: highlights 区域提取
- **WHEN** 页面包含 `[data-anchor-tag="highlights"]` 或 `[data-node-id*="BlockBuilderHighlights"]` 容器
- **THEN** 提取 `img[data-hb-id="FluidImage"]`、`img[data-hb-id="Image"]`、`img.ImageComponent-image`、`img[data-codeception-id="ImageComponent"]` 及 `video[poster]` 封面图

#### Scenario: 仅保留 Wayfair CDN 图片
- **WHEN** 提取到图片 URL
- **THEN** 仅保留 `assets.wfcdn.com` 域名下的图片 URL，过滤 blank.gif/spacer.gif 等占位图

### Requirement: Wayfair SKU 图提取 (wfGetSku)
系统 SHALL 从 Wayfair 商品页面提取 SKU 变体图片 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### Scenario: 全量 img 扫描 + 宽度阈值
- **WHEN** 页面加载完成
- **THEN** 扫描所有 `img` 标签的 `srcset`，仅保留宽度描述符 ≥ 700w 的候选项，取每个 img 的最大尺寸 URL

#### Scenario: URL 清洗
- **WHEN** 提取到 SKU 图片 URL
- **THEN** 去除查询参数，去重后上报

### Requirement: Wayfair 视频提取 (wfGetVideo)
系统 SHALL 从 Wayfair 商品页面提取视频 URL 列表，通过 `tauriBridge.send('VideoUrls', videos)` 上报。

#### Scenario: __NEXT_DATA__ JSON 解析
- **WHEN** 页面包含 `script#__NEXT_DATA__` 标签
- **THEN** 解析 `product.videoMap`、`product.videos` 数组、`product.hero.video/hero.videoUrl`，递归搜索 product 对象中的视频 URL

#### Scenario: DOM video 元素提取
- **WHEN** 页面包含 `<video>` 元素
- **THEN** 提取 `video.src` / `video.currentSrc` 及子 `<source>` 元素的 src

#### Scenario: XHR/Fetch 拦截
- **WHEN** 页面发起网络请求
- **THEN** 拦截 XMLHttpRequest 和 Fetch 请求，检测响应中的视频 URL（mp4/m3u8/flv 等）

#### Scenario: Shadow DOM 穿透
- **WHEN** 页面包含 `syndigo-powerpage` 等 Web Components
- **THEN** 穿透 Shadow DOM 提取内部 video 元素

#### Scenario: 视频去重
- **WHEN** 发现视频 URL
- **THEN** 通过 URL 规范化（提取文件名中的数字 ID）进行去重，避免同一视频重复上报

### Requirement: Wayfair 标题/链接/商品ID 提取 (wfGetHylinkTitle)
系统 SHALL 从 Wayfair 商品页面提取商品标题、干净链接和商品ID。

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 等待 `document.title` 包含有效内容（长度 > 10 且包含品牌名），通过 `tauriBridge.send('productTitle', title)` 上报

#### Scenario: 商品 ID 提取
- **WHEN** URL 包含 `piid` 查询参数
- **THEN** 提取 piid 值作为商品 ID
- **WHEN** URL 不含 piid 但路径匹配 `-w{sku}.html`
- **THEN** 提取 sku 数字作为商品 ID

#### Scenario: 干净链接生成
- **WHEN** 提取到商品 URL
- **THEN** 去除查询参数，仅保留 origin + pathname，通过 `tauriBridge.send('productLink', cleanUrl)` 上报

### Requirement: Wayfair 入口编排 (index.ts)
系统 SHALL 提供统一的 Wayfair 抓取脚本入口，遵循项目现有模式。

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中运行
- **THEN** 立即退出，仅在主窗口执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动视频拦截模块（XHR/Fetch 拦截需尽早执行）

#### Scenario: 数据模块延迟启动
- **WHEN** DOMContentLoaded 事件触发
- **THEN** 依次执行登录检测、模拟滚动、验证码监控、后台并行启动 Main/Sku/Detail/HylinkTitle 模块

#### Scenario: 完成判定
- **WHEN** 所有模块启动后
- **THEN** 使用 `waitForCompletion()` 数据静默超时判定（7s 无新图片 → 完成，15s 最大超时兜底）

#### Scenario: 登录检测
- **WHEN** 页面包含登录相关元素
- **THEN** 通过 `probeAndReportLogin()` 上报 `LoginRequired` 事件，跳过抓取模块

### Requirement: 构建配置注册
系统 SHALL 将 Wayfair 抓取脚本注册到 Vite IIFE 构建流程。

#### Scenario: build-scraper.mjs 注册
- **WHEN** 执行 `npm run build:scraper`
- **THEN** Wayfair 入口被构建为 `dist-scripts/wayfair.bundle.js`

## MODIFIED Requirements
无修改已有需求。

## REMOVED Requirements
无移除需求。
