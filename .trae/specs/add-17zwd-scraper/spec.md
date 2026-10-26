# 17货源(17zwd)抓取脚本 Spec

## Why
项目已注册 17zwd 平台标识（Rust `Platform::Zwd`、前端 `zwdHandler`、平台模式/标签/图标），但 `scraper-scripts/17zwd/` 目录尚未实现，导致 17货源商品页无法抓取任何图片/视频/标题数据。

## What Changes
- 新增 `scraper-scripts/17zwd/` 目录，包含 7 个文件：
  - `zwdGetMain.ts` — 主图提取
  - `zwdGetSku.ts` — SKU图提取（返回清理函数）
  - `zwdGetDetail.ts` — 详情图提取（返回清理函数）
  - `zwdGetVideo.ts` — 视频提取
  - `zwdGetHylinkTitle.ts` — 标题/链接/商品ID/访问时间提取
  - `zwdUtils.ts` — 17zwd 平台共享工具（URL黑名单、缩略图还原、商品图判定）
  - `index.ts` — 入口编排
- 更新 `scripts/build-scraper.mjs` 注册 `17zwd` 平台入口
- 新增 `src-tauri/src/login/default.rs` 配置的 17zwd 登录策略（使用 DefaultLoginStrategy）

## Impact
- Affected specs: 17zwd 平台抓取能力
- Affected code:
  - `scraper-scripts/17zwd/` (新增)
  - `scripts/build-scraper.mjs` (修改)
  - `src-tauri/src/login/mod.rs` (修改)

## ADDED Requirements

### Requirement: 17zwd 平台共享工具 (zwdUtils.ts)
系统 SHALL 提供 17zwd 平台各模块共享的工具函数，避免在多个模块中重复定义相同的 URL 处理逻辑。

#### Scenario: 共享工具函数
- **WHEN** 各子模块需要 URL 清洗和过滤
- **THEN** `zwdUtils.ts` 导出以下函数：
  - `URL_BLACKLIST`：URL 黑名单常量数组（`resource.17.shop`、`resource.17zwd.com`、`/public/img/`、`icon-open-video`、`avatar`、`/logo/`、`loading`、`placeholder`、`trustutn.org`）
  - `DETAIL_URL_BLACKLIST`：详情图额外黑名单（含 `preview_100_100`）
  - `isZwdProductImage(url)`：协议检查 + 黑名单过滤 + 图片扩展名检查
  - `convertToOriginalUrl(url)`：移除缩略图后缀 `_数字x数字.扩展名` / `_数字-数字.扩展名`，补全协议 `//` → `https:`，移除查询参数
  - `extractUrlFromImg(img)`：遍历 `src`/`data-src`/`data-original`/`data-lazy` 属性，调用 `isZwdProductImage` + `convertToOriginalUrl`
  - `deduplicateZwdUrls(urls)`：基于 `convertToOriginalUrl` 的 URL 去重

### Requirement: 17货源主图提取 (zwdGetMain)
系统 SHALL 从 17zwd.com 商品页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。遵循开发指南的"重试获取 + 额外探测"模式。

#### Scenario: 成功提取主图
- **WHEN** 用户抓取 `https://*.17zwd.com/item/*` 页面
- **THEN** 脚本通过以下方法提取主图：
  1. 全页面 `img` 元素扫描（通过 `zwdUtils.extractUrlFromImg`）
  2. Swiper 容器类名模式匹配（`introSwiper`/`thumbImg`/`bigImg`/`mainImg`/`productImg`）
  3. 视频容器同级元素提取（`.video-react` 播放器的父容器同级图片）
- **AND** 使用 `shared/utils` 的 `deduplicateUrls` 去重
- **AND** 使用 `shared/utils` 的 `sleep` 实现重试等待（禁止本地定义 sleep）
- **AND** 执行流程：
  1. 初始空上报 `tauriBridge.send('MainPic', [])`
  2. 循环重试（MAX_RETRIES=20, RETRY_INTERVAL=500ms），每轮调用 `gatherAllImages()`
  3. 获取到图片后，额外抓取（MAX_EXTRA_FETCHES=3, 间隔 500ms）合并去重
  4. 最终上报 `tauriBridge.send('MainPic', images)`

### Requirement: 17货源SKU图提取 (zwdGetSku)
系统 SHALL 从 17zwd.com 商品页提取 SKU 图片 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。遵循开发指南的"MutationObserver 动态监听 + 返回清理函数"模式。

#### Scenario: 成功提取SKU图
- **WHEN** 用户抓取 17zwd 商品页
- **THEN** 脚本通过以下方法提取 SKU 图：
  1. "颜色"标签定位（查找 `<i>` 标签文本为"颜色"，取父容器内图片）
  2. Ant Design `ant-space-horizontal` 容器提取
  3. SKU 类名模式匹配（`itemColor`/`SkuCover`/`itemSku`/`skuImg`）
- **AND** 使用 `zwdUtils` 的 `extractUrlFromImg` 和 `deduplicateZwdUrls`
- **AND** 使用 `shared/utils` 的 `deduplicateUrls` 和 `sleep`
- **AND** 执行流程：
  1. 初始空上报 `tauriBridge.send('SkuPic', [])`
  2. 首轮扫描 `scanSkuContainers()`，有结果立即上报
  3. 注册 MutationObserver 精确监听 SKU 容器（非 document.body），监听 `childList` + `subtree` + `attributes`（`src`/`data-src`/`data-original`）
  4. 轮询兜底（POLL_INTERVAL=1000ms, MAX_POLLS=10）
  5. **返回清理函数**：同时清理 `observer.disconnect()` 和 `clearInterval(pollTimer)`

### Requirement: 17货源详情图提取 (zwdGetDetail)
系统 SHALL 从 17zwd.com 商品页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。遵循开发指南的"重试等待容器 + 多轮次遍历 + MutationObserver 持续监听"模式。

#### Scenario: 成功提取详情图
- **WHEN** 用户抓取 17zwd 商品页
- **THEN** 脚本通过以下方法提取详情图：
  1. "宝贝详情"标题定位（查找 `<h2>` 标签文本含"宝贝详情"，取父容器内图片）
  2. 类名模式匹配（`detailWrapper`/`goodsInfoImg`/`goodsInfo`/`detail-desc`）
  3. `ant-row` 参数区域兄弟元素提取（含"颜色分类"/"尺码分类"/"货号"文本的行之后的所有兄弟）
  4. `goodsParamsWrapper` 兄弟元素提取
- **AND** 使用 `zwdUtils` 的 `DETAIL_URL_BLACKLIST` 过滤
- **AND** URL 清洗使用 `zwdUtils.convertToOriginalUrl`（补全协议、移除查询参数、移除缩略图后缀）
- **AND** 使用 `shared/utils` 的 `deduplicateUrls` 和 `sleep`
- **AND** 执行流程：
  1. 初始空上报 `tauriBridge.send('DetailPic', [])`
  2. 重试等待容器出现（MAX_CONTAINER_RETRIES=20, RETRY_INTERVAL=500ms）
  3. 多轮提取（EXTRACTION_PASSES=5, PASS_DELAY_MS=1000），每轮扫描所有方法
  4. 最终上报
  5. 注册 MutationObserver 持续监听详情区域，检测到图片增加时增量上报
  6. **返回清理函数**：同时清理 `observer.disconnect()` 和定时器

### Requirement: 17货源视频提取 (zwdGetVideo)
系统 SHALL 从 17zwd.com 商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videos)` 上报。遵循开发指南的"多手段、尽早介入"模式。

#### Scenario: 成功提取视频
- **WHEN** 用户抓取 17zwd 商品页
- **THEN** 脚本在 `document_start` 阶段启动，通过以下方式拦截/提取视频：
  1. XHR/Fetch 请求拦截（拦截 JSON 响应递归查找视频 URL）
  2. Performance API 增量监控（使用游标避免重复扫描，requestAnimationFrame 循环）
  3. MutationObserver 动态监听新增 `<video>` 和 `<script>` 元素
  4. 页面 `<script>` 标签 JSON 数据提取
  5. `window` 全局变量检查
  6. 延时梯度扫描（1s/3s/5s/10s）
- **AND** 视频格式匹配正则：`/\.(mp4|m3u8|flv|avi|mov|wmv|mkv|webm|mp3|aac|wav|ogg)(\?.*)?$/i`
- **AND** 过滤广告/评论/UGC/头像相关 URL
- **AND** 通过 URL 规范化去重（提取文件名中的长数字 ID 作为标识）
- **AND** 所有视频默认分类为 `main` 类型
- **AND** 视频上报采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写

### Requirement: 17货源标题/链接/商品ID/访问时间提取 (zwdGetHylinkTitle)
系统 SHALL 从 17zwd.com 商品页提取商品标题、链接、ID 和访问时间。遵循开发指南的"基础信息聚合提取"模式，**必须输出全部四个字段**。

#### Scenario: 成功提取标题信息
- **WHEN** 用户抓取 17zwd 商品页
- **THEN** 脚本提取：
  - 商品标题：优先 `document.title`（移除" - 17网"/" - 一起做网店"后缀），回退 `<h1>` 文本
  - 商品 ID：URL 中 `/item/(\d+)` 匹配
  - 商品链接：`{origin}/item/{id}` 格式清洗
  - 访问时间：`YYYY-MM-DD HH:mm` 格式
- **AND** 通过 `tauriBridge.send` 上报全部四个字段：
  - `productTitle`、`productLink`、`productId`、`visitTime`
- **AND** 等待 `document.title` 非 "loading..." 后再提取（最多 10 秒）
- **AND** 使用 `shared/utils` 的 `sleep` 实现等待

### Requirement: 17货源入口编排 (index.ts)
系统 SHALL 提供统一的 17zwd 抓取脚本入口，编排各模块执行时序。严格遵循开发指南的标准模板。

#### Scenario: 脚本启动流程
- **WHEN** 17zwd bundle.js 被注入到 WebView
- **THEN** 入口脚本执行以下流程：
  1. `window !== window.top` 检查（iframe 防护）
  2. 立即启动视频拦截模块（`zwdGetVideo.run()`）
  3. 等待 DOMContentLoaded 后：
     a. 登录检测（`probeAndReportLogin(LOGIN_SELECTORS)`）
     b. 重置 `tauriBridge.resetUploadedDataFlag()`
     c. 模拟滚动 `simulateScroll()`
     d. 后台并行启动 `zwdGetMain`/`zwdGetSku`/`zwdGetDetail`/`zwdGetHylinkTitle`（使用 `withTimeout` 15s 单模块超时保护）
     e. 启动数据驱动完成判定 `waitForCompletion()`
  4. 完成后清理模块资源（调用各模块返回的清理函数）并调用 `tauriBridge.completeTask()`
  5. 异常时：有数据则 completeTask，无数据则 failTask
- **AND** 登录选择器配置：`.login-panel`、`.qrcode-login`、`.ant-login-form`（17zwd 使用 Ant Design）
- **AND** 验证码选择器留空（17zwd 暂无已知验证码机制）

### Requirement: 构建脚本注册
系统 SHALL 在 `scripts/build-scraper.mjs` 的 PLATFORMS 对象中注册 `17zwd` 平台入口。

#### Scenario: 构建产物
- **WHEN** 运行 scraper 构建脚本
- **THEN** 生成 `dist-scripts/17zwd.bundle.js`

### Requirement: 登录策略注册
系统 SHALL 在 `src-tauri/src/login/mod.rs` 中为 17zwd 注册 DefaultLoginStrategy。

#### Scenario: 登录检测
- **WHEN** 17zwd 页面需要登录
- **THEN** 使用 DefaultLoginStrategy 检测 `login.17zwd.com` 等登录域名
