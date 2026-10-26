# 修复任务状态误判与展示误导 - 任务列表 (v3)

> **注**: 面板拆分重构（`completed-collapse` + `failed-collapse`）已由同事完成。本任务聚焦根因修复 + CSS 防御 + 前端兜底。

- [x] Task 1: Rust 看门狗超时提升至 60 秒
  - [x] 修改 `src-tauri/src/lib.rs` L387 的 `Duration::from_secs(35)` → `Duration::from_secs(60)`
  - [x] 同步更新日志/注释中的超时描述

- [x] Task 2: Scraper DOM 等待最大时长缩减至 25 秒
  - [x] 修改 `scraper-scripts/taobao/index.ts` L111 的 `maxWaitMs = 30000` → `25000`
  - [x] 同步检查其他平台 scraper（如 jd 等）是否有相同逻辑需修改 — 仅 taobao 平台有该逻辑

- [x] Task 3: 前端 task-failed 兜底检查 — 有数据则转 completed
  - [x] 在 `src/composables/useIpcListener.ts` 的 `case 'task-failed'` 中增加数据检查逻辑
  - [x] 检查 `resultStore.getResult(taskId)` 是否已有有效数据（mainPics/detailPics/skuPics/videoUrls）
  - [x] 有数据时调用 `taskStore.completeTask(taskId)` 代替 `taskStore.failTask`
  - [x] 控制台输出 warn 日志记录拦截事件

- [x] Task 4: CSS 防御加固 + emoji 图标 + 背景色 + 命名优化
  - [x] `TaskQueue.vue` 中 `.collapse-header-success` / `.collapse-header-error` 添加 `!important`
  - [x] 新增 `:deep(.n-collapse-item__header-main)` + `:deep(.n-collapse-item__content-wrapper)` 穿透规则
  - [x] `.task-item--completed` / `.task-item--failed` 添加 `!important` + 背景色
  - [x] 折叠面板标题模板添加 ✅ / ❌ emoji 前缀
  - [x] `.task-url` 添加 `color: inherit`
  - [x] `finishedTasks` → `settledTasks` 重命名

- [x] Task 5: 验证修复效果
  - [x] `cargo check` Rust 编译通过
  - [x] `vue-tsc --noEmit` 前端 TypeScript 编译通过
  - [x] 无残留 `finishedTasks` 引用

# Task Dependencies
- Task 1, 2, 3, 4 可并行执行 ✅
- Task 5 依赖所有前置任务 ✅