# Tasks

- [x] Task 1: Rust 后端 — 替换依赖并实现 download_file 命令
  - [x] 在 `Cargo.toml` 中将 `tauri-plugin-http = "2"` 替换为 `reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "charset", "http2"] }`
  - [x] 在 `lib.rs` 中移除 `.plugin(tauri_plugin_http::init())`
  - [x] 在 `lib.rs` 中实现 `download_file` 异步命令（使用 reqwest GET + std::fs::write）
  - [x] 在 `lib.rs` 中实现 `get_referer_from_url` 辅助函数
  - [x] 在 `invoke_handler` 中注册 `download_file`

- [x] Task 2: 前端 — 回退 HTTP 插件，重构 downloadManager
  - [x] 在 `package.json` 中移除 `"@tauri-apps/plugin-http"` 依赖
  - [x] 执行 `npm install` 清理
  - [x] 在 `downloadManager.ts` 中：移除 `import { fetch } from '@tauri-apps/plugin-http'`，导入 `invoke`，将 `fetchResource` 逻辑替换为 `invoke('download_file', { url, filePath })`
  - [x] 在 `ImageDisplay.vue` 中移除 `import { fetch } from '@tauri-apps/plugin-http'`，恢复浏览器原生 `fetch`
  - [x] 在 `VideoDisplay.vue` 中移除 `import { fetch } from '@tauri-apps/plugin-http'`，恢复浏览器原生 `fetch`

- [x] Task 3: 权限配置 — 清理 default.json
  - [x] 在 `default.json` 中移除 `http:default` 权限对象

- [x] Task 4: 验证构建与启动
  - [x] 运行 `vue-tsc --noEmit` 确认无类型错误
  - [x] 运行 `vite build` 确认前端构建成功
  - [x] 运行 `npm run dev`（含 Rust 编译）确认应用正常启动

# Task Dependencies
- Task 2 依赖 Task 1（Rust 端命令需先实现，前端才能 invoke）
- Task 3 可与 Task 1、Task 2 并行
- Task 4 依赖 Task 1、Task 2、Task 3