# Tasks

- [x] Task 1: 创建 SHEIN 平台 Handler (`src/utils/platforms/shein.ts`)
  - [x] 实现 `cleanUrl()`：只保留 origin + pathname，移除查询参数和 hash
  - [x] 实现 `extractProductId()`：优先 `goods_id` 参数 → 路径 `-p-(\d+)\.html` → 9 位以上纯数字兜底
  - [x] 导出 `sheinHandler` 对象，类型为 `PlatformHandler`

- [x] Task 2: 创建 SHEIN 主图提取模块 (`scraper-scripts/shein/sheinGetMain.ts`)
  - [x] 使用共享 `sleep` 和 `deduplicateUrls`（禁止本地定义）
  - [x] 实现 Script 标签提取：`origin_image`、`skcImages`、`skuImages`、`goodsDetailSchema` JSON-LD
  - [x] 实现 DOM 提取：`.main-picture` 容器内 `.crop-image-container[data-before-crop-src]`、`img[data-src]`、`img[src]`
  - [x] 实现 URL 清洗：`//` 补协议 → 移除 `_(?:square_)?thumbnail_\d+x?\d*` → 移除查询字符串
  - [x] 实现重试轮询：MAX_RETRIES=40, RETRY_INTERVAL=500ms
  - [x] 实现额外抓取：MAX_EXTRA_FETCHES=3 确保数据完整
  - [x] 初始空上报 `tauriBridge.send('MainPic', [])`
  - [x] 最终上报 `tauriBridge.send('MainPic', images)`

- [x] Task 3: 创建 SHEIN 详情图提取模块 (`scraper-scripts/shein/sheinGetDetail.ts`)
  - [x] 使用共享 `sleep` 和 `deduplicateUrls`（禁止本地定义）
  - [x] 实现 9 个 DOM 选择器扫描 + background-image 提取
  - [x] 实现图片属性提取优先级：`data-src` → `data-original` → `data-lazySrc` → `src`
  - [x] 实现 URL 清洗：移除查询字符串 → 移除 `_thumbnail_\d+x\d+` → 移除 `_\d+x\d+$`
  - [x] 实现排除路径模式：`/flags/`、`/avatar/`、`/review/` 等
  - [x] 实现重试等待容器 + 多轮提取（EXTRACTION_PASSES=3）
  - [x] 实现 MutationObserver 持续监听（增量上报）
  - [x] **返回清理函数**：同时清理 Observer 和定时器
  - [x] 初始空上报 `tauriBridge.send('DetailPic', [])`

- [x] Task 4: 创建 SHEIN SKU 图提取模块 (`scraper-scripts/shein/sheinGetSku.ts`)
  - [x] 使用共享 `sleep`、`deduplicateUrls`、`cleanImageUrl`、`extractImageKey`（禁止本地定义）
  - [x] 实现 Script 标签提取：`goods_image` 字段（过滤 `ltwebstatic`）
  - [x] 实现 DOM 提取：`.purchase-control` 内的 `data-before-crop-src`、`img.bs-attr-crop-image-container__img`、`.main-sales-attr__color`
  - [x] 实现 URL 清洗：与主图相同规则
  - [x] 实现哈希去重：基于文件名（不含扩展名）去重
  - [x] 实现 MutationObserver **精确监听** SKU 容器（`.purchase-control`、`.main-sales-attr__color`），而非 document.body
  - [x] 监听属性变化：`src`、`data-src`、`data-original`
  - [x] 实现轮询兜底（MAX_POLLS=10 × POLL_INTERVAL=3000）
  - [x] **返回清理函数**：同时清理 Observer 和 setInterval 定时器
  - [x] 初始空上报 `tauriBridge.send('SkuPic', [])`

- [x] Task 5: 创建 SHEIN 视频提取模块 (`scraper-scripts/shein/sheinGetVideo.ts`)
  - [x] 实现 XHR 拦截（立即启动层）
  - [x] 实现 Fetch 拦截（立即启动层）
  - [x] 实现 Performance API 增量监控 + requestAnimationFrame 循环（立即启动层）
  - [x] 实现 Script 标签提取：`videoUrl`、`video_url`、`gbRawData` JSON 解析
  - [x] 实现 DOM 提取：`video[src]`、`video > source[src]`、独立 `source[src]`
  - [x] 实现视频有效性验证：排除 blob:/data:/API 链接，验证扩展名
  - [x] 实现视频分类：区分 main/detail 视频
  - [x] 实现"先读后写"策略：`tauriBridge.get('VideoUrls')` → 去重追加 → 回写
  - [x] 实现双重去重：原始 URL 集合 + 归一化视频 ID 集合
  - [x] 实现 MutationObserver 监听 `<video>` 和 `<script>` 新增
  - [x] 实现延时梯度扫描（1s/3s/5s/10s）
  - [x] 上报格式：`[{url, type, timestamp, pageUrl}]`

- [x] Task 6: 创建 SHEIN 标题/链接/商品ID/访问时间提取模块 (`scraper-scripts/shein/sheinGetHylinkTitle.ts`)
  - [x] 使用共享 `sleep`（禁止本地定义）
  - [x] 实现商品 ID 提取：URL 参数 `goods_id` → 路径 `-p-(\d+)\.html` → Script 标签
  - [x] 实现标题提取：`document.title`（排除占位）→ `h1` → `og:title` → 通用选择器
  - [x] 实现标题清洗：移除 `| SHEIN...`、`- SHEIN...`、`at SHEIN...` 后缀
  - [x] 实现链接清洗：只保留 origin + pathname
  - [x] **必须输出 `visitTime`**：格式 `YYYY-MM-DD HH:mm`
  - [x] 初始空上报 productTitle/productLink/productId
  - [x] 最终上报 productTitle/productLink/productId/visitTime

- [x] Task 7: 创建 SHEIN 平台入口脚本 (`scraper-scripts/shein/index.ts`)
  - [x] 严格遵循开发指南标准模板
  - [x] 实现 iframe 防护：`if (window !== window.top) return;`
  - [x] 实现登录检测：`probeAndReportLogin()` + SHEIN 登录选择器
  - [x] 实现验证码监控：`CAPTCHA_SELECTORS` 留空（SHEIN 暂无已知验证码选择器）
  - [x] 实现模块编排：Video 立即启动 → DOM 就绪后 Main/Sku/Detail/HylinkTitle 并行
  - [x] 实现超时保护：`withTimeout` 单模块 15s 上限
  - [x] 实现数据静默完成判定：`waitForCompletion()` + 异常处理
  - [x] 实现清理函数统一调用：模块返回的 cleanup function 由 `waitTaskCompletion` 统一调用

- [x] Task 8: 注册 SHEIN 到构建脚本 (`scripts/build-scraper.mjs`)
  - [x] 在 `PLATFORMS` 对象中添加 `shein: resolve(projectRoot, 'scraper-scripts/shein/index.ts')`

- [x] Task 9: 注册 SHEIN 登录策略 (`src-tauri/src/login/mod.rs`)
  - [x] 使用 `DefaultLoginStrategy` 注册 shein 平台，配置登录域名

- [x] Task 10: 构建验证
  - [x] 运行 `node scripts/build-scraper.mjs` 确认 `shein.bundle.js` 生成成功
  - [x] 确认前端 TypeScript 编译无错误（SHEIN 相关文件编译通过；`PlatformDetect.vue` 的 TS 错误为既有问题，与本次变更无关）

# Task Dependencies
- Task 2, 3, 4, 5, 6 相互独立可并行
- Task 7 依赖 Task 2, 3, 4, 5, 6（入口编排各模块）
- Task 8 依赖 Task 7（构建入口依赖入口文件存在）
- Task 10 依赖 Task 7, 8, 9（验证需要所有文件就位）
- Task 1, 9 可并行执行且无依赖
