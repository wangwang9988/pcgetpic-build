# 授权系统残余问题修复 Spec

## Why

修复后复评报告指出 2 个低成本的残余问题需要修复：`verify_before_operation` 不更新 `max_history_time` 导致防时间回拨精度降低，以及 `check-revoke`/`deactivate` 接口无速率限制。

## What Changes

- **修改** `src-tauri/src/license/validator.rs` — `verify_before_operation` 验证通过后更新 `max_history_time`
- **修改** `server/src/app.ts` — 为 `/api/v1/check-revoke` 和 `/api/v1/deactivate` 添加速率限制

## Impact

- Affected code: `validator.rs`、`app.ts`
- 无 Breaking Changes

## ADDED Requirements

### Requirement: verify_before_operation 更新防时间回拨记录

`verify_before_operation` SHALL 在验证通过后更新 `max_history_time` 为当前时间，确保防时间回拨检测的精度随操作持续更新，而非仅在启动时记录一次。

#### Scenario: 长期运行后防时间回拨精度
- **WHEN** 用户启动软件后持续使用 7 天（不重启），期间多次执行抓取操作
- **THEN** `max_history_time` 随每次操作更新，用户无法将时间回拨到启动时刻之后

### Requirement: check-revoke 和 deactivate 接口速率限制

系统 SHALL 为 `/api/v1/check-revoke` 和 `/api/v1/deactivate` 添加速率限制，防止高频请求探测激活码有效性或枚举设备指纹。

- 同一 IP 每 15 分钟最多 30 次请求（吊销检查频率高于激活，因为正常使用中每次启动都会检查）
- 超出限制返回 429 Too Many Requests

## MODIFIED Requirements

无

## REMOVED Requirements

无
