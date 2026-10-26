# Tasks

- [x] Task 1: 修改 `state.rs`，将单个 CDP 会话改为按平台存储的 HashMap
  - [x] 新增 `CdpBrowserSession` 结构体（port: u16, pid: u32, user_data_dir: String）
  - [x] 将 `cdp_port: u16` + `cdp_browser_pid: Option<u32>` 替换为 `cdp_sessions: HashMap<String, CdpBrowserSession>`
  - [x] 更新 `AppState::new()` 初始化

- [x] Task 2: 修改 `commands.rs` 的 `open_login_window`
  - [x] 移除 `kill_cdp_browser(&state)` 调用（不再杀掉之前的浏览器）
  - [x] 为每个平台创建独立的 CDP 浏览器会话，使用独立的端口和用户数据目录
  - [x] 如果该平台已有 CDP 会话在运行，返回提示而非重复创建
  - [x] 将新会话信息存入 `cdp_sessions` HashMap

- [x] Task 3: 修改 `commands.rs` 的 `confirm_external_login`
  - [x] 从 `cdp_sessions` HashMap 按 platform 查找 CDP 端口，替代全局 `cdp_port`
  - [x] Cookie 导入成功后，自动关闭该平台的浏览器进程，从 HashMap 中移除会话记录

- [x] Task 4: 修改 `commands.rs` 的 `kill_cdp_browser`
  - [x] 新增 `kill_cdp_browser_for_platform` 函数：按平台杀掉指定浏览器
  - [x] 修改 `kill_cdp_browser` 为 `kill_all_cdp_browsers`：杀掉所有 CDP 浏览器（用于应用退出清理）

- [x] Task 5: 删除 `platform_resolver.rs` 的 `external_login_url()` 方法
  - [x] 该方法从未在登录流程中被调用，且返回固定 URL 容易造成误解

# Task Dependencies
- Task 2 依赖 Task 1（需要新的 HashMap 结构）
- Task 3 依赖 Task 1（需要从 HashMap 读取 CDP 端口）
- Task 4 依赖 Task 1（需要从 HashMap 读取 PID）
- Task 5 独立
