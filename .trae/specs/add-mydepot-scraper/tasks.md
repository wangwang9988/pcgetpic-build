# Tasks

- [x] Task 1: 创建 mydepotGetMain.ts — 主图提取模块
  - [x] 1.1 实现 Shopify URL 补充清洗函数 `cleanShopifySuffix`（UUID 后缀 `_[0-9a-f]{8}-...`、数字尺寸后缀 `_1024x1024`、文字尺寸后缀 `_large/_medium/_small/_compact/_grande/_pico/_thumb/_icon/_master`），通用清洗优先使用 `shared/utils.ts` 的 `cleanImageUrl()`
  - [x] 1.2 实现三种 DOM 提取方式：`.productView-images-wrapper`（`.media[data-fancybox]` href + `img[data-main-image]` src/srcset）、`.productView-thumbnail-wrapper`（`.productView-thumbnail-link` data-image + img src/srcset）、全局 `.productView-thumbnail-link`（备用）
  - [x] 1.3 实现 `run()` 导出函数（对齐开发指南 GetMain 模式）：`tauriBridge.send('MainPic', [])` 初始空上报 → 循环重试 gatherAllImages（MAX_RETRIES=30, RETRY_INTERVAL=500ms）→ 额外抓取（MAX_EXTRA_FETCHES=3）→ `tauriBridge.send('MainPic', images)` 最终上报
  - [x] 1.4 使用共享 `sleep`（`import { sleep } from '../shared/utils'`），使用 `deduplicateUrls()` 去重

- [x] Task 2: 创建 mydepotGetDetail.ts — 详情图提取模块
  - [x] 2.1 复用 Task 1 的 Shopify URL 补充清洗函数
  - [x] 2.2 实现三种 DOM 提取方式：`.custom-image-container img`、`.image-wrapper img`、商品描述区域（`#product-description` / `.product-description` / `[class*="description"]` img）
  - [x] 2.3 实现 `run()` 导出函数（对齐开发指南 GetDetail 模式）：`tauriBridge.send('DetailPic', [])` 初始空上报 → 重试等待容器出现 → 多轮提取（EXTRACTION_PASSES）→ 最终上报
  - [x] 2.4 【可选】注册 MutationObserver 持续监听详情区域变化，发现新图片时增量上报

- [x] Task 3: 创建 mydepotGetSku.ts — SKU 图提取模块
  - [x] 3.1 实现从 `<script>` 标签提取 `initData.productVariants[].image.src` 的逻辑（JSON 解析优先 + 正则备用）
  - [x] 3.2 实现 `run()` 导出函数（对齐开发指南 GetSku 模式）：`tauriBridge.send('SkuPic', [])` 初始空上报 → 首轮扫描 → MutationObserver 精确监听 → 轮询兜底
  - [x] 3.3 **返回清理函数** `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }`，同时清理 Observer 和定时器
  - [x] 3.4 MutationObserver 精确监听 SKU 相关容器（而非 document.body），监听 attributes 变化（src, data-src 等）

- [x] Task 4: 创建 mydepotGetVideo.ts — 视频提取模块
  - [x] 4.1 实现立即启动层（对齐开发指南 GetVideo 必备策略）：XHR 拦截、Fetch 拦截、Performance API 增量监控（`performance.getEntriesByType('resource')` + 游标 + `requestAnimationFrame` 循环）
  - [x] 4.2 实现 DOMContentLoaded 后启动层：MutationObserver 监听 `<video>` 和 `<script>` 新增、延时梯度扫描（1s/3s/5s/10s）、页面内嵌 JSON 提取、window 全局变量检查、模拟用户交互触发懒加载
  - [x] 4.3 实现视频分类 `isMainVideoUrl()` 区分主图视频（main）和详情视频（detail）
  - [x] 4.4 实现双重去重（原始 URL 集合 + 归一化视频 ID 集合）和"先读后写"策略（`tauriBridge.get('VideoUrls')` → 去重追加 → `tauriBridge.send('VideoUrls', ...)`）
  - [x] 4.5 视频上报格式：`{ url, type: 'main'|'detail', timestamp, pageUrl }`

- [x] Task 5: 创建 mydepotGetHylinkTitle.ts — 标题/链接/商品ID/访问时间提取模块
  - [x] 5.1 实现标题提取：h1 → `.productView-title` → document.title → og:title，清洗 MyDepot 后缀
  - [x] 5.2 实现商品 ID 提取：URL variant 参数 → `/products/{handle}` 路径 → `/collections/.../products/{handle}` → form input
  - [x] 5.3 实现 script 标签数据提取（Shopify `var product =` / `initData`）
  - [x] 5.4 实现 `visitTime` 字段（格式 `YYYY-MM-DD HH:mm`，**必须包含**）
  - [x] 5.5 实现 `run()` 导出函数（对齐开发指南 GetHylinkTitle 模式）：清空旧数据 → waitForDynamicContent → 提取四字段 → 一次性上报 productTitle/productLink/productId/visitTime

- [x] Task 6: 创建 index.ts — 入口编排文件
  - [x] 6.1 严格遵循开发指南标准模板：导入 5 个子模块的 run 函数 + shared 工具
  - [x] 6.2 实现 main() 函数：`if (window !== window.top) return;` → 立即启动 Video → DOMContentLoaded 后 runModulesOnIdle
  - [x] 6.3 runModulesOnIdle：probeAndReportLogin（空选择器数组）→ resetUploadedDataFlag → simulateScroll → setupCaptchaWatcher（空数组）→ 四模块 forEach 后台并行（withTimeout 15s）→ waitTaskCompletion
  - [x] 6.4 waitTaskCompletion：waitForCompletion 数据驱动判定 → 清理 cleanupFns → completeTask
  - [x] 6.5 异常降级：有数据 completeTask，无数据 failTask

- [x] Task 7: 注册构建入口
  - [x] 7.1 在 `scripts/build-scraper.mjs` 的 PLATFORMS 对象中添加 `mydepot: resolve(projectRoot, 'scraper-scripts/mydepot/index.ts')`
  - [x] 7.2 执行构建验证 `node scripts/build-scraper.mjs` 成功生成 `dist-scripts/mydepot.bundle.js`

- [ ] Task 8: 可选 — 注册登录策略
  - [ ] 8.1 评估是否需要在 `src-tauri/src/login/mod.rs` 注册 DefaultLoginStrategy（MyDepot 为 Shopify 站点，通常无需登录即可浏览商品页，未注册时 check_login 默认返回 Normal）

# Task Dependencies
- Task 1 ~ 5 之间无依赖，可并行开发
- Task 6 依赖 Task 1 ~ 5（需要导入各模块的 run 函数）
- Task 7 依赖 Task 6（需要入口文件存在才能构建）
- Task 8 独立于其他任务
