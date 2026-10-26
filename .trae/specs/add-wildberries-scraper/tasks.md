# Tasks

- [x] Task 1: 创建 wbGetMain.ts — Wildberries 主图提取模块
  - [x] 实现容器选择器：`[class*="mediaSlider"]`、`[class*="slidersStickyWrap"]`、`[class*="sliders"]`、`[class*="miniatureSlide"]`
  - [x] 实现图片 URL 提取：优先 `data-src-pb` > `img.src` > `getAttribute('src')`
  - [x] 实现原图还原：`/tm/` → `/big/`，`/c\d+x\d+/` → `/big/`
  - [x] 实现轮询等待：`MAX_RETRIES=20`，`RETRY_INTERVAL=1000ms`
  - [x] 实现 MutationObserver 监听，防抖 300ms
  - [x] 实现 `tauriBridge.send('MainPic', urls)` 上报

- [x] Task 2: 创建 wbGetDetail.ts — Wildberries 详情图提取模块
  - [x] 实现容器选择器：`[class*="richContent"]`、`[class*="richPreview"]`、`[class*="richItems"]`、`[class*="richGallery"]`、`[class*="richItemTrustFactor"]`、`[class*="richText"]`、`[class*="richList"]`
  - [x] 实现图片 URL 提取：`img.getAttribute('src')`，补全 `//` → `https:`
  - [x] 实现容器查找重试：最多 20 次，间隔 1s
  - [x] 实现 MutationObserver 监听 rich* 容器出现，触发持续轮询
  - [x] 实现持续轮询：连续 10 次无新增图片则停止
  - [x] 实现 `tauriBridge.send('DetailPic', urls)` 上报

- [x] Task 3: 创建 wbGetSku.ts — Wildberries SKU 图提取模块
  - [x] 实现容器选择器：`.sizesAndColors--Rb8Ln`、`.product-colors-container`、`.slide--QgAtn`、`[class*="mainWrap"]`、`[class*="arrowWrapper"]`
  - [x] 实现图片 URL 提取：优先 `data-src-pb`（需以 `http` 开头），其次 `src`
  - [x] 实现 `cleanAndProcessUrl()`：清理反引号、截断到合法扩展名、`/tm/` → `/big/`、排除 `tps-2-2.png`
  - [x] 实现 MutationObserver 监听 SKU 容器变化，防抖 300ms
  - [x] 实现轮询兜底：`MAX_POLLS=10`，`POLL_INTERVAL=3000ms`
  - [x] 实现 `tauriBridge.send('SkuPic', urls)` 上报

- [x] Task 4: 创建 wbGetVideo.ts — Wildberries 视频提取模块
  - [x] 实现 DOM `<video>` 标签扫描
  - [x] 实现页面 JSON 提取（`<script>` 标签中匹配视频 URL）
  - [x] 实现 `window` 全局变量检测（`__playinfo__`、`videoInfo`、`wb`、`product` 等）
  - [x] 实现 Performance API 网络资源监控
  - [x] 实现 XHR 拦截（`XMLHttpRequest.prototype.send`）
  - [x] 实现 Fetch 拦截（`window.fetch`）
  - [x] 实现 MutationObserver 监听 `<video>` 和 `<script>` 插入
  - [x] 实现双层去重：原始 URL + 归一化视频 ID（10 位以上数字 ID）
  - [x] 实现视频分类：`main`（URL 含 video/detail/product/catalog）vs `detail`
  - [x] 实现 `tauriBridge.send('VideoUrls', videos)` 上报（先读后写策略）
  - [x] 确保模块在 `document_start` 阶段即可启动拦截

- [x] Task 5: 创建 wbGetHylinkTitle.ts — Wildberries 标题/链接/商品ID提取模块
  - [x] 实现标题提取：`.mainTitle--R75fTcZL` 的 `title` 属性 > `textContent` > `<head><title>` > `document.title`
  - [x] 实现商品 ID 提取：URL 正则 `/catalog/(\d+)`
  - [x] 实现 URL 清洗：移除查询参数，保留 `origin + pathname`
  - [x] 实现动态内容等待：轮询等待 `.mainTitle--R75fTcZL` 元素出现
  - [x] 实现 `tauriBridge.send('productTitle'/'productLink'/'productId')` 上报

- [x] Task 6: 创建 index.ts — Wildberries 入口编排模块
  - [x] 实现视频模块立即启动（不等待 DOMContentLoaded）
  - [x] 实现 DOMContentLoaded 后并行启动 Main/Sku/Detail/HylinkTitle
  - [x] 实现各模块 15 秒超时保护（`withTimeout`）
  - [x] 实现 `waitForCompletion()` 完成判定
  - [x] 实现异常容错：有图片数据则 completeTask，否则 failTask
  - [x] 实现 iframe 防护：`if (window !== window.top) return`

- [x] Task 7: 注册构建入口 — 修改 `scripts/build-scraper.mjs`
  - [x] 在 platforms 数组中添加 `'wildberries'` 入口
  - [x] 验证 `toCamelCase('wildberries')` 转换正确

- [x] Task 8: 添加 Referer 映射 — 修改 `src-tauri/src/utils.rs`
  - [x] 在 `get_referer_for_url()` 中添加 `wbbasket.ru` → `https://www.wildberries.ru/` 映射
  - [x] 在 `get_referer_for_url()` 中添加 `wildberries.ru` → `https://www.wildberries.ru/` 映射

# Task Dependencies
- Task 6 依赖 Task 1-5（index.ts 需要导入各模块的 run 函数）
- Task 7 依赖 Task 6（构建入口需要 index.ts 存在）
- Task 1-5 之间无依赖，可并行开发
- Task 8 独立于其他任务
