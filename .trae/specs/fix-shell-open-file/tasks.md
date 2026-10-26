# Tasks

- [x] Task 1: 在 Rust 后端新增 `open_folder` 和 `locate_file` 两个 Tauri 命令
  - [x] 在 `src-tauri/src/lib.rs` 中新增 `open_folder` 命令：接收文件夹路径，调用系统命令打开文件夹（Windows 用 `explorer`，macOS 用 `open`，Linux 用 `xdg-open`）
  - [x] 在 `src-tauri/src/lib.rs` 中新增 `locate_file` 命令：接收文件路径，调用系统命令在文件管理器中定位文件（Windows 用 `explorer /select,`，macOS 用 `open -R`，Linux 用 `xdg-open` 打开父目录）
  - [x] 在 `run()` 函数中注册这两个新命令

- [x] Task 2: 修改 `downloadManager.ts`，替换 `shell.open()` 为 `invoke()` 调用
  - [x] 修改 `locateFile()` 方法，用 `invoke('locate_file', { path })` 替换 `shell.open(filePath)`
  - [x] 修改 `openDownloadFolder()` 方法，用 `invoke('open_folder', { path })` 替换 `shell.open(this.downloadFolderPath)`
  - [x] 移除不再需要的 `import * as shell from '@tauri-apps/plugin-shell'`

- [x] Task 3: 编译验证
  - [x] 运行 `cargo check` 确保 Rust 代码编译通过
  - [x] 运行 `npx vue-tsc --noEmit` 确保前端 TypeScript 编译通过