# Refactor commands.rs 模块拆分 Spec

## Why
`commands.rs` 已膨胀至 **1324 行**，包含 28 个 Tauri Command 和 6 个辅助函数，违反了项目规范中"禁止将大段业务逻辑直接写入公共入口/核心组装文件"的约束。需要按职责拆分为多个子模块，降低维护成本。

## What Changes
- 将 `commands.rs` 拆分为 `commands/` 目录下的多个子模块：
  - `commands/mod.rs` — 模块声明 + 公共类型重导出
  - `commands/scraping.rs` — 抓取生命周期命令（start/pause/stop/submit/dispatch）
  - `commands/worker.rs` — Worker 管理命令（status/navigate/force_start/complete/fail）+ `try_convert_to_keeper`
  - `commands/download.rs` — 下载相关命令（download_file, fetch_resource_as_data_url）
  - `commands/file_ops.rs` — 文件操作命令（open_folder, locate_file, clear_worker_data）
  - `commands/login.rs` — 登录相关命令（open_login_window, confirm_external_login, close_login_windows, pre_login_verified, is_external_browser_login）+ CDP 辅助函数
  - `commands/config.rs` — 配置与杂项命令（set_worker_count, set_scraping_config, greet, resolve_platform, get_scrape_data）
- `lib.rs` 的 `invoke_handler` 和模块声明 **无需任何修改**（`commands::函数名` 路径不变）

## Impact
- Affected specs: 无（纯重构，不改变功能）
- Affected code:
  - `src-tauri/src/commands.rs` → 删除，替换为 `src-tauri/src/commands/` 目录
  - `src-tauri/src/lib.rs` — 无需修改

## REMOVED Requirements
### Requirement: 单文件 commands.rs
**Reason**: 文件过大（1324 行），违反项目架构约束
**Migration**: 拆分为 6 个子模块，保持 `commands::xxx` 公共路径不变