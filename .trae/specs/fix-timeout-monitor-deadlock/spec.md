# 修复 timeout_monitor 互斥锁死锁导致客户端卡死 Spec

## Why
`timeout_monitor.rs` 的 `check_timeouts` 函数在持有 `Mutex<AppState>` 锁的情况下，于内部循环中再次尝试锁定同一个互斥锁（L83-84），由于 `std::sync::Mutex` 不可重入，导致线程死锁。死锁后状态锁永远无法释放，主线程的 `on_navigation` 回调等待锁时被阻塞，整个客户端卡死无响应。

**触发条件**：当某个 Worker 处于 `Working` 状态且 7 秒内未产出任何数据时，超时监控器进入登录检测分支，触发死锁。前几个任务因 Scraper 脚本快速产出数据（`has_produced_data = true`）而绕过该分支，后续任务若页面加载慢或脚本注入延迟，7 秒后必触发死锁。

## What Changes
- **timeout_monitor.rs**: 重构 `check_timeouts` 函数，在持有锁期间仅收集必要数据（worker_id、platform、current_url），释放锁后再执行登录检测，避免嵌套锁定

## Impact
- Affected specs: 无
- Affected code: `src-tauri/src/timeout_monitor.rs`

---

## ADDED Requirements

### Requirement: check_timeouts 禁止嵌套锁定同一互斥锁
`check_timeouts` 函数 SHALL 在持有 `Mutex<AppState>` 锁期间，不再尝试锁定同一个互斥锁。登录检测所需的 `login_registry.check_login()` 调用 SHALL 在释放锁之后执行。

#### Scenario: Worker 7秒无数据时不触发死锁
- **GIVEN** Worker 0 处于 Working 状态且 7 秒内未产出数据
- **WHEN** 超时监控器检测到该 Worker 并尝试判断是否在登录页
- **THEN** 登录检测在锁外执行，不会造成死锁
- **AND** 超时监控器正常返回 `LoginDetected` 或 `NoDataTimeout` 动作

#### Scenario: 客户端不再卡死
- **GIVEN** 多个 Worker 同时运行，部分 Worker 未产出数据
- **WHEN** 超时监控器执行检查
- **THEN** 主线程不被阻塞，客户端保持响应
- **AND** `on_navigation` 回调可以正常获取锁

### Requirement: 登录检测结果与重构前一致
重构后 `check_timeouts` 的登录检测逻辑 SHALL 与重构前行为一致：根据 Worker 当前 URL 和平台判断是否处于登录/验证码页面。

#### Scenario: 登录页正确识别
- **GIVEN** Worker 的当前 URL 是京东登录页
- **WHEN** 超时监控器检测到该 Worker 7 秒无数据
- **THEN** 返回 `LoginDetected` 动作（与重构前一致）

#### Scenario: 普通页正确识别
- **GIVEN** Worker 的当前 URL 是普通商品页但 Scraper 未产出数据
- **WHEN** 超时监控器检测到该 Worker 7 秒无数据
- **THEN** 返回 `NoDataTimeout` 动作（与重构前一致）

## MODIFIED Requirements
无

## REMOVED Requirements
无
