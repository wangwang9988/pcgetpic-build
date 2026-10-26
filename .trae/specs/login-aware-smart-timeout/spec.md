# 登录感知的智能超时机制 Spec

## Why
当前抓取流程在用户未登录或遇到验证码时，Worker 会被空闲检测器（7秒）或看门狗（60秒）强制关闭，导致抓取失败。根本原因是：系统已具备登录检测能力（`detect_login_redirect`、`is_captcha_page`），但检测到登录需求时未在 Rust 端同步 Worker 状态，导致超时机制无法感知登录等待场景。

## What Changes
- **修复 Rust 端状态同步缺陷**：`on_navigation` 和 `on_page_load` 检测到登录/验证码时，立即将 Worker 状态设为 `CaptchaBlocked`
- **看门狗尊重 CaptchaBlocked 状态**：60秒看门狗跳过处于 `CaptchaBlocked` 状态的 Worker
- **零数据保护**：空闲检测器发现 Worker 长时间无数据产出时，主动检查页面是否为登录/验证码页，而非直接关闭
- **登录后自动恢复与 URL 纠偏**：用户在 Worker 窗口完成登录后，自动检测页面状态；若页面未回到商品页则主动导航回原 URL，然后重新注入抓取脚本
- **登录等待超时上限**：`CaptchaBlocked` 状态最多持续 5 分钟，超时后标记任务失败

## Impact
- Affected specs: `fix-scraping-timeout-robustness`, `optimize-completion-detection`
- Affected code:
  - `src-tauri/src/lib.rs` — `on_navigation` 回调、`on_page_load` 回调、看门狗线程、空闲检测线程
  - `src-tauri/src/worker_pool.rs` — 新增 `captcha_blocked_at` 字段记录挂起时间
  - `src/composables/useIpcListener.ts` — 处理 `login-resolved` / `captcha-resolved` 事件
  - `src/stores/taskQueue.ts` — Worker 状态同步

## ADDED Requirements

### Requirement: Rust 端登录/验证码检测时同步 Worker 状态
当 `on_navigation` 或 `on_page_load` 检测到登录重定向或验证码页面时，SHALL 立即将对应 Worker 的 Rust 端状态设为 `CaptchaBlocked`，而非仅发送前端事件。

#### Scenario: 页面重定向到登录页
- **WHEN** Worker 窗口导航到 `login.taobao.com` 等登录域名
- **THEN** `on_navigation` 回调中立即调用 `set_worker_state(worker_id, CaptchaBlocked)`
- **AND** 发送 `login-required` UI 事件

#### Scenario: 页面加载完成且为登录页
- **WHEN** `on_page_load` 检测到当前 URL 为登录页
- **THEN** 跳过脚本注入的同时，将 Worker 状态设为 `CaptchaBlocked`
- **AND** 发送 `login-required` UI 事件

#### Scenario: 页面加载完成且为验证码页
- **WHEN** `on_page_load` 检测到当前 URL 为验证码页
- **THEN** 跳过脚本注入的同时，将 Worker 状态设为 `CaptchaBlocked`（当前只发事件未设状态）
- **AND** 发送 `captcha-detected` UI 事件

### Requirement: 看门狗跳过 CaptchaBlocked 状态的 Worker
60 秒看门狗线程 SHALL 在判断 Worker 是否卡死前，先检查 Worker 状态。若 Worker 处于 `CaptchaBlocked` 状态，SHALL 跳过强制清理，让 Worker 继续等待用户操作。

#### Scenario: Worker 等待登录超过 60 秒
- **WHEN** Worker 因登录需求处于 `CaptchaBlocked` 状态超过 60 秒
- **THEN** 看门狗不强制清理该 Worker
- **AND** Worker 继续保持 `CaptchaBlocked` 状态等待用户登录

#### Scenario: Worker 正常工作卡死超过 60 秒
- **WHEN** Worker 处于 `Working` 状态且 60 秒未完成
- **THEN** 看门狗正常执行强制清理逻辑（行为不变）

### Requirement: 零数据产出时的登录感知保护
空闲检测器 SHALL 在 Worker 数据静默超时时，检查该 Worker 是否曾产出过有效数据。若 Worker 从未产出任何有效 URL（`last_data_change` 为 None），SHALL 不直接跳过，而是进一步检查页面状态。

#### Scenario: 登录弹窗场景（无重定向）
- **WHEN** Worker 运行超过空闲超时时间，且从未产出有效数据（`last_data_change` 为 None）
- **AND** Worker 仍处于 `Working` 状态（未被 `on_navigation` 捕获）
- **THEN** 空闲检测器通过 WebView 的 `url()` 获取当前页面 URL
- **AND** 若当前 URL 匹配登录/验证码模式，将 Worker 设为 `CaptchaBlocked`
- **AND** 发送 `login-required` UI 事件

#### Scenario: 页面确实无图但非登录问题
- **WHEN** Worker 运行超过空闲超时时间，且从未产出有效数据
- **AND** 当前 URL 不匹配登录/验证码模式
- **THEN** 按原有逻辑正常完成任务（行为不变）

### Requirement: 登录后自动恢复与 URL 纠偏
当处于 `CaptchaBlocked` 状态的 Worker 窗口内页面加载完成时，SHALL 检查当前页面是否已脱离登录/验证码状态。若已脱离，SHALL 自动恢复 Worker 并纠偏导航。

#### Scenario: 登录后页面自动跳回商品页
- **WHEN** Worker 处于 `CaptchaBlocked` 状态
- **AND** 用户完成登录，页面自动导航回商品详情页
- **THEN** `on_page_load` 检测到 Worker 处于 `CaptchaBlocked` 状态且当前 URL 不是登录/验证码页
- **AND** 将 Worker 状态恢复为 `Working`
- **AND** 重置 `last_data_change` 为当前时间
- **AND** 重置 `window.__SCRAPER_INJECTED__` 标记
- **AND** 重新注入抓取脚本
- **AND** 发送 `captcha-resolved` UI 事件

#### Scenario: 登录后页面停留在非商品页（URL 纠偏）
- **WHEN** Worker 处于 `CaptchaBlocked` 状态
- **AND** 用户完成登录，但页面停留在登录成功页或其他非商品页
- **THEN** `on_page_load` 检测到 Worker 处于 `CaptchaBlocked` 状态且当前 URL 与预期商品 URL 不一致
- **AND** 将 Worker 状态恢复为 `Working`
- **AND** 通过 `webview.eval()` 执行 `location.href = '{expected_url}'` 导航回原商品页
- **AND** 等待下一次 `on_page_load` 触发时自动注入抓取脚本
- **AND** 发送 `captcha-resolved` UI 事件

#### Scenario: 验证码解决后页面仍在商品页
- **WHEN** Worker 处于 `CaptchaBlocked` 状态（因验证码拦截）
- **AND** 用户完成验证码，页面仍在原商品页
- **THEN** `on_page_load` 检测到当前 URL 为商品页（非登录/验证码页）
- **AND** 恢复 Worker 状态、重注入脚本（同上）

### Requirement: 登录等待超时上限
Worker 处于 `CaptchaBlocked` 状态 SHALL 有最大等待时间限制（默认 5 分钟）。超时后 SHALL 将任务标记为失败，关闭 Worker 窗口，并提示用户"登录超时，请登录后重试"。

#### Scenario: 用户 5 分钟内未完成登录
- **WHEN** Worker 处于 `CaptchaBlocked` 状态超过 5 分钟
- **THEN** 自动将任务标记为失败，错误信息为"登录等待超时(5分钟)，请登录后重试"
- **AND** 关闭 Worker 窗口
- **AND** 触发新任务调度

#### Scenario: 用户在 5 分钟内完成登录
- **WHEN** 用户在 5 分钟内完成登录，脚本重注入成功
- **THEN** Worker 恢复正常抓取流程，登录等待计时器取消

## MODIFIED Requirements

### Requirement: 空闲检测器零数据保护
空闲检测器在原有逻辑基础上，SHALL 增加"零数据产出"场景的特殊处理。当 Worker 的 `last_data_change` 为 None 且运行超过空闲超时时间时，SHALL 先检查页面是否需要登录，而非直接跳过。

### Requirement: 看门狗超时判断
看门狗线程 SHALL 在判断 Worker 是否卡死时，增加 Worker 状态检查。仅当 Worker 处于 `Working` 状态时才执行强制清理；`CaptchaBlocked` 状态的 Worker 应被跳过。
