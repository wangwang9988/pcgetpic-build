# 包牛牛 (bao66) 抓取脚本 Spec

## Why
项目已实现淘宝、京东、唯品会、1688 等平台的抓取脚本，但包牛牛 (bao66.cn) 平台尚无对应的 `scraper-scripts/bao66/` 抓取脚本。需要参考 `GetPic/entrypoints/modules/bao66/` 下的浏览器插件脚本，将其核心提取逻辑适配为 Tauri WebView 注入的 IIFE 脚本，严格遵循《平台抓取脚本开发指南》的最佳实践模式。

## What Changes
- 新增 `scraper-scripts/bao66/` 目录，包含 6 个模块文件：
  - `index.ts` — 入口脚本（遵循指南 §3.1 标准模板：iframe 防护 + 分组调度 + 登录/验证码检测 + 数据驱动完成判定）
  - `bao66GetMain.ts` — 主图提取（遵循指南 §4.2 唯品会风格：重试循环 + 额外探测 + 增量抓取）
  - `bao66GetDetail.ts` — 详情图提取（遵循指南 §4.4：重试等待容器 + 多轮遍历 + 持续监听）
  - `bao66GetSku.ts` — SKU 图提取（遵循指南 §4.3：返回清理函数 + 精确监听 + 属性变化监听 + `_310x310` → `_750x750` 大图还原）
  - `bao66GetVideo.ts` — 视频提取（遵循指南 §4.5：XHR/Fetch 拦截 + Performance API 增量监控 + MutationObserver + Prism Player 特有提取）
  - `bao66GetHylinkTitle.ts` — 标题/链接/商品ID提取（遵循指南 §4.6：必须输出全部四个字段 productTitle/productLink/productId/visitTime）
- 修改 `scripts/build-scraper.mjs`，添加 `bao66` 构建入口
- 在 `src-tauri/src/login/mod.rs` 注册 `bao66` 的 `DefaultLoginStrategy`（登录域名 `login.bao66.cn`）

## Impact
- Affected specs: 包牛牛平台抓取能力
- Affected code:
  - `scraper-scripts/bao66/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (修改：添加 bao66 入口)
  - `src-tauri/src/login/mod.rs` (修改：注册 bao66 登录策略)

## ADDED Requirements

### Requirement: 包牛牛主图提取（指南 §4.2 唯品会风格）
系统 SHALL 从 bao66.cn 商品页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

执行流程：
1. 初始空上报 `MainPic: []`
2. 循环重试（MAX_RETRIES × RETRY_INTERVAL），每轮调用 `gatherAllImages()`
3. 获取到图片后，额外探测（MAX_EXTRA_FETCHES × RETRY_INTERVAL），合并去重
4. 最终上报 `MainPic: images`

数据来源优先级（按原插件 bao66GetMain.js 对齐）：
- `#thumblist img[big]` → `.tb-thumb img[big]` → `.picture .tb-pic img[big]` → `a.show-index-image` href → `img[big]` 兜底 → `img[mid]` 备选（仅无 big 属性时）

URL 清洗规则：
- 协议修复：`//` → `https://`
- 黑名单过滤：icon/avatar/logo/loading/placeholder/favicon/prism-/iconfont/snapshot/mkv2.oss
- 使用共享 `deduplicateUrls()` 去重

#### Scenario: 通过 img[big] 属性提取主图
- **WHEN** 商品页包含 `#thumblist img[big]`、`.tb-thumb img[big]`、`.picture .tb-pic img[big]` 等元素
- **THEN** 提取 `big` 属性值作为主图 URL，去重后上报

#### Scenario: 通过 a.show-index-image 提取主图
- **WHEN** 商品页包含 `a.show-index-image` 链接
- **THEN** 提取 `href` 属性值作为主图 URL

#### Scenario: 通过 img[mid] 备选提取
- **WHEN** 缩略图仅有 `mid` 属性而无 `big` 属性
- **THEN** 提取 `mid` 属性值作为备选主图 URL

### Requirement: 包牛牛详情图提取（指南 §4.4 模式）
系统 SHALL 从 bao66.cn 商品页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

执行流程：
1. 初始空上报 `DetailPic: []`
2. 重试等待容器出现（MAX_CONTAINER_RETRIES × RETRY_DELAY_MS）
3. 多轮提取（EXTRACTION_PASSES × PASS_DELAY_MS），每轮扫描容器内 img 标签
4. 最终上报 `DetailPic: detailPic`
5. 可选：注册 MutationObserver 持续监听，检测到图片增加时增量上报

数据来源（按原插件 bao66GetDetail.js 对齐）：
- `#productmemo img` → `.product_details img` → `img.scrollLoading`（data-url 优先）→ `.details_box` 父元素 → 详情标题区域 → `img[data-url]` 兜底

提取优先级（单个 img 元素）：`data-url` > `data-src` > `src`（排除 loading 占位图）

#### Scenario: 通过 #productmemo 和 .product_details 提取详情图
- **WHEN** 商品页包含 `#productmemo img` 或 `.product_details img` 元素
- **THEN** 优先从 `data-url`（懒加载真实 URL）提取，其次 `data-src`，最后 `src`

#### Scenario: 通过 img.scrollLoading 和 img[data-url] 提取懒加载图片
- **WHEN** 商品页使用懒加载，图片真实 URL 在 `data-url` 属性中
- **THEN** 优先提取 `data-url` 属性值

### Requirement: 包牛牛 SKU 图提取（指南 §4.3 模式 + 返回清理函数）
系统 SHALL 从 bao66.cn 商品页提取 SKU 颜色图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

执行流程：
1. 初始空上报 `SkuPic: []`
2. 首轮扫描 `scanDomContainers()`
3. 有结果 → 立即上报
4. 注册 MutationObserver 精确监听 SKU 容器（非 document.body），监听 childList + subtree + attributes（src, data-src）
5. 轮询兜底（首轮无结果时启动）
6. **返回清理函数**：同时清理 Observer 和 pollTimer

数据来源（按原插件 bao66GetSku.js 对齐）：
- `.sku-color img` → `.color_box img` → `.color-wrp img` → `#color-size-box img` → `.product_info .item img` → 颜色文字标签相邻区域

大图还原规则：
- `_\d+x\d+` 替换为 `_750x750`（如 `_310x310.jpg` → `_750x750.jpg`）

#### Scenario: 从颜色选择区域提取 SKU 图
- **WHEN** 商品页包含 `.sku-color img`、`.color_box img`、`.color-wrp img`、`#color-size-box img` 等元素
- **THEN** 提取 `src` 属性值，经 `convertToLargeUrl()` 转换为大图 URL

#### Scenario: SKU 小图还原为大图
- **WHEN** SKU 图片 URL 包含 `_310x310`、`_100x100` 等缩略图后缀
- **THEN** 将 `_\d+x\d+` 替换为 `_750x750` 还原大图 URL

#### Scenario: 清理函数同时清理 Observer 和定时器
- **WHEN** 任务完成，入口脚本调用清理函数
- **THEN** MutationObserver 被 disconnect，轮询定时器被 clearInterval

### Requirement: 包牛牛视频提取（指南 §4.5 多手段截获模式）
系统 SHALL 从 bao66.cn 商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videos)` 上报。

执行流程（双层启动）：
- **立即启动层**（run() 被调用时即执行，不等待 DOMContentLoaded）：
  1. 清空历史状态
  2. 启动 XHR 拦截
  3. 启动 Fetch 拦截
  4. 启动 Performance API 增量监控（requestAnimationFrame 循环）
- **DOMContentLoaded 后启动层**：
  5. 注册 MutationObserver 监听 `<video>` 和 `<script>` 新增
  6. 延时梯度扫描（1s/3s/5s/10s）
  7. 包牛牛特有提取：Prism Player (`#J_prismPlayer video`) + 阿里云 OSS URL 匹配

视频上报格式：`{ url, type: 'main'|'detail', timestamp, pageUrl }`
采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写。

#### Scenario: 通过 Prism Player 提取视频
- **WHEN** 商品页包含 `#J_prismPlayer video` 元素
- **THEN** 提取 `src` 或 `currentSrc` 作为视频 URL

#### Scenario: 通过网络请求拦截提取视频
- **WHEN** XHR/Fetch 请求返回包含 `.mp4`/`.m3u8`/`.flv` 的 URL
- **THEN** 拦截并上报视频 URL

#### Scenario: 通过 Performance API 增量监控提取视频
- **WHEN** Performance Resource Entries 中包含视频 URL
- **THEN** 通过 rAF 循环增量检测并上报

#### Scenario: 通过阿里云 OSS URL 模式匹配提取视频
- **WHEN** 页面 script 标签中包含 `aliyuncs.com` 域名的视频 URL
- **THEN** 正则匹配并上报

### Requirement: 包牛牛标题/链接/商品ID提取（指南 §4.6 四字段必须输出）
系统 SHALL 从 bao66.cn 商品页提取商品标题、链接、ID 和访问时间，通过 `tauriBridge.send()` 上报。

必须输出全部四个字段：
| 字段 | key | 提取策略 |
|------|-----|---------|
| 商品标题 | `productTitle` | `.huohao` 货号 → `#copy-url` data-clipboard-text → `.product_title` → `.promise` → `document.title` 兜底 |
| 商品ID | `productId` | URL `/p/xxx.html` → `/product/xxx` → 纯数字 ID 兜底 |
| 商品链接 | `productLink` | 清理 URL 仅保留核心路径（`/p/xxx.html`），去除查询参数 |
| 访问时间 | `visitTime` | 格式 `YYYY-MM-DD HH:mm` |

#### Scenario: 从 .huohao 元素提取货号标题
- **WHEN** 商品页包含 `.huohao` 元素
- **THEN** 提取文本内容，去除"货号："前缀，作为商品标题

#### Scenario: 从 URL 提取商品 ID
- **WHEN** 商品页 URL 格式为 `/p/xxx.html`
- **THEN** 提取 `xxx` 部分作为商品 ID

#### Scenario: 清理商品 URL
- **WHEN** 商品页 URL 包含查询参数
- **THEN** 仅保留 `/p/xxx.html` 核心路径部分

#### Scenario: 输出访问时间
- **WHEN** 模块执行
- **THEN** 生成 `visitTime` 字段，格式为 `YYYY-MM-DD HH:mm`

### Requirement: 包牛牛入口脚本（指南 §3.1 标准模板）
系统 SHALL 遵循开发指南 §3.1 的标准入口模板实现 bao66 入口脚本。

关键要素：
- iframe 防护：`window !== window.top` 检测
- 视频模块先行：`runVideo()` 不等待 DOMContentLoaded
- 登录探测：`probeAndReportLogin(LOGIN_SELECTORS)` 先于所有抓取模块
- 模块并行：四个图片/标题模块 `forEach` 后台并行，不阻塞完成判定
- 超时保护：`withTimeout` 单模块 15s 上限
- 清理函数：模块若返回 cleanup function，由 `waitTaskCompletion` 统一调用
- 异常降级：有数据则 completeTask，无数据则 failTask
- 验证码检测：MutationObserver 监听验证码 DOM（bao66 暂无已知验证码，CAPTCHA_SELECTORS 留空）

### Requirement: 共享工具函数使用（指南 §6 强制要求）
所有模块 SHALL 优先使用 `shared/utils.ts` 和 `shared/tauri-bridge.ts` 中的共享函数：

- `sleep()` — 禁止在模块内重复定义本地 sleep 函数
- `deduplicateUrls()` — URL 去重
- `cleanImageUrl()` — 通用 URL 清洗（协议补全、占位图过滤、缩略图后缀截断）
- `extractImageKey()` — URL 去重 key 提取
- `simulateScroll()` — 模拟滚动触发懒加载
- `waitForCompletion()` — 客户端侧数据静默判定
- `probeAndReportLogin()` — 登录态探测
- `tauriBridge.send/get/completeTask/failTask/emitEvent` — 通信层

仅平台特有清洗逻辑（如 bao66 的 `_\d+x\d+` → `_750x750`）在模块内自定义。

### Requirement: 包牛牛抓取脚本构建集成
系统 SHALL 将 bao66 抓取脚本纳入 Vite IIFE 构建流程。

#### Scenario: 构建产物生成
- **WHEN** 执行 `build-scraper.mjs`
- **THEN** 生成 `dist-scripts/bao66.bundle.js`

### Requirement: 包牛牛登录策略
系统 SHALL 在 Rust 端注册 bao66 的默认登录检测策略。

#### Scenario: 检测登录页
- **WHEN** Worker 导航到 `login.bao66.cn` 域名下的页面
- **THEN** 返回 `LoginCheckResult::LoginRequired`
