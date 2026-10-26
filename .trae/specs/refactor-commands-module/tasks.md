# Tasks

- [ ] Task 1: 创建 `commands/` 目录结构，编写 `commands/mod.rs` 模块声明文件
  - 声明所有子模块（scraping, worker, download, file_ops, login, config）
  - 从各子模块重导出所有公共函数（`pub use scraping::*;` 等）
  - 确保 `lib.rs` 中 `commands::函数名` 路径完全不变

- [ ] Task 2: 拆分 `commands/scraping.rs` — 抓取生命周期命令
  - 从 `commands.rs` 提取：`start_scraping`, `pause_scraping`, `stop_scraping`, `submit_tasks`, `dispatch_tasks`
  - 保留所有原有 `use` 导入和函数实现，不做任何逻辑修改

- [ ] Task 3: 拆分 `commands/worker.rs` — Worker 管理命令
  - 从 `commands.rs` 提取：`get_worker_status`, `get_task_status`, `navigate_worker`, `force_start_worker`, `complete_task`, `fail_task`
  - 提取辅助函数 `try_convert_to_keeper`
  - 保留所有原有 `use` 导入和函数实现

- [ ] Task 4: 拆分 `commands/download.rs` — 下载相关命令
  - 从 `commands.rs` 提取：`download_file`, `fetch_resource_as_data_url`
  - 保留所有原有 `use` 导入和函数实现

- [ ] Task 5: 拆分 `commands/file_ops.rs` — 文件操作命令
  - 从 `commands.rs` 提取：`open_folder`, `locate_file`, `clear_worker_data`
  - 保留所有原有 `use` 导入和函数实现

- [ ] Task 6: 拆分 `commands/login.rs` — 登录相关命令 + 辅助函数
  - 从 `commands.rs` 提取：`open_login_window`, `confirm_external_login`, `is_external_browser_login`, `pre_login_verified`, `close_login_windows`
  - 提取辅助函数：`cdp_fetch_all_cookies`, `get_available_port`, `kill_all_cdp_browsers`, `kill_cdp_browser_for_platform`, `find_browser_executable`
  - 保留所有原有 `use` 导入和函数实现

- [ ] Task 7: 拆分 `commands/config.rs` — 配置与杂项命令
  - 从 `commands.rs` 提取：`set_worker_count`, `set_scraping_config`, `greet`, `resolve_platform`, `get_scrape_data`
  - 保留所有原有 `use` 导入和函数实现

- [ ] Task 8: 删除旧的 `commands.rs` 文件，编译验证
  - 删除 `src-tauri/src/commands.rs`
  - 运行 `cargo build` 确认编译通过
  - 运行 `cargo check` 确认无警告

# Task Dependencies
- Task 2–7 均依赖 Task 1（需要先创建 mod.rs）
- Task 2–7 之间无依赖，可并行执行
- Task 8 依赖 Task 1–7 全部完成