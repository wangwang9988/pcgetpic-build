# 前端结果展示区重新设计 & 多链接并发修复 Spec

## Why
1. **多链接并发Bug**: 前端与 Rust 后端使用不同的 task ID 生成策略，导致并发任务状态同步断裂（task-assigned/task-complete 事件因 ID 不匹配被丢弃），任务永远停留在 `pending` 状态。同时 `scrape-data` 事件缺少真实 taskId，数据无法正确归属。
2. **前端展示问题**: 当前仅展示单个商品结果且通过 Tab 切换分类，用户输入大量链接时需要在一页内同时看到所有链接的全部资源。

## What Changes

### Part 1: 多链接并发 Bug 修复（底层数据流修复）

- **lib.rs**: `submit_tasks` 接口参数从 `urls: Vec<String>` 改为 `tasks: Vec<Task>`，直接使用前端传入的 task ID。在 WebView 创建后注入 `window.__WORKER_TASK_ID__`。修复 `scrape-data` 事件监听中 task_id 错误地将 `data.key` 当作 taskId 的问题。
- **ipc.rs**: `ScrapeEventData` 增加 `task_id: Option<String>` 字段
- **tauri-bridge.ts**: `send()` 方法读取 `window.__WORKER_TASK_ID__` 并附加到事件 payload
- **ControlBar.vue**: `startCurrentPlatform` / `startAllPlatforms` 传递完整 Task 结构（含 id、url、platform）
- **useIpcListener.ts**: 从事件中解构真实 `taskId`，直接写入对应任务的结果，不再依赖全局 `currentTaskId`

### Part 2: 前端结果展示重新设计

- **App.vue**: 右侧内容区从上下分屏改为统一可滚动区域
- **ResultPreview.vue**: 移除 NTabs，使用 NCollapse 手风琴模式展示所有 `allResults`，每个链接一个折叠面板，面板内按 主图→SKU→详情图→视频 垂直排列
- 每个折叠面板标题显示 "链接N: 商品标题"

### Part 3: 多 Worker 并发数据隔离

- lib.rs 在注入 bundle 前执行 `wv.eval(&format!("window.__WORKER_TASK_ID__ = '{}';", task_id))`
- tauri-bridge.ts 的 `send()` 读取 `window.__WORKER_TASK_ID__`，确保不同 Worker 的抓取数据正确归属

## Impact
- Affected specs: 无
- Affected code:
  - `src-tauri/src/lib.rs` — submit_tasks 接口变更 + __WORKER_TASK_ID__ 注入 + scrape-data 修复
  - `src-tauri/src/ipc.rs` — ScrapeEventData 增加 task_id 字段
  - `scraper-scripts/shared/tauri-bridge.ts` — send() 携带 taskId
  - `src/components/ControlBar.vue` — 传递完整 Task 而非 URL 列表
  - `src/composables/useIpcListener.ts` — 使用真实 taskId 写入结果
  - `src/App.vue` — 布局调整
  - `src/components/ResultPreview.vue` — 核心重构

## ADDED Requirements

### Requirement: 前后端任务 ID 统一
系统 SHALL 确保前端生成的任务 ID 贯穿整个抓取生命周期，Rust 后端不重新生成 ID。

#### Scenario: 提交任务时 ID 保持一致
- **WHEN** 用户点击"开始抓取"提交多个链接
- **THEN** Rust 后端使用前端传入的 Task.id，`task-assigned`/`task-complete` 等事件携带的 task_id 与前端任务列表中的 ID 一致

#### Scenario: 前端正确接收任务状态更新
- **WHEN** Rust 后端发出 `task-assigned` 事件
- **THEN** 前端能通过 task_id 匹配到对应任务并更新其状态为 `running`

### Requirement: 抓取脚本数据携带任务 ID 归属
系统 SHALL 确保注入到 WebView 的抓取脚本发送的数据附带正确的 task_id，实现多 Worker 并发时的数据隔离。

#### Scenario: 两个 Worker 并发抓取时数据不混淆
- **WHEN** Worker 1 抓取链接A，Worker 2 同时抓取链接B
- **THEN** 链接A的主图数据写入 taskA 的结果，链接B的主图数据写入 taskB 的结果

### Requirement: 多链接垂直堆叠展示
系统 SHALL 在右侧内容区以垂直滚动方式展示所有已抓取链接的结果，每个链接使用折叠面板展示。

#### Scenario: 多个链接同时展示
- **WHEN** 用户通过 LinkInput 添加了 5 个商品链接并完成抓取
- **THEN** 右侧内容区显示 5 个折叠面板，每个面板标题为"链接N: 商品标题"

#### Scenario: 手风琴模式
- **WHEN** 用户展开某个链接的面板查看图片
- **THEN** 其他已展开的面板自动折叠（手风琴模式），避免大量图片同时渲染导致卡顿

### Requirement: 四类资源垂直区块排列
每个链接的面板内 SHALL 按 主图 → SKU图 → 详情图 → 视频 顺序垂直排列四个资源区块。

#### Scenario: 某类资源为空
- **WHEN** 某链接未抓取到视频
- **THEN** 该链接面板内不显示视频区块

### Requirement: 内容区布局调整
App.vue 右侧 SHALL 从上下分屏改为统一可滚动区域。

## REMOVED Requirements
- ResultPreview 中的 Tab 切换逻辑（NTabs 移除）
- 全局 currentTaskId 依赖（各任务独立寻址）