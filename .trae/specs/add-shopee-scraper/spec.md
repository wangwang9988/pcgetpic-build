# Shopee (虾皮) 抓取脚本 Spec

## Why
项目已实现淘宝、京东、拼多多、唯品会、1688 等平台的抓取脚本，但 Shopee（虾皮）作为东南亚最大电商平台尚未实现。参考 `GetPic/entrypoints/modules/shopee/` 下的 5 个模块，需要将其适配为 Tauri WebView 注入的 IIFE 脚本，使用 `tauriBridge` 替代 `browser.runtime` 通信层。

## What Changes
- 新增 `scraper-scripts/shopee/` 目录，包含 6 个模块文件：
  - `shopeeGetMain.ts` — 主图提取（DOM 容器扫描 + URL 清洗还原原图）
  - `shopeeGetSku.ts` — SKU 图提取（DOM 容器扫描 + URL 清洗）
  - `shopeeGetDetail.ts` — 详情图提取（DOM 容器扫描 + URL 清洗）
  - `shopeeGetVideo.ts` — 视频提取（DOM video 标签 + Script 标签正则 + MutationObserver）
  - `shopeeGetHylinkTitle.ts` — 标题/链接/商品ID 提取（DOM + window 对象 + Script 标签）
  - `index.ts` — 入口编排（视频模块立即启动，其余模块 DOMContentLoaded 后并行启动，数据静默判定完成）
- 修改 `scripts/build-scraper.mjs`：注册 `shopee` 平台入口

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/shopee/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
- 不影响现有平台脚本，不影响 Rust 后端和 Vue 前端（Shopee 平台识别、URL 匹配、商品ID提取已在现有代码中实现）

## ADDED Requirements

### Requirement: Shopee 主图提取 (shopeeGetMain)
系统 SHALL 从 Shopee 商品详情页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### Scenario: 成功提取主图
- **WHEN** Shopee 商品页加载完成，DOM 中存在主图容器（`._OguPS` / `.airUhU` / `.UBG7wZ`）
- **THEN** 从容器内 `picture > source[srcset]`、`picture > img[src]`、`img[src]` 提取图片 URL，经过 `cleanImageUrl` 清洗后去重上报

#### Scenario: URL 清洗还原原图
- **WHEN** 图片 URL 包含缩略图后缀（如 `@resize_w82_nl.webp`）
- **THEN** 剥离后缀，还原为 `域名/file/哈希.扩展名` 格式的原图 URL
- **AND** 仅接受 `susercontent.com` 域名且包含 `/file/` 路径的 URL

### Requirement: Shopee SKU 图提取 (shopeeGetSku)
系统 SHALL 从 Shopee 商品详情页提取 SKU 图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### Scenario: 成功提取 SKU 图
- **WHEN** DOM 中存在 SKU 容器（`.W5LiQM` / `.KIoPj6` / `.j7HL5Q`）
- **THEN** 从容器内提取图片 URL，清洗去重后上报

### Requirement: Shopee 详情图提取 (shopeeGetDetail)
系统 SHALL 从 Shopee 商品详情页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### Scenario: 成功提取详情图
- **WHEN** DOM 中存在详情容器（`.product-detail` / `.page-product__detail` / `.QN2lPu` / `.I_DV_3`）
- **THEN** 从容器内提取图片 URL，清洗去重后上报

### Requirement: Shopee 视频提取 (shopeeGetVideo)
系统 SHALL 从 Shopee 商品详情页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videoObjects)` 上报。

#### Scenario: 成功提取视频
- **WHEN** 页面中存在 video 标签或 Script 标签中包含视频 URL
- **THEN** 从 DOM video 元素和 Script 标签正则匹配提取视频 URL，去重后以 `[{url: '...'}]` 格式上报
- **AND** 仅接受包含 `susercontent.com` / `shopeemobile.com` 域名且为 `.mp4/.m3u8/.webm/.mov` 格式的 URL

### Requirement: Shopee 标题/链接/商品ID 提取 (shopeeGetHylinkTitle)
系统 SHALL 从 Shopee 商品详情页提取商品标题、链接和商品ID。

#### Scenario: 成功提取标题和ID
- **WHEN** 页面加载完成
- **THEN** 通过 `document.title`（优先）或 `h1` 或 `meta[og:title]` 提取标题
- **AND** 通过 URL 路径模式（`-i.SHOPID.ITEMID`）或 URL 参数（`itemid`）提取商品ID
- **AND** 通过 `tauriBridge.send('productTitle', title)` / `tauriBridge.send('productLink', link)` / `tauriBridge.send('productId', id)` 上报

### Requirement: Shopee 入口编排 (index.ts)
系统 SHALL 按照与淘宝/京东一致的模式编排 Shopee 抓取脚本入口。

#### Scenario: 脚本启动流程
- **WHEN** 脚本被注入到 WebView
- **THEN** 立即启动视频拦截模块（document_start 时机）
- **AND** 在 DOMContentLoaded 后依次执行：登录检测 → 模拟滚动 → 验证码监控 → 并行启动 Main/Sku/Detail/HylinkTitle 模块 → 数据静默判定完成
- **AND** 完成后调用 `tauriBridge.completeTask()`，异常时根据是否有已上传数据决定 complete 或 fail

### Requirement: 构建注册
系统 SHALL 将 Shopee 平台注册到 scraper 构建脚本中。

#### Scenario: 构建产出
- **WHEN** 执行 `scripts/build-scraper.mjs`
- **THEN** 产出 `dist-scripts/shopee.bundle.js` IIFE 文件

## MODIFIED Requirements

### Requirement: 构建脚本 (build-scraper.mjs)
在 `PLATFORMS` 对象中新增 `shopee` 入口，指向 `scraper-scripts/shopee/index.ts`。

## REMOVED Requirements
无移除项。

---

## 关键适配说明（插件 → Tauri）

| 插件原逻辑 | Tauri 适配方案 |
|---|---|
| `browser.runtime.sendMessage({action:'setStorage', key, value})` | `tauriBridge.send(key, value)` |
| `browser.runtime.sendMessage({action:'getStorage', key})` | `tauriBridge.get(key)` |
| `defineContentScript({matches, runAt, main})` | 移除，由 Rust 端 `injector.rs` 控制注入时机 |
| 页面可见性/焦点检测 (visibilitychange/focus/blur) | 移除，由 Tauri 宿主静默判定 |
| 不活动超时 (5min inactivity timer) | 移除，由 `timeout_monitor.rs` 统一管理 |
| SPA 导航检测 (pushState/replaceState 拦截) | 移除，由 `worker_handlers.rs` 的 URL 纠偏机制处理 |
| 活动监控 (mousemove/keypress 等) | 移除，Tauri Worker 窗口无需用户交互 |
| `MainPicAll` / `DetailPicAll` 等历史累积存储 | 移除，Tauri 端 `scrape_handler.rs` 已有去重逻辑 |
| 重试稳定性检测 (stableCheckCount + extraFetchAfterStable) | 简化为 `MAX_RETRIES + RETRY_INTERVAL` 轮询 + `waitForCompletion` 数据静默判定 |

## Shopee 特有 URL 清洗逻辑

Shopee 图片 URL 格式：
- 缩略图：`https://down-sg.img.susercontent.com/file/{hash}@resize_w82_nl.webp`
- 原图：`https://down-sg.img.susercontent.com/file/{hash}.webp`

清洗规则：
1. 提取 `/file/` 后的哈希值（支持 32 位十六进制和带连字符格式）
2. 剥离 `@` 后的缩略图后缀
3. 拼接 `域名/file/哈希.扩展名` 还原原图

此逻辑与淘宝/京东的 `truncateToExtension` 不同，需要独立实现 `cleanShopeeImageUrl` 函数。
