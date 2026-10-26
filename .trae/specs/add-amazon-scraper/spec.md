# 亚马逊(Amazon)抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东等平台的抓取脚本，但亚马逊（全球最大电商平台、20+ 区域站点）尚未实现。用户需要通过 PcGetPic 的 Worker 窗口自动加载亚马逊商品页，提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/amazon/` 目录，包含 6 个 TypeScript 模块（index / amGetMain / amGetSku / amGetDetail / amGetVideo / amGetHylinkTitle）
- 在 `scripts/build-scraper.mjs` 中注册 amazon 平台入口
- 在 `src-tauri/src/login/` 中新增 `amazon.rs` 登录策略并注册到 `LoginStrategyRegistry`
- 前端平台注册表和 Rust `Platform` 枚举已有 Amazon 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/amazon/` (新增 6 个文件)
  - `scraper-scripts/shared/utils.ts` (扩展 `getProductId` 支持亚马逊 ASIN)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/amazon.rs` (新增)
  - `src-tauri/src/login/mod.rs` (注册策略)

## 设计对齐说明

本 Spec 严格遵循 `docs/平台抓取脚本开发指南.md` 的规范，与淘宝/京东已有实现保持一致：

### 对齐开发指南的要点
1. **模块结构**：6 文件结构（index + 5 子模块），与淘宝/京东完全一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与指南第八章一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，与指南 8.3 节一致
4. **保留核心提取逻辑**：DOM 选择器、全局变量提取、URL 清洗正则、MutationObserver、XHR/Fetch 拦截、Performance API — 全部保留，与指南 8.4 节一致
5. **完成判定**：使用 `waitForCompletion()` 前端辅助 + Rust 后端 7 秒静默自动完成，与指南第一/六章一致
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测，与指南第三章模板一致

### 亚马逊特有的复杂度（非过度设计）
亚马逊页面结构与淘宝/京东有本质差异，以下逻辑是必需的：
- **`smartQuoteReplacement()`**：亚马逊 HTML 内嵌的 JS 数据块使用单引号、缺少逗号、包含 `Date.now()` 等表达式，必须修复后才能 `JSON.parse()`。淘宝/京东无此问题（淘宝用 `__ICE_APP_CONTEXT__` 双引号 JSON，京东用 `pageConfig`）
- **`colorImages` 括号匹配法**：亚马逊商品图数据嵌套在 `colorImages: {initial: [...], "颜色名": [...]}` 结构中，需要括号匹配提取完整对象。淘宝/京东无此结构
- **A+ Content 容器**：亚马逊独有的 A+ Content 详情区域（`#aplus`、`.aplus-v2`），需要 12 个选择器覆盖。淘宝/京东用 `#content`/`#container` 等简单选择器
- **裁剪后缀还原**：亚马逊 A+ 图片有 `.__CR0,119,4317,1987__.` 裁剪参数，需额外正则。淘宝/京东仅需截断到扩展名
- **多区域域名**：亚马逊 20+ 区域站点（.com/.co.uk/.de/.co.jp 等），登录策略需覆盖所有区域

## ADDED Requirements

### Requirement: 亚马逊主图提取 (amGetMain)
系统 SHALL 从亚马逊商品页提取所有主图 URL，遵循开发指南 GetMain 模板（初始化空值 → 提取 → 重试 → 额外抓取 → 上报）：

#### Scenario: JSON colorImages 数据提取（主方案）
- **WHEN** 页面 HTML 中包含 `colorImages` JSON 数据块
- **THEN** 通过括号匹配法提取完整 `colorImages` 对象，解析 `initial` 分支及各颜色变体分支的 `hiRes`/`large` 字段，还原高清原图 URL

#### Scenario: #altImages 容器 DOM 提取（备用方案A）
- **WHEN** JSON 提取失败或无数据
- **THEN** 从 `#altImages` 容器遍历所有 `img` 标签，提取 `src`/`data-src` 属性并还原高清原图

#### Scenario: .a-spacing-small 容器 DOM 提取（备用方案B）
- **WHEN** 前两个方案均失败
- **THEN** 从 `.a-spacing-small` 容器遍历所有 `img` 标签提取

#### Scenario: 高清原图 URL 还原
- **WHEN** 获取到带尺寸后缀的亚马逊图片 URL（如 `._AC_US40_.`、`._SX300_SY300_.`）
- **THEN** 移除 `._[A-Z0-9,._]+_.` 格式的尺寸后缀，还原为最高清原图链接

#### Scenario: 无效图片过滤
- **WHEN** 提取到图片 URL
- **THEN** 过滤掉占位图（transparent-pixel、grey-pixel、spinner）、图标（/icons/、_icon）、视频播放图标（play-button、play-icon、video-thumb）、SVG 格式；仅保留包含 `/images/I/` 路径的 URL

#### Scenario: Amazon 数据修复
- **WHEN** 从 HTML 提取的 JSON 字符串包含单引号属性名、缺失逗号、`Date.now()`/`undefined` 等 JS 表达式
- **THEN** 通过 `smartQuoteReplacement()` 修复为合法 JSON 后再解析

### Requirement: 亚马逊 SKU 图提取 (amGetSku)
系统 SHALL 从亚马逊商品页提取 SKU 变体图片 URL，遵循开发指南 GetSku 模板（初始化空值 → DOM 扫描 → MutationObserver → 轮询兜底）：

#### Scenario: JSON colorImages 颜色变体提取（主方案）
- **WHEN** `colorImages` 包含多个颜色变体（非仅 `initial`）
- **THEN** 每个颜色变体取第一张图的 `hiRes`/`large` 字段作为 SKU 代表图，还原高清原图

#### Scenario: DOM 选择器提取（备用方案）
- **WHEN** JSON 方案失败
- **THEN** 按优先级尝试亚马逊 SKU 选择器：`#variation_color_name li img`、`#imgSwatch img`、`#variation_style_name li img` 等，从 `data-a-dynamic-image`、`data-a-hires`、`data-old-hires`、`data-src`、`src` 属性提取高清图

### Requirement: 亚马逊详情图提取 (amGetDetail)
系统 SHALL 从亚马逊商品页提取 A+ Content 和产品描述区域的详情图，遵循开发指南 GetDetail 模板（初始化空值 → 容器查找 → 多轮提取 → URL 清洗 → 上报）：

#### Scenario: A+ Content 容器查找
- **WHEN** 页面加载完成
- **THEN** 按优先级查找 A+ Content 容器：`#aplus`、`#aplus_feature_div`、`.aplus-v2`、`#productDescription` 等，支持最多 5 次重试等待容器渲染

#### Scenario: 多属性图片提取
- **WHEN** 找到详情容器
- **THEN** 从 `img` 标签的 `data-src`、`data-a-hires`、`data-old-hires`、`data-lazy-src`、`data-original`、`src` 属性提取；同时解析 `noscript` 标签中的 SEO 备份图片、`background-image` 样式图片、`data-a-dynamic-image` 动态图片属性

#### Scenario: A+ 图片高清还原
- **WHEN** 获取到 A+ Content 图片 URL
- **THEN** 移除裁剪后缀 `.__[A-Z0-9,._-]+__.` 和尺寸后缀 `._[A-Z0-9,._]+_.`，还原高清原图

### Requirement: 亚马逊视频提取 (amGetVideo)
系统 SHALL 从亚马逊商品页提取视频 URL，遵循开发指南 GetVideo 模板（立即启动 → 拦截注册 → DOM 检测 → 定时全量检测）：

#### Scenario: 网络请求拦截
- **WHEN** 页面发起 XHR/Fetch 请求
- **THEN** 拦截请求，检测响应 URL 和响应体中的视频 URL（mp4/m3u8/flv/webm 格式）

#### Scenario: DOM 视频标签检测
- **WHEN** 页面中存在 `video` 标签
- **THEN** 从 `src`、`currentSrc`、`source` 子元素提取视频 URL，排除 `blob:` 协议

#### Scenario: JSON 嗅探器注入
- **WHEN** 页面加载
- **THEN** 注入脚本嗅探 `window` 全局变量（`__INITIAL_STATE__`、`P`、`A`、`imageBlock` 等）中的视频 URL

#### Scenario: 视频分类与过滤
- **WHEN** 发现视频 URL
- **THEN** 分类为主图视频（main）或详情视频（detail），过滤广告（advertisement、banner、commercial）和 Prime Video 内容（prime-video、imdb）

#### Scenario: Performance API 监控
- **WHEN** 页面有网络资源加载
- **THEN** 通过 `performance.getEntriesByType('resource')` 检测媒体资源请求

### Requirement: 亚马逊标题/链接/ASIN 提取 (amGetHylinkTitle)
系统 SHALL 从亚马逊商品页提取商品标题、链接和 ASIN，遵循开发指南 GetHylinkTitle 模板（初始化空值 → 等待动态内容 → 提取 → 上报）：

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `#productTitle` 元素提取标题文本；回退到 `head title` 标签并移除 `Amazon.com:` / `Amazon.co.jp:` 等站点前缀

#### Scenario: ASIN 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 扩展 `shared/utils.ts` 的 `getProductId()` 函数，增加亚马逊 ASIN 匹配：`/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i`，提取 10 位字母数字 ASIN

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报 `productTitle`、`productLink`、`productId`

### Requirement: 亚马逊抓取脚本入口 (index.ts)
系统 SHALL 提供统一的亚马逊抓取脚本入口，严格遵循开发指南第三章标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `amGetVideo` 模块（网络拦截需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(AMAZON_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块。亚马逊登录选择器：`#ap_signin1a_pagelet`、`.a-sign-in`、`#authportal-main-section`、`.signin-row`、`#signInSubmit`

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `amGetMain`、`amGetSku`、`amGetDetail`、`amGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 验证码检测
- **WHEN** 页面出现亚马逊 CAPTCHA 元素
- **THEN** 通过 MutationObserver 检测验证码出现/消失，发送 `captcha-detected`/`captcha-resolved` 事件（节流上限 3 次）。亚马逊验证码选择器：`#captchacharacters`、`.cvf-widget-form`、`#cvf-input-code`

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将亚马逊平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `amazon: resolve(projectRoot, 'scraper-scripts/amazon/index.ts')`，生成 `dist-scripts/amazon.bundle.js`

### Requirement: 亚马逊登录策略
系统 SHALL 在 Rust 后端实现亚马逊登录检测策略。由于亚马逊需要 `extract_product_id()` 提取 ASIN（`DefaultLoginStrategy` 返回 None），必须自定义实现（参考 `taobao.rs` 模式，而非 `default.rs`）：

#### Scenario: 登录页检测
- **WHEN** Worker 导航到亚马逊登录相关 URL
- **THEN** 检测 `signin.amazon`、`ap/signin`、`amazon.com/ap/signin` 等登录页面模式，返回 `LoginRequired`

#### Scenario: 验证码检测
- **WHEN** 页面出现亚马逊 CAPTCHA
- **THEN** 检测 `captcha`、`cvf/verification` 等 URL 模式，返回 `Captcha`

#### Scenario: 商品 ID 提取
- **WHEN** 需要从 URL 提取商品 ID
- **THEN** 匹配 `/dp/ASIN`、`/gp/product/ASIN`、`/gp/aw/d/ASIN` 格式提取 10 位 ASIN

#### Scenario: 平台非商品页检测
- **WHEN** CaptchaBlocked 恢复时
- **THEN** `is_still_on_platform_non_product()` 判断 URL 是否仍在 `amazon.` 域名下但非 `/dp/` 商品页

#### Scenario: 登录 Cookie 检测
- **WHEN** 需要判断是否已有登录态
- **THEN** 检查 `session-id`、`ubid-main`、`x-main` 等 Cookie

#### Scenario: 验证码选择器
- **WHEN** 前端脚本需要检测验证码 DOM 元素
- **THEN** 返回 `#captchacharacters`、`.cvf-widget-form`、`#cvf-input-code`

## MODIFIED Requirements

### Requirement: LoginStrategyRegistry
`LoginStrategyRegistry::new()` SHALL 注册亚马逊登录策略实例：
```rust
registry.register(Arc::new(amazon::AmazonLoginStrategy));
```

## REMOVED Requirements
无移除项。
