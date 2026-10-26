# Tasks

- [x] Task 1: 创建 mlGetMain.ts — MercadoLibre 主图提取模块
  - [x] 1.1 实现 `extractImagesFromPreloadedState()`：从 `#__PRELOADED_STATE__` 提取 `pageState.initialState.components.gallery.pictures`，生成 `https://http2.mlstatic.com/D_NQ_NP_2X_{id}-F.webp`
  - [x] 1.2 实现 `extractImagesFromNordicRenderingCtx()`：从 `#__NORDIC_RENDERING_CTX__` 使用花括号计数法提取 JSON，导航至 `appProps.pageProps.initialState.components.gallery.pictures`
  - [x] 1.3 实现 `gatherAllImages()`：先尝试方案1，失败则方案2，使用 `deduplicateUrls()` 去重
  - [x] 1.4 实现 `run()`：发送空 MainPic → 重试循环（100次/500ms）→ 增量抓取（3轮）→ 发送最终 MainPic

- [x] Task 2: 创建 mlGetDetail.ts — MercadoLibre 详情图提取模块
  - [x] 2.1 实现 `extractMercadoLibreEnhancedContent()`：从 `#__PRELOADED_STATE__` 提取 `enhanced_content.media_content`，过滤 `type === 'image'`，生成高清 URL
  - [x] 2.2 实现 DOM 容器兜底提取：选择器列表 + `img`/`noscript`/`background-image`/`srcset`（2x优先）多源提取
  - [x] 2.3 实现 `cleanAndNormalizeDetailUrl()`：mlstatic.com 尺寸后缀替换（-B/-L/-O/-V/-C/-I → -F），D_NQ_NP_ → D_NQ_NP_2X_
  - [x] 2.4 实现 `isValidDetailImageUrl()`：mlstatic.com 域名白名单 + 通用扩展名检测
  - [x] 2.5 实现 `run()`：容器重试（5次/1s）→ JSON 优先 + DOM 兜底 → 多轮提取 → 发送 DetailPic

- [x] Task 3: 创建 mlGetSku.ts — MercadoLibre SKU 变体图提取模块
  - [x] 3.1 实现 `extractSkuImages()`：精准选择器 `.ui-pdp-outside_variations__items img` 和 `#outside_variations img.ui-pdp-image`
  - [x] 3.2 实现 URL 转换：`D_Q_NP_` → `D_NQ_NP_2X_`，`-R.webp/jpg/png` → `-F.webp/jpg/png`
  - [x] 3.3 实现 `run()`：重试（5次/500ms）→ 增量更新（3轮/500ms）→ MutationObserver 兜底 → 发送 SkuPic

- [x] Task 4: 创建 mlGetVideo.ts — MercadoLibre 视频提取模块
  - [x] 4.1 实现 JSON 提取：标准 URL 匹配 + Unicode 转义解码 + `_n.ctx.X={...}` 格式解析
  - [x] 4.2 实现网络拦截：`XMLHttpRequest.prototype.send` 和 `window.fetch` monkey-patch
  - [x] 4.3 实现 M3U8 Master Playlist 解析：通过 `tauriBridge` 代理 fetch，解析 `#EXT-X-STREAM-INF` 提取子流 URL
  - [x] 4.4 实现视频分类与去重：`main`/`detail` 分类 + 精确 URL + 归一化 ID 双重去重
  - [x] 4.5 实现 Performance API 监控 + MutationObserver + DOM video 元素检测
  - [x] 4.6 实现 `run()`：初始化空 VideoUrls → 启动所有检测通道

- [x] Task 5: 创建 mlGetHylinkTitle.ts — MercadoLibre 标题/链接/商品ID 提取模块
  - [x] 5.1 实现标题提取：`h1.ui-pdp-title` → `meta[twitter:title/og:title]` → `document.title`
  - [x] 5.2 实现商品 ID 提取：`input[name="itemId"]` → URL 正则 `([A-Z]{3})[-]?(\d+)`
  - [x] 5.3 实现 URL 清洗：`cleanMercadoLibreProductUrl()` 仅保留 origin + pathname
  - [x] 5.4 实现 `run()`：等待动态内容 → 提取标题/链接/ID → 发送 productTitle/productLink/productId/visitTime

- [x] Task 6: 创建 index.ts — MercadoLibre 入口编排
  - [x] 6.1 实现 iframe 防护 `if (window !== window.top) return`
  - [x] 6.2 立即启动视频模块 `runVideo()`
  - [x] 6.3 DOMContentLoaded 后：登录检测 → simulateScroll → 并行启动 Main/Sku/Detail/HylinkTitle
  - [x] 6.4 使用 `waitForCompletion()` 判定任务完成，调用 `tauriBridge.completeTask()`

- [x] Task 7: 注册构建入口和登录策略
  - [x] 7.1 在 `scripts/build-scraper.mjs` 的 PLATFORMS 中添加 `mercadolibre` 入口
  - [x] 7.2 在 `src-tauri/src/login/mod.rs` 中为 MercadoLibre 注册 `DefaultLoginStrategy`（login URL patterns: `mercadolibre.com/login`, `mercadolivre.com/login`）

# Task Dependencies
- Task 6 依赖 Task 1-5（index.ts 导入各模块的 run 函数）
- Task 7 独立于 Task 1-6（可并行执行）
- Task 1-5 之间无依赖，可并行实现
