# Tasks

- [x] Task 1: 创建 madeGetMain.ts — 中国制造网主图提取模块
  - [x] SubTask 1.1: 导入共享 `sleep`（`from '../shared/utils'`），不在模块内定义本地 sleep
  - [x] SubTask 1.2: 实现 `truncateToExtension()` URL 截断到扩展名函数（复用淘宝同款逻辑）
  - [x] SubTask 1.3: 实现 `normalizeUrl()` 相对协议处理（`//` → `https://`）
  - [x] SubTask 1.4: 实现 `extractMainImagesFromFsrc()` 从 `.sr-proMainInfo-slide-picItem` 容器的 `fsrc` 属性提取图片 URL
  - [x] SubTask 1.5: 实现 `run()` 导出函数：初始空上报 `await tauriBridge.send('MainPic', [])` → fsrc 提取 → 重试（20 次/1000ms，使用共享 `sleep`）→ 额外抓取（3 轮/500ms）→ `deduplicateUrls()` 去重 → `tauriBridge.send('MainPic', images)` 上报

- [x] Task 2: 创建 madeGetSku.ts — 中国制造网 SKU 图提取模块
  - [x] SubTask 2.1: 导入共享 `sleep`（`from '../shared/utils'`），不在模块内定义本地 sleep
  - [x] SubTask 2.2: 实现 `cleanAndProcessUrl()` URL 清洗函数（移除反引号、截断到扩展名、过滤 `tps-2-2.png`）
  - [x] SubTask 2.3: 实现 `collectUrlsFromImageElement()` 从 img 标签多属性提取（src、placeholder、data-src、data-original、style background-image、父元素 data 属性）
  - [x] SubTask 2.4: 实现 valueItem 容器扫描（`[class*="valueItem--"]`）和固定选择器扫描（`#skuOptionsArea`、`.skuWrapper--`、`.root--`、`.content--`）
  - [x] SubTask 2.5: 实现 `run()` 导出函数：初始空上报 `await tauriBridge.send('SkuPic', [])` → DOM 扫描 → 对特定 SKU 容器元素挂载 MutationObserver（监听 `childList`、`subtree`、`attributes`，`attributeFilter: ['src', 'data-original']`，非 `document.body`）→ 轮询兜底（20 次/1s）→ 增量上报 → **返回清理函数** `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }`

- [x] Task 3: 创建 madeGetDetail.ts — 中国制造网详情图提取模块
  - [x] SubTask 3.1: 导入共享 `sleep`（`from '../shared/utils'`），不在模块内定义本地 sleep
  - [x] SubTask 3.2: 实现 `.detail-desc` 容器查找（5 次重试，每次 1000ms，使用共享 `sleep`）
  - [x] SubTask 3.3: 实现 `extractImageUrlsFromContainer()` 从 img 标签的 `data-original`（优先）和 `src` 属性提取 URL
  - [x] SubTask 3.4: 实现 `isValidDetailImageUrl()` 和 `cleanAndNormalizeDetailUrl()` URL 验证与清洗（移除反引号、处理 `//` 协议、验证扩展名）
  - [x] SubTask 3.5: 实现 `run()` 导出函数：初始空上报 `await tauriBridge.send('DetailPic', [])` → 容器查找 → 3 轮提取（每轮间隔 2000ms，使用共享 `sleep`）→ 去重清洗 → 增量上报 `tauriBridge.send('DetailPic', ...)`

- [x] Task 4: 创建 madeGetVideo.ts — 中国制造网视频提取模块
  - [x] SubTask 4.1: 导入共享 `sleep`（`from '../shared/utils'`），不在模块内定义本地 sleep
  - [x] SubTask 4.2: 实现视频 URL 去重机制（`normalizeVideoUrl` + `isVideoDuplicate`），含 Made-in-China 特有标识匹配（`[a-f0-9]+/[a-f0-9]+_h264_def`）
  - [x] SubTask 4.3: 实现中国制造网视频分类（`isMainVideoUrl`：URL 含 `made-in-china.com` 或 `v.made-in-china.com` 为主图视频）
  - [x] SubTask 4.4: 实现 `extractMadeInChinaVideos()` 从 `.J-play-video` 的 `ads-data` JSON 属性和 `script[type="text/data-video"]` 标签提取视频
  - [x] SubTask 4.5: 实现 XHR/Fetch 拦截 + JSON 响应体递归搜索
  - [x] SubTask 4.6: 实现 Performance API 增量监控（游标增量检测 + `requestAnimationFrame` 持续轮询）
  - [x] SubTask 4.7: 实现 `run()` 导出函数：清空历史状态 → 立即启动层（XHR/Fetch 拦截 + Performance API 增量监控）→ DOMContentLoaded 后启动层（MutationObserver + 延时梯度扫描 1s/3s/5s/10s）→ 视频上报采用"先读后写"策略

- [x] Task 5: 创建 madeGetHylinkTitle.ts — 中国制造网标题/链接/商品ID/访问时间提取模块
  - [x] SubTask 5.1: 导入共享 `sleep`（`from '../shared/utils'`），不在模块内定义本地 sleep
  - [x] SubTask 5.2: 实现标题提取（`h1.J-baseInfo-name` 优先 → `h1` → `head title` 回退），等待动态内容（最多 10 次/1000ms）
  - [x] SubTask 5.3: 实现商品 ID 提取（`/product(?:-detail)?\/([^\/]+)\//` 正则匹配）
  - [x] SubTask 5.4: 实现 `cleanMadeProductUrl()` URL 清洗（仅保留 origin + pathname）
  - [x] SubTask 5.5: 实现 `generateVisitTime()` 生成访问时间，格式 `YYYY-MM-DD HH:mm`
  - [x] SubTask 5.6: 实现 `run()` 导出函数：初始空上报 `productTitle`/`productLink`/`productId` → 等待动态内容 → 提取四字段 → `Promise.all` 并行上报 `productTitle`、`productLink`、`productId`、`visitTime`

- [x] Task 6: 创建 index.ts — 中国制造网抓取脚本入口
  - [x] SubTask 6.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 6.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 6.3: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 15s 超时保护），保存各模块返回的清理函数
  - [x] SubTask 6.4: 实现登录探针检测（使用通用登录选择器）
  - [x] SubTask 6.5: 实现 `CAPTCHA_SELECTORS` 留空数组（中国制造网无已知验证码场景），`setupCaptchaWatcher()` 自动跳过
  - [x] SubTask 6.6: 实现 `waitForCompletion()` 数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成），判定完成后调用各模块清理函数
  - [x] SubTask 6.7: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 7: 注册 made-in-china 到构建脚本
  - [x] SubTask 7.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `'made-in-china'` 入口

- [x] Task 8: 构建验证
  - [x] SubTask 8.1: 运行 `node scripts/build-scraper.mjs` 确认 `made-in-china.bundle.js` 生成成功

# Task Dependencies
- Task 1 ~ 5: 可并行开发（各模块独立）
- Task 6: 依赖 Task 1 ~ 5（入口文件导入各模块）
- Task 7: 依赖 Task 6（构建脚本需入口文件存在）
- Task 8: 依赖 Task 7（最终验证）
