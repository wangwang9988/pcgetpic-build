# Checklist

- [x] Rust 命令 `open_folder` 已实现，支持 Windows/macOS/Linux 三平台
- [x] Rust 命令 `locate_file` 已实现，支持 Windows/macOS/Linux 三平台
- [x] 两个新命令已在 `run()` 中注册
- [x] `downloadManager.ts` 的 `locateFile()` 改用 `invoke('locate_file', ...)`
- [x] `downloadManager.ts` 的 `openDownloadFolder()` 改用 `invoke('open_folder', ...)`
- [x] 不再使用的 `shell` import 已移除
- [x] `cargo check` 通过（Rust 编译无误）
- [x] 前端 TypeScript 编译通过