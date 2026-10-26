# 快手(Kuaishou)平台抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688 等平台的抓取脚本，但快手平台尚未实现 `scraper-scripts/kuaishou/` 目录下的抓取模块。快手电商平台（kuaishou.com / kwaishop.com / kwaixiaodian.com）的图片、视频和商品信息提取逻辑已在参考项目 `GetPic/entrypoints/modules/kuaishou/` 中完整实现，需要将其适配到 PcGetPic 的 Tauri WebView 注入架构中。

## What Changes
- 新增 `scraper-scripts/kuaishou/` 目录，包含 7 个文件：
  - `ksUtils.ts` — 平台共享工具（URL 清洗、图片类型判断、background-image 提取等）
  - `index.ts` — 入口编排（登录检测、验证码监控、模块并行调度、完成判定）
  - `ksGetMain.ts` — 主图提取（Swiper 轮播区域的 item_image）
  - `ksGetDetail.ts` — 详情图提取（排除 Swiper，三种方法合并）
  - `ksGetSku.ts` — SKU 图提取（仅 sku_image，排除 Swiper，返回清理函数）
  - `ksGetVideo.ts` — 视频提取（DOM/JSON/网络拦截多渠道）
  - `ksGetHylinkTitle.ts` — 标题/链接/商品ID提取
- 修改 `scripts/build-scraper.mjs` — 注册 kuaishou 平台入口
- 修改 `src-tauri/src/login/mod.rs` — 注册快手 DefaultLoginStrategy

## Impact
- Affected specs: scraper-scripts 抓取脚本体系
- Affected code:
  - `scraper-scripts/kuaishou/` (新增 7 文件)
  - `scripts/build-scraper.mjs` (新增 1 行注册)
  - `src-tauri/src/login/mod.rs` (注册 kuaishou 策略)

## ADDED Requirements

### Requirement: 快手平台共享工具 (ksUtils.ts)
系统 SHALL 提供快手平台各模块共享的工具函数，避免跨模块重复定义。

#### Scenario: 多模块共享 URL 清洗和类型判断
- **WHEN** ksGetMain/ksGetDetail/ksGetSku 需要清洗快手图片 URL 或判断图片类型
- **THEN** 从 `ksUtils.ts` 导入 `cleanKuaishouImageUrl()`、`isKuaishouProductImage()`、`isKuaishouDetailImage()`、`isKuaishouSkuImage()`、`extractUrlFromBackgroundImage()`、`deduplicateKsUrls()`
- **AND** `cleanKuaishouImageUrl()` 截取到图片扩展名位置，补全 `//` 协议，去除查询参数
- **AND** 各 `is*Image()` 函数通过 URL 黑名单（avatar/icon/logo/loading/placeholder/default）+ 图片类型关键词过滤
- **AND** `extractUrlFromBackgroundImage()` 从 CSS `background-image` 样式字符串中提取 URL

### Requirement: 快手主图提取 (ksGetMain)
系统 SHALL 从快手商品详情页的 Swiper 轮播区域提取主图 URL 列表。

#### Scenario: Swiper 轮播区域存在主图
- **WHEN** 快手商品页 DOM 中存在 `.swiper-slide:not(.swiper-slide-duplicate)` 容器
- **THEN** 从 `img.css-9pa8cd` 和 `background-image` 样式中提取 `item_image` 类型的 URL
- **AND** 排除 `sku_image` 类型（由 SKU 模块负责）
- **AND** 通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: 首次扫描未找到主图
- **WHEN** DOM 尚未渲染完成，首次扫描结果为空
- **THEN** 使用共享 `sleep()` 以 500ms 间隔重试，最多 100 次
- **AND** 找到图片后额外抓取 3 轮以捕获延迟加载内容

### Requirement: 快手详情图提取 (ksGetDetail)
系统 SHALL 从快手商品详情页提取详情图 URL 列表，排除 Swiper 轮播区域。

#### Scenario: 详情图容器存在
- **WHEN** 快手商品页 DOM 中存在非 Swiper 区域的图片
- **THEN** 通过三种方法并行提取：background-image 样式（排除 Swiper）、`img.css-9pa8cd`（排除 Swiper）、大尺寸 tabindex 容器（宽度>400px，排除 Swiper）
- **AND** 接受 `item_image`、`sku_image`、`item_detail_image` 类型（通过 DOM 位置排除 Swiper）
- **AND** 通过 `tauriBridge.send('DetailPic', urls)` 上报
- **AND** 使用共享 `sleep()` 实现多轮提取间隔

### Requirement: 快手 SKU 图提取 (ksGetSku)
系统 SHALL 从快手商品详情页提取 SKU 图 URL 列表，并返回清理函数。

#### Scenario: SKU 选择区域存在
- **WHEN** 快手商品页 DOM 中存在非 Swiper 区域的 SKU 图片
- **THEN** 通过三种方法提取：`img.css-9pa8cd`（排除 Swiper）、`background-image`（排除 Swiper）、tabindex 容器（排除 Swiper）
- **AND** 仅接受 `sku_image` 类型
- **AND** 通过 `tauriBridge.send('SkuPic', urls)` 上报

#### Scenario: SKU 图片动态变化
- **WHEN** 用户点击不同规格触发 SKU 图懒加载
- **THEN** MutationObserver 精确监听 SKU 容器（而非 document.body），同时监听 `childList`、`subtree` 和 `attributes`（`src`、`data-src`）
- **AND** 图片数量增加时防抖后重新扫描上报

#### Scenario: 模块清理
- **WHEN** 任务完成判定触发清理
- **THEN** 模块返回清理函数 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }`
- **AND** 清理函数同时清理 MutationObserver 和轮询定时器，防止资源泄露

### Requirement: 快手视频提取 (ksGetVideo)
系统 SHALL 从快手商品详情页提取视频 URL。

#### Scenario: 页面包含视频元素或网络请求
- **WHEN** 快手商品页存在 video 标签、视频网络请求或页面 JSON 数据中包含视频 URL
- **THEN** 通过 XHR/Fetch 拦截、Performance API 增量监控（requestAnimationFrame 循环 + 游标）、MutationObserver、DOM 扫描、JSON 数据解析等多渠道检测
- **AND** 检查快手特有全局变量：`__INITIAL_STATE__`、`__INITIAL_DATA__`、`__NEXT_DATA__`、`pageData`、`goodsDetail`
- **AND** 通过 `tauriBridge.send('VideoUrls', videos)` 上报，格式为 `{ url, type, timestamp, pageUrl }`
- **AND** 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写
- **AND** 实现双重去重：原始 URL 集合 + normalizedVideoId 集合

### Requirement: 快手标题/链接/商品ID提取 (ksGetHylinkTitle)
系统 SHALL 从快手商品详情页提取商品标题、清理后的链接、商品ID和访问时间。

#### Scenario: 商品标题元素存在
- **WHEN** 快手商品页 DOM 中存在标题元素
- **THEN** 按优先级尝试选择器：`.goods-title`、`.item-title`、`.product-title`、`.goods-name`、`.detail-title`、`h1.title`、`.main-title`、`[class*="goodsName"]`、`[class*="goodsTitle"]`、`[class*="itemTitle"]`、`[class*="productName"]`
- **AND** 降级使用 `document.title`（去除网站名称后缀：`-|_快手/kuaishou/kwaishop/kwaixiaodian`）
- **AND** 商品ID从 URL 中提取（`/goods/{id}`、`/item/{id}`、`goodsId`/`goods_id` 查询参数）
- **AND** URL 清洗保留 `/goods/{id}` 或 `/item/{id}` 格式
- **AND** 必须输出全部四个字段：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）

### Requirement: 快手入口编排 (index.ts)
系统 SHALL 提供快手平台抓取脚本入口，编排各模块执行时序。

#### Scenario: 脚本注入后正常执行
- **WHEN** Tauri Worker 窗口注入 kuaishou.bundle.js
- **THEN** 添加 iframe 防护（`if (window !== window.top) return;`）
- **AND** 立即启动视频拦截模块（document_start 级别）
- **AND** DOM 就绪后依次执行：登录检测 → 模拟滚动 → 验证码监控 → 后台并行运行 Main/Sku/Detail/HylinkTitle 模块
- **AND** 各模块使用 `withTimeout()` 保护（单模块 15s 上限）
- **AND** 启动数据静默完成判定（`waitForCompletion()` + 7s 静默超时 + 15s 最大等待 + 3s 最小停留）
- **AND** 完成后清理各模块后台资源（调用返回的清理函数）并调用 `tauriBridge.completeTask()`
- **AND** 异常降级：有数据则 `completeTask()`，无数据则 `failTask()`

### Requirement: 快手登录检测策略
系统 SHALL 在 Rust 端注册快手平台的登录检测策略。

#### Scenario: 快手商品页需要登录
- **WHEN** Worker 导航到快手商品页，URL 包含登录相关路径
- **THEN** `LoginStrategyRegistry` 返回 `LoginRequired`
- **AND** 触发 `login-required` 事件，暂停抓取等待用户登录

### Requirement: 快手 URL 清洗与原图还原
系统 SHALL 对快手图片 URL 进行清洗，还原高清原图链接。

#### Scenario: 图片 URL 包含缩略图后缀或查询参数
- **WHEN** 提取到的图片 URL 包含 `?xxx` 查询参数或缩略图后缀
- **THEN** 截取到图片扩展名位置（.jpg/.jpeg/.png/.gif/.webp/.bmp），去除后续所有参数
- **AND** 补全 `//` 开头的协议为 `https:`

### Requirement: 代码规范遵循
快手抓取脚本 SHALL 遵循 `docs/平台抓取脚本开发指南.md` 中的最佳实践。

#### Scenario: 共享工具使用
- **WHEN** 模块需要延时功能
- **THEN** 使用 `import { sleep } from '../shared/utils'`，禁止在模块内重复定义本地 `sleep` 函数

#### Scenario: 初始空上报
- **WHEN** 模块开始执行
- **THEN** 先 `await tauriBridge.send(key, [])` 或 `await tauriBridge.send(key, '')` 清空旧数据

#### Scenario: 增量上报
- **WHEN** 数据可能动态增加（如 SKU 图、视频、详情图）
- **THEN** 每次检测到数据变化时立即 `tauriBridge.send()`，由 tauriBridge 内部去重保护避免重复触发时间戳更新

## MODIFIED Requirements

### Requirement: 构建脚本平台注册
`scripts/build-scraper.mjs` 的 PLATFORMS 对象 SHALL 包含 kuaishou 平台入口，指向 `scraper-scripts/kuaishou/index.ts`。

### Requirement: 登录策略注册表
`src-tauri/src/login/mod.rs` 的 `LoginStrategyRegistry::new()` SHALL 注册快手平台的 `DefaultLoginStrategy`，匹配 `login.kuaishou.com`、`passport.kuaishou.com` 登录 URL 模式。
