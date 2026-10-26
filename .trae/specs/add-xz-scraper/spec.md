# 四季星座 (571xz) 抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688、搜款网等平台的抓取脚本，但四季星座 (571xz.com / sjxz.cc) 平台仅有平台识别和 URL 清洗的前端/Rust 基础设施，缺少核心的 `scraper-scripts/xz/` 抓取脚本实现，导致用户输入四季星座商品 URL 后无法提取图片和视频数据。

## What Changes
- 新增 `scraper-scripts/xz/` 目录，包含 6 个模块文件 + 1 个共享工具文件
  - `index.ts` — 入口编排，严格遵循开发指南标准模板（登录检测 + 验证码检测 + 后台并行模块 + 静默超时判定）
  - `xzUtils.ts` — 共享 URL 清洗、黑名单过滤、图片属性提取逻辑
  - `xzGetMain.ts` — 主图提取（重试获取 + 额外探测 + 增量抓取模式）
  - `xzGetDetail.ts` — 详情图提取（重试等待容器 + 多轮次遍历 + MutationObserver 持续监听）
  - `xzGetSku.ts` — SKU 图提取（初始获取 + MutationObserver 精确监听 + 轮询兜底 + 返回清理函数）
  - `xzGetVideo.ts` — 视频提取（XHR/Fetch 拦截 + DOM 检测 + JSON 提取 + Performance API 增量监控）
  - `xzGetHylinkTitle.ts` — 标题/链接/商品ID/访问时间提取（必须输出全部四个字段）
- 修改 `scripts/build-scraper.mjs`，注册 `xz` 平台入口
- 在 `src-tauri/src/login/mod.rs` 中注册四季星座的默认登录策略

## Impact
- Affected specs: 四季星座平台抓取能力
- Affected code:
  - `scraper-scripts/xz/` (新增)
  - `scripts/build-scraper.mjs` (修改)
  - `src-tauri/src/login/mod.rs` (修改)

## ADDED Requirements

### Requirement: 四季星座抓取脚本

系统 SHALL 提供四季星座 (571xz.com / sjxz.cc) 平台的完整抓取脚本，对齐 `GetPic/entrypoints/modules/xz/` 下的提取逻辑，并严格遵循 `docs/平台抓取脚本开发指南.md` 中的最佳实践模式。

#### Scenario: 入口编排遵循标准模板
- **WHEN** 脚本被注入到 WebView
- **THEN** `index.ts` 遵循开发指南标准模板结构：
  - iframe 防护（`window !== window.top`）
  - 视频模块立即启动（document_start 时序），不等待 DOMContentLoaded
  - DOMContentLoaded 后先执行 `probeAndReportLogin()` 登录探测
  - 登录通过后 `simulateScroll()` + `setupCaptchaWatcher()` + 四个模块后台并行
  - `waitForCompletion()` 数据驱动完成判定
  - 模块超时保护（单模块 15s）
  - 异常降级（有数据 completeTask，无数据 failTask）
- **AND** 配置 `LOGIN_SELECTORS` 和 `CAPTCHA_SELECTORS`（四季星座暂无已知验证码，CAPTCHA_SELECTORS 为空数组）

#### Scenario: 主图提取成功（重试获取 + 额外探测模式）
- **WHEN** 用户输入 `https://www.571xz.com/item/12345` 类 URL
- **THEN** 脚本从 `.magnifier-box img`、`.photoAlbum-booth-big img`、`.photoAlbum-thumb-content li img`、`.swiper-slide img`、`.photoAlbum-video img`、`.product-img img`、`#J_UlThumb img` 等容器提取主图 URL
- **AND** URL 经过 `cleanXzImageUrl` 清洗（补全协议、移除查询参数、剥离 `_800x800.jpg` / `_sum.jpg` 等尺寸后缀、截断到扩展名）
- **AND** 过滤 `assets.571xz.com`、`/gonziyu/`、`play-icon`、`loading.gif` 等黑名单资源
- **AND** 图片属性优先级为 `data-src` > `data-original` > `src`
- **AND** 遵循 GetMain 标准执行流程：初始空上报 → 循环重试（20 次 × 500ms）→ 额外抓取（3 轮 × 500ms）→ 最终上报
- **AND** 使用 `import { sleep, deduplicateUrls } from '../shared/utils'`，禁止本地定义 sleep

#### Scenario: 详情图提取成功（重试等待容器 + 多轮遍历 + 持续监听模式）
- **WHEN** 商品页包含详情图区域
- **THEN** 脚本从 `.itemInnerWrap-img img`、`.itemInnerWrap1 img`、`.ant-tabs-tabpane-active img`、`.product-detail img`、`.rich-text-component img`、`#productDetail img` 等容器提取详情图
- **AND** 支持 `data-lazyload-src` 懒加载属性
- **AND** 初始延迟 1 秒等待详情图区域渲染
- **AND** 遵循 GetDetail 标准执行流程：初始空上报 → 重试等待容器（20 次 × 500ms）→ 多轮提取（3 轮 × 2s）→ 最终上报
- **AND** 可选注册 MutationObserver 持续监听详情区域变化，发现新图片时增量上报

#### Scenario: SKU 图提取成功（精确监听 + 返回清理函数模式）
- **WHEN** 商品页包含 SKU 选择区域
- **THEN** 脚本从 `.specSku .item-color-img ul li img`、`.item-color ul li img`、`.sku-item img`、`.color-item img`、`[class*="specification"] img`、`[class*="sku"] img` 等选择器提取 SKU 图
- **AND** 过滤 `/resource/img/` 目录下的 UI 图标
- **AND** 遵循 GetSku 标准执行流程：初始空上报 → 首轮扫描 → MutationObserver 精确监听 → 轮询兜底
- **AND** MutationObserver 精确监听目标 SKU 容器（而非 `document.body`），监听 `childList` + `subtree` + `attributes`（`src`、`data-src`、`data-original`）
- **AND** **必须返回清理函数**，同时清理 `observer.disconnect()` 和 `clearInterval(pollTimer)`

#### Scenario: 视频提取成功（多手段尽早介入模式）
- **WHEN** 商品页包含视频内容
- **THEN** 脚本通过 XHR/Fetch 拦截、DOM `<video>` 标签检测、`<script>` 标签 JSON 解析、`window.__INITIAL_STATE__` 全局变量提取、Performance API 增量监控等多种渠道检测视频 URL
- **AND** 支持 571xz 专用的 `__INITIAL_STATE__.c.shop.videourl` 和 `videoFaceUrl` 字段提取，含 `\u002F` 等转义字符解码
- **AND** Performance API 使用增量检测（游标记录已扫描位置），避免重复扫描
- **AND** 所有视频统一归类为 `main` 类型
- **AND** 双重去重：原始 URL 集合 + 归一化视频 ID 集合

#### Scenario: 标题和链接提取成功（四字段必输出模式）
- **WHEN** 商品页加载完成
- **THEN** 脚本从 `.i-d-c-title h3`（纯文本节点，排除子元素）、`.item-detail-right .title`、`.goods-title` 等选择器提取标题
- **AND** 从 URL 匹配 `/item/{id}` 格式提取商品 ID
- **AND** 生成 `https://www.571xz.com/item/{id}` 格式的干净链接
- **AND** 降级到 `document.title` 时移除 `-571xz`、`-优批网` 等站点后缀
- **AND** **必须输出全部四个字段**：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）

#### Scenario: 构建产物正确生成
- **WHEN** 运行 `node scripts/build-scraper.mjs`
- **THEN** 生成 `dist-scripts/xz.bundle.js` IIFE 格式文件

#### Scenario: 登录检测
- **WHEN** 四季星座页面需要登录
- **THEN** Rust 端登录策略检测到 `login.571xz.com` 或 `login.sjxz.cc` 域名时返回 `LoginRequired`

#### Scenario: 共享工具函数使用规范
- **WHEN** 模块需要延时、去重、URL 清洗等通用功能
- **THEN** 优先使用 `shared/utils.ts` 中的 `sleep`、`deduplicateUrls`、`cleanImageUrl` 等函数
- **AND** 禁止在各模块中重复定义本地 `sleep` 函数
- **AND** 仅在平台有特殊清洗需求时（如 `_800x800.jpg` 尺寸后缀）才在 `xzUtils.ts` 中定义平台特有清洗逻辑

## MODIFIED Requirements

### Requirement: 构建脚本平台注册
`scripts/build-scraper.mjs` 的 `PLATFORMS` 对象 SHALL 包含 `xz` 条目，指向 `scraper-scripts/xz/index.ts`。

### Requirement: 登录策略注册
`src-tauri/src/login/mod.rs` 的 `LoginStrategyRegistry::new()` SHALL 注册四季星座的默认登录策略，匹配 `login.571xz.com` 和 `login.sjxz.cc` 域名。

## REMOVED Requirements
无
