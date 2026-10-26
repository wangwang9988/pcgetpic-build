# 沃尔玛(Walmart)抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东、亚马逊等平台的抓取脚本，但沃尔玛（全球最大零售商、美国电商市场份额第二）尚未实现。用户需要通过 PcGetPic 的 Worker 窗口自动加载沃尔玛商品页，提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/walmart/` 目录，包含 6 个 TypeScript 模块（index / wmGetMain / wmGetSku / wmGetDetail / wmGetVideo / wmGetHylinkTitle）
- 在 `scripts/build-scraper.mjs` 中注册 walmart 平台入口
- 在 `src-tauri/src/login/` 中新增 `walmart.rs` 登录策略并注册到 `LoginStrategyRegistry`
- 前端平台注册表和 Rust `Platform` 枚举已有 Walmart 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/walmart/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/walmart.rs` (新增)
  - `src-tauri/src/login/mod.rs` (注册策略)

## 设计对齐说明

本 Spec 严格遵循项目规范和已有平台（亚马逊/淘宝/京东）的实现模式：

### 对齐要点
1. **模块结构**：6 文件结构（index + 5 子模块），与亚马逊/淘宝/京东完全一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与项目架构一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，由 Tauri 宿主的静默判定机制接管
4. **保留核心提取逻辑**：DOM 选择器、`__NEXT_DATA__` JSON 解析、URL 清洗、MutationObserver、XHR/Fetch 拦截、Performance API、Shadow DOM 穿透 — 全部保留
5. **完成判定**：使用 `waitForCompletion()` 前端辅助 + Rust 后端静默自动完成
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测

### 沃尔玛特有复杂度（非过度设计）
沃尔玛页面结构与淘宝/京东/亚马逊有本质差异，以下逻辑是必需的：
- **Next.js SPA 架构**：沃尔玛使用 Next.js，商品数据在 `__NEXT_DATA__` JSON 中，但 SPA 导航时该标签不更新（保持旧数据），因此 JSON 提取在 SPA 场景下不可靠，需以 DOM 提取为主
- **Shadow DOM 穿透**：沃尔玛详情区域使用 `syndigo-powerpage` Web Components，需要递归穿透 Shadow DOM 提取图片和视频
- **跨域 iframe 支持**：沃尔玛详情内容可能嵌入 `media.sku.ninja` iframe，需要穿透同源 iframe 提取图片和视频
- **商品图片 URL 过滤**：沃尔玛 CDN 图片包含营销素材和图标，需通过 `/seo/` 或 `/asr/` 路径特征过滤出真正的商品图片
- **多区域域名**：walmart.com / walmart.ca / walmart.mx / walmart.com.mx，平台识别和 URL 清洗需覆盖所有区域

## ADDED Requirements

### Requirement: 沃尔玛主图提取 (wmGetMain)
系统 SHALL 从沃尔玛商品页提取所有主图 URL，遵循开发指南 GetMain 模板（初始化空值 → 提取 → 重试 → 额外抓取 → 上报）：

#### Scenario: DOM 容器扫描提取（主方案）
- **WHEN** 页面 DOM 加载完成
- **THEN** 按优先级扫描多个容器选择器：`[data-testid="vertical-hero-carousel"]`、`[data-testid="hero-image-container"]`、`[data-testid="media-thumbnail"]`、`[data-seo-id="hero-carousel-image"]` 等，从 `img` 标签的 `src`/`srcset` 属性提取 URL

#### Scenario: zoom-panel 背景图提取
- **WHEN** 页面存在 `#zoom-panel` 元素
- **THEN** 从 `background-image` 样式中提取高清放大图 URL

#### Scenario: __NEXT_DATA__ JSON 提取（备用方案，默认禁用）
- **WHEN** 页面为首次加载（非 SPA 导航）
- **THEN** 从 `script#__NEXT_DATA__` 解析 `product.imageMap`、`product.imageInfo.allImages`、`product.variantCriteria` 中的图片 URL。注意：SPA 导航时此数据不更新，会导致数据污染，默认禁用

#### Scenario: 商品图片 URL 过滤
- **WHEN** 提取到图片 URL
- **THEN** 仅保留包含 `/seo/` 或 `/asr/` 路径的 URL（真正的商品图片），过滤掉营销素材、图标等非商品图片

#### Scenario: URL 清洗
- **WHEN** 获取到沃尔玛图片 URL
- **THEN** 移除所有查询参数（`?` 后的内容），过滤掉 `.svg` 文件

### Requirement: 沃尔玛 SKU 图提取 (wmGetSku)
系统 SHALL 从沃尔玛商品页提取 SKU 变体图片 URL：

#### Scenario: DOM 选择器提取（主方案）
- **WHEN** 页面 DOM 加载完成
- **THEN** 扫描 SKU 容器选择器：`[data-testid="variantGroup"]`、`#item-page-variant-group-bg-div`、`[data-testid="variant-tile-chip"]`、`[role="list"][aria-label*="Color"]` 等，从 `vt-swatch` 背景图、`background-image` 样式、`img` 标签提取 URL

#### Scenario: __NEXT_DATA__ JSON swatchImageUrl 提取（备用方案，默认禁用）
- **WHEN** 页面为首次加载
- **THEN** 从 `product.variantCriteria[].variantList[].swatchImageUrl` 提取色彩选择器缩略图 URL。注意：SPA 导航时此数据不更新，默认禁用

#### Scenario: URL 清洗
- **WHEN** 获取到 SKU 图片 URL
- **THEN** 移除查询参数，仅保留 `http` 开头的 URL

### Requirement: 沃尔玛详情图提取 (wmGetDetail)
系统 SHALL 从沃尔玛商品页提取详情区域图片，支持 Shadow DOM 穿透和 iframe 穿透：

#### Scenario: 主页面详情容器提取
- **WHEN** 页面 DOM 加载完成
- **THEN** 扫描主页面详情容器选择器：`[data-testid="product-description-content"]`、`[data-testid="about-the-brand"]`、`#product-description-section`、`.product-description`，从 `img` 标签的 `data-src`/`currentSrc`/`src`/`srcset` 属性提取 URL

#### Scenario: Shadow DOM 穿透
- **WHEN** 详情容器内存在 `syndigo-powerpage` Web Components
- **THEN** 递归穿透 Shadow DOM，收集所有 `img` 和 `source` 元素的图片 URL

#### Scenario: 同源 iframe 穿透
- **WHEN** 页面包含 `#marketing-description-frame` 同源 iframe
- **THEN** 穿透 iframe 的 `contentDocument`，提取所有 `img` 标签和 Shadow DOM 中的图片

#### Scenario: URL 清洗与过滤
- **WHEN** 获取到详情图片 URL
- **THEN** 移除查询参数获取高清原图，过滤掉 `blank.gif`、`spacer.gif` 等无效图片，仅保留 jpg/jpeg/png/webp/gif 格式

### Requirement: 沃尔玛视频提取 (wmGetVideo)
系统 SHALL 从沃尔玛商品页提取视频 URL，支持多种检测方式：

#### Scenario: __NEXT_DATA__ JSON 视频提取
- **WHEN** 页面加载
- **THEN** 从 `product.videoMap`、`product.videos` 数组、`product.hero.video` 提取视频 URL

#### Scenario: DOM video 元素检测
- **WHEN** 页面中存在 `video` 标签
- **THEN** 从 `src`/`currentSrc` 和 `source` 子元素提取视频 URL，排除 `blob:` 协议

#### Scenario: XHR/Fetch 拦截
- **WHEN** 页面发起网络请求
- **THEN** 拦截请求，检测响应 URL 和响应体中的 `walmartimages.com` 视频 URL（mp4/m3u8 格式）

#### Scenario: Performance API 监控
- **WHEN** 页面有网络资源加载
- **THEN** 通过 `performance.getEntriesByType('resource')` 检测媒体资源请求

#### Scenario: MutationObserver 动态监听
- **WHEN** DOM 发生变化
- **THEN** 检测新插入的 `video` 标签和 `script` 标签，从中提取视频 URL

#### Scenario: Shadow DOM 和 iframe 穿透
- **WHEN** 页面存在 `syndigo-powerpage` 或 `#marketing-description-frame`
- **THEN** 递归穿透 Shadow DOM 和同源 iframe 查找 `video` 和 `source` 元素

#### Scenario: 视频分类与去重
- **WHEN** 发现视频 URL
- **THEN** 沃尔玛商品页视频默认视为主图视频（main），通过规范化 URL 文件名进行内容去重

### Requirement: 沃尔玛标题/链接/ID 提取 (wmGetHylinkTitle)
系统 SHALL 从沃尔玛商品页提取商品标题、链接和商品 ID：

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 从 `document.title` 提取标题，等待标题加载完成（最多 10 秒，500ms 间隔轮询），验证标题包含 "Walmart" 且长度 > 10

#### Scenario: 商品 ID 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 解析 URL 路径，提取最后一段纯数字段作为商品 ID（沃尔玛 URL 格式：`/ip/{slug}/{product_id}`）

#### Scenario: URL 清洗
- **WHEN** 提取商品链接
- **THEN** 移除查询参数，仅保留 `origin + pathname`

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报 `productTitle`、`productLink`、`productId`

### Requirement: 沃尔玛抓取脚本入口 (index.ts)
系统 SHALL 提供统一的沃尔玛抓取脚本入口，严格遵循标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `wmGetVideo` 模块（网络拦截需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(WALMART_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `wmGetMain`、`wmGetSku`、`wmGetDetail`、`wmGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将沃尔玛平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `walmart: resolve(projectRoot, 'scraper-scripts/walmart/index.ts')`，生成 `dist-scripts/walmart.bundle.js`

### Requirement: 沃尔玛登录策略
系统 SHALL 在 Rust 后端实现沃尔玛登录检测策略。使用 `DefaultLoginStrategy` 即可（沃尔玛商品 ID 可通过简单数字正则提取）：

#### Scenario: 登录页检测
- **WHEN** Worker 导航到沃尔玛登录相关 URL
- **THEN** 检测 `login.walmart.com`、`walmart.com/account/login` 等登录页面模式，返回 `LoginRequired`

#### Scenario: 商品 ID 提取
- **WHEN** 需要从 URL 提取商品 ID
- **THEN** 匹配 `/ip/{slug}/{product_id}` 格式提取纯数字商品 ID

#### Scenario: 平台非商品页检测
- **WHEN** CaptchaBlocked 恢复时
- **THEN** 判断 URL 是否仍在 `walmart.` 域名下但非 `/ip/` 商品页

## MODIFIED Requirements

### Requirement: LoginStrategyRegistry
`LoginStrategyRegistry::new()` SHALL 注册沃尔玛登录策略实例：
```rust
registry.register(Arc::new(default::DefaultLoginStrategy::new(
    "walmart",
    &["login.walmart.com", "walmart.com/account/login"],
    &["/ip/"],
)));
```

## REMOVED Requirements
无移除项。
