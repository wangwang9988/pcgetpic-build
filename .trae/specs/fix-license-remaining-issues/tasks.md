# Tasks — 授权系统残余问题修复

- [x] Task 1: verify_before_operation 验证通过后更新 max_history_time
  - [x] 1.1 修改 `src-tauri/src/license/validator.rs` — 在 `verify_before_operation` 的 `Ok(())` 分支中，更新 `max_history_time = now` 并保存
- [x] Task 2: check-revoke 和 deactivate 接口速率限制
  - [x] 2.1 修改 `server/src/app.ts` — 为 `/api/v1/check-revoke` 和 `/api/v1/deactivate` 添加 rate-limit 中间件（15分钟30次）

# Task Dependencies

无依赖，可并行执行。
