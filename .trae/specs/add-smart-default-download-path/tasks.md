# Tasks

- [x] Task 1: Rust 后端新增 `get_default_download_path` 命令
  - [x] SubTask 1.1: 在 `commands/config.rs` 中新增 `get_default_download_path` Tauri Command 函数
  - [x] SubTask 1.2: 实现浏览器 Preferences 解析逻辑：读取 Chrome/Edge 的 `download.default_directory` 字段，验证路径有效性
  - [x] SubTask 1.3: 实现盘符探测逻辑：依次检查 D/E/F/C 盘是否存在，在首个存在的盘符下创建 `下载` 文件夹
  - [x] SubTask 1.4: 在 `lib.rs` 的 `invoke_handler` 中注册 `commands::config::get_default_download_path`

- [x] Task 2: 前端 `downloadManager.ts` 新增自动探测初始化逻辑
  - [x] SubTask 2.1: 新增 `initDefaultDownloadPath()` 静态方法：检查 localStorage 为空时调用 `invoke('get_default_download_path')`，成功后写入内存缓存和 localStorage
  - [x] SubTask 2.2: 在模块初始化阶段（`_downloadFolderPath` ref 初始化后）调用 `initDefaultDownloadPath()`

- [x] Task 3: DownloadSettings 组件适配
  - [x] SubTask 3.1: 更新 placeholder 文案，从"未设置（每次下载将询问）"改为"未设置（将自动探测默认路径）"

# Task Dependencies
- [Task 2] depends on [Task 1] (前端需要调用后端命令)
- [Task 3] depends on [Task 2] (组件需要适配新的探测行为)
