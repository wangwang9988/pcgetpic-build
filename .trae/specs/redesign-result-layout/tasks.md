# Tasks

- [x] Task 1: 修复 Rust 后端 submit_tasks 任务 ID 断裂
  - [x] 子任务 1.1：修改 `lib.rs` 中 `submit_tasks` 参数从 `urls: Vec<String>` 改为 `tasks: Vec<Task>`，直接使用前端传入的 Task.id
  - [x] 子任务 1.2：删除 `rand_suffix()` 辅助函数（不再需要）
  - [x] 子任务 1.3：在 `do_dispatch` 阶段 2 注入 bundle 前，先通过 `wv.eval` 设置 `window.__WORKER_TASK_ID__`
  - [x] 子任务 1.4：修复 `scrape-data` 事件监听：从 payload 中提取真实 `task_id`，不再将 `data.key` 误作 taskId
  - [x] 子任务 1.5：`ipc.rs` 中 `ScrapeEventData` 增加 `task_id: Option<String>` 字段（带 `#[serde(alias = "taskId")]`）

- [x] Task 2: 修复 tauri-bridge.ts 数据归属
  - [x] 子任务 2.1：`send()` 方法读取 `window.__WORKER_TASK_ID__` 全局变量
  - [x] 子任务 2.2：在 emit `scrape-data` 事件时附加 `taskId` 字段到 payload

- [x] Task 3: 修复前端 ControlBar 任务提交
  - [x] 子任务 3.1：`startCurrentPlatform` 改为传递完整 Task 结构 `{ id, url, platform }`
  - [x] 子任务 3.2：`startAllPlatforms` 同理改为传递完整 Task 结构
  - [x] 子任务 3.3：调用 `invoke('submit_tasks', { tasks })` 替代 `{ urls }`

- [x] Task 4: 修复 useIpcListener 数据写入
  - [x] 子任务 4.1：`scrape-data` 事件处理中解构真实 `taskId`（从 payload 或 data 字段）
  - [x] 子任务 4.2：使用解构出的 `taskId` 调用 `resultStore.updateResult(taskId, key, value)`，不再依赖全局 `currentTaskId`
  - [x] 子任务 4.3：移除对 `currentTaskId` 的依赖（保留 `setCurrentTask` 但仅作辅助用途）

- [x] Task 5: 重构 App.vue 内容区布局
  - [x] 子任务 5.1：移除 content-top / content-bottom 分屏布局
  - [x] 子任务 5.2：WorkerTabs 保留在上方但高度紧凑（max-height: 140px），下方 ResultPreview 占满剩余空间
  - [x] 子任务 5.3：整体右侧设为 `overflow-y: auto` 可滚动

- [x] Task 6: 重构 ResultPreview.vue
  - [x] 子任务 6.1：移除 NTabs 及 Tab 切换逻辑
  - [x] 子任务 6.2：使用 `allResults` 遍历所有抓取结果（替代 `currentResult`）
  - [x] 子任务 6.3：使用 NCollapse + NCollapseItem（手风琴模式）渲染每个链接的结果面板
  - [x] 子任务 6.4：面板标题格式："链接N: [商品标题]" + 资源数量统计 Tag
  - [x] 子任务 6.5：面板内按 主图→SKU→详情图→视频 顺序排列，复用 ImageDisplay 和 VideoDisplay
  - [x] 子任务 6.6：空资源区块不渲染
  - [x] 子任务 6.7：无抓取结果时显示空状态提示

- [x] Task 7: 构建验证
  - [x] 子任务 7.1：`npm run build:scraper` ✅ 通过
  - [x] 子任务 7.2：`npm run build`（vue-tsc + vite build）✅ 通过
  - [x] 子任务 7.3：`cargo build` ✅ 通过
  - [ ] 子任务 7.4：使用用户提供的 5 个天猫链接进行手动功能验证（需启动 Tauri 桌面应用）
  - [ ] 子任务 7.5：验证多链接并发抓取正确、数据不混淆、各链接面板展开折叠正常（需启动应用）