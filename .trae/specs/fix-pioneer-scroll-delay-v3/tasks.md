# Tasks

- [x] Task 1: 修改 on_page_load 回调，同时处理 Started 和 Finished 事件
  - [x] 在 `src-tauri/src/lib.rs` 的 `on_page_load` 回调中，移除 `if payload.event() != PageLoadEvent::Finished { return; }` 的早退守卫
  - [x] 将事件类型传递给 `handle_page_load` 函数
  - [x] 修改 `handle_page_load` 函数签名，接收 `is_started: bool` 参数
  - [x] 在 `handle_page_load` 中，对 `Started` 事件只处理 CaptchaBlocked 恢复逻辑：
    - `Started` + CaptchaBlocked + 商品页（`is_still_on_platform_non_product` 返回 false 且 `login_result` 为 Normal）→ CaptchaBlockedResume
    - `Started` + CaptchaBlocked + 非商品页 → InjectUrlWatcher
    - `Started` + CaptchaBlocked + 登录页/验证码页/中间页 → Skip
    - `Started` + 非 CaptchaBlocked → Skip（等待 Finished 再处理）
    - `Finished` + 任何路径 → 保持原有逻辑不变
  - [x] 在 `on_page_load` 回调中添加时间戳日志，记录 `Started` 和 `Finished` 事件的间隔，用于验证根因分析

- [x] Task 2: URL 监听脚本添加 `__TAURI_INTERNALS__` fallback
  - [x] 在 `src-tauri/src/worker_handlers.rs` 的 `InjectUrlWatcher` 分支中，修改 URL 监听脚本的 Tauri 通信部分
  - [x] 参照 tauri-bridge.ts 的 fallback 模式：先尝试 `window.__TAURI__.core.invoke`，失败后 fallback 到 `window.__TAURI_INTERNALS__.invoke`
  - [x] 具体修改：将 `window.__TAURI__.core.invoke('url_changed_to_product', ...)` 替换为包含 fallback 的调用模式

- [x] Task 3: 超时监控器增加 CaptchaBlocked Worker URL 轮询
  - [x] 在 `src-tauri/src/timeout_monitor.rs` 的 `TimeoutAction` 枚举中增加 `CaptchaBlockedRecovery` 变体
  - [x] 在 `check_timeouts` 函数中，增加对 CaptchaBlocked 状态超过 3 秒的 Worker 的 URL 检测逻辑
  - [x] 主动获取 WebView 当前 URL（使用 `app.get_webview_window(&label).and_then(|w| w.url().ok())`）
  - [x] 如果 URL 匹配商品页模式（`is_still_on_platform_non_product` 返回 false 且包含平台域名），生成 `CaptchaBlockedRecovery` action
  - [x] 在 `execute_timeout_action` 中处理 `CaptchaBlockedRecovery`：恢复 Worker 状态为 Working，注入 bundle，发送 captcha-resolved 事件
  - [x] 注入 bundle 时设置 `__LOGIN_PROBE_SKIP__ = true` 和 `__SCRAPER_INJECTED__ = true`（与 CaptchaBlockedResume 一致）

- [x] Task 4: 编译验证
  - [x] 执行 `cargo build` 确保 Rust 代码无编译错误
  - [x] 确认无新增 warning

# Task Dependencies
- [Task 4] 依赖 [Task 1], [Task 2], [Task 3]
- [Task 1], [Task 2], [Task 3] 之间无依赖，可并行执行
