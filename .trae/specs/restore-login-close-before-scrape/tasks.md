# Tasks

- [x] Task 1: `commands.rs` 恢复 `start_scraping` 中关闭登录窗口的逻辑
  - 移除旧的错误注释块（"不在 start_scraping 中关闭登录窗口"及后续解释）
  - 在 `do_dispatch` 调用前添加：遍历所有 `login-` 前缀窗口并关闭
  - 如果有关闭过窗口，等待 1.5 秒确保 Cookie 落盘
  - 添加注释说明"关闭登录窗口释放资源，防止低配电脑卡顿"
  - **验证**: `cargo check` 编译通过

- [x] Task 2: `dispatch.rs` 移除 Worker 创建后关闭登录窗口的逻辑
  - 移除 `do_dispatch` 中 Worker 创建成功后 spawn 线程关闭登录窗口的代码块（约 271-288 行）
  - **验证**: `cargo check` 编译通过

# Task Dependencies
- Task 1 和 Task 2 独立，可并行执行

# Implementation Notes
- 修改文件：
  - `src-tauri/src/commands.rs` — Task 1
  - `src-tauri/src/dispatch.rs` — Task 2
- 核心思路：恢复到原始设计——开始抓取前关闭登录窗口，抓取期间只保留抓取 Worker 窗口，减少资源占用