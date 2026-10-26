# MercadoLibre 抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688 等平台的抓取脚本，但 MercadoLibre（美客多）平台虽有平台识别和 URL 清洗配置，尚未实现 `scraper-scripts/mercadolibre/` 下的抓取脚本。需要参考 `GetPic/entrypoints/modules/mercadolibre/` 下的 6 个模块，将其核心提取逻辑移植为 Tauri WebView 注入脚本。

## What Changes
- 新增 `scraper-scripts/mercadolibre/` 目录，包含 6 个 TypeScript 文件：
  - `index.ts` — 入口编排（视频立即启动，其余模块 DOMContentLoaded 后并行启动）
  - `mlGetMain.ts` — 主图提取（从 `#__PRELOADED_STATE__` 和 `#__NORDIC_RENDERING_CTX__` JSON 提取）
  - `mlGetDetail.ts` — 详情图提取（JSON enhanced_content + DOM 容器兜底）
  - `mlGetSku.ts` — SKU 变体图提取（精准选择器 + URL 转换）
  - `mlGetVideo.ts` — 视频提取（网络拦截 + JSON 解析 + M3U8 解析）
  - `mlGetHylinkTitle.ts` — 标题/链接/商品ID 提取
- 修改 `scripts/build-scraper.mjs`，注册 `mercadolibre` 平台入口
- 修改 `src-tauri/src/login/mod.rs`，为 MercadoLibre 注册默认登录策略

## Impact
- Affected specs: scraper-scripts 构建流程、登录策略注册
- Affected code: `scripts/build-scraper.mjs`、`src-tauri/src/login/mod.rs`
- 不影响已有平台功能

## ADDED Requirements

### Requirement: MercadoLibre 主图提取 (mlGetMain.ts)
系统 SHALL 从 MercadoLibre 商品页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### Scenario: 从 __PRELOADED_STATE__ 提取主图
- **WHEN** 页面包含 `#__PRELOADED_STATE__` script 标签
- **THEN** 解析 JSON，导航至 `pageState.initialState.components.gallery.pictures`，对每个 `pic.id` 生成高清 URL `https://http2.mlstatic.com/D_NQ_NP_2X_{id}-F.webp`

#### Scenario: 从 __NORDIC_RENDERING_CTX__ 提取主图（备选）
- **WHEN** `#__PRELOADED_STATE__` 不存在或无图片数据
- **THEN** 解析 `#__NORDIC_RENDERING_CTX__`，使用花括号计数法提取 JSON，导航至 `appProps.pageProps.initialState.components.gallery.pictures`，生成相同格式高清 URL

#### Scenario: 重试等待
- **WHEN** 首次提取无结果
- **THEN** 以 500ms 间隔最多重试 100 次，找到后额外 3 轮增量抓取

### Requirement: MercadoLibre 详情图提取 (mlGetDetail.ts)
系统 SHALL 从 MercadoLibre 商品页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### Scenario: 从 __PRELOADED_STATE__ 提取 enhanced_content
- **WHEN** 页面包含 `#__PRELOADED_STATE__` script 标签
- **THEN** 解析 JSON，导航至 `pageState.initialState.components.enhanced_content.media_content`，过滤 `type === 'image'` 的项，对每个 `item.id` 生成高清 URL `https://http2.mlstatic.com/D_NQ_NP_2X_{id}-F.webp`

#### Scenario: DOM 容器兜底提取
- **WHEN** JSON 提取无结果
- **THEN** 使用选择器列表查找容器（`[data-testid="enhanced-content"]`、`.ui-pdp-enhanced-content`、`.ui-pdp-description` 等），从 `img` 元素的 `src`/`data-src`/`srcset`（2x 优先）提取 URL

#### Scenario: URL 清洗还原
- **WHEN** 提取到 mlstatic.com 图片 URL
- **THEN** 将尺寸后缀 `-B.webp`/`-L.webp`/`-O.webp`/`-V.webp`/`-C.webp`/`-I.webp` 替换为 `-F.webp`；将 `D_NQ_NP_` 替换为 `D_NQ_NP_2X_`

#### Scenario: 容器重试
- **WHEN** 首次未找到容器
- **THEN** 以 1000ms 间隔最多重试 5 次

### Requirement: MercadoLibre SKU 变体图提取 (mlGetSku.ts)
系统 SHALL 从 MercadoLibre 商品页提取 SKU 变体图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### Scenario: 精准选择器提取
- **WHEN** 页面包含 SKU 变体图片
- **THEN** 使用选择器 `.ui-pdp-outside_variations__items img.ui-pdp-outside_variations__thumbnails__item__picture` 和 `#outside_variations img.ui-pdp-image` 提取

#### Scenario: URL 转换
- **WHEN** 提取到 SKU 图片 URL
- **THEN** 将 `D_Q_NP_`/`D_Q_NP_2X_` 替换为 `D_NQ_NP_2X_`；将 `-R.webp`/`-R.jpg`/`-R.png` 替换为 `-F.webp`/`-F.jpg`/`-F.png`

#### Scenario: 重试与增量更新
- **WHEN** 首次提取无结果
- **THEN** 以 500ms 间隔最多重试 5 次；找到后以 500ms 间隔进行 3 轮增量更新

### Requirement: MercadoLibre 视频提取 (mlGetVideo.ts)
系统 SHALL 从 MercadoLibre 商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videos)` 上报。

#### Scenario: JSON 提取视频
- **WHEN** 页面 script 标签包含视频 URL
- **THEN** 匹配标准格式 `(https?://...mp4|m3u8|flv)` 和 Unicode 转义格式 `https:\u002F\u002F...`；解析 `_n.ctx.X={...}` 格式的 JSON

#### Scenario: 网络拦截
- **WHEN** 页面发起 XHR/Fetch 请求
- **THEN** 拦截响应，检测视频 URL 和 JSON 中的视频数据

#### Scenario: M3U8 Master Playlist 解析
- **WHEN** 发现 `.m3u8` URL
- **THEN** 通过 `tauriBridge` 代理 fetch 获取 playlist 内容，解析 `#EXT-X-STREAM-INF` 提取子流 URL

#### Scenario: DOM 视频元素检测
- **WHEN** 页面包含 `<video>` 元素
- **THEN** 提取 `src`/`currentSrc` 和 `<source>` 子元素

#### Scenario: 视频分类与去重
- **WHEN** 发现视频 URL
- **THEN** 按路径关键词分类为 `main`/`detail`；使用精确 URL + 归一化 ID 双重去重

### Requirement: MercadoLibre 标题/链接/商品ID 提取 (mlGetHylinkTitle.ts)
系统 SHALL 从 MercadoLibre 商品页提取标题、链接和商品 ID，通过 `tauriBridge.send()` 上报。

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `h1.ui-pdp-title` 提取；备选 `meta[name="twitter:title"]`/`meta[property="og:title"]`；兜底 `document.title`

#### Scenario: 商品 ID 提取
- **WHEN** 页面包含商品 ID
- **THEN** 优先从 `input[name="itemId"]` 获取；备选从 URL 正则 `([A-Z]{3})[-]?(\d+)` 提取

#### Scenario: URL 清洗
- **WHEN** 获取到商品链接
- **THEN** 仅保留 `origin + pathname`，去除查询参数

### Requirement: 入口编排 (index.ts)
系统 SHALL 在注入脚本后按正确时序启动各模块。

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入后
- **THEN** 立即启动 `mlGetVideo`（需拦截网络请求）

#### Scenario: 其余模块 DOMContentLoaded 后并行启动
- **WHEN** DOM 加载完成
- **THEN** 并行启动 `mlGetMain`、`mlGetSku`、`mlGetDetail`、`mlGetHylinkTitle`，使用 `waitForCompletion()` 判定任务完成

#### Scenario: 登录检测
- **WHEN** 页面包含登录元素
- **THEN** 通过 `probeAndReportLogin()` 上报 `LoginRequired`

### Requirement: 构建注册
系统 SHALL 将 MercadoLibre 抓取脚本注册到 Vite IIFE 构建流程。

#### Scenario: build-scraper.mjs 注册
- **WHEN** 运行 `npm run build:scraper`
- **THEN** `mercadolibre` 入口被构建为 `dist-scripts/mercadolibre.bundle.js`

### Requirement: 登录策略注册
系统 SHALL 为 MercadoLibre 注册默认登录策略。

#### Scenario: 登录 URL 检测
- **WHEN** Worker 导航到 MercadoLibre 登录页面
- **THEN** `DefaultLoginStrategy` 检测 `mercadolibre.com/login` 或 `mercadolivre.com/login` 并上报 `LoginRequired`

## MODIFIED Requirements
无修改已有需求。

## REMOVED Requirements
无移除需求。
