# Tasks

- [x] Task 1: 创建 pddGetMain.ts — 拼多多主图提取模块
  - [x] 遵循开发指南 §4.3 GetMain 模板：`run()` 导出 async 函数，初始化空值 → 重试等待 → 额外抓取 → 上报
  - [x] 实现 rawData 注入脚本（`document.createElement('script')` → MAIN world → `pdd_main_raw_data` CustomEvent 回传）
  - [x] 实现 SSR 数据提取（`#__cava_ssr_data__` → `__CAVA_INIT_DATA__` → imageUrl + goodsCarouselInfos）
  - [x] 实现 DOM 扫描（`.QFNLpbqP`、`.mui-mobile-swipe-child` 容器内 img）
  - [x] 实现 URL 清洗（`split('?')[0]`、跨 CDN 子域名 pathname 去重、rawData 优先合并）
  - [x] 实现重试机制（1s 间隔，最多 20 次）和额外抓取（3 次，500ms 间隔）
  - [x] 通过 `tauriBridge.send('MainPic', urls)` 上报
  - [x] 移除插件特有逻辑：defineContentScript、browser.runtime、SPA 导航检测、页面可见性、不活动超时、状态保存/恢复、MainPicAll

- [x] Task 2: 创建 pddGetSku.ts — 拼多多 SKU 图提取模块
  - [x] 遵循开发指南 §4.3 GetSku 模板：首次扫描 → MutationObserver 持续监听 → 轮询兜底
  - [x] 实现 rawData 提取（注入脚本 + `pdd_sku_raw_data` CustomEvent → skus[].thumbUrl）
  - [x] 实现 CAVA SSR 数据提取
  - [x] 实现 DOM 容器扫描（`.xkr85Q1j`、`.beast-mobile-drawer-content`、`div[role="dialog"]`、`.IuvVTIp4`）
  - [x] 实现独立选择器（`img[aria-label="点击查看大图"]`）
  - [x] 实现 URL 清洗（占位符过滤正则、`/mms-goods-image/` 白名单、跨 CDN 去重、rawData 优先）
  - [x] 实现 MutationObserver 监听 SKU 图片 src 变化（防抖 300ms）
  - [x] 实现轮询兜底（10 次，3s 间隔，有图即停）
  - [x] 通过 `tauriBridge.send('SkuPic', urls)` 上报
  - [x] 移除插件特有逻辑：同 Task 1

- [x] Task 3: 创建 pddGetDetail.ts — 拼多多详情图提取模块
  - [x] 遵循开发指南 §4.3 GetDetail 模板：等待容器 → 多轮提取 → 上报
  - [x] 实现 rawData 提取（注入脚本 + `pdd_detail_raw_data` CustomEvent → detailGallery[].url）
  - [x] 实现 CAVA SSR 数据提取
  - [x] 实现 DOM 容器扫描（5 个选择器 + aria-label 降级）
  - [x] 实现 img 标签提取（data-bimg-src > data-src > src 优先级）
  - [x] 实现 CSS 背景图提取（getComputedStyle → backgroundImage → url() 解析）
  - [x] 实现 URL 清洗和路径级去重（优先保留 img.pddpic.com 版本）
  - [x] 实现 MutationObserver 监听详情容器 DOM 变化（防抖 300ms）
  - [x] 实现多轮提取（3 轮，2s 间隔）捕获懒加载图片
  - [x] 通过 `tauriBridge.send('DetailPic', urls)` 上报
  - [x] 移除插件特有逻辑：同 Task 1

- [x] Task 4: 创建 pddGetVideo.ts — 拼多多视频提取模块
  - [x] 遵循开发指南 §4.3 GetVideo 模板：立即启动 → 持续监听（导出 `run(): void`，不返回 Promise）
  - [x] 实现 XHR/Fetch 拦截（对齐 tbGetVideo.ts 的 interceptXHR/interceptFetch 模式）
  - [x] 实现 Performance API 监控（requestAnimationFrame 循环）
  - [x] 实现 MutationObserver 监听 video 元素
  - [x] 实现 Script 标签 JSON 数据提取
  - [x] 实现视频分类（main/detail）
  - [x] 实现去重（URL 级 + 归一化 ID 级）
  - [x] 通过 `tauriBridge.send('VideoUrls', [{url, type, timestamp, pageUrl}])` 上报
  - [x] 移除插件特有逻辑：同 Task 1 + 导航屏蔽期（isNavigating）、存储队列、防抖保存

- [x] Task 5: 创建 pddGetHylinkTitle.ts — 拼多多标题/链接/商品ID提取模块
  - [x] 遵循开发指南 §4.3 GetHylinkTitle 模板：初始化空值 → 等待动态内容 → 提取上报
  - [x] 实现标题提取（5 级选择器优先级 + document.title 兜底）
  - [x] 实现带重试的标题获取（500ms 间隔，最多 10 次，区分真实标题与兜底标题）
  - [x] 实现商品 ID 提取（URL 参数 goods_id/goodsId）
  - [x] 实现商品链接清洗（重构为 `https://mobile.yangkeduo.com/goods.html?goods_id={id}`）
  - [x] 通过 `tauriBridge.send` 上报 productTitle、productLink、productId
  - [x] 移除插件特有逻辑：同 Task 1 + productLinkAll 历史记录

- [x] Task 6: 创建 index.ts — 拼多多抓取脚本入口
  - [x] 遵循开发指南 §3 平台入口标准模板，严格对齐 taobao/index.ts 和 jd/index.ts 的实现模式
  - [x] 实现模块导入和编排（Video 立即执行，其余 DOMContentLoaded 后并行执行）
  - [x] 实现 iframe 防护（`window !== window.top` 检查）
  - [x] 实现登录检测（`probeAndReportLogin` + PDD 登录选择器）
  - [x] 实现验证码检测（`CAPTCHA_SELECTORS` 设为空数组 + `setupCaptchaWatcher`）
  - [x] 实现数据驱动完成判定（`waitForCompletion` + `tauriBridge.resetUploadedDataFlag`）
  - [x] 实现模块超时保护（`withTimeout`，15s）
  - [x] 实现异常处理（有数据 `completeTask`，无数据 `failTask`）
  - [x] 实现 `simulateScroll()` 触发懒加载

- [x] Task 7: 更新 build-scraper.mjs — 注册 pdd 平台构建入口
  - [x] 在 PLATFORMS 对象中添加 `pdd: resolve(projectRoot, 'scraper-scripts/pdd/index.ts')`

# Task Dependencies
- [Task 6] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]（入口需要导入所有模块）
- [Task 7] depends on [Task 6]（构建脚本需要入口文件存在）
- [Task 1, Task 2, Task 3, Task 4, Task 5] 可并行开发
