# Checklist

- [x] `Cargo.toml` 包含 `reqwest` 依赖，不包含 `tauri-plugin-http`
- [x] `lib.rs` 未注册 `tauri_plugin_http`
- [x] `lib.rs` 实现了 `download_file` 命令（含 User-Agent、Referer、错误处理）
- [x] `lib.rs` `invoke_handler` 包含 `download_file`
- [x] `package.json` 不包含 `@tauri-apps/plugin-http`
- [x] `default.json` 不包含 `http:default`
- [x] `downloadManager.ts` 使用 `invoke('download_file', ...)`，不再使用 Tauri HTTP fetch
- [x] `ImageDisplay.vue` 使用浏览器原生 fetch
- [x] `VideoDisplay.vue` 使用浏览器原生 fetch
- [x] `vue-tsc --noEmit` 无类型错误
- [x] `vite build` 构建成功