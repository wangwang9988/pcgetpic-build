# 修复多平台外部浏览器并发登录 Spec

## Why
当前 `AppState` 仅存储单个 `cdp_port` 和 `cdp_browser_pid`，`open_login_window` 每次都先杀掉之前的 CDP 浏览器，导致多平台登录时只能保留最后一个浏览器。用户输入多个平台地址后，应该为每个平台弹出独立的登录浏览器。

## What Changes
- 修改 `state.rs`：将 `cdp_port: u16` + `cdp_browser_pid: Option<u32>` 替换为 `HashMap<String, CdpBrowserSession>`，按平台独立跟踪每个 CDP 浏览器实例
- 修改 `commands.rs` 的 `open_login_window`：不再杀掉之前的浏览器，而是为每个平台创建独立的 CDP 浏览器会话
- 修改 `commands.rs` 的 `confirm_external_login`：从 HashMap 中按平台查找对应的 CDP 端口
- 修改 `commands.rs` 的 `kill_cdp_browser`：支持按平台杀掉指定浏览器，或全部杀掉
- 清理 `platform_resolver.rs` 的 `external_login_url()` 方法：该方法返回固定登录 URL，但实际登录流程中从未被调用（`open_login_window` 使用前端传入的用户 URL），容易造成误解，应删除或标注为备用

## Impact
- Affected specs: 扩展外部浏览器登录范围
- Affected code:
  - `src-tauri/src/state.rs` — CDP 浏览器会话存储结构
  - `src-tauri/src/commands.rs` — `open_login_window` / `confirm_external_login` / `kill_cdp_browser`
  - `src-tauri/src/platform_resolver.rs` — `external_login_url()` 清理

## ADDED Requirements

### Requirement: 多平台并发 CDP 浏览器会话

系统 SHALL 支持同时为多个平台打开独立的 CDP 浏览器登录窗口。每个平台拥有独立的浏览器进程、CDP 调试端口和用户数据目录。

#### Scenario: 用户输入 3 个 1688 链接 + 2 个亚马逊链接 + 5 个敦煌网链接，点击一键预登录
- **WHEN** 用户点击一键预登录，且存在 3 个需要外部浏览器登录的平台（1688、亚马逊、敦煌网）
- **THEN** 系统为每个平台分别弹出独立的浏览器窗口（共 3 个），每个浏览器打开该平台的第一条用户输入链接

#### Scenario: 用户逐个点击平台登录按钮
- **WHEN** 用户先点击 1688 的登录按钮，再点击亚马逊的登录按钮
- **THEN** 1688 的浏览器保持打开，亚马逊的浏览器也独立弹出（不杀掉 1688 的浏览器）

### Requirement: 按平台独立跟踪 CDP 会话

`AppState` SHALL 使用 `HashMap<String, CdpBrowserSession>` 按 platform 字符串存储每个平台的 CDP 浏览器会话信息（端口、PID、用户数据目录），替代当前的单个 `cdp_port` + `cdp_browser_pid`。

#### Scenario: 查询 1688 的 CDP 端口
- **WHEN** 用户点击 1688 的「已完成登录」按钮
- **THEN** 系统从 HashMap 中查找 key 为 "ali1688" 的 CdpBrowserSession，获取对应的 CDP 端口

### Requirement: confirm_external_login 按平台查找 CDP 端口

`confirm_external_login` 命令 SHALL 从 `HashMap<String, CdpBrowserSession>` 中按平台查找对应的 CDP 端口，而非从全局 `cdp_port` 读取。

#### Scenario: 用户先确认 1688 登录，再确认亚马逊登录
- **WHEN** 用户先点击 1688 的「已完成登录」，再点击亚马逊的「已完成登录」
- **THEN** 每次导入 Cookie 时使用对应平台的 CDP 端口，互不干扰

### Requirement: 登录浏览器打开用户输入的第一条链接

外部浏览器登录时，浏览器 SHALL 打开用户输入的属于该平台的第一条链接，而非固定的登录页 URL。当前代码已正确实现（`open_login_window` 使用前端传入的 `url` 参数），但 `external_login_url()` 方法返回固定 URL 容易造成误解，应删除该方法。

#### Scenario: 用户输入 3 条 1688 商品链接，点击 1688 登录
- **WHEN** 用户输入了 `https://detail.1688.com/offer/123.html`、`https://detail.1688.com/offer/456.html`、`https://detail.1688.com/offer/789.html`
- **THEN** 登录浏览器打开 `https://detail.1688.com/offer/123.html`（第一条链接）

### Requirement: 清理已完成登录的 CDP 浏览器

当用户确认某个平台的登录完成后（`confirm_external_login` 成功），系统 SHALL 自动关闭该平台的 CDP 浏览器进程并从 HashMap 中移除会话记录。

#### Scenario: 用户确认 1688 登录完成
- **WHEN** 用户点击 1688 的「已完成登录」按钮，Cookie 导入成功
- **THEN** 1688 的浏览器进程被自动关闭，HashMap 中移除 "ali1688" 的会话记录

## MODIFIED Requirements

### Requirement: kill_cdp_browser 支持按平台清理

原有逻辑：`kill_cdp_browser` 杀掉全局唯一的 CDP 浏览器。
修改为：支持按平台杀掉指定浏览器（`kill_cdp_browser_for_platform`），以及全部杀掉（`kill_all_cdp_browsers`，用于应用退出时清理）。

### Requirement: open_login_window 不再杀掉之前的浏览器

原有逻辑：`open_login_window` 在打开新浏览器前先调用 `kill_cdp_browser` 杀掉之前的浏览器。
修改为：不再杀掉之前的浏览器，而是为新平台创建独立的 CDP 浏览器会话。如果该平台已有 CDP 浏览器在运行，则聚焦该浏览器窗口而非重复创建。

## REMOVED Requirements

### Requirement: external_login_url 方法
**Reason**: 该方法返回固定登录页 URL，但实际登录流程中从未被调用（`open_login_window` 使用前端传入的用户 URL）。该方法容易造成误解，且当前需求明确要求打开用户输入的链接而非固定登录页。
**Migration**: 删除 `external_login_url()` 方法。
