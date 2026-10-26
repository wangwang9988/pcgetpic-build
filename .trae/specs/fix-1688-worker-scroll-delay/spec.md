# 修复 1688 Worker 启动后 ~10 秒无自动滚动 Spec

## Why

1688 Worker 打开后页面正常显示，但自动滚动约 10 秒后才开始。根因与京东登录后 10 秒无滚动问题相同：`on_page_load(Finished)` 事件需等待页面所有子资源加载完毕才触发，导致 scraper bundle 注入延迟。京东的修复仅处理了 CaptchaBlocked 恢复路径的 `Started` 事件，但 1688 Worker 处于 `Working` 状态（非 CaptchaBlocked），`Started` 事件被完全跳过。

## 根因分析

### 当前代码逻辑（worker_handlers.rs 第 187-189 行）

```rust
if is_started {
    if !was_captcha_blocked {
        return PageLoadAction::Skip;  // ← 1688 正常 Worker 走这里，完全跳过 Started 事件
    }
    // ... 仅 CaptchaBlocked 恢复路径处理 Started
}
```

### 1688 Worker 流程

1. Worker 窗口创建 → 导航到 1688 商品页
2. `on_page_load(Started)` → `is_started=true`, `was_captcha_blocked=false` → **Skip**
3. 页面子资源加载（图片、脚本、iframe 等）→ ~10 秒
4. `on_page_load(Finished)` → `InjectBundle` → scraper 注入 → 开始滚动

### 与京东问题的对比

| 维度 | 京东（已修复） | 1688（当前问题） |
|------|------|------|
| Worker 状态 | CaptchaBlocked | Working |
| `Started` 处理 | ✅ 已处理（CaptchaBlocked 恢复路径） | ❌ 被跳过 |
| `Finished` 延迟 | ~10 秒 | ~10 秒 |
| 修复方案 | 处理 `Started` 事件 | 同样需要处理 `Started` 事件 |

### 为什么提前注入 bundle 是安全的

1. **scraper 脚本有 `document.readyState` 检查**：`index.ts` 中 `if (document.readyState === 'loading')` 会等待 `DOMContentLoaded`
2. **scraper 脚本有 `MAX_RETRIES` + `RETRY_INTERVAL` 轮询**：DOM 元素未就绪时会自动重试
3. **登录探针保护**：`probeAndReportLogin()` 会检测登录页面，不会在登录页上执行抓取
4. **`__SCRAPER_INJECTED__` 防重复**：即使 `Started` 和 `Finished` 都触发了注入，也只会执行一次

## What Changes

- 修改 `worker_handlers.rs` 的 `handle_page_load` 函数：对非 CaptchaBlocked 的正常 Worker，在 `Started` 事件时也检测 URL 是否为商品页，如果是则提前注入 bundle

## Impact

- Affected code:
  - `src-tauri/src/worker_handlers.rs` — `handle_page_load` 函数的 `Started` 事件处理逻辑
- 影响所有平台的正常 Worker（不仅限于 1688），但行为是安全的：
  - 商品页 → 提前注入 bundle（减少等待时间）
  - 登录页/验证码页/中间页 → 仍等待 `Finished` 事件

## ADDED Requirements

### Requirement: 正常 Worker 的 Started 事件也触发 bundle 注入

系统 SHALL 在 `on_page_load(Started)` 事件中，对非 CaptchaBlocked 的正常 Worker 也执行商品页检测逻辑。当 URL 匹配商品页模式（`login_result` 为 `Normal` 且非平台非商品页）时，提前注入 scraper bundle，无需等待 `Finished` 事件。

#### Scenario: 1688 Worker Started 事件检测到商品页
- **WHEN** Worker 处于 Working 状态（非 CaptchaBlocked）
- **AND** `on_page_load(Started)` 事件触发
- **AND** 当前 URL 匹配商品页模式（`login_result` 为 `Normal`，`is_still_on_platform_non_product` 返回 false）
- **THEN** 立即注入 scraper bundle（`InjectBundle`），无需等待 `Finished`

#### Scenario: 1688 Worker Started 事件检测到非商品页
- **WHEN** Worker 处于 Working 状态（非 CaptchaBlocked）
- **AND** `on_page_load(Started)` 事件触发
- **AND** 当前 URL 不匹配商品页模式（登录页/验证码页/中间页/平台非商品页）
- **THEN** 跳过处理，等待 `Finished` 事件

#### Scenario: 1688 Worker Finished 事件（兜底）
- **WHEN** Worker 处于 Working 状态
- **AND** `on_page_load(Finished)` 事件触发
- **AND** `Started` 事件已注入 bundle（`__SCRAPER_INJECTED__` 已设置）
- **THEN** `InjectBundle` 中的 `if (!window.__SCRAPER_INJECTED__)` 检查会阻止重复注入
- **THEN** 行为与现有逻辑完全一致

#### Scenario: 其他平台（如淘宝）正常 Worker
- **WHEN** 淘宝 Worker 处于 Working 状态
- **AND** `on_page_load(Started)` 事件触发
- **AND** URL 匹配商品页
- **THEN** 同样提前注入 bundle（所有平台受益，减少等待时间）

## MODIFIED Requirements

### Requirement: on_page_load Started 事件处理范围

原逻辑：`Started` 事件仅处理 CaptchaBlocked 恢复路径。现修改为：`Started` 事件同时处理正常 Worker 的商品页检测和 bundle 注入。
