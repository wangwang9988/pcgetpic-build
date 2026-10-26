# Tasks

- [x] Task 1: 修复 CaptchaBlockedRecovery 重新注入时丢失 `__IDLE_TIMEOUT_MS__` 的 Bug
  - [x] SubTask 1.1: 在 `timeout_monitor.rs` 的 `CaptchaBlockedRecovery` 分支中，读取 `AppState.idle_timeout` 并在注入脚本中补充 `window.__IDLE_TIMEOUT_MS__ = {idle_timeout * 1000};`
  - [x] SubTask 1.2: 验证注入脚本格式与 `dispatch.rs:131-133` 的首次注入格式保持一致

- [x] Task 2: Rust 端 `set_scraping_config` 增加 `idle_timeout` 值域校验
  - [x] SubTask 2.1: 在 `commands.rs` 的 `set_scraping_config` 函数中，对 `idle_timeout` 做 `clamp(3, 60)` 处理后再赋值

- [x] Task 3: 优化 ControlBar.vue 超时选项标签文案
  - [x] SubTask 3.1: 将 5 秒选项标签改为 `5秒 (快速·有风险)`
  - [x] SubTask 3.2: 将 7 秒选项标签改为 `7秒 (推荐·安全)`

# Task Dependencies
- Task 1, Task 2, Task 3 相互独立，可并行执行
