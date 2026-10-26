# Tasks

- [x] Task 1: Rust 后端 - 重构预登录窗口 Tauri 命令（简化版）
  - [x] SubTask 1.1: 删除旧的 `open_pre_login_window`、`close_pre_login_window`、`close_all_pre_login_windows` 命令
  - [x] SubTask 1.2: 保留 `calculate_cascade_position` 和 `get_platform_label` 辅助函数（已存在，无需修改）
  - [x] SubTask 1.3: 新增 `open_login_window` 命令：创建标签为 `login-{platform}` 的 WebView 窗口，标题为"登录 - {平台中文名}"，使用与 Worker 相同的 cookie 目录，**不注入脚本、不拦截导航**，窗口关闭时发送 `login-window-closed` 事件
  - [x] SubTask 1.4: **关键修复**：`open_login_window` 必须在 `std::thread::spawn` 中创建 WebView2 窗口（与 `do_dispatch` 一致），spawn 前获取 cookie_dir（锁内），spawn 后 sleep 500ms 再 build，命令处理器立即返回 `Ok(())`
  - [x] SubTask 1.5: `on_window_event` 在 build 后通过 `window.on_window_event()` 注册（Tauri v2 的 `WebviewWindowBuilder` 不支持 builder 链上注册，与 Worker 窗口实现一致）
  - [x] SubTask 1.6: 更新 `invoke_handler` 注册：移除旧命令，注册 `open_login_window`
  - [x] SubTask 1.7: 更新 `capabilities/default.json`：配置 `login-*` 窗口权限

- [x] Task 2: 前端 Store - 预登录状态管理（简化版）
  - [x] SubTask 2.1: 删除旧的 `preLoggedInPlatforms`、`preLoginOpenPlatforms`、`isSequentialPreLoginRunning` 状态
  - [x] SubTask 2.2: 新增 `loggedInPlatforms: Ref<Set<string>>` 和 `loginOpenPlatforms: Ref<Set<string>>` 响应式状态
  - [x] SubTask 2.3: 实现 `openLogin(platform, url)` 方法：调用 `invoke('open_login_window')`，将平台加入 `loginOpenPlatforms`
  - [x] SubTask 2.4: 实现 `markPlatformLoggedIn(platform)` 方法：将平台从 `loginOpenPlatforms` 移至 `loggedInPlatforms`
  - [x] SubTask 2.5: 实现 `isPlatformLoggedIn(platform)` 和 `isPlatformLoggingIn(platform)` 查询方法
  - [x] SubTask 2.6: 实现 `getUnloggedInPlatforms()` 方法：返回有任务但未登录的平台列表（排除 unknown）
  - [x] SubTask 2.7: 实现 `openAllLoginWindows()` 方法：为所有未登录平台同时调用 `openLogin()`
  - [x] SubTask 2.8: 实现 `resetPreLoginState()` 方法：清空两个 Set（不关闭登录窗口）
  - [x] SubTask 2.9: 修改 `stopAndReset()` 方法：追加 `resetPreLoginState()` 调用
  - [x] SubTask 2.10: 在 Store 返回对象中导出所有新增状态和方法

- [x] Task 3: 前端 IPC - 登录窗口关闭事件监听
  - [x] SubTask 3.1: 删除旧的 `pre-login-window-closed` 事件处理
  - [x] SubTask 3.2: 新增 `login-window-closed` 事件处理：调用 `taskQueueStore.markPlatformLoggedIn(platform)`

- [x] Task 4: 前端 UI - PlatformDetect 预登录横幅与卡片增强
  - [x] SubTask 4.1: 删除旧的串联式预登录相关 UI 和逻辑
  - [x] SubTask 4.2: 在平台列表顶部新增预登录提示横幅：当 ≥1 个未登录平台且非运行中时显示，包含提示文案 + "🔑 一键预登录 (N个平台)" 按钮，点击调用 `taskQueueStore.openAllLoginWindows()`
  - [x] SubTask 4.3: 在每个平台卡片中增加登录状态指示器（🔴 未登录带脉冲动画 / 🟡 登录中 / 🟢 已登录）
  - [x] SubTask 4.4: 在每个平台卡片中增加"🔐 登录"按钮，点击调用 `taskQueueStore.openLogin(platform, group.urls[0])`，已登录时显示"✅ 已登录"不可点击
  - [x] SubTask 4.5: 已登录卡片左侧绿色边框指示（3px solid #30d158）

- [x] Task 5: 前端 UI - ControlBar 抓取启动门控
  - [x] SubTask 5.1: 删除旧的门控逻辑（含 `close_all_pre_login_windows` 调用）
  - [x] SubTask 5.2: 在 `startCurrentPlatform` 和 `startAllPlatforms` 中检查目标平台的预登录状态
  - [x] SubTask 5.3: 如有未登录平台，弹出 `dialog.warning` 2 按钮确认对话框："已登录，直接开始" + "去登录"
  - [x] SubTask 5.4: "已登录，直接开始"：标记未登录平台为已登录，继续抓取
  - [x] SubTask 5.5: "去登录"：关闭对话框，调用 `openAllLoginWindows()`，不执行抓取
  - [x] SubTask 5.6: 取消操作：通过 `onMaskClick` 和 `onClose` 回调返回 false

# Task Dependencies

- [Task 2] depends on [Task 1]（Store 方法调用 Rust 命令）
- [Task 3] depends on [Task 1] + [Task 2]（监听 Rust 端事件并调用 Store 方法）
- [Task 4] depends on [Task 2]（UI 绑定 Store 状态和方法）
- [Task 5] depends on [Task 2] + [Task 4]（门控逻辑依赖 Store 状态）
- Task 1 可独立执行
