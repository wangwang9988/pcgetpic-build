# Tasks

- [x] Task 1: 创建 Ozon 主图提取模块 `scraper-scripts/ozon/ozonGetMain.ts`
  - [x] 1.1 实现 `getOriginalOzonUrl()` 原图还原函数：`/c\d+/wc\d+/` → `/wc1000/`，`/wc\d+/` → `/wc1000/`，`/c\d+/` → `/wc1000/`，移除查询参数
  - [x] 1.2 实现 `isValidOzonImageUrl()` 验证函数：必须包含 `ir.ozone.ru`，必须是图片格式，排除 `/cms/`、`/icons/`、`/logos/`、`sprite`、`_icon`
  - [x] 1.3 实现多方案提取逻辑：方案0 从 `data-widget="webGallery"` 的 `data-state` JSON 提取；方案1 从 webGallery HTML 正则匹配 img/srcset；方案2 从 NUXT State 提取；方案3 从 JSON-LD 提取
  - [x] 1.4 实现 `run()` 导出函数：初始空上报 → 轮询重试（MAX_RETRIES=20, RETRY_INTERVAL=1000）→ 额外探测（MAX_EXTRA_FETCHES=3, EXTRA_FETCH_INTERVAL=500）→ 合并去重 → 最终上报，使用共享 `sleep` 和 `deduplicateUrls`

- [x] Task 2: 创建 Ozon SKU 图提取模块 `scraper-scripts/ozon/ozonGetSku.ts`
  - [x] 2.1 实现 `extractSkuImagesFromWebAspects()`：从 `div[data-widget="webAspects"]` 中遍历 `<a>` 标签提取 `<img>` src，还原高清 URL
  - [x] 2.2 实现 `extractSkuImagesFromHtml()`：从 webAspects 区域 HTML 正则匹配 `ir.ozone.ru` 图片 URL
  - [x] 2.3 实现 MutationObserver 精确监听：对 `[data-widget="webAspects"]` 容器注册 Observer，监听 childList + subtree + attributes（src/data-src/data-original），图片数量增加时防抖后重新扫描上报
  - [x] 2.4 实现轮询兜底：首次无结果时启动定时器（MAX_POLLS=10, POLL_INTERVAL=3000），获取到结果后停止
  - [x] 2.5 实现 `run()` 导出函数：返回清理函数 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }`，同时清理 Observer 和定时器

- [x] Task 3: 创建 Ozon 详情图提取模块 `scraper-scripts/ozon/ozonGetDetail.ts`
  - [x] 3.1 实现容器查找：`[data-widget="webDescription"]` + `#section-description`，最多重试 5 次等待容器出现
  - [x] 3.2 实现图片提取：从 `<img>` 的 src/data-src/data-lazy-src/data-original 提取，从 `<noscript>` 提取 SEO 备份图，从 `background-image` style 提取
  - [x] 3.3 实现 URL 清理：仅移除查询参数（详情图已是高清大图），验证 `ir.ozone.ru` 域名，排除 `/cms/` 和占位图
  - [x] 3.4 实现 MutationObserver 持续监听：监听详情容器，检测到图片增加时增量上报
  - [x] 3.5 实现 `run()` 导出函数：等待容器 → 多轮提取 → 去重 → 上报 → 返回清理函数 `() => observer.disconnect()`

- [x] Task 4: 创建 Ozon 视频提取模块 `scraper-scripts/ozon/ozonGetVideo.ts`
  - [x] 4.1 实现 `isValidOzonVideoUrl()` 验证：接受 `cdnvideo.v.ozone.ru` 的 `.mp4/.m3u8/.webm`，排除 `/cover/`、`ozon-webmanifests`、图片扩展名
  - [x] 4.2 实现多方案提取：从 `data-state` JSON 提取 → HTML 正则匹配 cdnvideo URL → `<video>` 标签 → XHR/Fetch 拦截 → Performance API 增量监控（requestAnimationFrame 循环）→ MutationObserver
  - [x] 4.3 实现视频双重去重：原始 URL 集合 + 归一化视频 ID 集合（从 `/video-\d+/VIDEO_ID/` 提取）
  - [x] 4.4 实现视频分类上报：区分 main/detail，使用"先读后写"策略 `tauriBridge.get('VideoUrls')` → 去重追加 → `tauriBridge.send('VideoUrls', ...)`
  - [x] 4.5 实现 `run()` 导出函数：清空历史状态 → 启动 XHR/Fetch 拦截 → Performance API 监控 → DOM 就绪后启动 MutationObserver + 延时梯度扫描

- [x] Task 5: 创建 Ozon 标题/链接/商品ID/访问时间提取模块 `scraper-scripts/ozon/ozonGetHylinkTitle.ts`
  - [x] 5.1 实现标题提取：从 `#productTitle` 元素获取，兜底 `<head><title>` 和 `document.title`
  - [x] 5.2 实现标题清理：移除 " - OZON" 和 " — интернет-магазин OZON" 后缀
  - [x] 5.3 实现商品ID提取：URL 正则 `/product/(?:.*-)?(\d+)` 和 `/context/detail/id/(\d+)`
  - [x] 5.4 实现 URL 清洗：仅保留 origin + pathname
  - [x] 5.5 实现访问时间生成：`generateVisitTime()` 格式 `YYYY-MM-DD HH:mm`
  - [x] 5.6 实现 `run()` 导出函数：初始空上报 productTitle/productLink/productId → 等待动态内容 → 提取 → 上报全部四个字段（含 visitTime）

- [x] Task 6: 创建 Ozon 入口编排模块 `scraper-scripts/ozon/index.ts`
  - [x] 6.1 严格遵循开发指南标准模板，导入 5 个子模块 + shared 工具
  - [x] 6.2 配置 `LOGIN_SELECTORS`（Ozon 登录选择器）和 `CAPTCHA_SELECTORS`（Ozon 验证码选择器，如无则留空数组）
  - [x] 6.3 实现 `main()` 函数：iframe 防护 → 立即启动视频模块 → DOM 就绪后并行运行 Main/Sku/Detail/HylinkTitle
  - [x] 6.4 实现数据驱动完成判定：`waitForCompletion()` + `tauriBridge.completeTask()`
  - [x] 6.5 实现异常处理：有数据则 completeTask，无数据则 failTask
  - [x] 6.6 实现模块超时保护：`withTimeout` 单模块 15s 上限

- [x] Task 7: 注册 Ozon 到构建脚本 `scripts/build-scraper.mjs`
  - [x] 7.1 在 `PLATFORMS` 对象中添加 `ozon: resolve(projectRoot, 'scraper-scripts/ozon/index.ts')`

- [x] Task 8: 注册 Ozon 登录策略到 `src-tauri/src/login/mod.rs`
  - [x] 8.1 使用 `DefaultLoginStrategy::new` 为 Ozon 注册默认登录策略，匹配 `ozon.ru/login`、`ozon.com/login` 等 URL 模式

- [x] Task 9: 构建验证
  - [x] 9.1 运行 `node scripts/build-scraper.mjs` 确认 `dist-scripts/ozon.bundle.js` 生成成功
  - [x] 9.2 运行前端类型检查确认无 TypeScript 错误（Ozon 相关代码无新增错误）

# Task Dependencies
- Task 1 ~ Task 5: 互相独立，可并行开发
- Task 6: 依赖 Task 1 ~ Task 5（需要导入各子模块）
- Task 7: 依赖 Task 6（需要入口文件存在）
- Task 8: 无依赖，可与 Task 1 ~ Task 5 并行
- Task 9: 依赖 Task 6 ~ Task 8 全部完成
