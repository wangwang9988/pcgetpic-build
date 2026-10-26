# Tasks

- [x] Task 1: 修改 ControlBar.vue 超时选项与标签
  - [x] 移除 7 秒选项标签中的 "(推荐·安全)"
  - [x] 新增 30 秒、1 分钟、2 分钟选项
  - [x] 为 1 分钟选项添加 "(推荐)" 标签
- [x] Task 2: 修改 taskQueue.ts 默认值
  - [x] 将 `idleTimeout` 默认值从 7 改为 60
- [x] Task 3: 修改 Rust 后端默认值与上限
  - [x] 将 `state.rs` 中 `idle_timeout` 默认值从 7 改为 60
  - [x] 将 `commands.rs` 中 `clamp(3, 60)` 改为 `clamp(3, 120)`

# Task Dependencies
- Task 1, Task 2, Task 3 相互独立，可并行执行
