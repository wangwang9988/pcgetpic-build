# Ozon 平台抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688 等国内平台的抓取脚本，但 Ozon（俄罗斯最大电商平台）尚未实现 `scraper-scripts/ozon/` 下的抓取模块。Ozon 平台的前端平台注册（`PLATFORM_PATTERNS`、`registry.ts`、`platform_resolver.rs`）已就绪，但缺少核心的 DOM 数据提取脚本，导致用户输入 Ozon 商品 URL 后无法提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/ozon/` 目录，包含 6 个 TypeScript 模块：
  - `ozonGetMain.ts` — 主图提取（从 `data-widget="webGallery"` 的 `data-state` JSON + HTML img/srcset 正则 + NUXT State + JSON-LD 多方案提取）
  - `ozonGetSku.ts` — SKU 图提取（从 `data-widget="webAspects"` DOM + HTML 正则备用方案 + MutationObserver 精确监听 + 返回清理函数）
  - `ozonGetDetail.ts` — 详情图提取（从 `data-widget="webDescription"` + `#section-description` 容器提取 + MutationObserver 持续监听）
  - `ozonGetVideo.ts` — 视频提取（从 `data-state` JSON + `<video>` 标签 + XHR/Fetch 拦截 + Performance API + MutationObserver）
  - `ozonGetHylinkTitle.ts` — 标题/链接/商品ID/访问时间提取（从 `#productTitle` + `document.title` + URL 正则提取 ID）
  - `index.ts` — 入口编排（模块调度 + 登录检测 + 验证码检测 + 数据驱动完成判定）
- 修改 `scripts/build-scraper.mjs`，注册 `ozon` 平台入口
- 在 `src-tauri/src/login/mod.rs` 中为 Ozon 注册默认登录策略

## Impact
- Affected specs: 抓取脚本模块（scraper-scripts）
- Affected code:
  - `scraper-scripts/ozon/` (新增 6 文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/mod.rs` (新增 Ozon 登录策略注册)

## ADDED Requirements

### Requirement: 共享工具函数优先使用（跨模块约束）
所有模块 SHALL 优先使用 `shared/utils.ts` 中的共享工具函数，仅在平台有特殊清洗需求时才自定义逻辑。

#### Scenario: 共享 sleep
- **WHEN** 模块需要延时等待
- **THEN** 使用 `import { sleep } from '../shared/utils'`，禁止定义本地 `sleep` 函数

#### Scenario: 共享去重
- **WHEN** 模块需要对 URL 列表去重
- **THEN** 使用 `import { deduplicateUrls } from '../shared/utils'`

#### Scenario: 平台特有清洗
- **WHEN** Ozon 的 URL 清洗逻辑与通用 `cleanImageUrl()` 不同（如 Ozon CDN 路径段 `/c\d+/`、`/wc\d+/` 的尺寸还原）
- **THEN** 在模块内自定义 `getOriginalOzonUrl()` 等平台特有清洗函数

### Requirement: Ozon 主图提取 (ozonGetMain)
系统 SHALL 从 Ozon 商品页提取当前选中颜色的所有高清主图 URL。

#### Scenario: 从 data-state 提取主图
- **WHEN** 页面包含 `[data-widget="webGallery"]` 元素且其 `data-state` 属性包含有效 JSON
- **THEN** 解析 JSON 中的 `images` 数组、`coverImage`、`galleryItems`，提取 `ir.ozone.ru` 域名的图片 URL

#### Scenario: 从 HTML 正则补充提取
- **WHEN** `data-state` 方案未找到足够图片
- **THEN** 从 webGallery 区域 HTML 中匹配 `<img src>` 和 `srcset` 中的 `ir.ozone.ru` URL

#### Scenario: NUXT State 兜底
- **WHEN** 前两种方案均无结果
- **THEN** 从 `window.__NUXT__.state` 中匹配 `ir.ozone.ru/s3/multimedia` 图片链接

#### Scenario: 原图还原
- **WHEN** 提取到缩略图 URL（含 `/c\d+/`、`/wc\d+/` 路径段）
- **THEN** 将尺寸路径段替换为 `/wc1000/`（高清），移除查询参数

#### Scenario: 过滤无效图片
- **WHEN** URL 包含 `/cms/`、`/icons/`、`/logos/`、`sprite`、`_icon` 模式
- **THEN** 排除该 URL（这些是网站 UI 元素，非商品图）

#### Scenario: 重试 + 额外探测
- **WHEN** 首次提取无结果
- **THEN** 最多重试 20 次（每次 1 秒），获取到图片后再额外探测 3 次（每次 500ms）合并去重

### Requirement: Ozon SKU 图提取 (ozonGetSku)
系统 SHALL 从 Ozon 商品页提取所有颜色/款式变体的 SKU 高清图片。

#### Scenario: 从 webAspects DOM 提取
- **WHEN** 页面包含 `div[data-widget="webAspects"]` 容器
- **THEN** 遍历其中所有 `<a>` 标签，提取 `<img>` 的 src，还原为高清 URL

#### Scenario: HTML 正则备用方案
- **WHEN** DOM 方案未找到 SKU 图片
- **THEN** 从 webAspects 区域 HTML 中正则匹配 `ir.ozone.ru` 图片 URL

#### Scenario: MutationObserver 精确监听
- **WHEN** 首次提取获得 SKU 图片
- **THEN** 对 `[data-widget="webAspects"]` 容器注册 MutationObserver，监听 childList + subtree + attributes（src/data-src/data-original），图片数量增加时防抖后重新扫描上报

#### Scenario: 返回清理函数
- **WHEN** 模块注册了 MutationObserver 和轮询定时器
- **THEN** 返回清理函数，同时 disconnect Observer 和 clearInterval 定时器，防止内存泄漏

#### Scenario: 轮询兜底
- **WHEN** 首次提取未获得 SKU 图片
- **THEN** 启动轮询定时器（最多 10 次，间隔 3 秒），获取到结果后停止轮询

### Requirement: Ozon 详情图提取 (ozonGetDetail)
系统 SHALL 从 Ozon 商品详情描述区域提取所有详情图片。

#### Scenario: 从描述容器提取
- **WHEN** 页面包含 `[data-widget="webDescription"]` 或 `#section-description` 容器
- **THEN** 从容器内 `<img>` 标签的 src/data-src/data-lazy-src/data-original 属性提取 URL

#### Scenario: 背景图提取
- **WHEN** 容器内元素使用 `background-image` CSS 样式
- **THEN** 从 `style` 属性中提取 `url()` 内的图片地址

#### Scenario: noscript 标签提取
- **WHEN** 容器内存在 `<noscript>` 标签（SEO 备份图片）
- **THEN** 从中提取 `<img src>` URL

#### Scenario: 详情图 URL 清理
- **WHEN** 提取到详情图 URL
- **THEN** 仅移除查询参数，保持原始尺寸（详情图通常已是高清大图如 `/ww1200/`）

#### Scenario: MutationObserver 持续监听
- **WHEN** 详情区域内容可能动态增加（懒加载）
- **THEN** 注册 MutationObserver 监听容器，检测到图片增加时增量上报

#### Scenario: 返回清理函数
- **WHEN** 模块注册了 MutationObserver
- **THEN** 返回清理函数，disconnect Observer

### Requirement: Ozon 视频提取 (ozonGetVideo)
系统 SHALL 从 Ozon 商品页提取视频 URL。

#### Scenario: 从 data-state 提取视频
- **WHEN** 页面元素包含 `data-state` 属性且其中含 `video` 关键字
- **THEN** 解析 JSON 中的 `videos` 数组和 `videoCover` 对象，提取 `cdnvideo.v.ozone.ru` 域名的视频 URL

#### Scenario: HTML 正则兜底
- **WHEN** data-state 方案未找到视频
- **THEN** 从页面 HTML 中正则匹配 `cdnvideo.v.ozone.ru/vod/` 的 `.mp4` URL

#### Scenario: video 标签提取
- **WHEN** 页面存在 `<video>` 元素
- **THEN** 从 src/currentSrc 和 `<source>` 子元素提取有效视频 URL

#### Scenario: XHR/Fetch 拦截
- **WHEN** 页面发起网络请求
- **THEN** 拦截 XHR 和 Fetch 请求的响应，从中提取视频 URL

#### Scenario: Performance API 增量监控
- **WHEN** 页面加载视频资源
- **THEN** 使用 `performance.getEntriesByType('resource')` + requestAnimationFrame 循环增量检测视频 URL

#### Scenario: 视频有效性验证
- **WHEN** URL 包含 `/cover/`、`ozon-webmanifests`、`frontend-ozon`、图片扩展名
- **THEN** 排除该 URL（封面图/网站资源/非视频文件）

#### Scenario: 视频双重去重
- **WHEN** 发现新视频 URL
- **THEN** 基于原始 URL 集合 + 归一化视频 ID 集合（从 `/video-\d+/VIDEO_ID/` 提取）双重去重

#### Scenario: 视频分类上报
- **WHEN** 发现有效视频
- **THEN** 区分 main/detail 类型，使用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到头部回写

### Requirement: Ozon 标题/链接/商品ID/访问时间提取 (ozonGetHylinkTitle)
系统 SHALL 从 Ozon 商品页提取商品标题、清洁链接、商品ID和访问时间。

#### Scenario: 标题提取
- **WHEN** 页面包含 `#productTitle` 元素
- **THEN** 从其 textContent 获取标题
- **WHEN** 不存在 `#productTitle` 元素
- **THEN** 从 `<head><title>` 或 `document.title` 兜底获取

#### Scenario: 标题清理
- **WHEN** 标题包含 " - OZON" 或 " — интернет-магазин OZON" 后缀
- **THEN** 移除该后缀

#### Scenario: 商品ID提取
- **WHEN** URL 匹配 `/product/(?:.*-)?(\d+)` 或 `/context/detail/id/(\d+)` 模式
- **THEN** 提取数字部分作为商品ID

#### Scenario: URL 清洗
- **WHEN** 获取到原始 URL
- **THEN** 仅保留 origin + pathname，移除查询参数和 hash

#### Scenario: 访问时间
- **WHEN** 模块执行提取
- **THEN** 生成 `visitTime` 字段，格式 `YYYY-MM-DD HH:mm`，通过 `tauriBridge.send('visitTime', visitTime)` 上报

#### Scenario: 初始空上报
- **WHEN** 模块开始执行
- **THEN** 先 `tauriBridge.send('productTitle', '')`、`productLink`、`productId` 清空旧数据

### Requirement: Ozon 入口编排 (index)
系统 SHALL 编排 Ozon 各抓取模块的执行流程，严格遵循开发指南的标准模板。

#### Scenario: 模块调度
- **WHEN** 脚本在 Ozon 商品页启动
- **THEN** 立即启动视频拦截模块（不等待 DOMContentLoaded），DOM 就绪后并行运行 Main/Sku/Detail/HylinkTitle 模块

#### Scenario: 数据驱动完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 监控数据静默期，7 秒无新数据即判定完成

#### Scenario: 登录检测
- **WHEN** 页面包含登录相关元素
- **THEN** 通过 `probeAndReportLogin()` 上报 `LoginRequired` 事件，跳过所有抓取模块

#### Scenario: 验证码检测
- **WHEN** 页面出现验证码元素
- **THEN** 通过 `emitTauriEvent('captcha-detected')` 上报，验证码消失后上报 `captcha-resolved`，带节流保护（最多 3 次）

#### Scenario: 异常降级
- **WHEN** 流程发生异常
- **THEN** 有数据则 `completeTask`，无数据则 `failTask`

#### Scenario: 模块超时保护
- **WHEN** 单个模块执行超过 15 秒
- **THEN** 跳过该模块，不影响其他模块

### Requirement: 构建脚本注册
系统 SHALL 将 Ozon 平台注册到构建脚本中。

#### Scenario: 构建入口
- **WHEN** 执行 `build-scraper.mjs`
- **THEN** `ozon` 平台被构建为 `dist-scripts/ozon.bundle.js`

### Requirement: Ozon 登录策略注册
系统 SHALL 为 Ozon 注册默认登录策略。

#### Scenario: 登录检测
- **WHEN** Rust 端检测 Ozon 平台的登录状态
- **THEN** 使用 `DefaultLoginStrategy` 匹配 Ozon 登录页 URL 模式
