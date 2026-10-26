# TikTok 抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东等平台的抓取脚本，但 TikTok Shop（全球社交电商龙头）尚未实现。用户需要通过 PcGetPic 的 Worker 窗口自动加载 TikTok 商品页，提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/tiktok/` 目录，包含 6 个 TypeScript 模块（index / tkGetMain / tkGetSku / tkGetDetail / tkGetVideo / tkGetHylinkTitle）
- 在 `scripts/build-scraper.mjs` 中注册 tiktok 平台入口
- 在 `src-tauri/src/login/` 中新增 `tiktok.rs` 登录策略并注册到 `LoginStrategyRegistry`
- 前端平台注册表和 Rust `Platform` 枚举已有 TikTok 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/tiktok/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/tiktok.rs` (新增)
  - `src-tauri/src/login/mod.rs` (注册策略)

## 设计对齐说明

本 Spec 严格遵循 `docs/平台抓取脚本开发指南.md` 的规范，与淘宝/京东已有实现保持一致：

### 对齐开发指南的要点
1. **模块结构**：6 文件结构（index + 5 子模块），与淘宝/京东完全一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与指南一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，与指南一致
4. **保留核心提取逻辑**：DOM 选择器、`__MODERN_ROUTER_DATA__` JSON 解析、URL 清洗正则、MutationObserver、XHR/Fetch 拦截、Performance API — 全部保留
5. **完成判定**：使用 `waitForCompletion()` 前端辅助 + Rust 后端 7 秒静默自动完成，与指南第一/六章一致
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测，与指南第三章模板一致
7. **共享 sleep**：使用 `import { sleep } from '../shared/utils'`，不在模块内重复定义本地 `sleep` 函数，与指南 4.1 节一致
8. **初始空上报**：每个模块入口处先 `await tauriBridge.send(key, [])` 或 `await tauriBridge.send(key, '')` 清空旧数据，与指南 4.1 节一致
9. **GetSku 返回清理函数**：返回同时清理 Observer 和定时器的清理函数，与指南 4.3 节一致
10. **GetSku 精确监听**：对 SKU 容器精确挂载 MutationObserver + 监听 attributes 变化，与指南 4.3 节一致
11. **GetDetail 多轮提取**：多轮次遍历 + MutationObserver 持续监听，与指南 4.4 节一致
12. **GetVideo 延时梯度扫描**：1s/3s/5s/10s 延时梯度扫描，与指南 4.5 节一致
13. **GetHylinkTitle 四字段输出**：必须输出 `productTitle`、`productLink`、`productId`、`visitTime`，与指南 4.6 节一致

### TikTok 特有的数据源结构
TikTok 商品页使用 Modern.js 框架，核心数据注入在 `<script id="__MODERN_ROUTER_DATA__">` 标签中，与淘宝的 `__ICE_APP_CONTEXT__` 和京东的 `pageConfig` 不同。数据路径为：
```
JSON.parse(scriptTag.textContent)
  → loaderData
    → {动态路由键}
      → page_config.components_map (策略1)
      → components_map (策略2)
      → component_data (策略3-旧结构)
        → product_info
          → product_base.images (主图)
          → product_base.desc_detail (详情图JSON字符串)
          → product_base.video (视频)
          → sale_props (SKU图)
          → title (标题)
```

## ADDED Requirements

### Requirement: TikTok 主图提取 (tkGetMain)
系统 SHALL 从 TikTok 商品页提取所有主图 URL，遵循开发指南 GetMain 模板（初始化空值 → 提取 → 重试 → 额外抓取 → 上报）：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await tauriBridge.send('MainPic', [])` 清空旧数据

#### Scenario: __MODERN_ROUTER_DATA__ JSON 提取（主方案）
- **WHEN** 页面 HTML 中包含 `__MODERN_ROUTER_DATA__` script 标签
- **THEN** 解析 JSON，遍历 `loaderData` 的所有动态路由键，按三策略查找 `product_info` 组件的 `product_base.images` 数组，提取每个 `imgObj.url_list[0]` 作为主图 URL

#### Scenario: 三策略路由键遍历
- **WHEN** 遍历 `loaderData` 各路由键
- **THEN** 按优先级尝试：策略1 `page_config.components_map` → 策略2 直接 `components_map` → 策略3 旧结构 `component_data.product_info.product_base.images`，任一策略成功即停止

#### Scenario: DOM 容器提取（备用方案）
- **WHEN** JSON 提取失败或无数据
- **THEN** 从 DOM 选择器 `.slick-slider-container img`、`.w-66.h-66 img`、`img.cursor-zoom-in` 提取图片 URL

#### Scenario: 无效图片过滤
- **WHEN** 提取到图片 URL
- **THEN** 仅保留 `http` 开头的有效 URL，过滤掉非 HTTP 协议的 URL

#### Scenario: 重试与额外抓取
- **WHEN** 首轮提取无结果
- **THEN** 循环重试（MAX_RETRIES=100 × RETRY_INTERVAL=500ms），获取到结果后额外抓取 3 轮合并去重

### Requirement: TikTok SKU 图提取 (tkGetSku)
系统 SHALL 从 TikTok 商品页提取 SKU 变体图片 URL，遵循开发指南 GetSku 模板（初始获取 + MutationObserver 动态监听 + 轮询兜底 + 返回清理函数）：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await tauriBridge.send('SkuPic', [])` 清空旧数据

#### Scenario: __MODERN_ROUTER_DATA__ JSON 提取（主方案）
- **WHEN** 页面包含 `__MODERN_ROUTER_DATA__` 数据
- **THEN** 遍历 `loaderData`，从 `product_info` 组件的 `sale_props` 数组中提取 `has_image === true` 的属性组，遍历其 `sale_prop_values`，提取 `image.url_list[0]` 作为 SKU 图片

#### Scenario: DOM 选择器提取（备用方案）
- **WHEN** JSON 方案失败
- **THEN** 按优先级尝试 TikTok SKU 选择器：`div.overflow-x-auto.flex-wrap > div > img`、`img[width='68'][height='68']`、`div.cursor-pointer > img`

#### Scenario: MutationObserver 精确监听
- **WHEN** SKU 容器存在
- **THEN** 对 SKU 容器精确挂载 MutationObserver（非 document.body），监听 `childList`、`subtree` 和 `attributes`（`src`、`data-src`），图片数量增加时防抖后重新扫描上报

#### Scenario: 轮询兜底
- **WHEN** 首轮无结果
- **THEN** 启动定时轮询，获取到结果后停止轮询

#### Scenario: 返回清理函数
- **WHEN** 模块执行完成
- **THEN** 返回同时清理 MutationObserver（`observer.disconnect()`）和轮询定时器（`clearInterval(pollTimer)`）的清理函数

### Requirement: TikTok 详情图提取 (tkGetDetail)
系统 SHALL 从 TikTok 商品页提取详情图，遵循开发指南 GetDetail 模板（重试等待容器 + 多轮提取 + MutationObserver 持续监听）：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await tauriBridge.send('DetailPic', [])` 清空旧数据

#### Scenario: __MODERN_ROUTER_DATA__ desc_detail 提取（主方案）
- **WHEN** 页面包含 `__MODERN_ROUTER_DATA__` 数据
- **THEN** 从 `product_info` 组件的 `product_base.desc_detail` 字段（JSON 字符串）解析出数组，提取 `type === "image"` 项的 `image.url_list[0]`

#### Scenario: DOM 容器提取（备用方案）
- **WHEN** JSON 方案失败
- **THEN** 从 `div[class^="expandableSection"] div[class^="sectionContent"] img`、`div[class^="sectionContent"] img.w-full` 提取详情图

#### Scenario: 多轮提取
- **WHEN** 找到详情容器
- **THEN** 进行多轮扫描（EXTRACTION_PASSES=3，间隔 PASS_DELAY_MS=1000），每轮合并去重后增量上报

#### Scenario: MutationObserver 持续监听
- **WHEN** 详情区域内容可能动态增加
- **THEN** 注册 MutationObserver 持续监听详情容器，发现新图片时增量上报

### Requirement: TikTok 视频提取 (tkGetVideo)
系统 SHALL 从 TikTok 商品页提取视频 URL，遵循开发指南 GetVideo 模板（立即启动 → 拦截注册 → DOM 检测 → 延时梯度扫描）：

#### Scenario: TikTok 视频 CDN 识别
- **WHEN** 检测视频 URL
- **THEN** 通过域名特征识别 TikTok 视频：`tiktokcdn-us.com`、`tiktokcdn.com`、`tiktokv.com`、`ttcdn-us.com`，且 URL 路径包含 `/video/` 或 `mime_type=video` 或 `video_mp4`

#### Scenario: __MODERN_ROUTER_DATA__ 视频提取
- **WHEN** 页面包含 `__MODERN_ROUTER_DATA__` 数据
- **THEN** 从 `product_info` 组件的 `product_base.video` 字段提取视频 URL（支持对象和数组格式），递归搜索 `product_info` 对象中的视频 URL

#### Scenario: DOM video 元素提取
- **WHEN** 页面中存在 `video` 标签
- **THEN** 从 `src`、`currentSrc`、`source` 子元素提取视频 URL，仅保留 TikTok CDN 域名的视频

#### Scenario: 网络请求拦截
- **WHEN** 页面发起 XHR/Fetch 请求
- **THEN** 拦截请求，检测响应 URL 和响应体中的 TikTok 视频 URL（`tiktokcdn.*\/video\/` 正则匹配）和传统视频格式（mp4/m3u8/flv）

#### Scenario: Performance API 增量监控
- **WHEN** 页面有网络资源加载
- **THEN** 使用 `performance.getEntriesByType('resource')` + 游标增量检测 + `requestAnimationFrame` 持续轮询检测媒体资源请求

#### Scenario: MutationObserver 动态监听
- **WHEN** DOM 发生变化
- **THEN** 监听新增的 `video` 标签和 `script` 标签，提取视频 URL

#### Scenario: 延时梯度扫描
- **WHEN** DOMContentLoaded 后
- **THEN** 按 1s/3s/5s/10s 延时梯度执行全量视频检测（提取页面内嵌 JSON + 检查 window 全局变量 + 扫描视频容器 DOM），首次执行时模拟用户交互触发懒加载

#### Scenario: 视频分类与过滤
- **WHEN** 发现视频 URL
- **THEN** TikTok 商品页视频默认视为主图视频（main），过滤广告（ad）、评论（comment）、UGC、头像（avatar）相关视频

#### Scenario: 双重去重
- **WHEN** 发现新视频 URL
- **THEN** 使用原始 URL 集合（`foundVideoUrls`）+ 归一化视频 ID 集合（`normalizedVideoIds`）双重去重

#### Scenario: 视频增量上报
- **WHEN** 发现新视频
- **THEN** 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写

### Requirement: TikTok 标题/链接/商品ID/访问时间 提取 (tkGetHylinkTitle)
系统 SHALL 从 TikTok 商品页提取商品标题、链接、商品 ID 和访问时间，遵循开发指南 GetHylinkTitle 模板，必须输出全部四个字段：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await tauriBridge.send('productTitle', '')`、`await tauriBridge.send('productLink', '')`、`await tauriBridge.send('productId', '')` 清空旧数据

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `.mainTitle--R75fTcZL` DOM 元素提取标题文本；回退到 `head title` 标签；同时尝试从 `__MODERN_ROUTER_DATA__` 的 `product_info.product_base.title` 提取

#### Scenario: 商品 ID 提取
- **WHEN** URL 包含 `tiktok.com/shop/pdp/`
- **THEN** 从 URL 路径段中反向查找第一个纯数字段作为商品 ID

#### Scenario: 清洁链接生成
- **WHEN** 成功提取商品 ID
- **THEN** 生成 `origin + pathname` 格式的清洁链接

#### Scenario: 访问时间生成
- **WHEN** 提取完成
- **THEN** 生成 `YYYY-MM-DD HH:mm` 格式的访问时间

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报 `productTitle`、`productLink`、`productId`、`visitTime` 四个字段

### Requirement: TikTok 抓取脚本入口 (index.ts)
系统 SHALL 提供统一的 TikTok 抓取脚本入口，严格遵循开发指南第三章标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `tkGetVideo` 模块（网络拦截需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(TIKTOK_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块。TikTok 登录选择器：`.login-container`、`.login-form`、`.login-wrapper`、`[class*="login"]`、`.passport-login`

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `tkGetMain`、`tkGetSku`、`tkGetDetail`、`tkGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 验证码检测
- **WHEN** 页面出现 TikTok CAPTCHA 元素
- **THEN** 通过 MutationObserver 检测验证码出现/消失，发送 `captcha-detected`/`captcha-resolved` 事件（节流上限 3 次）。TikTok 验证码选择器：`.captcha-verify-container`、`#captcha-verify-image`、`.verify-bar-close`

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将 TikTok 平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `tiktok: resolve(projectRoot, 'scraper-scripts/tiktok/index.ts')`，生成 `dist-scripts/tiktok.bundle.js`

### Requirement: TikTok 登录策略
系统 SHALL 在 Rust 后端实现 TikTok 登录检测策略。由于 TikTok 需要从 URL 提取商品 ID（`DefaultLoginStrategy` 返回 None），必须自定义实现（参考 `taobao.rs` 模式）：

#### Scenario: 登录页检测
- **WHEN** Worker 导航到 TikTok 登录相关 URL
- **THEN** 检测 `login.tiktok`、`passport.tiktok`、`accounts.tiktok`、`/login` 路径等登录页面模式，返回 `LoginRequired`

#### Scenario: 验证码检测
- **WHEN** 页面出现 TikTok CAPTCHA
- **THEN** 检测 `captcha`、`verify` 等 URL 模式，返回 `Captcha`

#### Scenario: 商品 ID 提取
- **WHEN** 需要从 URL 提取商品 ID
- **THEN** 匹配 `/shop/pdp/(\d+)` 格式提取商品 ID

#### Scenario: 平台非商品页检测
- **WHEN** CaptchaBlocked 恢复时
- **THEN** `is_still_on_platform_non_product()` 判断 URL 是否仍在 `tiktok.com` 域名下但非 `/shop/pdp/` 商品页

#### Scenario: 登录 Cookie 检测
- **WHEN** 需要判断是否已有登录态
- **THEN** 检查 `sessionid`、`sid_tt`、`sid_guard` 等 Cookie

#### Scenario: 验证码选择器
- **WHEN** 前端脚本需要检测验证码 DOM 元素
- **THEN** 返回 `.captcha-verify-container`、`#captcha-verify-image`、`.verify-bar-close`

## MODIFIED Requirements

### Requirement: LoginStrategyRegistry
`LoginStrategyRegistry::new()` SHALL 注册 TikTok 登录策略实例：
```rust
registry.register(Arc::new(tiktok::TiktokLoginStrategy));
```

## REMOVED Requirements
无移除项。
