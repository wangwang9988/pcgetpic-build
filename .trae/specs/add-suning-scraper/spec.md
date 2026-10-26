# 苏宁(Suning)抓取脚本实现 Spec

## Why
项目已实现淘宝、京东等平台的抓取脚本，但苏宁平台仅有平台识别和URL清洗的前端基础设施，缺少核心的 `scraper-scripts/suning/` 抓取脚本模块。需要参考 `GetPic/entrypoints/modules/suning/` 下的原插件脚本，将其核心提取逻辑适配到 Tauri WebView Worker 架构（替换 `browser.runtime.sendMessage` 为 `tauriBridge.send`，移除插件特有的页面可见性/焦点/SPA导航检测逻辑，由 Tauri 宿主的静默判定机制接管）。

## What Changes
- 新增 `scraper-scripts/suning/` 目录，包含 6 个模块文件：
  - `snGetMain.ts` — 主图提取（src-large 属性扫描、URL清洗去参数、去重）
  - `snGetSku.ts` — SKU图提取（指定容器扫描、imgservice.suning.cn 域名过滤、尺寸参数清洗）
  - `snGetDetail.ts` — 详情图提取（多容器扫描、苏宁CDN域名校验、尺寸参数清洗）
  - `snGetVideo.ts` — 视频提取（DOM video元素扫描、Script标签JSON解析、XHR/Fetch拦截、Performance API监控、MutationObserver动态监听）
  - `snGetHylinkTitle.ts` — 标题/链接/商品ID提取（URL路径中 .html 前数字提取、标题等待加载）
  - `index.ts` — 统一入口（模块编排、登录检测、验证码监控、任务完成判定）
- 修改 `scripts/build-scraper.mjs` — 注册 `suning` 平台入口

## Impact
- Affected specs: 无（纯新增功能）
- Affected code:
  - `scraper-scripts/suning/` (新增)
  - `scripts/build-scraper.mjs` (修改，新增1行)

## ADDED Requirements

### Requirement: 苏宁主图提取 (snGetMain)
系统 SHALL 从苏宁商品页 DOM 中提取商品主图 URL。

#### Scenario: 成功提取主图
- **WHEN** 苏宁商品页加载完成，页面中存在带 `src-large` 属性的 img 标签
- **THEN** 提取所有 `src-large` 属性值，补全 `//` 开头的协议为 `https:`，去除查询参数，过滤 `.svg` 文件，去重后通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: 页面无主图
- **WHEN** 页面中不存在带 `src-large` 属性的 img 标签
- **THEN** 通过轮询重试（MAX_RETRIES=100, RETRY_INTERVAL=500ms）等待异步渲染，最终上报空数组

### Requirement: 苏宁SKU图提取 (snGetSku)
系统 SHALL 从苏宁商品页指定容器中提取SKU规格图片 URL。

#### Scenario: 成功提取SKU图
- **WHEN** 页面中存在 `#J-TZM`、`#colorItemList`、`.clr-item` 容器且包含 img 标签
- **THEN** 提取 `src` 属性中包含 `imgservice.suning.cn` 的图片URL，清洗尺寸参数（`_\d+w_\d+h_\w+`），补全协议，去重后通过 `tauriBridge.send('SkuPic', urls)` 上报

### Requirement: 苏宁详情图提取 (snGetDetail)
系统 SHALL 从苏宁商品页多个详情容器中提取详情图片 URL。

#### Scenario: 成功提取详情图
- **WHEN** 页面中存在 `#product-detail`、`#J-procon-desc`、`[modulename="商品详情"]` 等容器
- **THEN** 扫描容器内 img 标签的 src/data-src/lazy-src 属性，校验苏宁CDN域名（uimgproxy.suning.cn/image.suning.cn/res.suning.cn），清洗尺寸参数，过滤 icon-img 类名和 blank.gif/spacer.gif，去重后通过 `tauriBridge.send('DetailPic', urls)` 上报

### Requirement: 苏宁视频提取 (snGetVideo)
系统 SHALL 从苏宁商品页提取商品视频 URL。

#### Scenario: 成功提取视频
- **WHEN** 页面中存在 video 元素、Script标签内嵌JSON包含视频URL、或网络请求中包含媒体资源
- **THEN** 通过 DOM扫描 + Script JSON解析 + XHR/Fetch拦截 + Performance API监控 + MutationObserver动态监听等多种策略提取视频URL，过滤非视频资源（js/css/json/图片等），归一化去重后通过 `tauriBridge.send('VideoUrls', videos)` 上报

#### Scenario: 视频懒加载
- **WHEN** 视频采用懒加载策略，初始DOM中不存在
- **THEN** 通过模拟用户交互（mouseover/click事件）触发视频加载，延时梯度扫描（1s/3s/5s/10s）覆盖异步渲染

### Requirement: 苏宁标题/链接/商品ID提取 (snGetHylinkTitle)
系统 SHALL 从苏宁商品页提取商品标题、链接和商品ID。

#### Scenario: 成功提取标题信息
- **WHEN** 苏宁商品页加载完成
- **THEN** 从 document.title 提取标题，从 URL 路径中提取 `.html` 前的数字作为商品ID（格式：`/0000000000/12417428830.html`），清洗URL去除查询参数，通过 `tauriBridge.send` 分别上报 productTitle/productLink/productId/visitTime

### Requirement: 苏宁抓取脚本入口 (index.ts)
系统 SHALL 提供统一的苏宁抓取脚本入口，编排各模块执行时序。

#### Scenario: 正常执行流程
- **WHEN** 苏宁抓取脚本被注入到 WebView Worker
- **THEN** 立即启动视频拦截模块（document_start时序），等待DOMContentLoaded后依次执行登录检测→模拟滚动→验证码监控→并行启动Main/Sku/Detail/HylinkTitle模块→等待任务完成判定→completeTask

#### Scenario: 检测到登录
- **WHEN** 页面中存在苏宁登录元素
- **THEN** 通过 probeAndReportLogin 上报 LoginRequired，跳过抓取模块

### Requirement: 构建脚本注册
系统 SHALL 在构建脚本中注册苏宁平台入口。

#### Scenario: 构建苏宁bundle
- **WHEN** 执行 build-scraper.mjs 构建脚本
- **THEN** 生成 `dist-scripts/suning.bundle.js` 文件
