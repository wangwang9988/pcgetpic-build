# 下载路径设置功能 Spec

## Why
当前下载路径仅存储在 `DownloadManager.downloadFolderPath` 静态变量中（内存），应用重启后丢失，用户每次启动都需要重新选择下载目录。需要提供持久化的下载路径设置，让用户配置一次即可持续使用。

## What Changes
- 新建 `DownloadSettings.vue` 组件，放置在侧边栏 `NCollapse` 折叠面板中，作为"⚙️ 下载设置"折叠项，与"📋 任务队列"并列
- 提供下载路径的展示、选择、修改和清除功能
- 使用 `localStorage` 持久化下载路径配置，key 为 `dangtu_download_folder`
- 修改 `DownloadManager`，新增 `selectDownloadFolder()` 和 `getDownloadFolderPath()` 公开方法，封装目录选择和路径读取逻辑
- 修改已有 `resetDownloadFolder()` 方法，清除时同步删除 `localStorage`
- 在 `App.vue` 中将 `DownloadSettings` 集成到 `NCollapse` 折叠面板

## Impact
- Affected code:
  - `src/App.vue` — 在 `NCollapse` 中新增"⚙️ 下载设置"折叠项
  - `src/utils/downloadManager.ts` — 新增公开方法，修改路径获取和重置逻辑
  - 新增 `src/components/DownloadSettings.vue` — 下载设置组件

## ADDED Requirements

### Requirement: 下载路径设置面板
系统应在侧边栏 `NCollapse` 折叠面板中提供一个独立的"⚙️ 下载设置"折叠项，包含下载路径的展示与配置功能。

#### Scenario: 首次使用，未设置下载路径
- **WHEN** 用户首次打开应用且 `localStorage` 中无保存的下载路径
- **THEN** 设置面板的只读输入框显示 placeholder "未设置（每次下载将询问）"，提供"选择目录"按钮

#### Scenario: 用户选择下载路径
- **WHEN** 用户点击"选择目录"按钮
- **THEN** 调用 `DownloadManager.selectDownloadFolder()` 弹出系统目录选择对话框，用户选择后路径被保存到 `localStorage` 并在输入框中显示

#### Scenario: 已有保存的下载路径
- **WHEN** 应用启动时 `localStorage` 中已有保存的下载路径
- **THEN** 设置面板的只读输入框直接显示该路径，用户无需再次选择

#### Scenario: 用户修改下载路径
- **WHEN** 用户点击"更改路径"按钮
- **THEN** 调用 `DownloadManager.selectDownloadFolder()` 弹出系统目录选择对话框，用户选择新路径后更新 `localStorage` 和输入框显示

#### Scenario: 用户清除下载路径设置
- **WHEN** 用户点击"清除设置"按钮
- **THEN** 调用 `DownloadManager.resetDownloadFolder()` 清除内存缓存和 `localStorage`，输入框恢复为 placeholder 状态，后续下载将重新弹窗询问

#### Scenario: 用户打开下载目录
- **WHEN** 用户点击"打开文件夹"按钮（仅在已设置路径时可用）
- **THEN** 调用 Tauri 后端 `invoke('open_folder')` 打开系统文件管理器定位到下载根目录

### Requirement: 下载路径持久化
系统应使用 `localStorage` 持久化存储用户选择的下载根目录路径，key 为 `dangtu_download_folder`。

#### Scenario: DownloadManager 启动时读取已保存路径
- **WHEN** `DownloadManager.startDownload()` 被调用且 `downloadFolderPath` 为 `null`
- **THEN** 优先从 `localStorage` 读取 `dangtu_download_folder`，若存在则直接使用，不再弹窗

#### Scenario: DownloadManager 保存用户选择的路径
- **WHEN** 用户通过目录选择对话框选择了新的下载路径
- **THEN** 路径同时保存到 `downloadFolderPath` 静态变量和 `localStorage`

#### Scenario: DownloadManager 清除已保存路径
- **WHEN** 调用 `resetDownloadFolder()` 方法
- **THEN** 同时清空 `downloadFolderPath` 静态变量和 `localStorage` 中的 `dangtu_download_folder`

### Requirement: DownloadManager 公开接口封装
`DownloadManager` 应提供以下公开静态方法供设置组件调用，封装目录选择和路径管理逻辑：

#### Scenario: selectDownloadFolder() 方法
- **WHEN** 调用 `DownloadManager.selectDownloadFolder()`
- **THEN** 弹出 Tauri 系统目录选择对话框，用户选择后更新内存缓存和 `localStorage`，返回选择的路径；用户取消则返回 `null`

#### Scenario: getDownloadFolderPath() 方法
- **WHEN** 调用 `DownloadManager.getDownloadFolderPath()`
- **THEN** 优先返回内存缓存值，若为空则从 `localStorage` 读取并回填内存缓存，仍为空则返回 `null`

### Requirement: 设置面板与下载流程解耦
设置面板中的下载路径配置与下载时的子文件夹创建逻辑互不冲突。设置面板配置的是**下载根目录**，每次下载时仍会在该根目录下创建 `{商品ID}_{商品标题}_{日期}` 子文件夹。

#### Scenario: 用户设置下载根目录后执行下载
- **WHEN** 用户在设置面板配置了下载根目录为 `D:\Downloads`
- **THEN** 下载文件保存到 `D:\Downloads\{商品ID}_{商品标题}_{日期}\` 子文件夹中，无需再次选择目录

### Requirement: 设置面板 UI 设计
设置面板应遵循项目现有的深色主题和 Apple 风格设计规范。

#### Scenario: 设置面板视觉风格
- **THEN** 使用 Naive UI 的 `NInput`（只读模式）显示路径，`NButton` 提供操作按钮，整体风格与现有组件一致

#### Scenario: 折叠面板默认状态
- **THEN** "⚙️ 下载设置"折叠项默认收起，与"📋 任务队列"并列，不占用额外空间
