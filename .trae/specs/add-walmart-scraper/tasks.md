# Tasks

- [x] Task 1: 创建 wmGetMain.ts — 沃尔玛主图提取模块
  - [x] SubTask 1.1: 实现 `isProductImageUrl()` 商品图片 URL 过滤函数（仅保留包含 `/seo/` 或 `/asr/` 路径的 URL）
  - [x] SubTask 1.2: 实现 `extractMainImagesFromDOM()` DOM 容器扫描提取（vertical-hero-carousel、hero-image-container、media-thumbnail、hero-carousel-image 等选择器 + zoom-panel 背景图 + srcset 解析）
  - [x] SubTask 1.3: 实现 `extractImagesFromNextData()` __NEXT_DATA__ JSON 提取（imageMap、imageInfo.allImages、variantCriteria），默认禁用
  - [x] SubTask 1.4: 实现 `cleanUrl()` URL 清洗函数（移除查询参数）和 `processUrls()` 去重处理
  - [x] SubTask 1.5: 实现 `run()` 导出函数：整合 DOM 主方案（+ JSON 备用方案），带重试和 `tauriBridge.send('MainPic', ...)` 上报

- [x] Task 2: 创建 wmGetSku.ts — 沃尔玛 SKU 图提取模块
  - [x] SubTask 2.1: 实现 `extractSkuImagesFromDOM()` DOM 选择器提取（variantGroup、variant-tile-chip、vt-swatch 背景图、background-image 样式、img 标签）
  - [x] SubTask 2.2: 实现 `extractSwatchImagesFromNextData()` __NEXT_DATA__ JSON swatchImageUrl 提取，默认禁用
  - [x] SubTask 2.3: 实现 `run()` 导出函数：DOM 主方案 → JSON 备用方案，带重试和 `tauriBridge.send('SkuPic', ...)` 上报

- [x] Task 3: 创建 wmGetDetail.ts — 沃尔玛详情图提取模块
  - [x] SubTask 3.1: 实现详情容器选择器列表（product-description-content、about-the-brand、product-description-section 等）
  - [x] SubTask 3.2: 实现 `collectImagesFromShadowDOM()` Shadow DOM 递归穿透（syndigo-powerpage Web Components）
  - [x] SubTask 3.3: 实现同源 iframe 穿透（#marketing-description-frame + iframe 内 Shadow DOM）
  - [x] SubTask 3.4: 实现 `isValidDetailImageUrl()` 和 `getHighResUrl()` URL 验证与清洗
  - [x] SubTask 3.5: 实现 `run()` 导出函数：容器查找 → Shadow DOM/iframe 穿透 → 去重清洗 → `tauriBridge.send('DetailPic', ...)` 上报

- [x] Task 4: 创建 wmGetVideo.ts — 沃尔玛视频提取模块
  - [x] SubTask 4.1: 实现视频 URL 去重机制（`normalizeVideoUrl` + `isVideoDuplicate`）
  - [x] SubTask 4.2: 实现沃尔玛视频分类（`isWalmartVideoUrl`/`isLikelyMainVideo`），过滤非视频资源（JS/CSS/JSON/图片/Next.js 静态资源）
  - [x] SubTask 4.3: 实现 XHR/Fetch 拦截 + JSON 响应体递归搜索 + walmartimages.com 视频 URL 匹配
  - [x] SubTask 4.4: 实现 Performance API 监控 + MutationObserver 动态监听
  - [x] SubTask 4.5: 实现 `extractVideosFromNextData()` 从 __NEXT_DATA__ 提取视频（videoMap、videos 数组、hero.video、递归搜索 product 对象）
  - [x] SubTask 4.6: 实现 `extractVideosFromDOMElements()` DOM video 元素提取 + Shadow DOM/iframe 穿透
  - [x] SubTask 4.7: 实现 `run()` 导出函数：初始化 → 拦截注册 → DOM 检测 → 定时全量检测（10 次，每秒一次）

- [x] Task 5: 创建 wmGetHylinkTitle.ts — 沃尔玛标题/链接/ID 提取模块
  - [x] SubTask 5.1: 实现标题提取（`document.title` + 等待有效标题加载 + 验证包含 "Walmart" 且长度 > 10）
  - [x] SubTask 5.2: 实现商品 ID 提取（URL 路径最后一段纯数字段，沃尔玛 URL 格式 `/ip/{slug}/{product_id}`）
  - [x] SubTask 5.3: 实现 `run()` 导出函数：等待动态内容 → 提取 → `tauriBridge.send` 上报 `productTitle`/`productLink`/`productId`

- [x] Task 6: 创建 index.ts — 沃尔玛抓取脚本入口
  - [x] SubTask 6.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 6.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 6.3: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 超时保护）
  - [x] SubTask 6.4: 实现登录探针检测（`WALMART_LOGIN_SELECTORS`）
  - [x] SubTask 6.5: 实现 `waitTaskCompletion()` 数据静默判定（复用 `waitForCompletion`）
  - [x] SubTask 6.6: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 7: 注册 walmart 到构建脚本
  - [x] SubTask 7.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `walmart` 入口

- [x] Task 8: 实现沃尔玛登录策略
  - [x] SubTask 8.1: 在 `src-tauri/src/login/mod.rs` 中注册沃尔玛 `DefaultLoginStrategy`（平台标识 "walmart"，登录 URL 模式 `["login.walmart.com", "walmart.com/account/login"]`，商品页路径 `["/ip/"]`）

- [x] Task 9: 构建验证
  - [x] SubTask 9.1: 运行 `node scripts/build-scraper.mjs` 确认 `walmart.bundle.js` 生成成功
  - [x] SubTask 9.2: 运行 `cargo check` 确认 Rust 编译通过

# Task Dependencies
- Task 1 ~ 5: 可并行开发（各模块独立）
- Task 6: 依赖 Task 1 ~ 5（入口文件导入各模块）
- Task 7: 依赖 Task 6（构建脚本需入口文件存在）
- Task 8: 独立于 Task 1 ~ 7，可并行开发
- Task 9: 依赖 Task 7 和 Task 8（最终验证）
