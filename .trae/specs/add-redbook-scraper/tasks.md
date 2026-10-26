# Tasks

- [x] Task 1: 创建 `scraper-scripts/redbook/rbGetMain.ts` — 小红书主图提取模块（重试获取 + 额外探测模式）
  - [x] 入口处先 `tauriBridge.send('MainPic', [])` 清空旧数据
  - [x] 实现精准容器提取：从 `.search-layout__main`、`.feeds-container`、`.img-container`、`[class*="swiper-slide"]`、`.note-container` 五个容器提取图片
  - [x] 实现黑名单过滤：从 `.footer`、`.parent-comment`、`.item-wrapper` 容器提取黑名单 URL 并排除
  - [x] 实现 `cleanImageUrl` URL 清洗：保留完整 URL（小红书 CDN 需要签名参数），排除非图片资源、视频资源、头像等
  - [x] 使用 `shared/utils.ts` 的 `deduplicateUrls` 去重、`sleep` 延时（禁止本地 sleep）
  - [x] 实现循环重试（MAX_RETRIES × RETRY_INTERVAL）等待容器出现，获取到图片后额外探测（MAX_EXTRA_FETCHES）合并去重
  - [x] 实现 `run()` 导出函数：使用 `tauriBridge.send('MainPic', urls)` 上报
  - [x] 参考 `GetPic/entrypoints/modules/redbook/RedbookGetMain.js` 的核心提取逻辑

- [x] Task 2: 创建 `scraper-scripts/redbook/rbGetSku.ts` — 小红书 SKU 图提取模块（MutationObserver 动态监听 + 返回清理函数模式）
  - [x] 入口处先 `tauriBridge.send('SkuPic', [])` 清空旧数据
  - [x] 首轮扫描：双策略提取（策略1 从 `__INITIAL_STATE__` JSON 递归提取 `urlDefault`/`urlPre`/`url` 字段；策略2 从 DOM 容器 `.img-container` 和 `.swiper-slide` 提取），有结果立即上报
  - [x] 注册 MutationObserver 精确监听目标容器（非 document.body），监听 `childList` + `subtree` + `attributes`（`src`、`data-src`），图片数量增加时防抖后重新扫描上报
  - [x] 轮询兜底：首轮无结果时启动定时轮询，获取到结果后停止
  - [x] 数据保护：提取结果为空时保留历史有效数据，防止误清空
  - [x] 使用 `shared/utils.ts` 的 `deduplicateUrls`、`sleep`（禁止本地 sleep）
  - [x] 返回清理函数：同时清理 `observer.disconnect()` 和 `clearInterval(pollTimer)`
  - [x] 实现 `run()` 导出函数：使用 `tauriBridge.send('SkuPic', urls)` 上报
  - [x] 参考 `GetPic/entrypoints/modules/redbook/RedbookGetSku.js` 的核心提取逻辑

- [x] Task 3: 创建 `scraper-scripts/redbook/rbGetDetail.ts` — 小红书详情图提取模块（重试等待容器 + 多轮遍历模式）
  - [x] 入口处先 `tauriBridge.send('DetailPic', [])` 清空旧数据
  - [x] 重试等待详情容器出现（MAX_CONTAINER_RETRIES × RETRY_INTERVAL）
  - [x] 多轮提取（EXTRACTION_PASSES）：每轮扫描 `.note-content`、`.desc`、`[class*="desc"]` 等正文容器内的 img 标签和背景图，间隔 PASS_DELAY_MS
  - [x] 使用 `shared/utils.ts` 的 `deduplicateUrls`、`sleep`（禁止本地 sleep）
  - [x] 实现 `run()` 导出函数：使用 `tauriBridge.send('DetailPic', urls)` 上报

- [x] Task 4: 创建 `scraper-scripts/redbook/rbGetVideo.ts` — 小红书视频提取模块（多手段尽早介入模式）
  - [x] 清空历史状态，立即启动（不等待 DOMContentLoaded）：
    - Performance API 增量监控：`performance.getEntriesByType('resource')` + 游标增量检测 + `requestAnimationFrame` 持续轮询
    - MutationObserver 监听 `<video>` 和 `<script>` 新增
  - [x] DOMContentLoaded 后启动：
    - `__INITIAL_STATE__` JSON 解析（提取 `stream.h264/h265/av1` 的 `masterUrl`/`backupUrls` 和 `consumer.originVideoKey`）
    - DOM 提取（video 元素 + 播放器容器 + `data-src`/`data-video` 属性）
    - 正则匹配 HTML（`masterUrl`、`originVideoKey`、`sns-video` 域名 URL）
  - [x] 实现 `isValidVideoUrl` 验证：精确区分视频 CDN（`sns-video-*` 放行）和图片 CDN（`sns-webpic-*` 拦截），拦截图片处理参数后缀（`!webp`、`!jpg` 等）
  - [x] 双重去重：原始 URL 集合 + 归一化视频 ID（18位十六进制）集合，优先保留高码率链接，过滤 `pre_post/` 和 `spectrum/` 预览链接
  - [x] 视频分类上报：区分主图视频（main）和详情视频（detail），上报格式 `{ url, type, timestamp, pageUrl }`
  - [x] 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写
  - [x] 使用 `shared/utils.ts` 的 `sleep`（禁止本地 sleep）
  - [x] 实现 `run()` 导出函数：使用 `tauriBridge.send('VideoUrls', videoObjects)` 上报
  - [x] 参考 `GetPic/entrypoints/modules/redbook/RedbookGetVideo.js` 的核心提取逻辑

- [x] Task 5: 创建 `scraper-scripts/redbook/rbGetHylinkTitle.ts` — 小红书标题/链接提取模块（基础信息聚合模式）
  - [x] 入口处先清空旧数据：`tauriBridge.send('productTitle', '')`、`tauriBridge.send('productLink', '')`、`tauriBridge.send('productId', '')`、`tauriBridge.send('visitTime', '')`
  - [x] 等待动态内容加载（重试等待关键 DOM 元素出现，MAX_RETRIES × RETRY_DELAY_MS）
  - [x] 多策略提取标题：`meta[property="og:title"]` → `#detail-title` / `.note-content .title` → `.mainTitle--R75fTcZL` → `h1` → 兜底 `document.title`
  - [x] 实现笔记 ID 提取：从 URL 提取 `/explore/{id}` 或 `keyword` 参数
  - [x] 清洗商品链接：去除繁杂查询参数，规范化为 `/explore/{id}` 格式
  - [x] MUST 输出全部四个字段：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）
  - [x] 使用 `shared/utils.ts` 的 `sleep`（禁止本地 sleep）
  - [x] 实现 `run()` 导出函数：通过 `tauriBridge.send()` 分别上报四个字段
  - [x] 参考 `GetPic/entrypoints/modules/redbook/RedbookGetHylinkTitle.js` 的核心提取逻辑

- [x] Task 6: 创建 `scraper-scripts/redbook/index.ts` — 小红书抓取脚本入口（对齐开发指南标准模板）
  - [x] 遵循开发指南的标准模板：视频模块立即启动（document_start），其余模块在 DOMContentLoaded 后并行启动
  - [x] 实现登录检测：使用 `probeAndReportLogin()` + 小红书特有登录选择器
  - [x] 实现验证码监控：MutationObserver 检测验证码元素，通过 `tauriBridge.emitEvent` 上报（含节流保护）
  - [x] 实现数据驱动完成判定：使用 `waitForCompletion()` + `tauriBridge.getLastImageDataChangeAt()`
  - [x] 模块并行：四个图片/标题模块 `forEach` 后台并行，不阻塞完成判定
  - [x] 超时保护：`withTimeout` 单模块 15s 上限
  - [x] 异常降级：有数据则 completeTask，无数据则 failTask

- [x] Task 7: 修改 `scripts/build-scraper.mjs` — 注册 redbook 构建入口
  - [x] 在 `PLATFORMS` 对象中新增 `redbook: resolve(projectRoot, 'scraper-scripts/redbook/index.ts')`

- [x] Task 8: 构建验证
  - [x] 执行构建脚本，确认 `dist-scripts/redbook.bundle.js` 正确生成
  - [x] 检查构建产物无报错

# Task Dependencies
- [Task 6] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]
- [Task 7] depends on [Task 6]
- [Task 8] depends on [Task 7]
- [Task 1, Task 2, Task 3, Task 4, Task 5] 可并行执行
