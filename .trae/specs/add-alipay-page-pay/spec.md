# 智能默认下载路径探测 Spec

## Why

当前用户未设置下载位置时，每次首次下载都会弹出系统目录选择对话框，体验不佳。应自动探测合理的默认下载路径，实现开箱即用。

## What Changes

* Rust 后端新增 `get_default_download_path` Tauri Command，按优先级自动探测下载路径

* 前端 `downloadManager.ts` 在初始化时若 localStorage 无保存路径，调用后端探测并自动持久化

* 前端 `DownloadSettings.vue` 在无路径时展示探测到的默认路径

## Impact

* Affected code:

  * `src-tauri/src/commands/config.rs` — 新增 `get_default_download_path` 命令

  * `src-tauri/src/lib.rs` — 在 `invoke_handler` 中注册新命令

  * `src/utils/downloadManager.ts` — 新增初始化时自动探测逻辑

  * `src/components/DownloadSettings.vue` — placeholder 文案调整

## ADDED Requirements

### Requirement: 默认下载路径自动探测

系统应在用户未设置下载位置时，按以下优先级自动探测并设置默认下载路径：

1. **浏览器下载路径**（最高优先级）：读取 Chrome 和 Edge 的 `Preferences` 文件中 `download.default_directory` 字段
2. **D盘"下载"文件夹**：`D:\下载`
3. **E盘"下载"文件夹**：`E:\下载`
4. **F盘"下载"文件夹**：`F:\下载`
5. **C盘"下载"文件夹**（兜底）：`C:\下载`

#### Scenario: Chrome 浏览器已设置自定义下载路径

* **WHEN** 用户未设置下载位置，且 Chrome 的 `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Preferences` 中 `download.default_directory` 字段存在且路径有效

* **THEN** 系统使用该路径作为默认下载位置

#### Scenario: Edge 浏览器已设置自定义下载路径

* **WHEN** 用户未设置下载位置，Chrome 未设置或读取失败，且 Edge 的 `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Preferences` 中 `download.default_directory` 字段存在且路径有效

* **THEN** 系统使用该路径作为默认下载位置

#### Scenario: 浏览器未自定义下载路径，D盘存在

* **WHEN** 用户未设置下载位置，浏览器读取失败或未自定义，且 D 盘存在

* **THEN** 系统在 D 盘创建 `下载` 文件夹（如不存在）并使用 `D:\下载` 作为默认路径

#### Scenario: 浏览器未自定义下载路径，D盘不存在但E盘存在

* **WHEN** 用户未设置下载位置，D 盘不存在，E 盘存在

* **THEN** 系统在 E 盘创建 `下载` 文件夹并使用 `E:\下载` 作为默认路径

#### Scenario: D/E/F盘均不存在

* **WHEN** 用户未设置下载位置，D/E/F 盘均不存在

* **THEN** 系统在 C 盘创建 `下载` 文件夹并使用 `C:\下载` 作为兜底路径

#### Scenario: 所有探测均失败

* **WHEN** 所有路径探测均失败（极端情况，如权限不足）

* **THEN** 返回 null，前端回退到弹窗让用户手动选择

### Requirement: Rust 后端 get\_default\_download\_path 命令

在 `src-tauri/src/commands/config.rs` 中新增 `get_default_download_path` Tauri Command。

#### Scenario: 命令调用

* **WHEN** 前端调用 `invoke('get_default_download_path')`

* **THEN** 按优先级顺序探测路径，返回第一个有效路径字符串或 null

#### Scenario: 浏览器 Preferences 文件解析

* **THEN** 读取 Chrome 和 Edge 的 Preferences JSON 文件，提取 `download.default_directory` 字段，验证路径存在性

* **THEN** Chrome 优先于 Edge

#### Scenario: 盘符探测与文件夹创建

* **THEN** 依次检查 D/E/F/C 盘是否存在，在首个存在的盘符下创建 `下载` 文件夹（如不存在）

* **THEN** 使用 `std::fs::create_dir_all` 确保目录可用

### Requirement: 前端自动探测与持久化

前端在初始化时若 localStorage 无保存路径，自动调用后端探测并持久化结果。

#### Scenario: 应用启动时自动探测

* **WHEN** 应用启动，`localStorage` 中 `downpictures_download_folder` 为空

* **THEN** 调用 `invoke('get_default_download_path')` 获取默认路径，成功后写入 `_downloadFolderPath` 和 `localStorage`

#### Scenario: 已有保存路径时不触发探测

* **WHEN** 应用启动，`localStorage` 中已有 `downpictures_download_folder`

* **THEN** 不触发自动探测，直接使用已保存路径

#### Scenario: 探测失败时回退到手动选择

* **WHEN** 后端返回 null（所有探测失败）

* **THEN** 保持原有行为，首次下载时弹出目录选择对话框

### Requirement: DownloadSettings 组件适配

当路径由自动探测设置时，UI 应正确展示。

#### Scenario: 自动探测路径后的显示

* **WHEN** 路径由自动探测设置

* **THEN** DownloadSettings 组件正常显示该路径，用户可"更改路径"或"清除设置"

#### Scenario: 清除设置后重新探测

* **WHEN** 用户点击"清除设置"

* **THEN** 清除 localStorage 和内存缓存，下次启动或下载时重新触发自动探测

