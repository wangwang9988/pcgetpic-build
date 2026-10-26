# 修复前端 Worker ID 编号不一致导致状态更新静默失败 Spec

## Why

同事代码审查发现两个 BUG：

1. **前端 Worker ID 从 1 开始，Rust 端从 0 开始**：`taskQueue.initWorkers()` 初始化 Worker 编号为 `1, 2, 3, 4`，但 Rust 端 `WorkerPool` 编号为 `0, 1, 2, 3`。当 Rust 发送 `worker_id: 0` 时，前端 `updateWorkerState(0, ...)` 找不到匹配的 Worker，所有 worker-0 的状态更新（task-assigned、captcha-detected 等）全部静默失败。

2. **login-required 事件遗漏修复**：同事已将 `captcha-detected` 和 `captcha-resolved` 中的 `workerId > 0` 改为 `workerId != null`，但 `login-required` 事件（[useIpcListener.ts:128](file:///d:/Trae/PcGetPic/src/composables/useIpcListener.ts#L128)）仍保留旧逻辑，导致 worker-0 遇到登录拦截时状态无法更新。

## What Changes
- 修改 `taskQueue.initWorkers()` 使 Worker ID 从 0 开始，与 Rust 端对齐
- 修改 `useIpcListener.ts` 中 `login-required` 的 `workerId > 0` 判断为 `workerId != null`

## Impact
- Affected code: `src/stores/taskQueue.ts`（initWorkers）、`src/composables/useIpcListener.ts`（login-required）
- 不涉及 Rust 端修改

## MODIFIED Requirements

### Requirement: Worker ID 编号与 Rust 端一致
前端 Worker ID 编号 SHALL 与 Rust 端 `WorkerPool` 保持一致，从 0 开始递增。

#### Scenario: Worker 状态更新
- **WHEN** Rust 端发送 `worker_id: 0` 的状态变更事件
- **THEN** 前端能正确找到对应 Worker 并更新其状态

### Requirement: login-required 事件 Worker ID 过滤
`login-required` 事件中的 Worker ID 过滤条件 SHALL 与 `captcha-detected`/`captcha-resolved` 保持一致，仅排除 `null`/`undefined`，允许 `workerId === 0`。

#### Scenario: worker-0 触发登录拦截
- **WHEN** Rust 发送 `login-required` 事件，`worker_id: 0`
- **THEN** 前端将 `worker-0` 状态更新为 `captchaBlocked`