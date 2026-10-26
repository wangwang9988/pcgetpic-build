# Tasks

- [x] Task 1: 创建 scraper-scripts/bao66/bao66GetMain.ts — 主图提取模块（指南 §4.2 唯品会风格）
  - [x] 实现 `gatherAllImages()`：合并 6 种选择器提取结果
    - `extractFromThumblist()`：`#thumblist img[big]` → big 属性
    - `extractFromTbThumb()`：`.tb-thumb img[big]` → big 属性
    - `extractFromPictureArea()`：`.picture .tb-pic img[big]` → big 属性
    - `extractFromShowIndexImage()`：`a.show-index-image` → href 属性
    - `extractFromAnyBigAttr()`：任意 `img[big]` 兜底
    - `extractFromMidAttr()`：`img[mid]` 备选（仅无 big 属性时使用）
  - [x] 实现 `isValidProductImage()`：URL 黑名单过滤（icon/avatar/logo/loading/placeholder/favicon/prism-/iconfont/snapshot/mkv2.oss）+ 图片扩展名校验 + k3cdn.com 域名放行
  - [x] 实现 `normalizeUrl()`：协议修复 `//` → `https://`
  - [x] 使用共享 `deduplicateUrls()` 去重，共享 `sleep()` 延时
  - [x] 实现重试循环（MAX_RETRIES=20, RETRY_INTERVAL=1000ms）+ 额外探测（MAX_EXTRA_FETCHES=3, EXTRA_FETCH_INTERVAL=500ms）
  - [x] 初始空上报 `tauriBridge.send('MainPic', [])`，最终上报 `tauriBridge.send('MainPic', images)`

- [x] Task 2: 创建 scraper-scripts/bao66/bao66GetDetail.ts — 详情图提取模块（指南 §4.4 模式）
  - [x] 实现 `findContainers()`：查找 `#productmemo`、`.product_details` 等详情图容器
  - [x] 实现 `waitForContainers()`：重试等待容器出现（MAX_CONTAINER_RETRIES=5, RETRY_DELAY_MS=1000ms）
  - [x] 实现 `extractUrlFromImg()`：优先级 data-url > data-src > src，排除 loading 占位图
  - [x] 实现 6 种选择器提取函数：
    - `extractFromProductMemo()`：`#productmemo img`
    - `extractFromProductDetails()`：`.product_details img`
    - `extractFromScrollLoading()`：`img.scrollLoading`（data-url 优先）
    - `extractFromDetailsBox()`：`.details_box` 父元素
    - `extractFromDetailTitle()`：包含"详情"文字的标题区域
    - `extractFromDataUrl()`：`img[data-url]` 兜底
  - [x] 实现 `isValidProductImage()`：黑名单过滤 + 图片扩展名校验
  - [x] 使用共享 `deduplicateUrls()` 去重，共享 `sleep()` 延时
  - [x] 实现多轮提取（EXTRACTION_PASSES=3, PASS_DELAY_MS=2000ms）
  - [x] 初始空上报 `tauriBridge.send('DetailPic', [])`，最终上报 `tauriBridge.send('DetailPic', detailPic)`

- [x] Task 3: 创建 scraper-scripts/bao66/bao66GetSku.ts — SKU 图提取模块（指南 §4.3 模式 + 返回清理函数）
  - [x] 实现 `scanDomContainers()`：6 种选择器扫描
    - `.sku-color img`、`.color_box img`、`.color-wrp img`、`#color-size-box img`、`.product_info .item img`、颜色文字标签相邻区域
  - [x] 实现 `convertToLargeUrl()`：`_\d+x\d+` → `_750x750` 大图还原（包牛牛 CDN 特有规则）
  - [x] 实现 `isValidProductImage()`：黑名单过滤 + 图片扩展名校验
  - [x] 使用共享 `deduplicateUrls()` / `extractImageKey()` / `cleanImageUrl()` / `sleep()`
  - [x] 注册 MutationObserver **精确监听 SKU 容器**（非 document.body），监听 childList + subtree + attributes（src, data-src）
  - [x] 实现轮询兜底（MAX_POLLS=10, POLL_INTERVAL=3000ms）
  - [x] **返回清理函数**：同时清理 `observer.disconnect()` 和 `clearInterval(pollTimer)`
  - [x] 初始空上报 `tauriBridge.send('SkuPic', [])`，增量上报 `tauriBridge.send('SkuPic', currentUrls)`

- [x] Task 4: 创建 scraper-scripts/bao66/bao66GetVideo.ts — 视频提取模块（指南 §4.5 多手段截获模式）
  - [x] 立即启动层（run() 调用时即执行）：
    - 清空历史状态（foundVideoUrls / normalizedVideoIds / videoCategories）
    - XHR 拦截：劫持 `XMLHttpRequest.prototype.send`
    - Fetch 拦截：劫持 `window.fetch`
    - Performance API 增量监控：`performance.getEntriesByType('resource')` + requestAnimationFrame 循环
  - [x] DOMContentLoaded 后启动层：
    - MutationObserver 监听 `<video>` 和 `<script>` 新增
    - 延时梯度扫描（1s/3s/5s/10s）
    - `extractVideosFromPageJson()`：script 标签内视频 URL 正则匹配
    - `checkWindowForVideos()`：window 全局变量扫描
    - `extractVideosFromDOM()`：`<video>` / `<source>` / `data-video-url` 属性检测
  - [x] 包牛牛特有提取 `extractVideosFromBao66()`：
    - Prism Player：`#J_prismPlayer video` → src/currentSrc
    - 阿里云 OSS URL 匹配：`aliyuncs.com` 域名视频 URL 正则
  - [x] 实现视频去重：原始 URL 集合 + 归一化视频 ID 集合双重去重
  - [x] 采用"先读后写"策略：`tauriBridge.get('VideoUrls')` → 去重追加 → `tauriBridge.send('VideoUrls', videos)`
  - [x] 视频上报格式：`{ url, type: 'main'|'detail', timestamp, pageUrl }`

- [x] Task 5: 创建 scraper-scripts/bao66/bao66GetHylinkTitle.ts — 标题/链接/商品ID提取模块（指南 §4.6 四字段必须输出）
  - [x] 实现 `extractProductTitle()`：5 级降级策略
    - `.huohao` 货号（去除"货号："前缀）→ `#copy-url` data-clipboard-text → `.product_title` → `.promise` → `document.title` 兜底（去除 ` - bao66*` 后缀）
  - [x] 实现 `extractProductId()`：URL 解析
    - `/p/xxx.html` → `/product/xxx` → 纯数字 ID 兜底
  - [x] 实现 `cleanProductUrl()`：保留核心路径（`/p/xxx.html` 或 `/product/xxx`），去除查询参数
  - [x] 实现 `generateVisitTime()`：格式 `YYYY-MM-DD HH:mm`
  - [x] 实现 `waitForDynamicContent()`：等待 `.huohao` 元素出现（MAX_RETRIES=10, RETRY_DELAY_MS=1000ms）
  - [x] 使用共享 `sleep()` 延时
  - [x] 初始空上报 productTitle/productLink/productId，最终上报全部四个字段（含 visitTime）

- [x] Task 6: 创建 scraper-scripts/bao66/index.ts — 入口脚本（指南 §3.1 标准模板）
  - [x] 导入 5 个子模块的 `run` 函数 + 共享工具（simulateScroll, waitForCompletion, tauriBridge, probeAndReportLogin）
  - [x] 配置 LOGIN_SELECTORS（`.login-panel`, `.qrcode-login` 等）和 CAPTCHA_SELECTORS（留空数组，bao66 暂无已知验证码）
  - [x] 实现 iframe 防护（`window !== window.top`）
  - [x] document_start 组：立即启动 `runVideo()`（XHR/Fetch 拦截需尽早执行）
  - [x] document_idle 组：DOMContentLoaded 后启动 `runModulesOnIdle()`
  - [x] `runModulesOnIdle()` 内部：
    - 登录检测 `probeAndReportLogin(LOGIN_SELECTORS)`
    - `tauriBridge.resetUploadedDataFlag()`
    - `simulateScroll()` + `setupCaptchaWatcher()`
    - 四个模块后台并行（withTimeout 15s 保护）
    - `waitTaskCompletion()` 数据驱动完成判定
  - [x] 异常降级：有数据 completeTask，无数据 failTask

- [x] Task 7: 修改 scripts/build-scraper.mjs — 添加 bao66 构建入口
  - [x] 在 PLATFORMS 对象中添加 `bao66: resolve(projectRoot, 'scraper-scripts/bao66/index.ts')`

- [x] Task 8: 修改 src-tauri/src/login/mod.rs — 注册 bao66 登录策略
  - [x] 添加 `DefaultLoginStrategy::new("bao66", &["login.bao66.cn"], &[])` 注册

# Task Dependencies
- Task 6 依赖 Task 1-5（入口脚本需导入所有子模块）
- Task 7 依赖 Task 6（构建入口需存在 index.ts）
- Task 8 独立，可并行执行
- Task 1-5 之间无依赖，可并行执行
