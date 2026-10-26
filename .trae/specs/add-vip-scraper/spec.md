# 唯品会(VIP)抓取脚本实现 Spec

## Why
项目当前仅实现了淘宝/天猫和京东两个平台的抓取脚本（`scraper-scripts/taobao/` 和 `scraper-scripts/jd/`），需要新增唯品会(VIP)平台的抓取支持。唯品会详情页（`detail.vip.com`）的主图、SKU图、详情图、视频和标题/链接数据需要被完整提取。

## What Changes
- 新增 `scraper-scripts/vip/` 目录，包含 6 个模块文件：`index.ts`、`vipGetMain.ts`、`vipGetSku.ts`、`vipGetDetail.ts`、`vipGetVideo.ts`、`vipGetHylinkTitle.ts`
- 修改 `scripts/build-scraper.mjs`，注册 `vip` 平台入口
- 前端平台注册（`src/utils/platforms/`）和 Rust 端（`platform_resolver.rs`、`login/mod.rs`）已有 VIP 配置，无需修改

## Impact
- Affected specs: 新增唯品会平台抓取能力
- Affected code:
  - `scraper-scripts/vip/` — 新增 6 个文件
  - `scripts/build-scraper.mjs` — 新增 vip 构建入口

## ADDED Requirements

### Requirement: 唯品会主图提取 (vipGetMain)
系统 SHALL 从唯品会商品详情页提取主图 URL 列表。

#### Scenario: 成功提取主图
- **WHEN** 用户输入唯品会商品详情页 URL（如 `https://detail.vip.com/detail-123456-692847301.html`）
- **THEN** 脚本从 `#J-img-content` 容器中提取所有 `<img>` 标签的图片 URL
- **AND** 优先使用 `data-original` 属性，回退到 `src` 属性
- **AND** 将 `//` 开头的 URL 补全为 `https://`
- **AND** 移除缩略图尺寸后缀（如 `_420x420_90.jpg` → `.jpg`，正则 `/_\d+x\d+_\d+\.(jpg|jpeg|png|gif|webp|bmp|heic)$/i`）
- **AND** 通过 `tauriBridge.send('MainPic', urls)` 上传去重后的 URL 数组
- **AND** 支持重试等待容器出现（最多 20 次，每次 1 秒间隔）
- **AND** 容器出现后额外执行 3 次定时抓取（500ms 间隔），确保懒加载图片被捕获

### Requirement: 唯品会 SKU 图提取 (vipGetSku)
系统 SHALL 从唯品会商品详情页提取 SKU 图片 URL 列表。

#### Scenario: 成功提取 SKU 图
- **WHEN** 唯品会商品详情页包含颜色/尺寸 SKU 选项
- **THEN** 脚本从 `#J_detail_color` 和 `#J_detail_size` 两个容器中提取所有 `<img>` 标签
- **AND** 优先使用 `data-original` 属性，回退到 `src` 属性
- **AND** 执行与主图相同的 URL 清洗逻辑（补全协议、移除尺寸后缀）
- **AND** 通过 `tauriBridge.send('SkuPic', urls)` 上传去重后的 URL 数组
- **AND** 支持重试等待容器出现（最多 5 次基础重试 + 3 次额外重试，500ms 间隔）
- **AND** 使用 MutationObserver 监听 DOM 变化，检测到新图片时增量更新

### Requirement: 唯品会详情图提取 (vipGetDetail)
系统 SHALL 从唯品会商品详情页提取详情图片 URL 列表。

#### Scenario: 成功提取详情图
- **WHEN** 唯品会商品详情页包含详情描述区域
- **THEN** 脚本从 `.dc-img-detail` 容器中提取所有 `<img>` 标签
- **AND** 优先使用 `data-original` 属性，回退到 `src` 属性
- **AND** 执行与主图相同的 URL 清洗逻辑（补全协议、移除尺寸后缀、移除反引号）
- **AND** 通过 `tauriBridge.send('DetailPic', urls)` 上传去重后的 URL 数组
- **AND** 支持重试等待容器出现（最多 5 次，每次 1 秒间隔）
- **AND** 容器出现后执行多轮提取（5 轮，1 秒间隔），检测图片数量变化并增量更新

### Requirement: 唯品会视频提取 (vipGetVideo)
系统 SHALL 从唯品会商品详情页提取视频 URL。

#### Scenario: 成功提取视频
- **WHEN** 唯品会商品详情页包含商品视频
- **THEN** 脚本通过以下方式检测视频 URL：
  1. 拦截 XHR 和 Fetch 请求，检测媒体资源响应
  2. Performance API 监控网络请求中的媒体资源
  3. MutationObserver 监听 DOM 中新增的 `<video>` 标签
  4. 从页面 `<script>` 标签中的 JSON 数据提取视频 URL
  5. 检查 `window` 对象上的视频数据键
- **AND** 对视频 URL 进行分类（主图视频 vs 详情页视频），基于 URL 特征判断（如包含 `video-zb`、`detail`、`shopdetail`、`shopcenter` 为主图视频）
- **AND** 通过 `tauriBridge.send('VideoUrls', videoObjects)` 上传视频对象数组
- **AND** 视频对象格式为 `{ url, type, timestamp, pageUrl }`
- **AND** 使用规范化去重机制，避免同一视频重复上报
- **AND** 排除广告、评论、UGC、头像等非商品视频

### Requirement: 唯品会标题/链接/商品ID提取 (vipGetHylinkTitle)
系统 SHALL 从唯品会商品详情页提取商品标题、链接和商品 ID。

#### Scenario: 成功提取标题和链接
- **WHEN** 唯品会商品详情页加载完成
- **THEN** 脚本优先从 `.pib-title-detail` 元素的 `title` 属性提取标题，回退到 `textContent`，再回退到 `<head><title>`
- **AND** 从 URL 中提取商品 ID（正则 `/-(\d+)\.html$/`，取最后一个 `-` 后的数字）
- **AND** 通过 `tauriBridge.send('productTitle', title)` 上传标题
- **AND** 通过 `tauriBridge.send('productLink', url)` 上传链接
- **AND** 通过 `tauriBridge.send('productId', id)` 上传商品 ID
- **AND** 等待动态内容加载（`.pib-title-detail` 元素出现，最多 5 次重试，1 秒间隔）

### Requirement: 唯品会抓取入口编排 (index.ts)
系统 SHALL 提供唯品会抓取脚本的统一入口，编排各模块执行时序。

#### Scenario: 脚本启动与模块编排
- **WHEN** 唯品会抓取脚本被注入到 WebView Worker 中
- **THEN** 入口文件执行以下编排：
  1. 检测 iframe 环境，若 `window !== window.top` 则立即退出
  2. 立即启动视频拦截模块 `vipGetVideo`（document_start 阶段逻辑）
  3. 等待 DOM 就绪后执行 `runModulesOnIdle()`
  4. 在 `runModulesOnIdle()` 中：
     - 调用 `probeAndReportLogin()` 检测登录状态（VIP 登录选择器：`.login-panel`、`.login-form`、`.qrcode-login`）
     - 调用 `simulateScroll()` 触发懒加载
     - 并行启动 `vipGetMain`、`vipGetSku`、`vipGetDetail`、`vipGetHylinkTitle` 四个模块
     - 启动数据静默判定 `waitForCompletion()`，与模块并行运行
  5. 完成判定通过后调用 `tauriBridge.completeTask()`
- **AND** 遵循与淘宝/京东入口完全一致的架构模式（登录检测、验证码监控、模块超时保护、异常处理）

### Requirement: 构建系统集成
系统 SHALL 将唯品会抓取脚本集成到 Vite IIFE 构建流程中。

#### Scenario: 构建唯品会 bundle
- **WHEN** 执行 `scripts/build-scraper.mjs`
- **THEN** 构建脚本将 `scraper-scripts/vip/index.ts` 编译为 `dist-scripts/vip.bundle.js`
- **AND** 输出格式为 IIFE，全局变量名为 `vipScraper`

## MODIFIED Requirements
无修改需求。Rust 端 `platform_resolver.rs` 已包含 `Platform::Vip` 枚举变体和 `from_url()`/`bundle_name()` 映射，前端 `platforms/` 目录已有 `vip.ts` handler 和注册，登录策略已有 `DefaultLoginStrategy::new("vip", &["login.vip.com"], &[])` 配置。

## REMOVED Requirements
无移除需求。
