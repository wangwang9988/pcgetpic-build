# Restore Login Window Close Before Scraping Spec

## Why
旧版设计在开始抓取（打开抓取 Worker）前关闭登录 Worker，目的是减少同时打开的窗口数量，防止低配电脑卡顿。在修复 `fix-worker-exe-creation`（bundle 文件缺失）的过程中，误将登录窗口关闭逻辑从 `start_scraping` 移除并搬到 `do_dispatch` 的 Worker 创建之后。现在 bundle 缺失问题已修复，需要恢复原始设计。

## What Changes
- `commands.rs`：`start_scraping` 在调用 `do_dispatch` 前关闭所有登录窗口，等待 1.5s 确保 Cookie 落盘
- `dispatch.rs`：移除 Worker 创建成功后关闭登录窗口的逻辑（该逻辑已迁回 `start_scraping`）

## Impact
- Affected specs: `fix-worker-exe-creation`（其误删了登录窗口关闭逻辑）
- Affected code:
  - `src-tauri/src/commands.rs` — `start_scraping` 增加登录窗口关闭 + 等待逻辑
  - `src-tauri/src/dispatch.rs` — 移除 Worker 创建后的登录窗口关闭代码

## MODIFIED Requirements

### Requirement: 抓取开始前关闭登录窗口
系统 SHALL 在 `start_scraping` 中、调用 `do_dispatch` 之前，关闭所有 `login-` 前缀的 WebView2 窗口，并等待 1.5 秒确保 Cookie 落盘。

#### Scenario: 用户从预登录切换到抓取
- **GIVEN** 用户已通过"一键预登录"打开过登录窗口
- **WHEN** 用户点击"开始抓取"或"全部平台依次抓取"
- **THEN** `start_scraping` 先关闭所有登录窗口
- **AND** 等待 1.5 秒 Cookie 落盘
- **AND** 然后调用 `do_dispatch` 创建抓取 Worker

#### Scenario: 用户未使用登录功能直接抓取
- **GIVEN** 用户未打开过任何登录窗口
- **WHEN** 用户点击"开始抓取"
- **THEN** 无需关闭窗口（无登录窗口存在）
- **AND** 直接调用 `do_dispatch` 创建抓取 Worker

## REMOVED Requirements

### Requirement: do_dispatch 中 Worker 创建后关闭登录窗口
**Reason**: 该逻辑是为解决错误的根因（data_directory 锁）而添加的。现在恢复到原始设计：在 `start_scraping` 中关闭登录窗口后再创建 Worker。
**Migration**: 将关闭逻辑从 `dispatch.rs` 迁回 `commands.rs` 的 `start_scraping` 中。