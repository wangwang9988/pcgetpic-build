# Tasks

- [x] Task 1: 创建 etsyGetMain.ts — Etsy 主图提取模块
  - [x] 从 JSON-LD (`script[type="application/ld+json"]`) 提取 Product 类型的 image.contentURL
  - [x] 实现 URL 清理：去除查询参数、过滤 .svg、过滤黑名单 URL
  - [x] 使用 tauriBridge.send('MainPic', urls) 上报，遵循 MAX_RETRIES + RETRY_INTERVAL 轮询模式
  - [x] 导出 `run()` 函数，返回 Promise<void>

- [x] Task 2: 创建 etsyGetDetail.ts — Etsy 详情图提取模块
  - [x] 从 DOM 容器选择器提取详情图片（img 标签 src/data-src）
  - [x] 支持 iframe 穿透：检测同源 iframe，穿透 contentDocument 提取图片
  - [x] 过滤占位图（blank.gif、spacer.gif、loading 等）和无效 URL
  - [x] 使用 MutationObserver 监听动态加载内容，增量更新
  - [x] 导出 `run()` 函数，返回 Promise<(() => void) | void>（清理函数）

- [x] Task 3: 创建 etsyGetSku.ts — Etsy SKU 图提取模块
  - [x] 从轮播分页列表容器提取 SKU 图片（`ul[data-carousel-pagination-list]`、`li[data-carousel-pagination-item]`、`li.carousel-pagination-item-v2`）
  - [x] 实现 URL 高清化：`il_\d+x\d+` 替换为 `il_fullxfull`
  - [x] 过滤视频缩略图（v.etsystatic.com 域名）
  - [x] 使用 MutationObserver 监听变化，增量更新
  - [x] 导出 `run()` 函数，返回 Promise<(() => void) | void>（清理函数）

- [x] Task 4: 创建 etsyGetVideo.ts — Etsy 视频提取模块
  - [x] 从 JSON-LD VideoObject 提取视频 URL（contentURL/contentUrl/url/embedUrl）
  - [x] 从 `__NEXT_DATA__` 提取视频（product.videoMap、product.videos、product.hero）
  - [x] 从 DOM video 元素提取视频（含 iframe 穿透和 Shadow DOM 穿透）
  - [x] 拦截 XHR 和 fetch 请求，监控网络视频资源
  - [x] Performance API 资源监控
  - [x] 视频去重：URL 精确匹配 + 规范化 ID 双重机制
  - [x] 导出 `run()` 函数，返回 void（模块自行管理生命周期）

- [x] Task 5: 创建 etsyGetHylinkTitle.ts — Etsy 标题链接提取模块
  - [x] 提取商品标题：document.title，去除 " - Etsy" / " | Etsy" 后缀
  - [x] 提取商品 ID：URL 路径 `/listing/{listingId}` 中的数字
  - [x] 构建干净 URL：去除查询参数
  - [x] 通过 tauriBridge.send 上报 productTitle、productLink、productId
  - [x] 导出 `run()` 函数，返回 Promise<void>

- [x] Task 6: 创建 index.ts — Etsy 统一入口
  - [x] 导入所有子模块的 run 函数
  - [x] Video 模块在 document_start 阶段立即启动
  - [x] 其余模块（Main/Sku/Detail/HylinkTitle）在 DOM 就绪后并行启动
  - [x] 使用 probeAndReportLogin 检测登录状态
  - [x] 使用 simulateScroll 触发懒加载
  - [x] 使用 waitForCompletion 数据驱动完成判定
  - [x] 异常处理：有数据则 completeTask，无数据则 failTask
  - [x] iframe 防护：主窗口运行全部模块，iframe 仅运行 Detail 模块

- [x] Task 7: 注册构建入口 — 修改 build-scraper.mjs
  - [x] 在 PLATFORMS 对象中新增 `etsy: resolve(projectRoot, 'scraper-scripts/etsy/index.ts')`

# Task Dependencies
- [Task 6] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]
- [Task 7] depends on [Task 6]
- [Task 1, Task 2, Task 3, Task 4, Task 5] 可并行执行
