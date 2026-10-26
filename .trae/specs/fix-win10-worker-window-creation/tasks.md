# Tasks

- [x] Task 1: 移除 `start_scraping` 中冗余的 `close_login_windows` 逻辑
  - 在 `src-tauri/src/commands.rs` 的 `start_scraping` 函数中，删除第 71-79 行关闭登录窗口的代码块
  - 添加注释说明登录窗口关闭已由前端 `close_login_windows` 命令处理
  - **验证**: 编译通过，`cargo check` 无错误 ✅

- [x] Task 2: 在 `start_scraping` 调用 `do_dispatch` 前增加 WebView2 进程退出等待
  - 在 `start_scraping` 中，设置 `scraping_active = true` 后、调用 `do_dispatch` 前，检查是否有登录窗口曾被打开（通过检查 `app.webview_windows()` 中是否还存在 `login-` 前缀的窗口）
  - 如果登录窗口刚被关闭（前端 `close_login_windows` 已处理），`start_scraping` 中 `get_webview_window` 返回 `None`，说明窗口已关闭但进程可能未退出
  - 添加 `std::thread::sleep(Duration::from_secs(3))` 等待 WebView2 进程完全退出
  - 添加日志输出 `[start_scraping] 等待 WebView2 进程退出完成（3秒），避免 data_directory 文件锁冲突`
  - **验证**: 编译通过 ✅

- [x] Task 3: 延长 `do_dispatch` 首个 Worker 的安全延迟
  - 在 `src-tauri/src/dispatch.rs` 的 `do_dispatch` 函数中，将 `delay_ms` 从 `1500 + (item.worker_id as u64) * 1000` 改为 `3000 + (item.worker_id as u64) * 1000`
  - 更新注释说明延长延迟是为了给 WebView2 进程更多时间释放 data_directory 文件锁
  - **验证**: 编译通过 ✅

# Task Dependencies
- Task 2 和 Task 3 可并行执行
- 所有任务互不依赖，可在同一文件中修改

# Implementation Notes
- 修改文件: `src-tauri/src/commands.rs` (Task 1, Task 2), `src-tauri/src/dispatch.rs` (Task 3)
- 所有修改集中在 Rust 后端，无需改动前端代码
- 总等待时间变化: 原来 `close_login_windows`(1.5s) + `do_dispatch` 首个 Worker(1.5s) = 3s → 改为 `close_login_windows`(1.5s) + `start_scraping` 等待(2-3s) + `do_dispatch` 首个 Worker(3s) = 6.5-7.5s