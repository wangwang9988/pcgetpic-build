# Tasks

- [x] Task 1: 创建快手平台共享工具 ksUtils.ts
  - [x] 1.1 创建 `scraper-scripts/kuaishou/ksUtils.ts`，提取各模块共享的平台特有工具函数
  - [x] 1.2 实现 `cleanKuaishouImageUrl(url)` — 截取到图片扩展名位置，补全 `//` 协议，去除查询参数
  - [x] 1.3 实现 `isKuaishouProductImage(url)` — 仅接受 `item_image`（排除 `sku_image`），黑名单过滤 avatar/icon/logo/loading/placeholder/default
  - [x] 1.4 实现 `isKuaishouDetailImage(url)` — 接受 `item_image`/`sku_image`/`item_detail_image`，黑名单过滤
  - [x] 1.5 实现 `isKuaishouSkuImage(url)` — 仅接受 `sku_image`，黑名单过滤
  - [x] 1.6 实现 `extractUrlFromBackgroundImage(styleString)` — 从 CSS background-image 中提取 URL
  - [x] 1.7 实现 `deduplicateKsUrls(urls)` — 基于 cleanKuaishouImageUrl 的去重
  - [x] 1.8 定义 URL 黑名单常量 `URL_BLACKLIST` 和图片扩展名常量 `IMAGE_EXTENSIONS`

- [x] Task 2: 创建快手主图提取模块 ksGetMain.ts
  - [x] 2.1 创建 `scraper-scripts/kuaishou/ksGetMain.ts`，参考 `GetPic/entrypoints/modules/kuaishou/kuaishouGetMain.js` 的 DOM 提取逻辑
  - [x] 2.2 实现 Swiper 轮播区域精准提取：`.swiper-slide:not(.swiper-slide-duplicate) img.css-9pa8cd`、`.swiper-slide:not(.swiper-slide-duplicate) [style*="background-image"]`、`.swiper-wrapper img` 三种方法
  - [x] 2.3 使用 `ksUtils` 中的 `isKuaishouProductImage()`、`cleanKuaishouImageUrl()`、`deduplicateKsUrls()`
  - [x] 2.4 实现重试机制（MAX_RETRIES=100, RETRY_INTERVAL=500ms）和额外抓取（MAX_EXTRA_FETCHES=3）
  - [x] 2.5 使用共享 `sleep()`（`import { sleep } from '../shared/utils'`），禁止本地定义
  - [x] 2.6 初始空上报 `await tauriBridge.send('MainPic', [])`，最终通过 `tauriBridge.send('MainPic', images)` 上报

- [x] Task 3: 创建快手详情图提取模块 ksGetDetail.ts
  - [x] 3.1 创建 `scraper-scripts/kuaishou/ksGetDetail.ts`，参考 `GetPic/entrypoints/modules/kuaishou/kuaishouGetDetail.js`
  - [x] 3.2 实现三种提取方法：background-image 样式（排除 Swiper）、`img.css-9pa8cd`（排除 Swiper）、大尺寸 tabindex 容器（宽度>400px，排除 Swiper）
  - [x] 3.3 使用 `ksUtils` 中的 `isKuaishouDetailImage()`、`cleanKuaishouImageUrl()`、`extractUrlFromBackgroundImage()`、`deduplicateKsUrls()`
  - [x] 3.4 实现多轮提取（EXTRACTION_PASSES=3, PASS_DELAY_MS=2000ms），使用共享 `sleep()`
  - [x] 3.5 初始空上报 `await tauriBridge.send('DetailPic', [])`，最终通过 `tauriBridge.send('DetailPic', urls)` 上报

- [x] Task 4: 创建快手 SKU 图提取模块 ksGetSku.ts
  - [x] 4.1 创建 `scraper-scripts/kuaishou/ksGetSku.ts`，参考 `GetPic/entrypoints/modules/kuaishou/kuaishouGetSku.js`
  - [x] 4.2 实现三种提取方法：`img.css-9pa8cd`（排除 Swiper）、`background-image`（排除 Swiper）、tabindex 容器（排除 Swiper）
  - [x] 4.3 使用 `ksUtils` 中的 `isKuaishouSkuImage()`、`cleanKuaishouImageUrl()`、`extractUrlFromBackgroundImage()`、`deduplicateKsUrls()`
  - [x] 4.4 实现 MutationObserver 精确监听 SKU 容器（而非 document.body），同时监听 `childList`、`subtree` 和 `attributes`（`src`、`data-src`），图片数量增加时防抖后重新扫描上报
  - [x] 4.5 实现轮询兜底（MAX_POLLS=10, POLL_INTERVAL=3000ms）
  - [x] 4.6 **返回清理函数** `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }`，同时清理 Observer 和定时器
  - [x] 4.7 初始空上报 `await tauriBridge.send('SkuPic', [])`，增量上报通过 `tauriBridge.send('SkuPic', urls)`

- [x] Task 5: 创建快手视频提取模块 ksGetVideo.ts
  - [x] 5.1 创建 `scraper-scripts/kuaishou/ksGetVideo.ts`，参考 `GetPic/entrypoints/modules/kuaishou/kuaishouGetVideo.js`
  - [x] 5.2 实现 XHR/Fetch 拦截（劫持 `XMLHttpRequest.prototype.send` 和 `window.fetch`）
  - [x] 5.3 实现 Performance API 增量监控（requestAnimationFrame 循环 + 游标，避免重复扫描已处理条目）
  - [x] 5.4 实现 MutationObserver 监听 `<video>` 和 `<script>` 新增
  - [x] 5.5 实现 DOM 扫描（video 标签 + source 子元素 + data-video-url/data-video/data-src 属性）
  - [x] 5.6 实现 JSON 数据解析（script 标签正则匹配 + 递归遍历对象查找视频 URL）
  - [x] 5.7 检查快手特有全局变量：`__INITIAL_STATE__`、`__INITIAL_DATA__`、`__NEXT_DATA__`、`pageData`、`goodsDetail`
  - [x] 5.8 实现视频去重（foundVideoUrls Set + normalizedVideoIds Set 双重去重）
  - [x] 5.9 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写
  - [x] 5.10 上报格式为 `{ url, type: 'main'|'detail', timestamp, pageUrl }`

- [x] Task 6: 创建快手标题/链接提取模块 ksGetHylinkTitle.ts
  - [x] 6.1 创建 `scraper-scripts/kuaishou/ksGetHylinkTitle.ts`，参考 `GetPic/entrypoints/modules/kuaishou/kuaishouHylinkTitle.js`
  - [x] 6.2 实现标题提取（多选择器优先级：`.goods-title` → `.item-title` → `[class*="goodsName"]` → document.title 降级，去除网站名称后缀）
  - [x] 6.3 实现商品ID提取（`/goods/{id}`、`/item/{id}`、`goodsId`/`goods_id` 查询参数）
  - [x] 6.4 实现 URL 清洗（保留 `/goods/{id}` 或 `/item/{id}` 格式）
  - [x] 6.5 必须输出全部四个字段：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）
  - [x] 6.6 初始空上报后等待动态内容加载（waitForDynamicContent），使用共享 `sleep()`

- [x] Task 7: 创建快手入口编排模块 index.ts
  - [x] 7.1 创建 `scraper-scripts/kuaishou/index.ts`，严格遵循 `docs/平台抓取脚本开发指南.md` 中的标准模板
  - [x] 7.2 实现 iframe 防护（`if (window !== window.top) return;`）
  - [x] 7.3 视频模块立即启动（document_start），其余模块 DOM 就绪后并行运行
  - [x] 7.4 实现登录检测（`probeAndReportLogin()` + 快手登录选择器：`.login-panel`、`.qrcode-login` 等）
  - [x] 7.5 实现验证码监控（MutationObserver + captcha 选择器 + 节流 CAPTCHA_THROTTLE_LIMIT=3）
  - [x] 7.6 实现模块并行调度（`modules.forEach` + `withTimeout` 15s 上限），收集清理函数
  - [x] 7.7 实现数据静默完成判定（`waitForCompletion()` + 7s 静默 + 15s 最大等待 + 3s 最小停留）
  - [x] 7.8 完成后调用各模块清理函数 + `tauriBridge.completeTask()`
  - [x] 7.9 实现异常处理（有数据 completeTask，无数据 failTask）

- [x] Task 8: 注册快手平台到构建脚本
  - [x] 8.1 在 `scripts/build-scraper.mjs` 的 PLATFORMS 对象中添加 `kuaishou: resolve(projectRoot, 'scraper-scripts/kuaishou/index.ts')`

- [x] Task 9: 添加快手登录检测策略
  - [x] 9.1 在 `src-tauri/src/login/mod.rs` 的 `LoginStrategyRegistry::new()` 中注册快手 `DefaultLoginStrategy`
  - [x] 9.2 配置登录 URL 模式：`login.kuaishou.com`、`passport.kuaishou.com`

- [x] Task 10: 构建验证
  - [x] 10.1 运行 `node scripts/build-scraper.mjs` 确认 kuaishou.bundle.js 构建成功
  - [x] 10.2 运行 `cargo check` 确认 Rust 端编译通过

# Task Dependencies
- Task 1 (ksUtils.ts) 无依赖，最先开发
- Task 2 ~ Task 6 依赖 Task 1（各模块需要导入 ksUtils），Task 2~6 之间可并行开发
- Task 7 依赖 Task 2 ~ Task 6（入口需要导入各模块）
- Task 8 依赖 Task 7（构建脚本需要入口文件存在）
- Task 9 无依赖，可与 Task 1 ~ Task 6 并行
- Task 10 依赖 Task 8 和 Task 9
