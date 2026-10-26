# Tasks

- [x] Task 1: 重写 lazadaGetVideo.ts — 对齐指南 GetVideo 最佳实践
  - [x] SubTask 1.1: Performance API 改为游标增量检测（添加 `checkedResourceCount` 游标变量，`monitorNetworkRequests()` 仅处理新增条目）
  - [x] SubTask 1.2: 新增 `checkVideoElement()` 函数 — 从 `<video>` 元素的 `src`/`currentSrc`/`data-src`/`data-video-url`/`poster`/`<source>` 子元素提取视频 URL，过滤 `blob:`/`data:` 协议
  - [x] SubTask 1.3: 新增 `scanVideoContainers()` 函数 — 通过 CSS 选择器（`.video-player`/`.vjs-tech`/`[class*="video"]`/`[class*="player"]`/`[id*="video"]`/`[id*="player"]`）定位视频容器，提取 `<video>` 元素和 `data-url`/`data-video`/`data-src`/`data-source` 自定义属性
  - [x] SubTask 1.4: 新增 `simulateInteraction()` 函数 — 定位视频容器 → `scrollIntoView` → 延时 500ms 触发 `mouseover` → 延时 100ms 触发 `click`
  - [x] SubTask 1.5: 延时扫描改为梯度 `[1s, 3s, 5s, 10s]`，首次执行 `simulateInteraction()`，每次执行 `extractVideosFromPageJson()` + `checkWindowForVideos()` + `scanVideoContainers()`
  - [x] SubTask 1.6: MutationObserver 回调中对 `<video>` 元素改用 `checkVideoElement()` 替代直接取 `src`/`currentSrc`；添加 `attributes` 监听（`src`/`data-src`/`data-video-url`），属性变化时也触发 `checkVideoElement()`
  - [x] SubTask 1.7: `run()` 返回类型改为 `(() => void) | void`，返回清理函数（断开 MutationObserver、取消 rAF 循环、清除延时定时器）
  - [x] SubTask 1.8: 移除 `extractVideoUrlsFromHTML()` 全量 HTML 正则扫描（由延时梯度+容器扫描替代，更高效）

- [x] Task 2: 简化 lazadaGetSku.ts 轮询逻辑
  - [x] SubTask 2.1: 移除独立的 `pollCounter` 定时器，将 `pollCount` 计数逻辑合并到 `pollTimer` 回调内（`pollCount++` → 超限 `clearInterval` → 有结果 `clearInterval`）
  - [x] SubTask 2.2: 清理函数中移除对 `pollCounter` 的引用，仅清理 `observer` + `pollTimer`

- [x] Task 3: lazadaGetDetail.ts 添加 MutationObserver 持续监听
  - [x] SubTask 3.1: 在 `extractWithRetry()` 完成并上报后，对详情图容器注册 MutationObserver 监听 `childList` + `subtree` + `attributes`（`src`/`data-src`/`data-original`）
  - [x] SubTask 3.2: Observer 回调中检测图片数量增加时重新扫描并增量上报
  - [x] SubTask 3.3: `run()` 返回类型改为 `Promise<(() => void) | void>`，返回清理函数（断开 MutationObserver）

- [x] Task 4: index.ts 添加验证码守卫
  - [x] SubTask 4.1: `setupCaptchaWatcher()` 开头添加 `if (CAPTCHA_SELECTORS.length === 0) return;` 守卫

- [x] Task 5: 构建验证
  - [x] SubTask 5.1: 运行 `node scripts/build-scraper.mjs` 确认 `lazada.bundle.js` 生成成功

# Task Dependencies
- Task 1: 无依赖（独立模块重写）
- Task 2: 无依赖（独立模块简化）
- Task 3: 无依赖（独立模块增强）
- Task 4: 无依赖（入口文件小修改）
- Task 5: 依赖 Task 1 ~ 4（最终验证）
- Task 1 ~ 4 可并行执行
