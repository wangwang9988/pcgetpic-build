# Tasks

- [x] Task 1: 创建 `scraper-scripts/xz/xzUtils.ts` 共享工具模块
  - [x] 实现 `cleanXzImageUrl()`：补全 `//` 协议头、移除查询参数、剥离 `_800x800.jpg` / `_sum.jpg` 等尺寸后缀、截断到图片扩展名
  - [x] 实现 `isUrlBlacklisted()`：过滤 `assets.571xz.com`、`/gonziyu/`、`play-icon`、`loading.gif`、`/resource/img/` 等非商品资源
  - [x] 实现 `extractBestUrlFromImg()`：`data-src` > `data-original` > `src` 属性优先级，结合清洗和黑名单
  - [x] 实现 `extractUrlFromImg()`：`data-src` > `data-lazyload-src` > `src`，适用于详情图懒加载场景
  - [x] 实现 `deduplicateXzUrls()`：基于清洗后 URL 的 Set 去重
  - [x] 导出黑名单常量 `URL_BLACKLIST`、`DETAIL_URL_BLACKLIST`、`SKU_URL_BLACKLIST`

- [x] Task 2: 创建 `scraper-scripts/xz/xzGetMain.ts` 主图提取模块
  - [x] 实现多容器选择器扫描：`.magnifier-box img`、`.photoAlbum-booth-big img`、`.photoAlbum-thumb-content li img`、`.swiper-slide img`、`.photoAlbum-video img`、`.product-img img`、`#J_UlThumb img`
  - [x] 使用 `extractBestUrlFromImg` 提取图片 URL
  - [x] 遵循 GetMain 标准流程：初始空上报 `MainPic: []` → 循环重试（20 次 × 500ms）→ 额外抓取（3 轮 × 500ms）→ 最终上报
  - [x] 使用 `import { sleep, deduplicateUrls } from '../shared/utils'`，禁止本地定义 sleep
  - [x] 通过 `tauriBridge.send('MainPic', images)` 上报数据

- [x] Task 3: 创建 `scraper-scripts/xz/xzGetDetail.ts` 详情图提取模块
  - [x] 实现多容器选择器扫描：`.itemInnerWrap-img img`、`.itemInnerWrap1 img`、`.ant-tabs-tabpane-active img`、`.product-detail img`、`.rich-text-component img`、`#productDetail img`
  - [x] 支持 `data-lazyload-src` 懒加载属性
  - [x] 初始延迟 1 秒等待详情图区域渲染
  - [x] 遵循 GetDetail 标准流程：初始空上报 → 重试等待容器（20 次 × 500ms）→ 多轮提取（3 轮 × 2s）→ 最终上报
  - [x] 使用 `import { sleep } from '../shared/utils'`，禁止本地定义 sleep
  - [x] 通过 `tauriBridge.send('DetailPic', urls)` 上报数据

- [x] Task 4: 创建 `scraper-scripts/xz/xzGetSku.ts` SKU 图提取模块
  - [x] 实现专用 SKU 选择器：`.specSku .item-color-img ul li img`、`.item-color ul li img`
  - [x] 实现通用 SKU 选择器：`.sku-item img`、`.color-item img`、`.size-item img`
  - [x] 实现属性匹配选择器：`[class*="specification"] img`、`[class*="sku"] img`、`[class*="color"] li img`
  - [x] 使用 `SKU_URL_BLACKLIST` 过滤 `/resource/img/` 目录
  - [x] 遵循 GetSku 标准流程：初始空上报 → 首轮扫描 → MutationObserver 精确监听 → 轮询兜底
  - [x] MutationObserver 精确监听目标 SKU 容器（而非 document.body），监听 `childList` + `subtree` + `attributes`（`src`、`data-src`、`data-original`）
  - [x] **必须返回清理函数**，同时清理 `observer.disconnect()` 和 `clearInterval(pollTimer)`
  - [x] 使用 `import { sleep, cleanImageUrl, extractImageKey } from '../shared/utils'`

- [x] Task 5: 创建 `scraper-scripts/xz/xzGetVideo.ts` 视频提取模块
  - [x] 实现 XHR/Fetch 拦截，解析 JSON 响应中的视频 URL
  - [x] 实现 DOM `<video>` 标签 + `<source>` 子元素 + `data-video-url`/`data-video`/`data-src` 属性检测
  - [x] 实现 `<script>` 标签 JSON 提取 + 递归查找视频 URL
  - [x] 实现 `window.__INITIAL_STATE__` 全局变量提取，含 `c.shop.videourl` 和 `videoFaceUrl` 字段，含 `\u002F` 等转义字符解码
  - [x] 实现 Performance API 增量监控（游标记录已扫描位置），使用 `requestAnimationFrame` 持续轮询
  - [x] 实现 MutationObserver 监听新增 `<video>` 和 `<script>` 元素
  - [x] 视频去重：URL 精确匹配 + 归一化 ID 去重
  - [x] 所有视频统一归类为 `main` 类型
  - [x] 通过 `tauriBridge.send('VideoUrls', videos)` 上报数据，采用"先读后写"策略

- [x] Task 6: 创建 `scraper-scripts/xz/xzGetHylinkTitle.ts` 标题/链接提取模块
  - [x] 实现标题提取：首选 `.i-d-c-title h3` 纯文本节点（排除子元素），备选 `.item-detail-right .title`、`.goods-title`、`.item-title`、`.product-title`、`.goods-name`
  - [x] 实现商品 ID 提取：从 URL 匹配 `/item/{id}` 格式
  - [x] 实现链接清理：保留 `/item/{id}` 格式的干净链接
  - [x] 降级到 `document.title` 时移除 `-571xz`、`-优批网` 等站点后缀
  - [x] **必须输出全部四个字段**：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）
  - [x] 使用 `import { sleep } from '../shared/utils'`

- [x] Task 7: 创建 `scraper-scripts/xz/index.ts` 入口编排模块
  - [x] 严格遵循开发指南标准模板结构
  - [x] iframe 防护：`if (window !== window.top) return;`
  - [x] 立即启动视频拦截模块（document_start 时序）
  - [x] DOMContentLoaded 后：先 `probeAndReportLogin()` → `simulateScroll()` + `setupCaptchaWatcher()` + 四个模块后台并行
  - [x] 配置 `LOGIN_SELECTORS`（四季星座登录选择器）和 `CAPTCHA_SELECTORS`（空数组，暂无已知验证码）
  - [x] 数据驱动完成判定：`waitForCompletion()` + `tauriBridge.completeTask()`
  - [x] 模块超时保护：`withTimeout` 单模块 15s
  - [x] 异常处理：有数据时 completeTask，无数据时 failTask

- [x] Task 8: 修改 `scripts/build-scraper.mjs`，注册 xz 平台入口
  - [x] 在 `PLATFORMS` 对象中添加 `xz: resolve(projectRoot, 'scraper-scripts/xz/index.ts')`

- [x] Task 9: 修改 `src-tauri/src/login/mod.rs`，注册四季星座登录策略
  - [x] 在 `LoginStrategyRegistry::new()` 中添加 `DefaultLoginStrategy::new("xz", &["login.571xz.com", "login.sjxz.cc"], &[])`

- [x] Task 10: 构建验证
  - [x] 运行 `node scripts/build-scraper.mjs`，确认 `dist-scripts/xz.bundle.js` 生成成功
  - [x] 检查 Rust 编译是否通过

# Task Dependencies
- [Task 2] depends on [Task 1] (xzGetMain 使用 xzUtils)
- [Task 3] depends on [Task 1] (xzGetDetail 使用 xzUtils)
- [Task 4] depends on [Task 1] (xzGetSku 使用 xzUtils)
- [Task 5] depends on [Task 1] (xzGetVideo 使用 xzUtils 的清洗函数)
- [Task 6] depends on [Task 1] (xzGetHylinkTitle 使用 xzUtils 的 URL 清洗)
- [Task 7] depends on [Task 2, 3, 4, 5, 6] (index 编排所有子模块)
- [Task 8] depends on [Task 7] (构建脚本需要入口文件存在)
- [Task 10] depends on [Task 8, 9] (验证需要构建和 Rust 编译都通过)
- [Task 9] 无依赖，可并行
