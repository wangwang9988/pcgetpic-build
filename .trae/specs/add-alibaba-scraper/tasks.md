# Tasks

- [x] Task 1: 创建 abGetUtils.ts — 阿里巴巴平台特有工具函数
  - [x] `normalizeUrl(url)`: 补全 `//` 开头的协议头为 `https:`
  - [x] `cleanThumbnailSuffix(url)`: 找到第一个有效图片扩展名后截断，移除缩略图后缀
  - [x] `isPlaceholderUrl(url)`: 判断是否为占位图（含 `-tps-`、`s.gif`、`blank.gif`、`data:image`）
  - [x] `isFlagOrIconImage(url)`: 判断是否为标志/图标图片（哈希文件名 UI 检测、尺寸模式检测、路径关键词检测）
  - [x] `normalizeCdnUrl(url)`: CDN 域名归一化（alicdn 子域名统一为 img.alicdn.com）
  - [x] `extractAlibabaVideoId(url)`: 从视频 URL 提取唯一标识（gv.videocdn.alibaba.com 格式）
  - [x] `extractVideoQuality(url)`: 从视频 URL 解析清晰度等级（hd/sd/ld）

- [x] Task 2: 创建 abGetMain.ts — 阿里巴巴主图抓取模块
  - [x] 初始空上报 `await tauriBridge.send('MainPic', [])`
  - [x] 从 JSON-LD `<script type="application/ld+json">` 提取 `@type=Product` 的 `image` 字段
  - [x] 清洗 URL：使用 `cleanThumbnailSuffix` 移除缩略图后缀、`isPlaceholderUrl` 跳过占位图
  - [x] 使用 `deduplicateUrls` 去重后通过 `tauriBridge.send('MainPic', urls)` 上报
  - [x] 实现重试机制：1s 间隔，最多 20 次
  - [x] 额外抓取：3 轮（间隔 500ms），合并去重后最终上报
  - [x] 使用 `sleep` from `shared/utils`，`cleanThumbnailSuffix`/`isPlaceholderUrl` from `./abGetUtils`
  - [x] 导出 `run` 函数

- [x] Task 3: 创建 abGetSku.ts — 阿里巴巴SKU图抓取模块
  - [x] 初始空上报 `await tauriBridge.send('SkuPic', [])`
  - [x] 从 `[data-testid="sku-info"]`、`[data-testid="sku-list"]`、`[data-testid="sku-list-item"]` 容器提取 img src
  - [x] 清洗 URL：使用 `cleanThumbnailSuffix` 移除缩略图后缀、`normalizeUrl` 添加 https: 前缀
  - [x] 使用 `deduplicateUrls` 去重后通过 `tauriBridge.send('SkuPic', urls)` 上报
  - [x] 实现重试机制：500ms 间隔，最多 30 次
  - [x] MutationObserver 精确监听 SKU 容器（attributes: src, data-src），防抖重新扫描
  - [x] 返回清理函数：同时清理 MutationObserver 和轮询定时器
  - [x] 导出 `run` 函数

- [x] Task 4: 创建 abGetDetail.ts — 阿里巴巴详情图抓取模块
  - [x] 初始空上报 `await tauriBridge.send('DetailPic', [])`
  - [x] 重试等待容器出现（最多 20 次，间隔 1s）
  - [x] 三种并行提取方式：iframe 内容提取、主文档容器提取、MutationObserver + IntersectionObserver
  - [x] iframe 提取：从 `#container` 下 iframe 的 `img[data-src]`/`img[src]` 提取
  - [x] 主文档提取：从 `[data-module-name*="module_structure_description"]` 等容器提取
  - [x] 过滤占位图（`isPlaceholderUrl`）、标志/图标图（`isFlagOrIconImage`）
  - [x] CDN 域名归一化去重（`normalizeCdnUrl`）
  - [x] 多轮提取（5 轮，间隔 2s），每轮扫描容器和 iframe
  - [x] 增量上报：检测到新图片时立即 `tauriBridge.send('DetailPic', urls)`
  - [x] 返回清理函数：同时清理 MutationObserver、IntersectionObserver 和轮询定时器
  - [x] 使用 `cleanImageUrl`、`deduplicateUrls`、`sleep` from `shared/utils`
  - [x] 导出 `run` 函数，返回 cleanup 函数

- [x] Task 5: 创建 abGetVideo.ts — 阿里巴巴视频抓取模块
  - [x] 立即启动层：清空历史状态、XHR 拦截、Fetch 拦截、Performance API 增量监控（rAF 循环）
  - [x] DOMContentLoaded 后启动层：MutationObserver 监听 `<video>` 和 `<script>` 新增
  - [x] 延时梯度扫描（1s/3s/5s/10s）：提取页面内嵌 JSON、检查 window 全局变量、扫描视频容器 DOM
  - [x] 模拟用户交互触发懒加载
  - [x] iframe 内视频提取（带重试机制）
  - [x] 注入脚本嗅探页面全局变量中的视频链接（postMessage 通信）
  - [x] 清晰度优先去重：同一视频 ID 保留 hd > sd > ld
  - [x] 双重去重：原始 URL 集合 + 归一化视频 ID 集合
  - [x] 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加回写
  - [x] 通过 `tauriBridge.send('VideoUrls', videoData)` 上报，格式 `{ url, type, timestamp, pageUrl }`
  - [x] 返回清理函数：清理 MutationObserver、rAF 循环、恢复 XHR/Fetch 原始方法
  - [x] 使用 `extractAlibabaVideoId`/`extractVideoQuality` from `./abGetUtils`
  - [x] 导出 `run` 函数，返回 cleanup 函数

- [x] Task 6: 创建 abGetHylinkTitle.ts — 阿里巴巴标题链接抓取模块
  - [x] 初始空上报 `productTitle`/`productLink`/`productId` 为空字符串
  - [x] 从 JSON-LD 提取 Product 的 `name`（标题）和 `@id`（商品 ID）
  - [x] 降级方案：DOM 选择器 `.mainTitle--R75fTcZL` 或 document.title
  - [x] 从 URL 提取商品 ID（`/_(\d+)\.html` 模式）
  - [x] 清洗商品链接（移除查询参数，仅保留 origin + pathname）
  - [x] 输出全部四个字段：`productTitle`、`productId`、`productLink`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）
  - [x] 等待动态内容加载（重试检测 JSON-LD 出现）
  - [x] 使用 `getProductId` from `shared/utils` 作为兜底
  - [x] 导出 `run` 函数

- [x] Task 7: 创建 index.ts — 阿里巴巴统一入口脚本
  - [x] 遵循开发指南标准模板
  - [x] iframe 防护（`window !== window.top` 检查）
  - [x] 立即启动视频模块（document_start 阶段）
  - [x] DOMContentLoaded 后启动 Main/Sku/Detail/HylinkTitle 模块（后台并行）
  - [x] 登录检测（`probeAndReportLogin`，LOGIN_SELECTORS 留空）
  - [x] 验证码检测（`setupCaptchaWatcher`，CAPTCHA_SELECTORS 留空）
  - [x] 模拟滚动（`simulateScroll`）
  - [x] 数据驱动完成判定（`waitForCompletion`）
  - [x] 异常处理：有数据则 completeTask，无数据则 failTask
  - [x] 单模块超时保护（`withTimeout`，15s 上限）

- [x] Task 8: 注册构建入口 — 修改 scripts/build-scraper.mjs
  - [x] 在 PLATFORMS 对象中添加 `alibaba: resolve(projectRoot, 'scraper-scripts/alibaba/index.ts')`

- [x] Task 9: 注册登录策略 — 修改 src-tauri/src/login/mod.rs
  - [x] 添加 `registry.register(Arc::new(default::DefaultLoginStrategy::new("alibaba", &["login.alibaba.com"], &[])));`

- [x] Task 10: 构建验证
  - [x] 运行 `node scripts/build-scraper.mjs` 确认生成 `dist-scripts/alibaba.bundle.js`

# Task Dependencies
- Task 1（abGetUtils）是 Task 2-5 的前置依赖
- Task 7（index.ts）依赖 Task 2-6（入口脚本需要导入各模块的 run 函数）
- Task 8 依赖 Task 7（构建入口需要 index.ts 存在）
- Task 9 独立，可与 Task 1-6 并行执行
- Task 10 依赖 Task 7-9（构建验证需要所有文件就位）
- Task 2-6 之间相互独立（除 Task 1 依赖外），可并行执行
