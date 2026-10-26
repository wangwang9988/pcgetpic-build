# Etsy 抓取脚本 Spec

## Why
Etsy 平台在前端平台检测（`platforms/index.ts`、`registry.ts`、`etsy.ts`）和 Rust 后端（`platform_resolver.rs`）中已完成注册，但缺少核心的抓取脚本实现（`scraper-scripts/etsy/`）。需要参考 `GetPic/entrypoints/modules/etsy/` 下的浏览器插件脚本，将其转换为 Tauri WebView 注入的 IIFE 格式，使用 `tauriBridge` 替代 `browser.runtime` 通信层。

## What Changes
- 新增 `scraper-scripts/etsy/etsyGetMain.ts`：从 JSON-LD 结构化数据提取主图 URL（contentURL），去除查询参数，过滤 .svg 和黑名单 URL
- 新增 `scraper-scripts/etsy/etsyGetDetail.ts`：从 DOM 容器提取详情图，支持 iframe 穿透（marketing-description-frame），使用 MutationObserver 增量更新
- 新增 `scraper-scripts/etsy/etsyGetSku.ts`：从轮播分页列表（`ul[data-carousel-pagination-list]`、`li[data-carousel-pagination-item]`）提取 SKU 图片，URL 高清化（`il_\d+x\d+` → `il_fullxfull`）
- 新增 `scraper-scripts/etsy/etsyGetVideo.ts`：从 JSON-LD VideoObject、`__NEXT_DATA__`、DOM video 元素提取视频 URL，拦截 XHR/fetch 网络请求，Performance API 监控
- 新增 `scraper-scripts/etsy/etsyGetHylinkTitle.ts`：提取商品标题（document.title）、商品 ID（URL 路径 `/listing/{id}`）、商品链接
- 新增 `scraper-scripts/etsy/index.ts`：统一入口，编排模块执行时序（Video 在 document_start，其余在 DOM 就绪后并行），数据驱动完成判定
- 修改 `scripts/build-scraper.mjs`：注册 `etsy` 平台入口

## Impact
- Affected specs: Etsy 平台抓取能力
- Affected code:
  - `scraper-scripts/etsy/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行注册)

## ADDED Requirements

### Requirement: Etsy 主图提取 (etsyGetMain)
系统 SHALL 从 Etsy 商品页的 JSON-LD 结构化数据（`script[type="application/ld+json"]`）中提取 Product 类型的 image.contentURL，去除查询参数还原原图链接，过滤 .svg 文件和黑名单 URL，去重后通过 tauriBridge.send('MainPic', urls) 上报。

#### Scenario: 成功提取主图
- **WHEN** Etsy 商品页加载完成，JSON-LD 中包含 Product 类型的 image 数组
- **THEN** 提取所有 contentURL，清理查询参数，去重后上报 MainPic

#### Scenario: JSON-LD 未加载
- **WHEN** 页面初始加载时 JSON-LD 尚未注入
- **THEN** 使用 MAX_RETRIES + RETRY_INTERVAL 轮询等待，直到数据出现或超时

### Requirement: Etsy 详情图提取 (etsyGetDetail)
系统 SHALL 从 Etsy 商品页的 DOM 容器中提取详情图片，支持 iframe 穿透查找（同源 iframe 如 marketing-description-frame），使用 MutationObserver 监听动态加载内容增量更新，过滤占位图和无效 URL。

#### Scenario: 主页面提取详情图
- **WHEN** Etsy 商品页详情区域包含图片
- **THEN** 从指定容器选择器中提取 img 标签的 src/data-src，清理 URL 后上报 DetailPic

#### Scenario: iframe 中提取详情图
- **WHEN** 详情图在 iframe（如 ebaydesc 同源 iframe）中
- **THEN** 穿透 iframe contentDocument 提取图片 URL，通过 postMessage 发送给主页面

### Requirement: Etsy SKU 图提取 (etsyGetSku)
系统 SHALL 从 Etsy 商品页的轮播分页列表容器中提取 SKU 图片，将缩略图 URL 转换为高清原图（`il_\d+x\d+` → `il_fullxfull`），过滤视频缩略图（v.etsystatic.com），去重后上报 SkuPic。

#### Scenario: 成功提取 SKU 图
- **WHEN** 页面包含 `ul[data-carousel-pagination-list]` 或 `li[data-carousel-pagination-item]` 容器
- **THEN** 提取 img 标签 src，高清化 URL，去重后上报 SkuPic

### Requirement: Etsy 视频提取 (etsyGetVideo)
系统 SHALL 从多种数据源提取 Etsy 商品视频 URL：JSON-LD VideoObject 的 contentURL/embedUrl、`__NEXT_DATA__` 的 product.videoMap/videos/hero、DOM video 元素、XHR/fetch 网络请求拦截、Performance API 资源监控。视频去重基于 URL 和规范化 ID 双重机制。

#### Scenario: 从 JSON-LD 提取视频
- **WHEN** 页面包含 VideoObject 类型的 JSON-LD
- **THEN** 提取 contentURL/contentUrl/url/embedUrl，验证为视频格式后上报 VideoUrls

#### Scenario: 从 __NEXT_DATA__ 提取视频
- **WHEN** 页面包含 `#__NEXT_DATA__` script 标签
- **THEN** 从 product.videoMap、product.videos、product.hero 中提取视频 URL

### Requirement: Etsy 标题链接提取 (etsyGetHylinkTitle)
系统 SHALL 从 Etsy 商品页提取商品标题（document.title，去除 " - Etsy" / " | Etsy" 后缀）、商品 ID（URL 路径 `/listing/{listingId}` 中的数字）、商品链接（去除查询参数的干净 URL），通过 tauriBridge 上报。

#### Scenario: 成功提取标题和 ID
- **WHEN** Etsy 商品页 URL 格式为 `/listing/{listingId}/{slug}`
- **THEN** 提取 listingId 作为 productId，document.title 清洗后作为 productTitle

### Requirement: Etsy 统一入口 (index.ts)
系统 SHALL 提供统一入口编排 Etsy 各抓取模块的执行时序：Video 模块在 document_start 阶段立即启动（网络拦截需要尽早注册），其余模块（Main/Sku/Detail/HylinkTitle）在 DOM 就绪后并行启动，使用数据驱动完成判定（waitForCompletion）决定任务结束时机。

#### Scenario: 正常执行流程
- **WHEN** Etsy 抓取脚本被注入到 WebView
- **THEN** 立即启动 Video 模块，等待 DOM 就绪后并行启动其余模块，数据静默 7s 后完成任务

### Requirement: 构建注册
系统 SHALL 在 `scripts/build-scraper.mjs` 的 PLATFORMS 对象中注册 `etsy` 平台入口，使其能被构建为 `dist-scripts/etsy.bundle.js`。

## MODIFIED Requirements

### Requirement: 构建脚本平台注册
在 `scripts/build-scraper.mjs` 的 PLATFORMS 对象中新增 `etsy` 条目，指向 `scraper-scripts/etsy/index.ts`。

## REMOVED Requirements
无
