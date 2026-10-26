# Tasks

- [x] Task 1: Rust 后端集成 tauri-plugin-http
  - [x] 在 `src-tauri/Cargo.toml` 的 `[dependencies]` 中添加 `tauri-plugin-http = "2"`
  - [x] 在 `src-tauri/src/lib.rs` 的 `run()` 函数中注册 `.plugin(tauri_plugin_http::init())`
  - [x] 在 `src-tauri/capabilities/default.json` 的 `permissions` 中添加 `"http:default"`

- [x] Task 2: 前端依赖安装与 fetch 替换
  - [x] 在 `package.json` 的 `dependencies` 中添加 `"@tauri-apps/plugin-http": "^2"`
  - [x] 执行 `npm install` 安装新依赖
  - [x] 在 `src/utils/downloadManager.ts` 中将 `fetch` 替换为 `import { fetch } from '@tauri-apps/plugin-http'`，并增强 `handleError` 日志
  - [x] 在 `src/components/ImageDisplay.vue` 的 `getImageFileSize` 中将原生 `fetch` 替换为 `import { fetch } from '@tauri-apps/plugin-http'`
  - [x] 在 `src/components/VideoDisplay.vue` 的 `getVideoFileSize` 中将原生 `fetch` 替换为 `import { fetch } from '@tauri-apps/plugin-http'`

- [x] Task 3: 验证构建
  - [x] 执行 `npm run build`（含 `vue-tsc --noEmit`）确认无类型错误
  - [x] 执行 Tauri 构建确认 Rust 编译通过

# Task Dependencies
- Task 2 依赖 Task 1（需先完成 Rust 端插件配置，前端才能使用 HTTP 插件）
- Task 3 依赖 Task 1 和 Task 2