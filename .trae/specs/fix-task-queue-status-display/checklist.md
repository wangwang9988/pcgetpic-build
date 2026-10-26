# 修复任务状态误判与展示误导 - 检查清单 (v3)

- [x] Rust: `src-tauri/src/lib.rs` 看门狗 `Duration::from_secs(35)` 已改为 `Duration::from_secs(60)`
- [x] Rust: 日志/注释中的超时描述已同步更新（注释、println、error 字段均已更新为 60s）
- [x] Scraper: `scraper-scripts/taobao/index.ts` 中 `maxWaitMs` 已从 30000 改为 25000
- [x] Scraper: 其他平台脚本检查完成 — 仅 taobao 存在该逻辑，无需同步
- [x] 前端: `useIpcListener.ts` 中 `case 'task-failed'` 已增加数据检查逻辑
- [x] 前端: 有数据时调用 `taskStore.completeTask`，无数据时才调用 `failTask`
- [x] 前端: 拦截事件时控制台输出 warn 日志
- [x] 前端: `.collapse-header-success` / `.collapse-header-error` 使用 `:deep()` + `!important`
- [x] 前端: `.task-item--completed` / `.task-item--failed` 具有 `!important` + 背景色
- [x] 前端: 成功面板标题显示"✅ 已成功完成 (N)"
- [x] 前端: 失败面板标题显示"❌ 抓取失败 (N)"
- [x] 前端: `finishedTasks` → `settledTasks` 已重命名，无残留引用
- [x] `cargo check` 编译通过
- [x] `vue-tsc --noEmit` 编译通过