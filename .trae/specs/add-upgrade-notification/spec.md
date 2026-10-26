# 客户端升级通知与自动下载 Spec

## Why
当前客户端没有版本更新检测机制，用户无法得知是否有新版本可用。需要在本地版本落后于线上版本时，自动提示用户升级，并支持一键下载最新安装包。

## What Changes
- 新增 Rust 命令 `download_update`，专用于下载升级 EXE，**不触发授权校验**
- 新增 Rust 命令 `check_for_update`，从线上获取最新版本信息
- 新增前端组件 `UpgradeNotice`，在 StatusBar 中显示升级提示图标
- 新增前端 Store `upgradeStore`，管理升级状态
- 启动后 30~60 分钟随机延迟检查版本更新
- 用户点击升级按钮后自动下载 EXE 到用户设置的下载路径

## Impact
- Affected code:
  - `src-tauri/src/commands/` — 新增升级相关命令模块
  - `src-tauri/src/lib.rs` — 注册新命令
  - `src/components/StatusBar.vue` — 添加升级通知组件
  - `src/stores/` — 新增 upgradeStore
  - `src/types/` — 新增升级相关类型定义

## ADDED Requirements

### Requirement: 版本更新检测
系统 SHALL 在应用启动后 30~60 分钟（随机延迟）自动检查线上版本，并在后续每 24 小时检查一次。

#### Scenario: 检测到新版本
- **WHEN** 本地版本号 < 线上 `version.json` 中的 `desktopVersion`
- **THEN** 在 StatusBar 右侧显示升级提示图标（带小红点或动画）

#### Scenario: 已是最新版本
- **WHEN** 本地版本号 >= 线上 `desktopVersion`
- **THEN** 不显示任何升级提示

#### Scenario: 网络不可用
- **WHEN** 版本检查请求失败
- **THEN** 静默忽略，不显示任何提示，下次定时周期重试

### Requirement: 升级通知 UI
系统 SHALL 在 StatusBar 右侧（LicenseStatus 左侧）显示升级通知图标。

#### Scenario: 有新版本时显示
- **WHEN** 检测到新版本可用
- **THEN** 显示一个带向上箭头图标的升级按钮，带有微妙的呼吸动画提示
- **AND** 鼠标悬停显示 tooltip："发现新版本 v{latestVersion}，点击升级"

#### Scenario: 点击升级按钮
- **WHEN** 用户点击升级按钮
- **THEN** 弹出确认对话框，显示当前版本和最新版本信息
- **AND** 对话框包含"立即下载"和"稍后提醒"两个按钮

### Requirement: 自动下载升级包
系统 SHALL 支持用户点击后自动下载最新 EXE 安装包，**无需授权校验**。

#### Scenario: 用户确认下载
- **WHEN** 用户在确认对话框中点击"立即下载"
- **THEN** 系统使用 Rust 端 `download_update` 命令下载 EXE
- **AND** 下载 URL 为 `https://www.downpictures.com/downloads/{desktopFilename}`
- **AND** 下载路径遵循用户设置的下载目录（与图片下载一致）
- **AND** **不触发授权码校验**（软件升级不属于付费功能）
- **AND** StatusBar 中的升级图标变为下载进度指示

#### Scenario: 下载完成
- **WHEN** EXE 下载成功
- **THEN** 弹出通知"升级包下载完成"，包含"打开文件夹"按钮
- **AND** 升级图标变为完成状态

#### Scenario: 下载失败
- **WHEN** EXE 下载失败
- **THEN** 弹出通知"下载失败，请稍后重试"
- **AND** 升级图标恢复为可点击状态，允许重试

#### Scenario: 用户未设置下载路径
- **WHEN** 用户尚未设置下载目录
- **THEN** 弹出目录选择对话框，选择后开始下载（与图片下载首次行为一致）

### Requirement: Rust 端升级命令
系统 SHALL 提供两个新的 Tauri Command，不校验授权。

#### Scenario: check_for_update 命令
- **WHEN** 前端调用 `check_for_update`
- **THEN** Rust 端请求 `https://www.downpictures.com/version.json`
- **AND** 返回 `{ has_update: bool, latest_version: string, download_filename: string }`
- **AND** 使用 `env!("CARGO_PKG_VERSION")` 作为本地版本进行比较
- **AND** 请求超时 10 秒，失败静默返回 `has_update: false`

#### Scenario: download_update 命令
- **WHEN** 前端调用 `download_update(url, file_path)`
- **THEN** Rust 端使用 reqwest 下载文件到指定路径
- **AND** **不调用** `verify_before_operation()` 授权校验
- **AND** 自动创建父目录
- **AND** 通过 IPC 事件 `update-download-progress` 上报下载进度
- **AND** 下载完成后通过 IPC 事件 `update-download-complete` 通知前端
- **AND** 下载失败通过 IPC 事件 `update-download-failed` 通知前端

### Requirement: 版本比较逻辑
系统 SHALL 使用语义化版本比较（支持多位版本号，如 2.0.117 > 2.0.9）。

#### Scenario: 版本号比较
- **WHEN** 比较本地版本和线上版本
- **THEN** 按点号分割为数字数组，逐位比较
- **AND** 位数不足时补 0（如 2.0.9 vs 2.0.117 → [2,0,9] vs [2,0,117]）

## MODIFIED Requirements

### Requirement: StatusBar 布局
StatusBar 右侧现有顺序为 `UpgradeCountdown | LicenseStatus | 运行状态`，修改为 `UpgradeCountdown | UpgradeNotice | LicenseStatus | 运行状态`。

## REMOVED Requirements
无
