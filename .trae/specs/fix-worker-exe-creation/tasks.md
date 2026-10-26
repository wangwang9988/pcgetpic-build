# Tasks

- [x] Task 1: `tauri.conf.json` 添加 `bundle.resources` 配置
  - 在 `bundle` 对象中添加 `"resources"` 字段
  - 将 `../dist-scripts/*` 映射到 `bundles/` 目标路径
  - 确保所有 `.bundle.js` 文件在 `npm run build:app` 时被打包进安装包
  - **验证**: `cargo check` 编译通过（配置语法正确），构建 exe 后检查资源目录是否包含 bundle 文件

- [x] Task 2: `lib.rs` 传递 `resource_dir` 给 `AppState::new()`
  - 在 `setup` 闭包中调用 `app.path().resource_dir()` 获取资源目录路径
  - 将 `resource_dir` 作为第二个参数传递给 `AppState::new(data_dir, resource_dir)`
  - 添加错误处理：`resource_dir()` 返回 `Result`，需 `.expect()` 或 `map_err()`
  - **验证**: `cargo check` 编译通过

- [x] Task 3: `state.rs` 更新 `AppState::new` 签名
  - 添加 `resource_dir: PathBuf` 参数
  - 将 `bundles_dir` 从 `app_data_dir.join("bundles")` 改为 `resource_dir.join("bundles")`
  - `cookie_dir` 保持 `app_data_dir.join("cookies")` 不变
  - 更新注释说明生产/开发环境的路径差异
  - **验证**: `cargo check` 编译通过

# Task Dependencies
- Task 2 和 Task 3 有依赖关系（Task 3 修改 `AppState::new` 签名，Task 2 调用处也需要同步修改），建议合并为一个 commit
- Task 1 独立，可并行执行

# Implementation Notes
- 修改文件：
  - `src-tauri/tauri.conf.json` — Task 1（**核心修复**）
  - `src-tauri/src/lib.rs` — Task 2
  - `src-tauri/src/state.rs` — Task 3
- 核心思路：Tauri v2 的 `bundle.resources` 会在构建时将指定文件复制到资源目录；`app.path().resource_dir()` 在运行时返回该目录的路径
- `ScriptInjector::find_dev_bundles_dir()` 逻辑**不变**：开发模式下找到 `dist-scripts/` 目录时仍然优先使用；安装版 exe 中返回 `None` 后回退到 `resource_dir/bundles/`
- 同事的改动（`commands.rs` 不关登录窗口、`dispatch.rs` 延迟关闭、`ControlBar.vue` 移除 `close_login_windows` 调用）**保留不变**