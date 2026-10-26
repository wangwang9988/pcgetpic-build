# Coupang 抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东、唯品会、1688 等平台的抓取脚本，但 Coupang（韩国最大电商平台）尚未实现。用户需要通过 PcGetPic 的 Worker 窗口自动加载 Coupang 商品页，提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/coupang/` 目录，包含 7 个 TypeScript 文件（index + cpGetMain / cpGetSku / cpGetDetail / cpGetVideo / cpGetHylinkTitle + cpUtils 共享工具）
- 在 `scripts/build-scraper.mjs` 中注册 coupang 平台入口
- 前端平台注册表（`PLATFORM_PATTERNS`/`PLATFORM_LABELS`/`PLATFORM_ICONS`/`registry.ts`）和 Rust `Platform` 枚举已有 Coupang 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/coupang/` (新增 7 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)

## 设计对齐说明

本 Spec 严格遵循 `docs/平台抓取脚本开发指南.md` 的规范，与淘宝/京东已有实现保持一致：

### 对齐开发指南的要点
1. **模块结构**：6 文件结构（index + 5 子模块），与淘宝/京东完全一致。额外新增 `cpUtils.ts` 存放平台特有工具函数（指南 2.1 节明确允许）
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与指南一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒、页面状态保存/恢复 — 全部移除，与指南 1.1 节一致（窗口关闭只与数据值变化有关，与脚本执行无关）
4. **保留核心提取逻辑**：JSON-LD 解析、Next.js `self.__next_f.push` 数据提取、DOM 选择器、URL 清洗（thumbnail→image 还原）、MutationObserver、XHR/Fetch 拦截、Performance API — 全部保留
5. **完成判定**：使用 `waitForCompletion()` 数据静默判定 + Rust 后端 7 秒静默自动完成，与指南第一/六章一致
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测，与指南第三章模板一致
7. **共享 sleep**：使用 `import { sleep } from '../shared/utils'`，不在模块内定义本地 sleep（指南 4.1 节强制要求新平台使用共享 sleep）
8. **GetSku 返回清理函数**：返回同时清理 Observer 和定时器的清理函数（指南 4.3 节推荐，唯品会做法的增强版）
9. **GetSku 精确监听**：监听特定 SKU 容器而非 document.body，同时监听 attributes 变化（指南 4.3 节推荐，京东/唯品会/1688 做法）
10. **GetVideo Performance API 增量检测**：使用游标增量检测而非全量扫描（指南 4.5 节推荐，京东/1688 做法）
11. **GetHylinkTitle 四字段完整输出**：必须输出 `productTitle`、`productLink`、`productId`、`visitTime`（指南 4.6 节强制要求）

### Coupang 特有的复杂度（非过度设计）
Coupang 页面结构与淘宝/京东有本质差异，以下逻辑是必需的：
- **Next.js 数据提取**：Coupang 使用 Next.js SSR，商品数据嵌套在 `self.__next_f.push([1,"..."])` 脚本标签中，需要反转义后通过括号匹配法提取 `attributeVendorItemMap` 和 `options` 对象。淘宝用 `__ICE_APP_CONTEXT__`，京东用 `pageConfig`
- **JSON-LD 提取**：Coupang 在 `<script type="application/ld+json">` 中提供 `@type=Product` 的 `image` 数组，这是最可靠的主图来源
- **高清原图还原**：Coupang 缩略图 URL 格式为 `thumbnail.coupangcdn.com/thumbnails/remote/{尺寸}/image/`，需替换域名为 `image.coupangcdn.com` 并删除 `/thumbnails/remote/{尺寸}/` 路径段。这与淘宝/京东的截断到扩展名方式完全不同，属于指南 7.2 节的"平台特有缩略图后缀"场景
- **颜色属性 SKU**：Coupang SKU 图通过 `options.optionRows` 中 `colorAttribute===true` 的 `image.origin` 字段提取，而非淘宝/京东的 DOM 选择器方式
- **详情图双重来源**：Coupang 详情图需从 Next.js 脚本标签（`<img src>` 正则匹配）和 DOM 容器（`.product-detail-content-inside`/`.product-detail-content`）双路提取

## ADDED Requirements

### Requirement: Coupang 共享工具函数 (cpUtils.ts)
系统 SHALL 提供 Coupang 平台特有的工具函数，供各子模块复用：

#### Scenario: 高清原图 URL 还原
- **WHEN** 获取到 Coupang 图片 URL（可能为缩略图）
- **THEN** `getOriginalCoupangUrl(url)` 将 `thumbnail.coupangcdn.com` 替换为 `image.coupangcdn.com`，删除 `/thumbnails/remote/{尺寸}/` 路径段，移除查询参数

#### Scenario: Coupang 图片有效性验证
- **WHEN** 需要验证提取到的 URL 是否为有效的 Coupang 产品图片
- **THEN** `isValidCoupangImageUrl(url)` 检查图片扩展名、验证产品路径（`/vendor_inventory/`、`/retail/`、`/product/`、`/productDetail/`）、过滤 UI 图标/徽章

#### Scenario: JSON 对象括号匹配提取
- **WHEN** 需要从 Next.js 脚本反转义后的字符串中提取 JSON 对象
- **THEN** `extractJsonObject(str, startKey)` 通过括号匹配法定位并解析完整 JSON 对象

#### Scenario: Next.js 脚本反转义
- **WHEN** 需要处理 `self.__next_f.push([1,"..."])` 中的转义字符串
- **THEN** `unescapeNextJsData(rawData)` 执行 `\\"` → `"`、`\\\\` → `\`、`\\u003c` → `<`、`\\u003e` → `>`、`\\u0022` → `"` 等反转义

### Requirement: Coupang 主图提取 (cpGetMain)
系统 SHALL 从 Coupang 商品页提取所有主图 URL，遵循指南 GetMain 模板（初始化空值 → 提取 → 重试 → 额外抓取 → 上报）：

#### Scenario: JSON-LD 数据提取（首选方案）
- **WHEN** 页面 HTML 中包含 `<script type="application/ld+json">` 且 `@type` 为 `Product`
- **THEN** 解析 JSON-LD 的 `image` 字段（数组或字符串），获取主图 URL 并通过 `getOriginalCoupangUrl()` 还原高清原图

#### Scenario: Next.js attributeVendorItemMap 提取（增强方案）
- **WHEN** 页面包含 `self.__next_f.push` 脚本标签
- **THEN** 通过 `unescapeNextJsData()` 反转义后，使用 `extractJsonObject()` 提取 `attributeVendorItemMap` 对象，遍历所有 SKU 的 `images[].origin` 字段获取图片 URL

#### Scenario: Next.js options.optionRows 颜色属性图片提取（补充方案）
- **WHEN** `attributeVendorItemMap` 提取完成
- **THEN** 继续使用 `extractJsonObject()` 从 `options.optionRows` 中提取 `attributes[].image.origin` 字段获取颜色属性图片

#### Scenario: 重试与额外抓取
- **WHEN** 首次提取无结果
- **THEN** 以 500ms 间隔最多重试 100 次（使用共享 `sleep`）；有结果后额外抓取 3 轮确保完整性

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send('MainPic', images)` 上报去重后的图片 URL 列表

### Requirement: Coupang SKU 图提取 (cpGetSku)
系统 SHALL 从 Coupang 商品页提取 SKU 颜色变体图片 URL，遵循指南 GetSku 模板（初始化空值 → DOM/JSON 扫描 → MutationObserver → 轮询兜底 → 返回清理函数）：

#### Scenario: Next.js options.optionRows 颜色主图提取（主方案）
- **WHEN** 页面包含 `self.__next_f.push` 脚本且 `options.optionRows` 中存在 `colorAttribute===true` 的行
- **THEN** 提取该行所有 `attributes[].image.origin` 字段，通过 `getOriginalCoupangUrl()` 还原高清原图 URL

#### Scenario: DOM .fashion-option 容器提取（备用方案）
- **WHEN** JSON 方案失败
- **THEN** 从 `.fashion-option` 容器遍历所有 `img` 标签，提取 `src`/`data-src` 属性并还原高清原图

#### Scenario: MutationObserver 精确监听
- **WHEN** SKU 区域 DOM 发生变化
- **THEN** 精确监听 `[data-widget="webAspects"]` 和 `.pdp_q6` 容器（而非 document.body），同时监听 `childList` 和 `attributes` 变化（`src`、`data-src`），防抖 500ms 后重新抓取

#### Scenario: 轮询兜底
- **WHEN** 首次提取无结果
- **THEN** 以 3000ms 间隔最多轮询 10 次（使用共享 `sleep`）

#### Scenario: 返回清理函数
- **WHEN** 模块执行完成
- **THEN** 返回 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }` 清理函数，同时清理 Observer 和定时器（指南 4.3 节强制要求）

### Requirement: Coupang 详情图提取 (cpGetDetail)
系统 SHALL 从 Coupang 商品页提取详情区域的图片 URL，遵循指南 GetDetail 模板（初始化空值 → 容器查找 → 多轮提取 → URL 清洗 → 上报）：

#### Scenario: Next.js 脚本标签提取（主方案）
- **WHEN** 页面包含 `self.__next_f.push` 脚本且内容包含 `<img>` 和 `vendor_inventory`
- **THEN** 通过 `unescapeNextJsData()` 反转义后，使用主正则匹配 `<img src>` 中 `coupangcdn.com/image/vendor_inventory/` 路径的图片 URL；备用正则直接匹配 `coupangcdn.com/image/vendor_inventory/{hash}/{hash}.{ext}` 格式

#### Scenario: DOM 容器提取（备用方案）
- **WHEN** 脚本标签提取失败
- **THEN** 从 `.product-detail-content-inside` 和 `.product-detail-content` 容器遍历所有 `img` 标签，提取 `src`/`data-src`/`data-lazy-src`/`data-original` 属性，通过 `getOriginalCoupangUrl()` 还原高清原图

#### Scenario: 多轮提取与重试
- **WHEN** 首次提取无结果
- **THEN** 最多 5 次重试等待容器渲染（间隔 1000ms，使用共享 `sleep`），每轮从脚本标签和 DOM 双路提取

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send('DetailPic', images)` 上报去重后的图片 URL 列表

### Requirement: Coupang 视频提取 (cpGetVideo)
系统 SHALL 从 Coupang 商品页提取视频 URL，遵循指南 GetVideo 模板（立即启动 → 拦截注册 → DOM 检测 → 定时全量检测）：

#### Scenario: 网络请求拦截
- **WHEN** 页面发起 XHR/Fetch 请求
- **THEN** 拦截请求，检测响应 URL 和响应体中的视频 URL（mp4/m3u8/webm/flv 格式）

#### Scenario: DOM 视频标签检测
- **WHEN** 页面中存在 `video` 标签
- **THEN** 从 `src`、`currentSrc`、`source` 子元素提取视频 URL

#### Scenario: 页面 JSON 嗅探
- **WHEN** 页面加载
- **THEN** 从 `<script>` 标签和 `application/ld+json` 中正则匹配视频 URL，递归遍历 JSON 对象查找视频链接（深度限制 15 层，循环引用检测）

#### Scenario: data-* 属性与 meta 标签提取
- **WHEN** 页面中存在 `data-video-url`、`data-video-src`、`data-mp4` 等属性或 `og:video`、`twitter:player` 等 meta 标签
- **THEN** 提取对应视频 URL

#### Scenario: Performance API 增量监控
- **WHEN** 页面有网络资源加载
- **THEN** 使用 `performance.getEntriesByType('resource')` + 游标增量检测 + `requestAnimationFrame` 持续轮询（指南 4.5 节推荐，京东/1688 做法），避免重复扫描已检测过的资源

#### Scenario: 视频分类与过滤
- **WHEN** 发现视频 URL
- **THEN** 过滤广告（`/ad/`、`avatar`、`comment`、`banner`、`splash`）和非视频格式（jpg/png/gif/webp/svg）

#### Scenario: 视频双重去重
- **WHEN** 同一视频 URL 被多次发现
- **THEN** 通过原始 URL 集合 + 归一化视频 ID 集合双重去重

#### Scenario: 视频增量上报
- **WHEN** 发现新视频
- **THEN** 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写

### Requirement: Coupang 标题/链接/商品ID 提取 (cpGetHylinkTitle)
系统 SHALL 从 Coupang 商品页提取商品标题、链接和商品 ID，遵循指南 GetHylinkTitle 模板（初始化空值 → 等待动态内容 → 提取 → 上报）：

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `#productTitle` 元素提取标题文本；回退到 `head title` 标签并移除 `쿠팡` / `Coupang` 等站点后缀

#### Scenario: 商品 ID 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 匹配 `/vp/products/(\d+)` 格式提取数字型商品 ID

#### Scenario: 四字段完整上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报全部四个字段：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`，指南 4.6 节强制要求）

### Requirement: Coupang 抓取脚本入口 (index.ts)
系统 SHALL 提供统一的 Coupang 抓取脚本入口，严格遵循指南第三章标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `cpGetVideo` 模块（网络拦截需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(COUPANG_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块。Coupang 登录选择器使用通用选择器即可（参考插件源码中无明确登录检测）

#### Scenario: 验证码检测
- **WHEN** 页面出现 CAPTCHA 元素
- **THEN** 通过 MutationObserver 检测验证码出现/消失，发送 `captcha-detected`/`captcha-resolved` 事件（节流上限 3 次）。Coupang 暂无已知验证码选择器，`CAPTCHA_SELECTORS` 留空数组

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `cpGetMain`、`cpGetSku`、`cpGetDetail`、`cpGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将 Coupang 平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `coupang: resolve(projectRoot, 'scraper-scripts/coupang/index.ts')`，生成 `dist-scripts/coupang.bundle.js`

## MODIFIED Requirements
无修改项。

## REMOVED Requirements
无移除项。
