# 小红书抓取脚本 Spec

## Why
项目已支持淘宝、京东、抖音等 30+ 平台的图片/视频抓取，但小红书（Redbook）平台的 `scraper-scripts/redbook/` 目录尚未创建。前端平台识别（`platform_resolver.rs`、`platforms/redbook.ts`、`registry.ts`）和构建入口（`build-scraper.mjs`）均已预留，需要补全核心的抓取脚本实现。

## What Changes
- 新增 `scraper-scripts/redbook/` 目录，包含 6 个模块文件：`index.ts`、`rbGetMain.ts`、`rbGetSku.ts`、`rbGetDetail.ts`、`rbGetVideo.ts`、`rbGetHylinkTitle.ts`
- 修改 `scripts/build-scraper.mjs`，注册 `redbook` 构建入口

## Impact
- Affected specs: 抓取脚本体系新增小红书平台支持
- Affected code: `scraper-scripts/redbook/`（新增）、`scripts/build-scraper.mjs`（修改）

## ADDED Requirements

### Requirement: 小红书抓取脚本

系统 SHALL 提供小红书（xiaohongshu.com）平台的图片、视频、标题抓取功能，通过 Tauri WebView Worker 注入脚本实现。

#### 架构约束（对齐《平台抓取脚本开发指南》）
- 所有模块 MUST 遵循项目现有 `scraper-scripts/` 架构：使用 `tauriBridge.send()` 上报数据，使用 `shared/utils.ts` 的共享工具函数
- 所有模块 MUST 移除浏览器插件特有的页面可见性/焦点/SPA导航检测/不活动定时器逻辑，由 Tauri 宿主的静默判定机制（`waitForCompletion`）接管
- 入口 `index.ts` MUST 遵循开发指南的标准模板：视频模块立即启动（document_start），其余模块在 DOMContentLoaded 后并行启动
- 所有模块 MUST 使用 `shared/utils.ts` 的 `sleep` 函数，禁止定义本地 `sleep`
- 所有模块 MUST 在入口处先 `tauriBridge.send(key, [])` 或 `tauriBridge.send(key, '')` 清空旧数据，避免上次残留
- 使用 MutationObserver/setInterval 的模块 MUST 返回清理函数，清理函数中必须同时清理 Observer 和定时器

#### Scenario: 主图提取（rbGetMain）— 重试获取 + 额外探测模式
- **WHEN** 用户访问小红书笔记页面
- **THEN** 系统先 `tauriBridge.send('MainPic', [])` 清空旧数据
- **AND** 从 `.search-layout__main`、`.feeds-container`、`.img-container`、`[class*="swiper-slide"]`、`.note-container` 五个容器精准提取图片 URL
- **AND** 从 `.footer`、`.parent-comment`、`.item-wrapper` 容器提取黑名单 URL 并过滤
- **AND** 保留完整 URL（小红书 CDN 需要完整签名参数），仅排除非图片资源、视频资源、头像等
- **AND** 使用 `shared/utils.ts` 的 `deduplicateUrls` 去重
- **AND** 循环重试（MAX_RETRIES × RETRY_INTERVAL）等待容器出现，获取到图片后额外探测（MAX_EXTRA_FETCHES）合并去重
- **AND** 通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: SKU图提取（rbGetSku）— MutationObserver 动态监听 + 返回清理函数模式
- **WHEN** 用户访问小红书商品笔记页面
- **THEN** 系统先 `tauriBridge.send('SkuPic', [])` 清空旧数据
- **AND** 首轮扫描：双策略提取（策略1 从 `__INITIAL_STATE__` JSON 递归提取 `urlDefault`/`urlPre`/`url` 字段；策略2 从 DOM 容器 `.img-container` 和 `.swiper-slide` 提取），有结果立即上报
- **AND** 注册 MutationObserver 精确监听目标容器（非 document.body），监听 `childList` + `subtree` + `attributes`（`src`、`data-src`），图片数量增加时防抖后重新扫描上报
- **AND** 轮询兜底：首轮无结果时启动定时轮询，获取到结果后停止
- **AND** 数据保护：提取结果为空时，如果之前已有数据则保留，防止误清空
- **AND** MUST 返回清理函数，同时清理 `observer.disconnect()` 和 `clearInterval(pollTimer)`

#### Scenario: 详情图提取（rbGetDetail）— 重试等待容器 + 多轮遍历模式
- **WHEN** 用户访问小红书笔记详情页
- **THEN** 系统先 `tauriBridge.send('DetailPic', [])` 清空旧数据
- **AND** 重试等待详情容器出现（MAX_CONTAINER_RETRIES × RETRY_INTERVAL）
- **AND** 多轮提取（EXTRACTION_PASSES）：每轮扫描 `.note-content`、`.desc`、`[class*="desc"]` 等正文容器内的 img 标签和背景图，间隔 PASS_DELAY_MS
- **AND** 通过 `tauriBridge.send('DetailPic', urls)` 上报

#### Scenario: 视频提取（rbGetVideo）— 多手段尽早介入模式
- **WHEN** 用户访问小红书视频笔记页面
- **THEN** 系统清空历史状态，立即启动以下策略（不等待 DOMContentLoaded）：
  - Performance API 增量监控：`performance.getEntriesByType('resource')` + 游标增量检测 + `requestAnimationFrame` 持续轮询
  - MutationObserver 监听 `<video>` 和 `<script>` 新增
- **AND** DOMContentLoaded 后启动以下策略：
  - `__INITIAL_STATE__` JSON 解析（提取 `stream.h264/h265/av1` 的 `masterUrl`/`backupUrls` 和 `consumer.originVideoKey`）
  - DOM 提取（video 元素 + 播放器容器 + `data-src`/`data-video` 属性）
  - 正则匹配 HTML（`masterUrl`、`originVideoKey`、`sns-video` 域名 URL）
- **AND** 精确区分视频 CDN（`sns-video-*` 放行）和图片 CDN（`sns-webpic-*` 拦截），拦截图片处理参数后缀（`!webp`、`!jpg` 等）
- **AND** 双重去重：原始 URL 集合 + 归一化视频 ID（18位十六进制）集合，优先保留高码率链接
- **AND** 视频分类上报：区分主图视频（main）和详情视频（detail），上报格式为 `{ url: string, type: 'main' | 'detail', timestamp: number, pageUrl: string }[]`
- **AND** 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写
- **AND** 通过 `tauriBridge.send('VideoUrls', videoObjects)` 上报

#### Scenario: 标题/链接提取（rbGetHylinkTitle）— 基础信息聚合模式
- **WHEN** 用户访问小红书笔记页面
- **THEN** 系统先清空旧数据：`tauriBridge.send('productTitle', '')`、`tauriBridge.send('productLink', '')`、`tauriBridge.send('productId', '')`、`tauriBridge.send('visitTime', '')`
- **AND** 等待动态内容加载（重试等待关键 DOM 元素出现）
- **AND** 多策略提取标题：`meta[property="og:title"]` → `#detail-title` / `.note-content .title` → `.mainTitle--R75fTcZL` → `h1` → 兜底 `document.title`
- **AND** 从 URL 提取笔记 ID（`/explore/{id}` 或 `keyword` 参数），使用平台专属解析
- **AND** 清洗商品链接：去除繁杂查询参数，规范化为 `/explore/{id}` 格式
- **AND** MUST 输出全部四个字段：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）
- **AND** 通过 `tauriBridge.send()` 分别上报四个字段

#### Scenario: 构建集成
- **WHEN** 执行 `npm run build:scraper` 或整体构建
- **THEN** `redbook.bundle.js` 被正确构建到 `dist-scripts/` 目录
- **AND** Rust 端 `platform_resolver.rs` 的 `Platform::Redbook.bundle_name()` 返回 `"redbook"`，与构建产物文件名匹配

## MODIFIED Requirements

### Requirement: 构建脚本平台注册
`scripts/build-scraper.mjs` 的 `PLATFORMS` 对象 MUST 新增 `redbook` 入口，指向 `scraper-scripts/redbook/index.ts`。

## REMOVED Requirements
无
