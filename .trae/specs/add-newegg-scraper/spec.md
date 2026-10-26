# Newegg 抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688 等平台的抓取脚本，但 Newegg 平台（`newegg.com`）的 `scraper-scripts/newegg/` 目录尚未实现。Rust 端 `Platform::Newegg` 枚举和前端 `neweggHandler` 已就绪，仅缺少注入 WebView 的抓取脚本本体，导致 Newegg 商品页无法提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/newegg/` 目录，包含 6 个模块文件：
  - `index.ts` — 入口编排（参考 `jd/index.ts` 模式）
  - `neGetMain.ts` — 主图提取（参考 `GetPic/entrypoints/modules/newegg/neweggGetMain.js`）
  - `neGetSku.ts` — SKU 图提取（参考 `GetPic/entrypoints/modules/newegg/neweggGetSku.js`）
  - `neGetDetail.ts` — 详情图提取（参考 `GetPic/entrypoints/modules/newegg/neweggGetDetail.js`）
  - `neGetVideo.ts` — 视频提取（参考 `GetPic/entrypoints/modules/newegg/neweggGetVideo.js`）
  - `neGetHylinkTitle.ts` — 标题/链接/商品ID提取（参考 `GetPic/entrypoints/modules/newegg/neweggGetHylinkTitle.js`）
- 新增 `scraper-scripts/newegg/neUtils.ts` — 共享工具函数（商品ID提取）
- 修改 `scripts/build-scraper.mjs` — 注册 `newegg` 平台入口

## Impact
- Affected code:
  - `scraper-scripts/newegg/` — 全部新增
  - `scripts/build-scraper.mjs` — 新增一行入口注册
- 不涉及 Rust 端或 Vue 前端修改（`Platform::Newegg`、`neweggHandler` 已存在）

## ADDED Requirements

### Requirement: Newegg 抓取脚本实现

系统 SHALL 在 `scraper-scripts/newegg/` 下实现 Newegg 平台的完整抓取脚本，遵循项目既有的 Tauri WebView 注入架构（`tauriBridge.send` 通信、`waitForCompletion` 完成判定、`simulateScroll` 滚动触发懒加载）。

#### Scenario: 主图提取
- **WHEN** Newegg 商品页加载完成
- **THEN** 脚本从 `#ProductViewSticky img`、`.objImages img`、`.product-view-bar-box img`、`.swiper-zoom-container img`、`.product-hover-panel img` 等选择器提取主图 URL
- **AND** 将缩略图路径（`/productimage/nb640/`、`/ProductImageCompressAll60/` 等）统一替换为高清路径 `/productimage/nb1280/`
- **AND** 排除含 `logo` 类名或 alt 包含 "logo" 的图片
- **AND** 通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: SKU 图提取
- **WHEN** Newegg 商品页加载完成
- **THEN** 脚本从 Stylitics 穿搭模块（`img[data-testid="stylitics-ui-image"]`、`[data-collage-img]`）和原生轮播图模块（`.product-qv-images picture img.picture-image`）提取 SKU 图
- **AND** 对 Adobe Scene7 服务器图片（路径含 `/is/image/`）追加 `wid=1500&fmt=jpeg&qlt=90` 参数获取高清版本
- **AND** Stylitics 平台图片（域名含 `stylitics.com`）保持原 URL 不变
- **AND** 通过 `tauriBridge.send('SkuPic', urls)` 上报

#### Scenario: 详情图提取
- **WHEN** Newegg 商品页加载完成
- **THEN** 脚本从 `#overview-desktop`、`#product-details` 容器提取详情图
- **AND** 排除黑名单图片（如 `https://c1.neweggimages.com/WebResource/Themes/Nest/images/icons/Autor.png`）
- **AND** 通过 `tauriBridge.send('DetailPic', urls)` 上报

#### Scenario: 视频提取
- **WHEN** Newegg 商品页加载完成
- **THEN** 脚本通过多种策略检测视频：DOM video 元素扫描、页面内嵌 JSON 解析（`__MODERN_ROUTER_DATA__`）、XHR/Fetch 拦截、Performance API 监控、MutationObserver 动态监听
- **AND** 识别 Newegg 视频 CDN 域名特征（`macyscdn-us.com`、`ttcdn-us.com` 等）
- **AND** 通过 `tauriBridge.send('VideoUrls', videos)` 上报，视频对象包含 `url`、`type`（main/detail）、`timestamp`、`pageUrl`

#### Scenario: 标题/链接/商品ID提取
- **WHEN** Newegg 商品页加载完成
- **THEN** 脚本提取 `document.title` 作为商品标题
- **AND** 从 URL 查询参数 `?Item=` 或路径 `/p/` 后提取商品 ID
- **AND** 清洗 URL：保留 `origin + pathname`，若有 `Item` 参数则追加
- **AND** 通过 `tauriBridge.send('productTitle', ...)` / `tauriBridge.send('productLink', ...)` / `tauriBridge.send('productId', ...)` 上报

#### Scenario: 入口编排与完成判定
- **WHEN** 脚本被注入到 Newegg 商品页 WebView
- **THEN** 入口 `index.ts` 立即启动视频拦截模块（`neGetVideo`）
- **AND** 等待 `DOMContentLoaded` 后启动其余模块（`neGetMain`、`neGetSku`、`neGetDetail`、`neGetHylinkTitle`）
- **AND** 使用 `probeAndReportLogin` 检测登录状态
- **AND** 使用 `simulateScroll` 触发懒加载
- **AND** 使用 `waitForCompletion` 判定任务完成，完成后调用 `tauriBridge.completeTask`
- **AND** iframe 内不执行（`if (window !== window.top) return`）

#### Scenario: 构建集成
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** `newegg` 平台被构建为 `dist-scripts/newegg.bundle.js`
