# 抖音(Douyin)抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东、拼多多等平台的抓取脚本，但抖音（国内最大短视频/直播电商平台）尚未实现抓取脚本。用户需要通过 PcGetPic 的 Worker 窗口自动加载抖音商品页（含直播间商品、精选联盟商品），提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/douyin/` 目录，包含 7 个 TypeScript 文件（index / dyGetMain / dyGetSku / dyGetDetail / dyGetVideo / dyGetHylinkTitle / dyUtils）
- 在 `scripts/build-scraper.mjs` 中注册 douyin 平台入口
- 在 `src-tauri/src/login/` 中新增 `douyin.rs` 登录策略并注册到 `LoginStrategyRegistry`
- 前端平台注册表和 Rust `Platform` 枚举已有 Douyin 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/douyin/` (新增 7 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/douyin.rs` (新增)
  - `src-tauri/src/login/mod.rs` (注册策略)

## 设计对齐说明

本 Spec 严格遵循 `docs/平台抓取脚本开发指南.md` 的规范，与淘宝/京东/亚马逊已有实现保持一致：

### 对齐开发指南的要点
1. **模块结构**：6 文件结构（index + 5 子模块）+ 1 个平台工具文件（dyUtils.ts），与指南第二章目录结构规范一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与指南一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，与指南第一章 1.2 节一致
4. **保留核心提取逻辑**：DOM 选择器、背景图 URL 提取、URL 清洗正则、MutationObserver、XHR/Fetch 拦截、Performance API — 全部保留，与指南第四章一致
5. **完成判定**：使用 `waitForCompletion()` 前端辅助 + Rust 后端 7 秒静默自动完成，与指南第一/六章一致
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测，与指南第三章模板一致
7. **共享工具函数**：使用 `import { sleep, deduplicateUrls } from '../shared/utils'`，不在模块内重复定义本地 `sleep`，与指南第四章 4.1 节第 5 条一致
8. **GetSku 最佳实践**：返回清理函数（同时清理 Observer 和定时器）、精确监听目标容器、监听属性变化，与指南第四章 4.3 节一致
9. **GetHylinkTitle 四字段**：必须输出 `productTitle`、`productLink`、`productId`、`visitTime`，与指南第四章 4.6 节一致

### 抖音特有逻辑（非过度设计）
抖音页面结构与淘宝/京东有本质差异，以下逻辑是必需的：
- **抖音图片域名验证**：仅接受 `ecombdimg.com`、`douyinpic.com`、`douyincdn.com`、`byteimg.com`、`bytedance.com` 域名的图片 URL，过滤非商品图片
- **resize 参数原图还原**：抖音图片 URL 包含 `resize:790:xxx`、`resize:300:0` 等尺寸参数，替换为 `resize:0:0` 获取原图
- **SKU 图尺寸区分**：SKU 图 URL 包含 `resize:300`，主图包含 `resize:1080` 或更大尺寸，通过尺寸参数区分 SKU 图和主图
- **Swiper 轮播图提取**：抖音主图使用 Swiper 组件，需从 `.swiper-slide:not(.swiper-slide-duplicate)` 提取，排除重复的克隆幻灯片
- **background-image 提取**：抖音部分图片以 CSS 背景图方式加载，需从 `style` 属性中 `url()` 提取
- **直播流过滤**：视频模块需过滤 `douyinliving.com`、`.flv`、`.m3u8` 等直播流格式，仅保留可下载的 mp4/webm 等格式
- **`__INITIAL_STATE__` 数据提取**：抖音页面将商品数据注入 `window.__INITIAL_STATE__`，需从中提取视频 URL（`c.shop.videourl` 字段）
- **商品 ID 多参数提取**：支持 `id`、`product_id`、`promotion_id` 三种 URL 参数，以及 `/live/{id}` 路径格式
- **平台工具文件 dyUtils.ts**：`cleanDouyinImageUrl()`、`isValidDouyinImageUrl()`、`getOriginalDouyinImageUrl()` 三个函数在 Main/SKU/Detail 三个模块中共享使用，按指南第二章 2.1 节说明抽取到 `<platform>Utils.ts`

## ADDED Requirements

### Requirement: 抖音平台工具函数 (dyUtils.ts)
系统 SHALL 提供抖音平台共享工具函数文件，供 dyGetMain/dyGetSku/dyGetDetail 三个模块复用：

#### Scenario: URL 协议补全
- **WHEN** 图片 URL 以 `//` 开头
- **THEN** `cleanDouyinImageUrl()` 补全为 `https:` 前缀

#### Scenario: 域名验证
- **WHEN** 需要验证图片 URL 是否来自抖音 CDN
- **THEN** `isValidDouyinImageUrl()` 仅接受 `ecombdimg.com`、`douyinpic.com`、`douyincdn.com`、`byteimg.com`、`bytedance.com` 域名，过滤 Base64 图片（`data:` 开头）

#### Scenario: 原图还原
- **WHEN** 图片 URL 包含 `resize:790:xxx`、`resize:300:0` 等尺寸参数
- **THEN** `getOriginalDouyinImageUrl()` 替换 `resize:\d+:\d+` 为 `resize:0:0` 获取原图

### Requirement: 抖音主图提取 (dyGetMain)
系统 SHALL 从抖音商品页提取所有主图 URL，遵循开发指南 GetMain 模板（初始化空值 → 提取 → 重试 → 额外抓取 → 上报）：

#### Scenario: Swiper 轮播图 DOM 提取（主方案 A）
- **WHEN** 页面包含 Swiper 轮播组件
- **THEN** 从 `.swiper-slide:not(.swiper-slide-duplicate) img` 提取 `src`/`data-src` 属性，过滤 Base64 图片和占位图

#### Scenario: background-image 样式提取（主方案 B）
- **WHEN** 页面包含 CSS 背景图
- **THEN** 从 `.swiper-slide div[style*="background-image"]` 等选择器提取 `url()` 中的图片 URL，处理 HTML 实体转义（`&quot;` → `"`）

#### Scenario: 抖音图片域名验证
- **WHEN** 提取到图片 URL
- **THEN** 使用 `dyUtils.isValidDouyinImageUrl()` 仅保留抖音 CDN 域名的 URL

#### Scenario: 无效图片过滤
- **WHEN** 提取到图片 URL
- **THEN** 过滤掉 Base64 图片（`data:image` 开头）和非抖音域名图片

### Requirement: 抖音 SKU 图提取 (dyGetSku)
系统 SHALL 从抖音商品页提取 SKU 变体图片 URL，遵循开发指南 GetSku 模板（初始获取 + MutationObserver 动态监听 + 轮询兜底 + 返回清理函数）：

#### Scenario: DOM 选择器提取
- **WHEN** 页面包含 SKU 图片区域
- **THEN** 按优先级尝试选择器：`.qZmIVPuL img`、`.b2x7cxK3 img`、`.nEYyfGLh`、`.mZgYczJr`、`[data-bytereplay-mask] img`

#### Scenario: SKU 图尺寸过滤
- **WHEN** 提取到图片 URL
- **THEN** 通过 URL 中的 `resize:300` 参数区分 SKU 图（300px）和主图（1080px 或更大），仅保留 `resize:300` 的图片

#### Scenario: SKU 缩略图原图还原
- **WHEN** 获取到包含 `resize:300:0` 的 SKU 图片 URL
- **THEN** 使用 `dyUtils.getOriginalDouyinImageUrl()` 替换为 `resize:0:0` 获取原图

#### Scenario: 商品弹窗检测
- **WHEN** SKU 提取结果为空但商品弹窗存在
- **THEN** 清空旧 SKU 数据，避免显示上一个商品的 SKU 图

#### Scenario: 精确监听目标容器
- **WHEN** 注册 MutationObserver
- **THEN** 精确监听 SKU 容器元素（而非 `document.body`），同时监听 `attributes` 变化（`src`、`data-src`、`data-original`），与指南 4.3 节最佳实践一致

#### Scenario: 返回清理函数
- **WHEN** 模块执行完成
- **THEN** 返回 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }` 清理函数，同时清理 Observer 和定时器，与指南 4.3 节一致

### Requirement: 抖音详情图提取 (dyGetDetail)
系统 SHALL 从抖音商品页提取详情区域图片，遵循开发指南 GetDetail 模板（重试等待容器 + 多轮次遍历 + 上报）：

#### Scenario: 详情图容器查找
- **WHEN** 页面加载完成
- **THEN** 按优先级查找详情容器：`.partial-detail-wrapper img`、`.product-big-img-list img`、`.gallery-component img`、`.NGeinxLS img`、`.eG19UsAr img`、`.ZW0NMRQy img`、`.jEqmQYXZ img`、`.qZmIVPuL img`

#### Scenario: 详情图原图还原
- **WHEN** 获取到包含 `resize:790:xxx` 等尺寸参数的详情图 URL
- **THEN** 使用 `dyUtils.getOriginalDouyinImageUrl()` 替换为 `resize:0:0` 获取原图

#### Scenario: 多属性图片提取
- **WHEN** 找到详情容器
- **THEN** 从 `img` 标签的 `src`、`data-src`、`data-original`、`currentSrc` 属性提取图片 URL

#### Scenario: 商品弹窗检测
- **WHEN** 详情图提取结果为空但商品弹窗存在
- **THEN** 清空旧详情数据，避免显示上一个商品的详情图

### Requirement: 抖音视频提取 (dyGetVideo)
系统 SHALL 从抖音商品页提取视频 URL，遵循开发指南 GetVideo 模板（立即启动 → 拦截注册 → DOM 检测 → 定时全量检测）：

#### Scenario: 网络请求拦截
- **WHEN** 页面发起 XHR/Fetch 请求
- **THEN** 拦截请求，检测响应 URL 和响应体中的视频 URL

#### Scenario: DOM 视频标签检测
- **WHEN** 页面中存在 `video` 标签
- **THEN** 从 `src`、`currentSrc`、`source` 子元素提取视频 URL，过滤过小视频（宽/高 < 50px）和过短视频（时长 < 1s）

#### Scenario: `__INITIAL_STATE__` 数据提取
- **WHEN** `window.__INITIAL_STATE__` 存在
- **THEN** 从 `c.shop.videourl` 字段提取视频 URL，解码 `\u002F` 等转义字符

#### Scenario: 直播流过滤
- **WHEN** 发现视频 URL
- **THEN** 过滤 `douyinliving.com` 域名、`.flv` 格式、`.m3u8` 格式、`/stream-` 路径、`fantasy/stream-` 路径等直播流 URL

#### Scenario: 视频黑名单过滤
- **WHEN** 发现视频 URL
- **THEN** 过滤包含 `avatar`、`/comment/`、`ugc`、`/ad/`、`loading`、`placeholder`、`emoji`、`sticker`、`watermark`、`preview`、`blob:`、`douyin_pc_client` 关键词的 URL

#### Scenario: mime_type 参数检测
- **WHEN** URL 包含 `mime_type=video` 或 `mime_type%3dvideo` 参数
- **THEN** 识别为视频 URL（即使无传统视频扩展名）

#### Scenario: Performance API 增量监控
- **WHEN** 页面有网络资源加载
- **THEN** 通过 `performance.getEntriesByType('resource')` + 游标增量检测 + `requestAnimationFrame` 持续轮询，与指南 4.5 节一致

#### Scenario: 延时梯度扫描
- **WHEN** DOMContentLoaded 后
- **THEN** 在 1s/3s/5s/10s 四个时间点执行全量检测（页面 JSON + window 全局变量 + DOM 扫描），与指南 4.5 节一致

### Requirement: 抖音标题/链接/商品ID/访问时间 提取 (dyGetHylinkTitle)
系统 SHALL 从抖音商品页提取商品标题、链接、商品 ID 和访问时间，遵循开发指南 GetHylinkTitle 模板（必须输出全部四个字段）：

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 按优先级尝试选择器：`.title-info .title-info__text`（好物联盟）、`.vs9hmvGz[title]`（商品弹窗）、`.lEOkRg32[title]`（商品详情）、`[data-e2e="promotion-title"]`（商品列表）等；回退到 `head title` 标签

#### Scenario: 商品 ID 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 按优先级尝试 URL 参数 `id`、`product_id`、`promotion_id`；回退到路径匹配 `live.douyin.com/{id}`、`/follow/live/{id}`、`/live/{id}`

#### Scenario: 商品链接清洗
- **WHEN** 获取到原始 URL
- **THEN** 移除查询参数和 Hash，保留核心路径（`origin + pathname`）

#### Scenario: 访问时间生成
- **WHEN** 提取完成
- **THEN** 生成 `visitTime` 字段，格式为 `YYYY-MM-DD HH:mm`，与指南 4.6 节要求一致

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报全部四个字段：`productTitle`、`productLink`、`productId`、`visitTime`

### Requirement: 抖音抓取脚本入口 (index.ts)
系统 SHALL 提供统一的抖音抓取脚本入口，严格遵循开发指南第三章标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `dyGetVideo` 模块（网络拦截需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(DOUYIN_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块。抖音登录选择器：`.login-panel`、`.qrcode-login`、`.scan-login`、`.login-switch`、`.mod-login`

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `dyGetMain`、`dyGetSku`、`dyGetDetail`、`dyGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 验证码检测
- **WHEN** 页面出现抖音 CAPTCHA 元素
- **THEN** 通过 MutationObserver 检测验证码出现/消失，发送 `captcha-detected`/`captcha-resolved` 事件（节流上限 3 次）。抖音验证码选择器：`#captcha_container`、`.captcha-verify-container`、`#captcha-verify-image`

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将抖音平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `douyin: resolve(projectRoot, 'scraper-scripts/douyin/index.ts')`，生成 `dist-scripts/douyin.bundle.js`

### Requirement: 抖音登录策略
系统 SHALL 在 Rust 后端实现抖音登录检测策略：

#### Scenario: 登录页检测
- **WHEN** Worker 导航到抖音登录相关 URL
- **THEN** 检测 `login.douyin.com`、`sso.douyin.com` 等登录页面模式，返回 `LoginRequired`

#### Scenario: 验证码检测
- **WHEN** 页面出现抖音 CAPTCHA
- **THEN** 检测 `captcha` URL 模式，返回 `Captcha`

#### Scenario: 商品 ID 提取
- **WHEN** 需要从 URL 提取商品 ID
- **THEN** 匹配 `id=`、`product_id=`、`promotion_id=` 参数格式以及 `/live/{id}` 路径格式

#### Scenario: 平台非商品页检测
- **WHEN** CaptchaBlocked 恢复时
- **THEN** `is_still_on_platform_non_product()` 判断 URL 是否仍在 `douyin.com`/`jinritemai.com`/`snssdk.com` 域名下但非商品页

#### Scenario: 验证码选择器
- **WHEN** 前端脚本需要检测验证码 DOM 元素
- **THEN** 返回 `#captcha_container`、`.captcha-verify-container`、`#captcha-verify-image`

## MODIFIED Requirements

### Requirement: LoginStrategyRegistry
`LoginStrategyRegistry::new()` SHALL 注册抖音登录策略实例：
```rust
registry.register(Arc::new(douyin::DouyinLoginStrategy));
```

## REMOVED Requirements
无移除项。
