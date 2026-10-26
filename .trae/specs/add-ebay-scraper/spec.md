# eBay 抓取脚本 Spec

## Why
项目已在前端（`platforms/ebay.ts`、`PLATFORM_PATTERNS`、`registry.ts`）和 Rust 后端（`platform_resolver.rs`、`utils.rs`）完成 eBay 平台注册，但核心的 `scraper-scripts/ebay/` 抓取脚本尚未实现，导致 eBay 商品页无法提取主图、详情图、SKU 图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/ebay/` 目录，包含 6 个模块：`index.ts`、`ebayGetMain.ts`、`ebayGetDetail.ts`、`ebayGetSku.ts`、`ebayGetVideo.ts`、`ebayGetHylinkTitle.ts`
- 在 `scripts/build-scraper.mjs` 中注册 `ebay` 构建入口
- 在 `src-tauri/src/login/` 下新增 `ebay.rs` 登录策略并注册到 `mod.rs`

## Impact
- Affected specs: eBay 平台抓取能力（从无到有）
- Affected code:
  - `scraper-scripts/ebay/`（新增目录）
  - `scripts/build-scraper.mjs`（新增一行构建入口）
  - `src-tauri/src/login/ebay.rs`（新增文件）
  - `src-tauri/src/login/mod.rs`（注册 eBay 策略）

## ADDED Requirements

### Requirement: eBay 主图提取 (ebayGetMain)
系统 SHALL 从 eBay 商品页的 `<script>` 标签中提取 `$M_96613636_C` 变量内的 PICTURE 模块数据，获取 `zoomImg.URL` 和 `originalImg.URL` 作为主图 URL。

#### Scenario: 从 script 标签提取主图成功
- **WHEN** eBay 商品页加载完成且 `<script>` 标签包含 `$M_96613636_C`
- **THEN** 提取 `PICTURE.mediaList[].image.zoomImg.URL` 和 `originalImg.URL`，去重后通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: script 标签提取失败，使用备用正则
- **WHEN** PICTURE 模块解析失败
- **THEN** 使用正则匹配 `i.ebayimg.com/images/g/{id}/s-l1600.webp` 和 `cloudfront.net` CDN URL

#### Scenario: 全部方法失败，全页面搜索
- **WHEN** script 标签和备用正则均未提取到图片
- **THEN** 对 `document.documentElement.innerHTML` 执行全局搜索匹配 eBay 高清图和 CDN 图片 URL

### Requirement: eBay 详情图提取 (ebayGetDetail)
系统 SHALL 从 eBay 商品页详情区域和 `ebaydesc.com`/`epprod.com` iframe 中提取详情图。

#### Scenario: 主页面模式提取详情图
- **WHEN** 脚本在主页面运行（非 iframe）
- **THEN** 扫描详情容器（`.tabs__content`、`[data-testid="d-item-description"]`、`#viTabs_0_is`、`.x-about-this-item`）中的 `<img>` 元素，提取 `data-zoom-src`、`data-src`、`src` 属性

#### Scenario: iframe 模式提取详情图
- **WHEN** 脚本在 `ebaydesc.com`/`epprod.com` iframe 中运行
- **THEN** 提取所有 `<img>` 元素 URL，通过 `postMessage` 发送给父页面

#### Scenario: URL 清洗与过滤
- **WHEN** 提取到原始 URL
- **THEN** 过滤无效图片（`s.gif`、`blank.gif`、`loading`、`data:image`、`placeholder` 等），清洗 URL（去除反引号、`//` 前缀补全 `https:`），通过 `tauriBridge.send('DetailPic', urls)` 上报

### Requirement: eBay SKU 图提取 (ebayGetSku)
系统 SHALL 从 eBay 商品页的 `$M_96613636_C` 变量中提取 MSKU 模块的 SKU 图片。

#### Scenario: 有 SKU 映射时提取 SKU 图
- **WHEN** `$M_96613636_C` 包含 `menuItemPictureIndexMap`
- **THEN** 按 SKU 映射的索引从 `mediaList` 中提取对应图片，优先级：`zoomImg.URL` > `originalImg.URL` > `thumbnail.URL`，eBay 官方图归一化为 `s-l1600.webp`

#### Scenario: 无 SKU 映射时提取全部图片
- **WHEN** `$M_96613636_C` 不包含 `menuItemPictureIndexMap`
- **THEN** 提取所有全局图片 URL

#### Scenario: 备用提取路径
- **WHEN** `$M_96613636_C` 提取失败
- **THEN** 从 `__ICE_APP_CONTEXT__` 数据路径 `loaderData.home.data.res.skuBase.props[].values[].image` 提取

### Requirement: eBay 视频提取 (ebayGetVideo)
系统 SHALL 从 eBay 商品页提取视频 URL。

#### Scenario: 从 script 标签提取视频
- **WHEN** `<script>` 标签包含 `$M_96613636_C`
- **THEN** 提取 `playlistMap` 中的 HLS（`.m3u8`）和 DASH（`.mpd`）URL，以及 `videoId` 构造 `https://video.ebaycdn.net/videos/v1/{videoId}/playlist.m3u8`

#### Scenario: 网络请求拦截
- **WHEN** 页面发起视频相关网络请求
- **THEN** 通过 XHR/Fetch 拦截和 Performance API 监控捕获视频 URL

#### Scenario: DOM 动态检测
- **WHEN** 页面动态添加 `<video>` 元素
- **THEN** 通过 MutationObserver 检测并提取 `src`/`currentSrc`

### Requirement: eBay 标题/链接/商品ID提取 (ebayGetHylinkTitle)
系统 SHALL 从 eBay 商品页提取商品标题、链接和 ID。

#### Scenario: 从 script 标签提取标题
- **WHEN** `<script>` 标签包含 `$M_96613636_C`
- **THEN** 提取 `TITLE.mainTitle.textSpans[0].text` 作为标题

#### Scenario: 从 DOM 元素提取标题
- **WHEN** script 标签提取失败
- **THEN** 按优先级扫描 `h1.x-item-title__mainTitle`、`h1[itemprop="name"]`、`.x-item-title__mainTitle`、`.ux-textspans--BOLD`、`h1`

#### Scenario: 从 document.title 提取标题
- **WHEN** DOM 元素提取失败
- **THEN** 使用 `document.title` 并清理 eBay 后缀（` | eBay`、` - eBay`）

#### Scenario: 商品 ID 提取与 URL 清洗
- **WHEN** 提取到商品 URL
- **THEN** 从 URL 路径 `/itm/{numericId}` 提取商品 ID，清洗 URL 为 `origin/itm/{productId}` 格式

### Requirement: eBay 入口脚本 (index.ts)
系统 SHALL 提供统一的 eBay 抓取入口，编排各子模块执行。

#### Scenario: 视频模块立即执行
- **WHEN** 脚本注入
- **THEN** 立即启动 `ebayGetVideo`（document_start 时序要求）

#### Scenario: 其他模块 DOM 就绪后执行
- **WHEN** DOM 加载完成
- **THEN** 依次启动 `ebayGetMain`、`ebayGetSku`、`ebayGetDetail`、`ebayGetHylinkTitle`，使用数据驱动完成判定

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中运行
- **THEN** 仅 Detail 模块允许在 iframe 中执行，其他模块跳过

### Requirement: eBay 构建注册
系统 SHALL 将 eBay 平台注册到 Vite IIFE 构建流程。

#### Scenario: 构建入口注册
- **WHEN** 运行 `build-scraper.mjs`
- **THEN** `ebay` 入口指向 `scraper-scripts/ebay/index.ts`，输出 `dist-scripts/ebay.bundle.js`

### Requirement: eBay 登录策略
系统 SHALL 为 eBay 平台提供登录检测策略。

#### Scenario: 检测 eBay 登录页
- **WHEN** URL 包含 `signin.ebay.com` 或 `login.ebay.com`
- **THEN** 返回 `LoginCheckResult::LoginRequired`

#### Scenario: 检测 eBay 验证码页
- **WHEN** URL 包含 `captcha` 或 DOM 中存在验证码元素
- **THEN** 返回 `LoginCheckResult::Captcha`
