# Tasks

- [x] Task 1: on_page_load 增加 WaitingForLogin 早退守卫（核心修复）
  - [x] 修改 `on_page_load` 闭包开头的状态获取逻辑：将 `(was_captcha_blocked, current_platform)` 二元组扩展为 `(was_captcha_blocked, is_waiting_for_login, current_platform)` 三元组
  - [x] 在 `was_captcha_blocked` 检查之前插入 `is_waiting_for_login` 早退逻辑：检测到 WaitingForLogin 状态时打印日志并直接 return
  - [x] 修改幅度：约 15 行变更（状态获取从 2 字段改为 3 字段元组 + 插入早退分支）

- [x] Task 2: on_navigation 增加 WaitingForLogin 放行守卫（加固修复）
  - [x] 在 `on_navigation` 闭包开头（`already_blocked` 检查之前）插入 WaitingForLogin 状态检测
  - [x] 当 Worker 处于 WaitingForLogin 时，打印日志并 return true（放行导航，不做状态变更）
  - [x] 修改幅度：约 10 行新增

- [x] Task 3: scrape-data 事件处理器增加防御性检查（纵深防御）
  - [x] 在 `scrape-data` 事件处理器的 `is_new_value` 分支内，`find_worker_id_by_task_id` 之后检查 Worker 状态
  - [x] 如果 Worker 处于 WaitingForLogin 状态，仅更新数据变化时间，跳过 `mark_platform_verified` 和 `get_waiting_workers_for_platform` 逻辑
  - [x] 打印警告日志 `[scrape-data] Worker {id} 处于 WaitingForLogin 状态，跳过平台验证和释放机制`

- [x] Task 4: active_platforms 计算纳入 WaitingForLogin 状态（调度完整性）
  - [x] 修改 `worker_pool.rs` 中 `dispatch_to_idle_workers` 的 `active_platforms` 计算逻辑
  - [x] 将 `worker.state == WorkerState::Working || worker.state == WorkerState::CaptchaBlocked` 扩展为 `worker.state == WorkerState::Working || worker.state == WorkerState::CaptchaBlocked || worker.state == WorkerState::WaitingForLogin`

- [x] Task 5: 编译验证
  - [x] 执行 `cargo build` 确保无编译错误
  - [x] 检查所有新增日志输出格式正确

# Task Dependencies
- [Task 1] 无依赖，核心修复，优先执行
- [Task 2] 无依赖，可与 Task 1 并行
- [Task 3] 无依赖，可与 Task 1 并行（纵深防御）
- [Task 4] 无依赖，可与 Task 1 并行
- [Task 5] 依赖 [Task 1-4] 全部完成
