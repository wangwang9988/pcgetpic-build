# Tasks

- [x] Task 1: 创建 `scraper-scripts/macys/macysGetMain.ts` — 梅西百货主图提取模块
  - [x] SubTask 1.1: 实现从 `.main-image-carousel .slideshow-item picture img` 和 `.alt-desktop-images .image-wrapper picture img` 提取图片 URL
  - [x] SubTask 1.2: 实现 URL 清洗逻辑（过滤 `macysassets.com`、移除查询参数、拼接 `?wid=1200&fmt=jpeg`）
  - [x] SubTask 1.3: 实现轮询等待机制（MAX_RETRIES=100, RETRY_INTERVAL=500ms）
  - [x] SubTask 1.4: 实现额外轮询获取增量图片（MAX_EXTRA_FETCHES=3）
  - [x] SubTask 1.5: 通过 `tauriBridge.send('MainPic', images)` 上报数据

- [x] Task 2: 创建 `scraper-scripts/macys/macysGetSku.ts` — 梅西百货 SKU 图提取模块
  - [x] SubTask 2.1: 实现 Stylitics 穿搭模块图片提取（`img[data-testid="stylitics-ui-image"]`、`[data-collage-img]`）
  - [x] SubTask 2.2: 实现原生轮播图提取（`.product-qv-images picture img.picture-image`）
  - [x] SubTask 2.3: 实现 `processToLargeImage` URL 清洗（Adobe Scene7: wid=1500/fmt=jpeg/qlt=90；Stylitics: 保持原 URL）
  - [x] SubTask 2.4: 实现轮询等待 + MutationObserver 动态监听
  - [x] SubTask 2.5: 通过 `tauriBridge.send('SkuPic', images)` 上报数据

- [x] Task 3: 创建 `scraper-scripts/macys/macysGetDetail.ts` — 梅西百货详情图提取模块
  - [x] SubTask 3.1: 实现 Syndigo 容器提取（`.syndigo-powerpage-grid` → `picture` → `source[srcset]`/`img[src]`）
  - [x] SubTask 3.2: 实现 Shadow DOM 穿透（`syndigo-powerpage` → `shadowRoot`）
  - [x] SubTask 3.3: 实现 `getHighestResUrl` srcset 最高分辨率解析
  - [x] SubTask 3.4: 实现轮询等待 + MutationObserver 动态监听
  - [x] SubTask 3.5: 通过 `tauriBridge.send('DetailPic', images)` 上报数据

- [x] Task 4: 创建 `scraper-scripts/macys/macysGetVideo.ts` — 梅西百货视频提取模块
  - [x] SubTask 4.1: 实现 `__MODERN_ROUTER_DATA__` JSON 解析提取视频 URL
  - [x] SubTask 4.2: 实现 DOM `<video>` 元素扫描提取
  - [x] SubTask 4.3: 实现 Macy's 视频 CDN 识别（`macyscdn-us.com`/`macyscdn.com`/`ttcdn-us.com` + `/video/`）
  - [x] SubTask 4.4: 实现 XHR/Fetch 拦截、Performance API 监控、MutationObserver 动态监听
  - [x] SubTask 4.5: 实现双重去重（原始 URL + 归一化视频 ID）和视频分类（主图/详情）
  - [x] SubTask 4.6: 通过 `tauriBridge.send('VideoUrls', videos)` 上报数据

- [x] Task 5: 创建 `scraper-scripts/macys/macysGetHylinkTitle.ts` — 梅西百货标题/链接提取模块
  - [x] SubTask 5.1: 实现商品 ID 提取（URL `?ID=` 参数 + `/shop/pdp/` 路径数字段）
  - [x] SubTask 5.2: 实现 URL 清洗（保留 `origin + pathname + ?ID=productId`）
  - [x] SubTask 5.3: 实现标题提取（`document.title`）
  - [x] SubTask 5.4: 通过 `tauriBridge.send` 上报 productTitle/productLink/productId/visitTime

- [x] Task 6: 创建 `scraper-scripts/macys/index.ts` — 入口编排模块
  - [x] SubTask 6.1: 实现 iframe 防护（`window !== window.top` 时退出）
  - [x] SubTask 6.2: 实现 document_start 阶段立即启动视频模块
  - [x] SubTask 6.3: 实现 DOMContentLoaded 后启动 Main/Sku/Detail/HylinkTitle 模块
  - [x] SubTask 6.4: 实现任务完成判定（`waitForCompletion` + `tauriBridge.completeTask`）
  - [x] SubTask 6.5: 实现异常处理（模块超时、流程异常时尝试完成或失败上报）

- [x] Task 7: 修改 `scripts/build-scraper.mjs` — 注册 macys 平台构建入口
  - [x] SubTask 7.1: 在 PLATFORMS 对象中添加 `macys: resolve(projectRoot, 'scraper-scripts/macys/index.ts')`

- [x] Task 8: 构建验证
  - [x] SubTask 8.1: 执行构建脚本，确认 `dist-scripts/macys.bundle.js` 生成成功

# Task Dependencies
- Task 1 ~ 5 之间无依赖，可并行开发
- Task 6 依赖 Task 1 ~ 5（需要导入各模块的 `run` 函数）
- Task 7 依赖 Task 6（需要入口文件存在）
- Task 8 依赖 Task 7（需要构建配置完成）
