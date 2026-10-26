# Tasks

- [x] Task 1: 修复 Rust 端登录/验证码检测时的 Worker 状态同步
  - [x] 1.1: 在 `on_navigation` 回调中，检测到登录重定向时调用 `set_worker_state(worker_id, CaptchaBlocked)`
  - [x] 1.2: 在 `on_page_load` 回调中，检测到登录页时调用 `set_worker_state(worker_id, CaptchaBlocked)`
  - [x] 1.3: 在 `on_page_load` 回调中，检测到验证码页时同样设置 Worker 状态为 `CaptchaBlocked`
  - [x] 1.4: 验证：cargo check 编译通过

- [x] Task 2: 看门狗跳过 CaptchaBlocked 状态的 Worker
  - [x] 2.1: 在看门狗线程中增加 Worker 状态检查：CaptchaBlocked 则跳过
  - [x] 2.2: 验证：cargo check 编译通过

- [x] Task 3: 空闲检测器零数据保护（已合并到正常超时流程）
  - [x] 3.1: 引入 `has_produced_data` 布尔标记替代 `last_data_change.is_none()` 检查
  - [x] 3.2: 引入 `task_assigned_at` 字段精确判断零数据超时
  - [x] 3.3: 合并零数据保护到正常超时检测流程，通过 `has_produced_data` 区分处理
  - [x] 3.4: `has_produced_data=false` 且超时后，在锁外查询页面 URL 判断是否为登录/验证码页
  - [x] 3.5: 验证：cargo check 编译通过

- [x] Task 4: 登录后自动恢复与 URL 纠偏（已修复竞态条件）
  - [x] 4.1: URL 不一致时仅执行导航，保持 CaptchaBlocked 状态不变
  - [x] 4.2: URL 一致时（商品页加载完成）才恢复为 Working 并重注入脚本
  - [x] 4.3: 发送 `captcha-resolved` UI 事件通知前端
  - [x] 4.4: 验证：cargo check 编译通过

- [x] Task 5: 登录等待超时上限（5分钟）
  - [x] 5.1: WorkerInfo 新增 `captcha_blocked_at` 字段
  - [x] 5.2: `set_worker_state` 中记录/清除 `captcha_blocked_at`
  - [x] 5.3: 空闲检测线程中 CaptchaBlocked 超过 5 分钟标记失败
  - [x] 5.4: 验证：cargo check 编译通过

- [x] Task 6: 前端处理 captcha-resolved 事件
  - [x] 6.1: `captcha-resolved` 事件中将任务状态从 `needsIntervention` 恢复为 `running`
  - [x] 6.2: 验证：vue-tsc 编译通过

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 1]
- [Task 6] depends on [Task 4]
