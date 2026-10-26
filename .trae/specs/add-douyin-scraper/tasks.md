# Tasks

- [x] Task 1: 创建 dyUtils.ts — 抖音平台共享工具函数
  - [x] SubTask 1.1: 实现 `cleanDouyinImageUrl()` URL 清洗函数（`//` 前缀补全 `https:`，trim 处理）
  - [x] SubTask 1.2: 实现 `isValidDouyinImageUrl()` 域名验证函数（仅接受 ecombdimg.com/douyinpic.com/douyincdn.com/byteimg.com/bytedance.com，过滤 `data:` 开头的 Base64）
  - [x] SubTask 1.3: 实现 `getOriginalDouyinImageUrl()` 原图还原函数（`resize:\d+:\d+` → `resize:0:0`）
  - [x] SubTask 1.4: 导出抖音 CDN 域名常量数组 `DOUYIN_IMAGE_DOMAINS`

- [x] Task 2: 创建 dyGetMain.ts — 抖音主图提取模块
  - [x] SubTask 2.1: 实现 `extractFromImgTags()` 渠道A：从 Swiper 轮播图 img 标签提取（`.swiper-slide:not(.swiper-slide-duplicate) img` 等 6 个选择器），过滤 Base64 图片
  - [x] SubTask 2.2: 实现 `extractFromBackgroundImage()` 渠道B：从 CSS background-image 样式提取（处理 HTML 实体 `&quot;` → `"`，正则匹配 `url(...)`）
  - [x] SubTask 2.3: 实现 `run()` 导出函数：整合双渠道提取，使用共享 `sleep`/`deduplicateUrls`，带重试（MAX_RETRIES=20, RETRY_INTERVAL=1000ms）和额外抓取（MAX_EXTRA_FETCHES=3），`tauriBridge.send('MainPic', ...)` 上报

- [x] Task 3: 创建 dyGetSku.ts — 抖音 SKU 图提取模块
  - [x] SubTask 3.1: 实现 DOM 选择器提取（`.qZmIVPuL img`、`.b2x7cxK3 img`、`.nEYyfGLh`、`.mZgYczJr`、`[data-bytereplay-mask] img`）
  - [x] SubTask 3.2: 实现 SKU 图尺寸过滤（通过 `resize:300` 区分 SKU 图和主图）
  - [x] SubTask 3.3: 实现商品弹窗检测（弹窗存在但无 SKU 图时清空旧数据）
  - [x] SubTask 3.4: 实现精确监听目标容器 + 属性变化监听（`src`/`data-src`/`data-original`），而非 `document.body` 全局监听
  - [x] SubTask 3.5: 实现 `run()` 导出函数：DOM 提取 → 尺寸过滤 → 原图还原（使用 `dyUtils.getOriginalDouyinImageUrl()`）→ 去重 → `tauriBridge.send('SkuPic', ...)` 上报，返回清理函数（同时清理 Observer 和 pollTimer）

- [x] Task 4: 创建 dyGetDetail.ts — 抖音详情图提取模块
  - [x] SubTask 4.1: 实现详情图选择器列表（`.partial-detail-wrapper img`、`.product-big-img-list img`、`.gallery-component img`、`.NGeinxLS img`、`.eG19UsAr img`、`.ZW0NMRQy img`、`.jEqmQYXZ img`、`.qZmIVPuL img`）
  - [x] SubTask 4.2: 实现 `getImageUrlFromElement()` 多属性提取（`src`/`data-src`/`data-original`/`currentSrc`）
  - [x] SubTask 4.3: 实现商品弹窗检测（弹窗存在但无详情图时清空旧数据）
  - [x] SubTask 4.4: 实现 `run()` 导出函数：容器查找（MAX_CONTAINER_RETRIES=5）→ 多属性提取 → 原图还原（使用 `dyUtils.getOriginalDouyinImageUrl()`）→ 去重 → `tauriBridge.send('DetailPic', ...)` 上报

- [x] Task 5: 创建 dyGetVideo.ts — 抖音视频提取模块
  - [x] SubTask 5.1: 实现视频 URL 去重机制（`normalizeVideoUrl` + `isVideoDuplicate`）
  - [x] SubTask 5.2: 实现抖音视频分类与过滤（直播流域名过滤 douyinliving.com、黑名单关键词过滤、mime_type 参数检测）
  - [x] SubTask 5.3: 实现 XHR/Fetch 拦截 + JSON 响应体递归搜索
  - [x] SubTask 5.4: 实现 Performance API 增量监控（游标增量检测 + requestAnimationFrame 持续轮询）+ MutationObserver 动态监听
  - [x] SubTask 5.5: 实现 `__INITIAL_STATE__` 数据提取（`c.shop.videourl`、`c.shop.videoFaceUrl` 字段，含 `\u002F` 转义解码）
  - [x] SubTask 5.6: 实现 `extractVideosFromDOM()` DOM 视频标签检测（过滤过小/过短视频）
  - [x] SubTask 5.7: 实现 `run()` 导出函数：初始化 → 拦截注册 → DOM 检测 → 延时梯度扫描（1s/3s/5s/10s）

- [x] Task 6: 创建 dyGetHylinkTitle.ts — 抖音标题/链接/商品ID/访问时间 提取模块
  - [x] SubTask 6.1: 实现标题提取（`.title-info .title-info__text` 优先 → `.vs9hmvGz[title]` → `.lEOkRg32[title]` → `[data-e2e="promotion-title"]` → `head title` 回退）
  - [x] SubTask 6.2: 实现 `extractProductId()` 商品 ID 提取（URL 参数 `id`/`product_id`/`promotion_id` → 路径匹配 `live.douyin.com/{id}`/`/follow/live/{id}`/`/live/{id}`）
  - [x] SubTask 6.3: 实现 `cleanProductUrl()` 商品链接清洗（移除查询参数和 Hash，保留 `origin + pathname`）
  - [x] SubTask 6.4: 实现 `generateVisitTime()` 访问时间生成（`YYYY-MM-DD HH:mm` 格式）
  - [x] SubTask 6.5: 实现 `run()` 导出函数：等待动态内容 → 提取 → `tauriBridge.send` 上报全部四个字段 `productTitle`/`productLink`/`productId`/`visitTime`

- [x] Task 7: 创建 index.ts — 抖音抓取脚本入口
  - [x] SubTask 7.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 7.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 7.3: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 超时保护）
  - [x] SubTask 7.4: 实现登录探针检测（`DOUYIN_LOGIN_SELECTORS`：`.login-panel`、`.qrcode-login`、`.scan-login`、`.login-switch`、`.mod-login`）
  - [x] SubTask 7.5: 实现验证码检测（`CAPTCHA_SELECTORS`：`#captcha_container`、`.captcha-verify-container`、`#captcha-verify-image`，节流上限 3 次）
  - [x] SubTask 7.6: 实现 `waitTaskCompletion()` 数据静默判定（复用 `waitForCompletion`）
  - [x] SubTask 7.7: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 8: 注册 douyin 到构建脚本
  - [x] SubTask 8.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `douyin` 入口

- [x] Task 9: 实现抖音登录策略
  - [x] SubTask 9.1: 创建 `src-tauri/src/login/douyin.rs`，实现 `DouyinLoginStrategy`（参考 `taobao.rs` 模式，自定义实现因为需要 `extract_product_id`）
  - [x] SubTask 9.2: 实现登录页检测（`login.douyin.com`、`sso.douyin.com` → `LoginRequired`）
  - [x] SubTask 9.3: 实现 `extract_product_id()`（URL 参数 `id`/`product_id`/`promotion_id` + 路径 `/live/{id}`）
  - [x] SubTask 9.4: 实现 `is_still_on_platform_non_product()`（`douyin.com`/`jinritemai.com`/`snssdk.com` 域名下但非商品页）
  - [x] SubTask 9.5: 实现 `captcha_selectors()`（`#captcha_container`、`.captcha-verify-container`、`#captcha-verify-image`）
  - [x] SubTask 9.6: 在 `src-tauri/src/login/mod.rs` 中注册 `douyin::DouyinLoginStrategy`

- [x] Task 10: 构建验证
  - [x] SubTask 10.1: 运行 `node scripts/build-scraper.mjs` 确认 `douyin.bundle.js` 生成成功
  - [x] SubTask 10.2: 运行 `cargo check` 确认 Rust 编译通过

# Task Dependencies
- Task 1: 独立（dyUtils.ts 无外部依赖）
- Task 2 ~ 4: 依赖 Task 1（Main/SKU/Detail 模块使用 dyUtils）
- Task 5 ~ 6: 独立于 Task 1 ~ 4（Video 和 HylinkTitle 不使用 dyUtils）
- Task 7: 依赖 Task 2 ~ 6（入口文件导入各模块）
- Task 8: 依赖 Task 7（构建脚本需入口文件存在）
- Task 9: 独立于 Task 1 ~ 8，可并行开发
- Task 10: 依赖 Task 8 和 Task 9（最终验证）
