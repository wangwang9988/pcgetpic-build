# Tasks

- [x] Task 1: 修复 HTTP 权限作用域配置
  - [x] 将 `default.json` 中 `"http:default"` 字符串替换为对象格式，包含 `allow` 字段允许 `"https://*"` 和 `"http://*"`
  - [x] 验证 JSON 格式有效性

- [x] Task 2: 验证复检
  - [x] 运行 `vue-tsc --noEmit` 确认前端无类型错误
  - [x] 运行 `vite build` 确认前端构建成功
  - [x] 确认 Rust 侧 `Cargo.toml` 和 `lib.rs` 变更无需回退

# Task Dependencies
- Task 2 依赖 Task 1