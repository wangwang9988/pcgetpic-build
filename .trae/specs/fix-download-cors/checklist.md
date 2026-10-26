# Checklist

- [x] `Cargo.toml` 包含 `tauri-plugin-http = "2"` 依赖
- [x] `lib.rs` 中注册了 `.plugin(tauri_plugin_http::init())`
- [x] `default.json` permissions 包含 `"http:default"`
- [x] `package.json` dependencies 包含 `"@tauri-apps/plugin-http": "^2"`
- [x] `downloadManager.ts` 使用 `@tauri-apps/plugin-http` 的 `fetch`，不再使用原生 `fetch`
- [x] `downloadManager.ts` 的 `handleError` 能正确打印非 Error 对象的异常信息
- [x] `ImageDisplay.vue` 的 `getImageFileSize` 使用 `@tauri-apps/plugin-http` 的 `fetch`
- [x] `VideoDisplay.vue` 的 `getVideoFileSize` 使用 `@tauri-apps/plugin-http` 的 `fetch`
- [x] `vue-tsc --noEmit` 无类型错误
- [x] `vite build` 构建成功