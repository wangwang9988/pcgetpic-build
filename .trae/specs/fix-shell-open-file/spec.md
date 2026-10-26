# 修复"定位文件"和"打开下载文件夹"报错 Spec

## Why
`downloadManager.ts` 中的 `locateFile()` 和 `openDownloadFolder()` 方法使用 Tauri v2 的 `shell.open()` 打开本地文件路径。但 `shell.open()` 的参数校验正则只允许 `mailto:`、`tel:`、`https?://` 协议，本地路径如 `D:\Downloads/...` 无法通过校验，导致报错:

```
Scoped command argument at position 0 was found, but failed regex validation ^((mailto:\w+)|(tel:\w+)|(https?://\w+)).+
```

## What Changes
- 在 Rust 后端新增 `open_folder` 和 `locate_file` 两个 Tauri 命令，调用操作系统原生方式打开文件夹/在文件管理器中定位文件
- 修改 `downloadManager.ts`，将 `shell.open()` 替换为 `invoke()` 调用新的 Rust 命令
- 确保跨平台兼容（Windows/macOS/Linux）

## Impact
- Affected specs: 无
- Affected code:
  - `src-tauri/src/lib.rs` — 新增 Rust 命令
  - `src/utils/downloadManager.ts` — 替换 shell.open 调用

## ADDED Requirements
### Requirement: Rust 原生文件定位命令
系统 SHALL 提供 `open_folder` 和 `locate_file` 两个 Tauri 命令，分别用于在文件管理器中打开文件夹和在文件管理器中高亮选中指定文件。

#### Scenario: 在 Windows 上打开文件夹
- **WHEN** 前端调用 `invoke('open_folder', { path: 'D:\\Downloads\\folder' })`
- **THEN** 系统使用 `explorer "D:\Downloads\folder"` 打开该文件夹

#### Scenario: 在 Windows 上定位文件
- **WHEN** 前端调用 `invoke('locate_file', { path: 'D:\\Downloads\\folder\\file.jpg' })`
- **THEN** 系统使用 `explorer /select,"D:\Downloads\folder\file.jpg"` 在资源管理器中打开该文件夹并高亮选中文件

#### Scenario: 路径不存在时优雅降级
- **WHEN** 传入的路径对应的文件或文件夹不存在
- **THEN** 命令返回 `Err`，前端显示友好错误提示

## MODIFIED Requirements
### Requirement: downloadManager 定位文件方法
`locateFile()` 和 `openDownloadFolder()` 方法 SHALL 使用 Rust 命令代替 `shell.open()`。

#### Scenario: 点击"定位文件"按钮
- **WHEN** 用户点击已下载文件的"定位文件"按钮
- **THEN** 系统在文件管理器中打开对应文件夹并高亮该文件