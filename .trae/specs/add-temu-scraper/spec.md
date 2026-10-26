# Temu 抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东、唯品会、1688、拼多多等平台的抓取脚本，但 Temu（全球增长最快的跨境电商平台）尚未实现。用户需要通过 PcGetPic 的 Worker 窗口自动加载 Temu 商品页，提取主图、SKU 图、详情图、视频和商品元数据。前端平台注册表和 Rust `Platform` 枚举已有 Temu 支持，仅缺抓取脚本实现。

## What Changes
- 新增 `scraper-scripts/temu/` 目录，包含 6 个 TypeScript 模块（index / temuGetMain / temuGetSku / temuGetDetail / temuGetVideo / temuGetHylinkTitle）
- 在 `scripts/build-scraper.mjs` 中注册 temu 平台入口
- 在 `src-tauri/src/login/` 中新增 `temu.rs` 登录策略并注册到 `LoginStrategyRegistry`
- 前端平台注册表和 Rust `Platform` 枚举已有 Temu 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/temu/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/temu.rs` (新增)
  - `src-tauri/src/login/mod.rs` (注册策略)

## 设计对齐说明

本 Spec 严格遵循项目规范和已有实现模式，与淘宝/京东保持一致：

### 对齐要点
1. **模块结构**：6 文件结构（index + 5 子模块），与淘宝/京东完全一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与项目规范一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，由 Tauri 宿主的静默判定机制接管
4. **保留核心提取逻辑**：DOM 选择器、主世界脚本注入（rawData/leoConfig）、URL 清洗正则、MutationObserver — 全部保留
5. **完成判定**：使用 `waitForCompletion()` 前端辅助 + Rust 后端 7 秒静默自动完成
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测

### Temu 特有的技术要点（非过度设计）
Temu 页面结构与淘宝/京东有本质差异，以下逻辑是必需的：
- **主世界脚本注入**：Temu 将商品数据存储在 `window.rawData` / `window.leoConfig` 全局变量中，内容脚本无法直接访问（跨世界隔离），必须注入 `<script>` 到主世界提取数据，通过 `postMessage` 传回。淘宝/京东无此问题（淘宝从 `__ICE_APP_CONTEXT__` 的 script 标签解析 JSON，京东从 `pageConfig` 解析）
- **gallery 字段多名称兼容**：Temu 的商品图数据字段名不固定（`gallery`/`gallery_list`/`galleryList`/`banner_list` 等），需逐一尝试
- **`#leftContent` / `#rightContent` / `#goodsDetail` 容器**：Temu 独有的 DOM 容器 ID，分别对应主图区、SKU 区、详情区。淘宝/京东用不同的选择器
- **域名黑名单 `aimg.kwcdn.com`**：Temu 评论图托管域名，需排除以避免评论图混入商品图
- **路径黑名单**：`/flags/`、`/material-put/`、`/avatar/`、`/review/` 等 Temu 特有的非商品图路径
- **商品 ID 提取**：Temu 使用 `goods_id` 查询参数或 `-g-(\d+).html` 路径格式，与淘宝/京东不同

## ADDED Requirements

### Requirement: Temu 主图提取 (temuGetMain)
系统 SHALL 从 Temu 商品页提取所有主图 URL，遵循项目 GetMain 模板（初始化空值 → 提取 → 重试 → 额外抓取 → 上报）：

#### Scenario: 主世界脚本注入提取 rawData（主方案）
- **WHEN** 页面加载完成且 `window.rawData` 或 `window.leoConfig` 存在
- **THEN** 注入 `<script>` 到主世界，从 `rawData.store.goods.gallery`（兼容 `gallery_list`/`galleryList`/`banner_list`/`bannerList`/`banners`/`images`/`imageList`/`image_list`/`main_images`/`mainImages` 等字段名）提取图片 URL，跳过 `type === 2` 的视频项，通过 `postMessage` 传回内容脚本

#### Scenario: #leftContent 容器 DOM 提取（备用方案）
- **WHEN** 主世界脚本注入无数据
- **THEN** 从 `#leftContent` 容器遍历 `background-image` 样式和 `<img>` 标签（`src`/`data-src`/`data-original` 属性），提取图片 URL

#### Scenario: 高清原图 URL 还原
- **WHEN** 获取到带尺寸后缀的 Temu 图片 URL（如 `_400x400`、`.slim.webp`）
- **THEN** 移除 `_\d+x\d+` 尺寸后缀和 `.slim.\w+` 后缀，截断到扩展名，还原高清原图链接

#### Scenario: 无效图片过滤
- **WHEN** 提取到图片 URL
- **THEN** 过滤掉域名黑名单（`aimg.kwcdn.com`）、路径黑名单（`/flags/`、`/material-put/`、`/avatar/`、`/review/`、`/upload_aimg/`、`/openingemail/`、`/icon`、`/logo`、`/sprite`、`/placeholder`、`/loading`、`/default`、`/s.gif`、`-tps-`、`/supplier-public-tag/`）、`data:` 协议占位图；仅保留含有效扩展名（.jpg/.jpeg/.png/.webp/.gif）的 URL

### Requirement: Temu SKU 图提取 (temuGetSku)
系统 SHALL 从 Temu 商品页提取 SKU 变体图片 URL，遵循项目 GetSku 模板（初始化空值 → DOM 扫描 → 重试 → 上报）：

#### Scenario: #rightContent 容器 DOM 提取
- **WHEN** 页面加载完成
- **THEN** 从 `#rightContent` 容器遍历 `background-image` 样式和 `<img>` 标签（`src`/`data-src`/`data-original` 属性），提取 SKU 图片 URL

#### Scenario: URL 清洗与过滤
- **WHEN** 提取到图片 URL
- **THEN** 使用与主图相同的 `cleanImageUrl()` 函数还原高清原图，使用与主图相同的黑名单过滤无效图片

### Requirement: Temu 详情图提取 (temuGetDetail)
系统 SHALL 从 Temu 商品页提取详情图，遵循项目 GetDetail 模板（初始化空值 → 容器查找 → 多轮提取 → URL 清洗 → 上报）：

#### Scenario: #goodsDetail 容器 DOM 提取
- **WHEN** 页面加载完成
- **THEN** 从 `#goodsDetail` 容器遍历 `background-image` 样式和 `<img>` 标签（`src`/`data-src`/`data-original` 属性），提取详情图 URL

#### Scenario: URL 清洗与过滤
- **WHEN** 提取到图片 URL
- **THEN** 使用与主图相同的 `cleanImageUrl()` 函数还原高清原图，使用与主图相同的黑名单过滤无效图片

### Requirement: Temu 视频提取 (temuGetVideo)
系统 SHALL 从 Temu 商品页提取视频 URL，遵循项目 GetVideo 模板（立即启动 → 拦截注册 → DOM 检测 → 定时全量检测）：

#### Scenario: 主世界脚本注入提取视频 URL（主方案）
- **WHEN** 页面加载完成且 `window.rawData` 或 `window.leoConfig` 存在
- **THEN** 注入 `<script>` 到主世界，从 `rawData.store.goods.gallery` 中提取 `type === 2` 或包含 `.mp4` 的视频项（`video_url`/`videoUrl`/`url`/`src` 字段），通过 `postMessage` 传回

#### Scenario: DOM 视频标签检测
- **WHEN** 页面中存在 `video` 标签
- **THEN** 从 `src`、`source` 子元素提取视频 URL，排除 `blob:` 和 `data:` 协议

#### Scenario: MutationObserver 动态监听
- **WHEN** DOM 中新增 `video` 元素或 `video` 的 `src` 属性变化
- **THEN** 通过 MutationObserver 检测变化，防抖 300ms 后重新提取

#### Scenario: 视频有效性验证
- **WHEN** 发现视频 URL
- **THEN** 仅保留包含 `.mp4`/`.m3u8`/`.webm`/`.mov` 扩展名的 URL，排除 `blob:` 和 `data:` 协议

### Requirement: Temu 标题/链接/商品ID 提取 (temuGetHylinkTitle)
系统 SHALL 从 Temu 商品页提取商品标题、链接和商品 ID，遵循项目 GetHylinkTitle 模板（初始化空值 → 等待动态内容 → 提取 → 上报）：

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `h1` 标签提取标题文本；回退到 `document.title` 并移除 `| Temu` / `- Temu` 后缀；再回退到 `meta[property="og:title"]` 标签

#### Scenario: 商品 ID 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 优先从 URL 查询参数 `goods_id` 提取；回退到路径匹配 `-g-(\d+).html`；再回退到 15 位以上纯数字匹配

#### Scenario: 链接提取
- **WHEN** 提取商品链接
- **THEN** 清理 URL 为 `origin + pathname` 格式（移除查询参数和哈希）

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报 `productTitle`、`productLink`、`productId`

### Requirement: Temu 抓取脚本入口 (index.ts)
系统 SHALL 提供统一的 Temu 抓取脚本入口，严格遵循项目标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `temuGetVideo` 模块（主世界脚本注入 + MutationObserver 需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(TEMU_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块。Temu 登录选择器待确认（Temu 可能使用弹窗式登录，暂设为空数组，依赖通用登录检测）

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `temuGetMain`、`temuGetSku`、`temuGetDetail`、`temuGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 验证码检测
- **WHEN** 页面出现 Temu CAPTCHA 元素
- **THEN** 通过 MutationObserver 检测验证码出现/消失，发送 `captcha-detected`/`captcha-resolved` 事件（节流上限 3 次）。Temu 验证码选择器暂设为空数组（待实际观察确认）

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将 Temu 平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `temu: resolve(projectRoot, 'scraper-scripts/temu/index.ts')`，生成 `dist-scripts/temu.bundle.js`

### Requirement: Temu 登录策略
系统 SHALL 在 Rust 后端实现 Temu 登录检测策略。使用 `DefaultLoginStrategy` 即可（与拼多多/唯品会模式一致），因为 Temu 登录流程简单，无中间页，且需要 `extract_product_id()` 提取商品 ID：

#### Scenario: 登录页检测
- **WHEN** Worker 导航到 Temu 登录相关 URL
- **THEN** 检测 `temu.com/login` 等登录页面模式，返回 `LoginRequired`

#### Scenario: 商品 ID 提取
- **WHEN** 需要从 URL 提取商品 ID
- **THEN** 匹配 `goods_id=(\d+)` 查询参数或 `-g-(\d+).html` 路径格式

#### Scenario: 平台非商品页检测
- **WHEN** CaptchaBlocked 恢复时
- **THEN** `is_still_on_platform_non_product()` 判断 URL 是否仍在 `temu.com` 域名下但非商品页

## MODIFIED Requirements

### Requirement: LoginStrategyRegistry
`LoginStrategyRegistry::new()` SHALL 注册 Temu 登录策略实例：
```rust
registry.register(Arc::new(temu::TemuLoginStrategy));
```

## REMOVED Requirements
无移除项。
