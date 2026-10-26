# Tasks

- [x] Task 1: 创建 wfGetMain.ts — Wayfair 主图提取模块
  - [x] SubTask 1.1: 实现 3 策略并行提取（ProductDetailImageCarousel / MediaTray / WaymoreModulesContainer）
  - [x] SubTask 1.2: 实现 extractBestUrlFromImg（srcset 最大尺寸解析 + MIN_WIDTH_THRESHOLD=400 过滤）
  - [x] SubTask 1.3: 实现 URL 清洗（去查询参数、过滤 .svg、黑名单 URL、去重）
  - [x] SubTask 1.4: 实现 MAX_RETRIES 轮询等待 + EXTRA_FETCHES 增量抓取
  - [x] SubTask 1.5: 通过 tauriBridge.send('MainPic', urls) 上报

- [x] Task 2: 创建 wfGetDetail.ts — Wayfair 详情图提取模块
  - [x] SubTask 2.1: 实现 4 选择器优先级提取（highlights / BlockBuilderHighlights / modules-container / WaymoreModulesContainer）
  - [x] SubTask 2.2: 实现 FluidImage + Image + ImageComponent 选择器收集
  - [x] SubTask 2.3: 实现视频封面图（video[poster]）提取
  - [x] SubTask 2.4: 实现 isValidDetailImageUrl（仅保留 assets.wfcdn.com 域名图片）
  - [x] SubTask 2.5: 实现 getBestUrlFromSrcset（srcset 最后一个 = 最大尺寸）
  - [x] SubTask 2.6: 实现 MAX_RETRIES 轮询 + EXTRACTION_PASSES 多轮提取
  - [x] SubTask 2.7: 通过 tauriBridge.send('DetailPic', urls) 上报

- [x] Task 3: 创建 wfGetSku.ts — Wayfair SKU 图提取模块
  - [x] SubTask 3.1: 实现全量 img 标签 srcset 扫描
  - [x] SubTask 3.2: 实现 parseSrcsetCandidates + parseWidthDescriptor（宽度描述符解析）
  - [x] SubTask 3.3: 实现 MIN_WIDTH_THRESHOLD=700 过滤 + 按宽度降序取最大
  - [x] SubTask 3.4: 实现 URL 清洗（去查询参数、去重）
  - [x] SubTask 3.5: 实现 MutationObserver + 轮询兜底
  - [x] SubTask 3.6: 通过 tauriBridge.send('SkuPic', urls) 上报

- [x] Task 4: 创建 wfGetVideo.ts — Wayfair 视频提取模块
  - [x] SubTask 4.1: 实现 __NEXT_DATA__ JSON 解析（videoMap / videos 数组 / hero 对象 + 递归搜索）
  - [x] SubTask 4.2: 实现 DOM video 元素 + source 子元素提取
  - [x] SubTask 4.3: 实现 XHR/Fetch 拦截（检测视频 URL + JSON 响应递归搜索）
  - [x] SubTask 4.4: 实现 Performance API 监控（requestAnimationFrame 循环）
  - [x] SubTask 4.5: 实现 MutationObserver 监听动态插入的 video 标签
  - [x] SubTask 4.6: 实现视频去重（normalizeVideoUrl 规范化 + normalizedVideoIds Set）
  - [x] SubTask 4.7: 通过 tauriBridge.send('VideoUrls', videos) 上报

- [x] Task 5: 创建 wfGetHylinkTitle.ts — Wayfair 标题/链接/商品ID 提取模块
  - [x] SubTask 5.1: 实现 waitForTitle（等待 document.title 有效内容，最多 10s）
  - [x] SubTask 5.2: 实现商品 ID 提取（piid 参数优先 → -w{sku}.html 降级）
  - [x] SubTask 5.3: 实现干净链接生成（origin + pathname，去查询参数）
  - [x] SubTask 5.4: 通过 tauriBridge.send 上报 productTitle / productLink / productId / visitTime

- [x] Task 6: 创建 index.ts — Wayfair 入口编排
  - [x] SubTask 6.1: 实现 iframe 防护（window !== window.top 则退出）
  - [x] SubTask 6.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 6.3: 实现登录检测（probeAndReportLogin + Wayfair 登录选择器）
  - [x] SubTask 6.4: 实现模拟滚动（simulateScroll）
  - [x] SubTask 6.5: 实现验证码监控（MutationObserver + captcha-detected/resolved 事件）
  - [x] SubTask 6.6: 实现模块后台并行启动 + 数据静默完成判定（waitForCompletion）
  - [x] SubTask 6.7: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 7: 注册构建配置 — build-scraper.mjs
  - [x] SubTask 7.1: 在 PLATFORMS 对象中添加 wayfair 入口

# Task Dependencies
- [Task 1] [Task 2] [Task 3] [Task 4] [Task 5] 可并行开发（无相互依赖）
- [Task 6] 依赖 [Task 1-5] 全部完成（index.ts 需要导入各模块的 run 函数）
- [Task 7] 依赖 [Task 6] 完成（构建入口需要 index.ts 存在）
