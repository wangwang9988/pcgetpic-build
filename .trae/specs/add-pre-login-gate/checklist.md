## Rust 后端

- [x] 旧的 `open_pre_login_window`、`close_pre_login_window`、`close_all_pre_login_windows` 命令已删除
- [x] `open_login_window` 命令正确创建 WebView 窗口，标签为 `login-{platform}`，标题为"登录 - {平台中文名}"
- [x] `open_login_window` 使用与 Worker 相同的 `data_directory`（cookie 目录共享）
- [x] `open_login_window` **不设置** `initialization_script`、`on_navigation`、`on_page_load`（用户自由操作）
- [x] **关键**：`open_login_window` 在 `std::thread::spawn` 中创建 WebView2 窗口，spawn 后 sleep 500ms 再 build
- [x] `on_window_event` 在 build 后通过 `window.on_window_event()` 注册（Tauri v2 的 `WebviewWindowBuilder` 不支持 builder 链上的 `on_window_event` 方法，与 Worker 窗口实现一致）
- [x] `open_login_window` 对同一平台重复调用时聚焦已有窗口而非创建新窗口
- [x] 登录窗口被用户关闭时，Rust 端发送 `login-window-closed` 事件，payload 包含 platform 字段
- [x] `invoke_handler` 中旧命令已移除，`open_login_window` 已注册
- [x] `capabilities/default.json` 中 `login-*` 已配置（windows 数组包含 `login-*`）
- [x] `calculate_cascade_position` 和 `get_platform_label` 辅助函数保留不变
- [x] `cargo check` 编译通过

## 前端 Store

- [x] 旧的 `preLoggedInPlatforms`、`preLoginOpenPlatforms`、`isSequentialPreLoginRunning` 状态已删除
- [x] `loggedInPlatforms` 和 `loginOpenPlatforms` 状态正确响应式更新
- [x] `openLogin` 方法正确调用 `invoke('open_login_window')` 并更新 `loginOpenPlatforms`
- [x] `markPlatformLoggedIn` 方法正确将平台从 `loginOpenPlatforms` 移至 `loggedInPlatforms`
- [x] `isPlatformLoggedIn` 和 `isPlatformLoggingIn` 正确返回平台登录状态
- [x] `getUnloggedInPlatforms()` 正确返回有任务但未登录的平台列表（排除 unknown）
- [x] `openAllLoginWindows()` 为所有未登录平台同时调用 `openLogin()`
- [x] `resetPreLoginState()` 正确清空两个 Set（不关闭登录窗口）
- [x] `stopAndReset()` 调用时正确追加 `resetPreLoginState()` 调用

## 前端 IPC

- [x] 旧的 `pre-login-window-closed` 事件处理已删除
- [x] `useIpcListener.ts` 正确监听 `login-window-closed` 事件并调用 `markPlatformLoggedIn`

## 前端 UI - PlatformDetect

- [x] 旧的串联式预登录相关 UI 和逻辑已删除
- [x] 预登录提示横幅在 ≥1 个未登录平台且非运行中时显示
- [x] 横幅包含提示文案和"🔑 一键预登录 (N个平台)"按钮
- [x] 横幅点击后**同时**为所有未登录平台打开登录窗口（非串联式）
- [x] 每个平台卡片显示正确的登录状态指示器（🔴 带脉冲 / 🟡 / 🟢）
- [x] "🔐 登录"按钮点击后打开登录窗口，卡片状态变为 🟡 登录中
- [x] 已登录平台显示"✅ 已登录"不可点击状态
- [x] 已登录卡片左侧绿色边框指示（3px solid #30d158）
- [x] `unknown` 平台不显示登录按钮和登录状态指示器
- [x] 所有平台已登录或运行中时横幅隐藏

## 前端 UI - ControlBar

- [x] 旧的门控逻辑（含 `close_all_pre_login_windows` 调用）已删除
- [x] 点击"开始抓取"时，如有未登录平台弹出 2 按钮确认对话框
- [x] 确认对话框使用 `dialog.warning`，"已登录，直接开始" + "去登录"
- [x] "已登录，直接开始"：标记平台已登录 + 继续抓取
- [x] "去登录"：关闭对话框 + 调用 `openAllLoginWindows()` + 不执行抓取
- [x] 点击遮罩层或按 ESC 可取消对话框，不执行抓取
- [x] 所有平台已登录时点击"开始抓取"不弹出确认对话框，直接执行

## 端到端验证

- [ ] 登录窗口能正常显示页面内容（非空白）
- [ ] 登录窗口可以正常点击关闭按钮关闭（非卡死）
- [ ] 登录窗口中登录的 cookie 能被后续 Worker 窗口共享使用
- [ ] 输入 6 条链接分属 2 个平台时，一键预登录**同时**弹出 2 个登录窗口
- [ ] 关闭登录窗口后前端正确收到 `login-window-closed` 事件
- [ ] 所有平台已登录后横幅自动消失
- [ ] 防拥堵机制与预登录机制正常协作（回归测试）
