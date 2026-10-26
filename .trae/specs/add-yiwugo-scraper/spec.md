# 义乌购(Yiwugo)抓取脚本 Spec

## Why

义乌购(yiwugo.com)在平台识别层（Rust Platform 枚举、前端 URL 匹配/Handler、平台标签）已完整注册，但在数据抓取层（scraper-scripts 抓取脚本 + 构建注册）完全缺失，导致用户输入义乌购商品 URL 后无法提取任何图片/视频/标题数据。

## What Changes

- 新增 `scraper-scripts/yiwugo/` 目录，包含 7 个文件：index.ts、ywGetMain.ts、ywGetSku.ts、ywGetDetail.ts、ywGetVideo.ts、ywGetHylinkTitle.ts、ywUtils.ts
- 在 `scripts/build-scraper.mjs` 中注册 yiwugo 平台入口，使其构建为 `dist-scripts/yiwugo.bundle.js`

## Impact

- Affected specs: 新增义乌购平台抓取能力
- Affected code:
  - `scraper-scripts/yiwugo/` (新增目录)
  - `scripts/build-scraper.mjs` (新增 yiwugo 入口)

## ADDED Requirements

### Requirement: 义乌购平台共享工具 (ywUtils.ts)

系统 SHALL 提供义乌购平台特有的共享工具函数，供各模块复用。

#### 函数清单

1. **`decodeEscapedUrl(url: string): string`** — Unicode 转义解码（`\u002F` → `/`），义乌购 `__INITIAL_STATE__` 中的 URL 普遍包含此类转义
2. **`cleanYiwugoImageUrl(url: string): string`** — 义乌购专用 URL 清洗：
   - 调用 `decodeEscapedUrl` 解码转义
   - 补全协议：`//` 前缀 → `https:`
   - 截断到扩展名：找到第一个图片扩展名位置后截取（`.jpg/.jpeg/.png/.gif/.webp/.bmp/.heic`）
   - 无扩展名时去掉查询参数
   - **优先使用共享 `cleanImageUrl()`** 处理通用清洗（占位图过滤、查询参数移除），仅在义乌购特有需求（Unicode 解码、截断到扩展名）时覆盖
3. **`isUrlBlacklisted(url: string): boolean`** — 黑名单过滤，支持两组过滤级别：
   - 严格黑名单（主图/SKU 使用）：`static.yiwugo.com`、`stall-recommend`、`main-download`、`/resource/img/`
   - 扩展黑名单（SKU 额外）：`/img/none.`

#### 设计原则

- 遵循开发指南：平台特有工具函数放在 `<platform>Utils.ts`，优先使用 `shared/utils.ts` 中的通用函数
- 使用共享 `sleep`（`import { sleep } from '../shared/utils'`），不在各模块中重复定义

### Requirement: 义乌购主图提取 (ywGetMain)

系统 SHALL 从义乌购商品页面提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### 执行模式

重试获取 + 额外探测（开发指南 GetMain 标准模式）。

#### 数据来源（三路并行提取，合并去重）

1. **`window.__INITIAL_STATE__`**：从 `c.detail.productDetailVO.picture` 提取封面主图，从 `c.detail.productDetailVO.picture1-4` 提取备用图，从 `c.detail.sdiProductsPicList[].picture/picture1-4` 提取 SKU 变体图
2. **script 标签解析**：匹配 `__INITIAL_STATE__` 脚本内容，JSON 解析后提取同结构字段；若 JSON 解析失败则使用正则匹配 `cbu*.alicdn.com` 图片 URL
3. **DOM 提取**：按优先级遍历选择器 `.preview-row img.product-pic` → `.swiper-container img.product-pic` → `.preview-row .swiper-slide img` → `.product-img img` → `.main-img img` → `.goods-img img` → `.detail-gallery img` → `.product-gallery img`

#### URL 清洗规则

- 使用 `ywUtils.cleanYiwugoImageUrl()` 处理义乌购特有清洗（Unicode 解码、截断到扩展名）
- 使用 `ywUtils.isUrlBlacklisted()` 过滤非商品图片
- 使用共享 `deduplicateUrls()` 去重

#### 重试与轮询

- 初始空上报 `tauriBridge.send('MainPic', [])`
- MAX_RETRIES=20，RETRY_INTERVAL=500ms（使用共享 `sleep`）
- MAX_EXTRA_FETCHES=3，每 500ms 追加一轮

#### Scenario: 成功提取主图

- **WHEN** 义乌购商品页加载完成且 `__INITIAL_STATE__` 可用
- **THEN** 通过三路提取合并去重后，将主图 URL 列表通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: 数据延迟加载

- **WHEN** 首次提取结果为空
- **THEN** 以 500ms 间隔重试，最多 20 次，直到提取到数据或达到上限

### Requirement: 义乌购详情图提取 (ywGetDetail)

系统 SHALL 从义乌购商品页面提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### 执行模式

重试等待容器 + 多轮次遍历 + MutationObserver 持续监听 + 返回清理函数（开发指南 GetDetail 标准模式）。

#### 数据来源（三路并行提取）

1. **`window.__INITIAL_STATE__`**：从 `c.detail.productDetailVO.detaill` 字段提取 HTML，用正则 `<img[^>]+src\s*=\s*["']([^"']+)["']>` 匹配图片 URL
2. **script 标签解析**：匹配 `"detaill"` 字段，解码转义字符后提取 `<img>` 的 `src`；若失败则用宽松正则匹配 `http` 开头的图片链接；再失败则在整个脚本内容中匹配
3. **DOM 提取**：按优先级遍历选择器 `.tab-detail .cpxq img` → `.content-detail img` → `.cpxq img` → `.tab-detail img` → `.rich-text-component img` → `.product-detail img` → `.goods-detail img` → `.detail-content img` → `.product-desc img` → `#productDetail img`；优先取 `data-lazyload-src` > `data-src` > `src`

#### MutationObserver 持续监听

- 监听详情图容器（`.tab-detail`、`.cpxq`、`.content-detail`）
- 监听 `childList`、`subtree`、`attributes`（`src`、`data-src`、`data-lazyload-src`）
- 检测到图片增加时，防抖后重新扫描并增量上报

#### 返回清理函数

- 模块 `run()` 返回 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }` 清理 MutationObserver 和轮询定时器

#### URL 清洗规则

- 使用 `ywUtils.cleanYiwugoImageUrl()` 处理义乌购特有清洗
- 详情图使用精准选择器，不需要黑名单过滤
- 使用共享 `deduplicateUrls()` 去重

#### 重试与轮询

- 初始空上报 `tauriBridge.send('DetailPic', [])`
- MAX_RETRIES=20，RETRY_INTERVAL=500ms（使用共享 `sleep`）
- MAX_EXTRA_FETCHES=3，每 1000ms 追加一轮（详情图加载较慢）

#### Scenario: 成功提取详情图

- **WHEN** 义乌购商品页加载完成且 `detaill` 字段有内容
- **THEN** 从 HTML 中提取所有 img src，清洗后通过 `tauriBridge.send('DetailPic', urls)` 上报

#### Scenario: 详情图动态加载

- **WHEN** 用户滚动或页面懒加载触发新详情图
- **THEN** MutationObserver 检测到变化，防抖后增量上报新图片

### Requirement: 义乌购 SKU 图提取 (ywGetSku)

系统 SHALL 从义乌购商品页面提取 SKU 图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### 执行模式

初始获取 + MutationObserver 精确监听 + 轮询兜底 + 返回清理函数（开发指南 GetSku 标准模式）。

#### 数据来源（三路并行提取）

1. **`window.__INITIAL_STATE__`**：从 `c.detail.productPropertySkuBoList[].picture` 提取 SKU 图片
2. **script 标签解析**：匹配 `"picture"` 字段值，仅提取 `ywgimg.yiwugo.com` 域名的图片
3. **DOM 提取**：按优先级遍历选择器 `.calculator .specification-box .item img` → `.specification-box .item img` → `.calculator .item img.wh-40` → `.calculator .item .w-40 img` → `.sku-item img` → `.product-sku img` → `.spec-item img` → `.color-item img` → `.size-item img` → `[class*="specification"] img`

#### MutationObserver 精确监听

- **精确监听目标容器**（而非 `document.body`）：`.specification-box`、`.calculator`
- 监听 `childList`、`subtree`、`attributes`（`src`、`data-src`）
- 检测到图片数量增加时，防抖后重新扫描上报

#### 返回清理函数

- 模块 `run()` 返回 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }` 清理 MutationObserver 和轮询定时器

#### URL 清洗规则

- 使用 `ywUtils.cleanYiwugoImageUrl()` 处理义乌购特有清洗
- 使用 `ywUtils.isUrlBlacklisted()` 过滤，扩展黑名单包含 `/img/none.`
- 使用共享 `deduplicateUrls()` 去重

#### 重试与轮询

- 初始空上报 `tauriBridge.send('SkuPic', [])`
- 首轮扫描：立即调用三路提取
- MutationObserver 精确监听 + pollTimer 轮询兜底（MAX_POLL_RETRIES=15，POLL_INTERVAL=500ms）
- 首轮无结果时启动轮询，获取到结果时停止轮询

#### Scenario: 成功提取 SKU 图

- **WHEN** 义乌购商品页有 SKU 规格选择
- **THEN** 从 `productPropertySkuBoList` 或 DOM 中提取 SKU 图片 URL，通过 `tauriBridge.send('SkuPic', urls)` 上报

#### Scenario: 商品无 SKU

- **WHEN** 商品没有 SKU 规格变体
- **THEN** SKU 图列表为空，正常完成（不报错）

#### Scenario: SKU 图动态加载

- **WHEN** 用户点击不同规格触发 SKU 图变化
- **THEN** MutationObserver 检测到属性/子节点变化，防抖后增量上报新 SKU 图

### Requirement: 义乌购视频提取 (ywGetVideo)

系统 SHALL 从义乌购商品页面提取视频 URL，通过 `tauriBridge.send('VideoUrls', videoData)` 上报。

#### 执行模式

多手段、尽早介入的无限制截获（开发指南 GetVideo 标准模式）。

#### 立即启动层（run() 被调用时即执行）

1. 清空历史状态
2. 启动 XHR 拦截（`XMLHttpRequest.prototype.send`）
3. 启动 Fetch 拦截（`window.fetch`）
4. 启动 Performance API 增量监控（`requestAnimationFrame` 循环 + 游标增量检测）

#### DOMContentLoaded 后启动层

5. 注册 MutationObserver 监听 `<video>` 和 `<script>` 新增
6. 延时梯度扫描（1s/3s/5s/10s）
7. 提取页面内嵌 JSON
8. 检查 window 全局变量（`__INITIAL_STATE__` 等）
9. 扫描视频容器 DOM

#### 义乌购特有提取

- **`window.__INITIAL_STATE__`**：从 `c.shop.videourl` 提取视频 URL；从 `c.shop.videoFaceUrl` 提取封面 URL 中可能包含的视频链接
- 视频分类：义乌购平台简单分类，默认归为主图视频

#### 视频去重

- URL 精确匹配 + 规范化 ID 去重（从文件名中提取 10 位以上数字 ID）

#### 视频上报格式

```typescript
{ url: videoUrl, type: 'main' | 'detail', timestamp: Date.now(), pageUrl: window.location.href }
```

采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写。

#### Scenario: 成功提取视频

- **WHEN** 义乌购商品页包含视频
- **THEN** 从 `__INITIAL_STATE__` 或网络拦截中提取视频 URL，通过 `tauriBridge.send('VideoUrls', videoData)` 上报

### Requirement: 义乌购标题/链接/商品ID提取 (ywGetHylinkTitle)

系统 SHALL 从义乌购商品页面提取商品标题、链接、商品 ID 和访问时间，通过 `tauriBridge.send()` 上报。

#### 必须输出的四个字段

| 字段 | key | 说明 |
|------|-----|------|
| 商品标题 | `productTitle` | 优先从特定 DOM 获取，兜底 `document.title`（去除"义乌购"后缀） |
| 商品 ID | `productId` | 从 URL 匹配 `/product/detail/{id}` 或 `/productdetail/{id}` 格式提取 |
| 商品链接 | `productLink` | 清洗 URL 保留 `/product/detail/{id}.html` 或 `/productdetail/{id}.html` 格式 |
| 访问时间 | `visitTime` | 格式 `YYYY-MM-DD HH:mm` |

#### 数据提取

- **商品标题**：按优先级遍历选择器 `.goods-title` → `.item-title` → `.product-title` → `.goods-name` → `.detail-title` → `h1.title` → `.main-title` → `[class*="goodsTitle"]` → `[class*="itemTitle"]`；降级使用 `document.title`（去除"义乌购"后缀）
- **商品链接**：清洗 URL 保留 `/product/detail/{id}.html` 或 `/productdetail/{id}.html` 格式

#### Scenario: 成功提取标题信息

- **WHEN** 义乌购商品页加载完成
- **THEN** 提取标题、链接、商品 ID、访问时间，分别通过 `tauriBridge.send()` 上报

### Requirement: 义乌购抓取脚本入口 (index.ts)

系统 SHALL 提供义乌购平台的统一入口脚本，编排各模块执行时序并管理任务完成判定。严格遵循开发指南标准模板。

#### 时序编排

1. **立即执行**（document_start 级别）：视频拦截模块 `ywGetVideo`（需要拦截网络请求）
2. **DOM 就绪后执行**（DOMContentLoaded）：
   - 先执行 `probeAndReportLogin()` 登录探测
   - 再并行启动：主图、SKU 图、详情图、标题模块

#### 登录探测

- `LOGIN_SELECTORS`：义乌购无需登录即可浏览商品页，配置为空数组 `[]`
- `probeAndReportLogin([])` 仍会执行通用登录检测逻辑

#### 验证码检测

- `CAPTCHA_SELECTORS`：义乌购无已知验证码机制，配置为空数组 `[]`
- `setupCaptchaWatcher()` 内部有 `CAPTCHA_SELECTORS.length === 0` 守卫，自动跳过

#### 完成判定

- 使用 `waitForCompletion()` 数据驱动判定：
  - 图片数据静默 `imageDataIdleMs`（默认 7s）→ 完成
  - 最大等待 `maxWaitMs`（默认 15s）→ 强制完成
  - 最小停留 `minStayMs`（默认 3s）
  - 硬性截止：`maxWaitMs + 5s`
- baseline 机制：`waitForCompletion` 启动时记录 baseline 时间戳，数据变化时间 ≤ baseline 视为已静默

#### iframe 防护

- 入口 `main()` 函数起首检查 `window !== window.top`，若在 iframe 中则直接返回

#### 模块超时保护

- 单模块最大执行时间 15s（`MODULE_TIMEOUT_MS = 15000`），超时后跳过该模块

#### 异常降级

- 有数据上传（`tauriBridge.getHasUploadedData()`）→ `completeTask`
- 无数据上传 → `failTask`

#### 清理函数

- 各模块若返回 cleanup function，由 `waitTaskCompletion` 统一调用

#### Scenario: 完整抓取流程

- **WHEN** 义乌购商品页在 Tauri WebView 中加载
- **THEN** 视频模块立即启动拦截，DOM 就绪后并行启动其余 4 个模块，数据静默后判定完成并调用 `tauriBridge.completeTask()`

### Requirement: 构建注册

系统 SHALL 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中注册 yiwugo 入口，使其构建为 `dist-scripts/yiwugo.bundle.js`。

#### Scenario: 构建产物生成

- **WHEN** 运行 `node scripts/build-scraper.mjs`
- **THEN** 生成 `dist-scripts/yiwugo.bundle.js` IIFE 格式文件

## MODIFIED Requirements

无修改。

## REMOVED Requirements

无移除。
