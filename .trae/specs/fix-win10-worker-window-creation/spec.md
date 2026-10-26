# Fix Win10 Worker Window Creation Spec

## Why
Windows 10 安装版（exe）在点击"全部平台依次抓取"后，抓取 Worker 的 WebView2 窗口无法弹出，但登录窗口可以正常弹出。Windows 11 开发模式（npm run dev）一切正常。根本原因是：`start_scraping` 命令关闭登录窗口后立即调用 `do_dispatch` 创建 Worker 窗口，而 WebView2 浏览器进程在 Windows 10 上释放 `data_directory` 文件锁的速度较慢，导致新 Worker 窗口创建时文件锁冲突失败。

## What Changes
- 移除 `start_scraping` 命令中冗余的 `close_login_windows` 逻辑（前端已处理）
- 在 `start_scraping` 调用 `do_dispatch` 前增加等待时间，确保 WebView2 浏览器进程完全退出
- 延长 `do_dispatch` 中首个 Worker 的安全延迟，给 WebView2 进程更多时间释放资源

## Impact
- Affected specs: 无
- Affected code: `src-tauri/src/commands.rs` (start_scraping), `src-tauri/src/dispatch.rs` (do_dispatch)

## MODIFIED Requirements

### Requirement: start_scraping 命令
系统 SHALL 在启动抓取前确保所有登录窗口已关闭，并等待足够时间让 WebView2 浏览器进程完全终止，避免 `data_directory` 文件锁冲突。

#### Scenario: Windows 10 用户从登录窗口切换到抓取 Worker
- **GIVEN** 用户已通过"一键预登录"打开过登录窗口
- **WHEN** 用户点击"全部平台依次抓取"
- **THEN** 前端 `close_login_windows` 关闭登录窗口并等待 1.5s（Cookie 落盘）
- **AND** `start_scraping` 命令等待额外 3 秒确保 WebView2 进程完全退出
- **AND** `do_dispatch` 成功创建 Worker WebView2 窗口

#### Scenario: 用户未使用登录功能直接抓取
- **GIVEN** 用户未打开过任何登录窗口
- **WHEN** 用户点击"全部平台依次抓取"
- **THEN** `start_scraping` 跳过登录窗口关闭步骤
- **AND** 无需额外等待，直接执行 `do_dispatch`

### Requirement: do_dispatch Worker 窗口创建延迟
系统 SHALL 在创建首个 Worker 窗口前等待足够时间，确保 WebView2 浏览器进程已完全释放 `data_directory` 文件锁。

#### Scenario: 首个 Worker 窗口创建
- **WHEN** `do_dispatch` 开始创建 Worker 窗口
- **THEN** 首个 Worker（worker_id=0）等待至少 3 秒后再调用 `WebviewWindowBuilder::build()`
- **AND** 后续 Worker 依次递增 1 秒延迟（保持 BUILD_LOCK 串行化）

## REMOVED Requirements

### Requirement: start_scraping 中关闭登录窗口
**Reason**: 前端 `close_login_windows` 命令已负责关闭登录窗口并等待 Cookie 落盘。`start_scraping` 中再次关闭是冗余操作，且不等待进程退出就直接调度，这是导致 Win10 上 Worker 窗口创建失败的根本原因。
**Migration**: 无需迁移，前端 `startAllPlatforms()` 已在调用 `start_scraping` 前调用 `close_login_windows`。