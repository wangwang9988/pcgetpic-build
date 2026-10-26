# Checklist

- [x] `default.json` 中 `http:default` 已变为对象格式，包含 `"allow": [{"url": "https://*"}, {"url": "http://*"}]`
- [x] `default.json` JSON 语法有效
- [x] `vue-tsc --noEmit` 无类型错误
- [x] `vite build` 构建成功
- [x] `src-tauri/Cargo.toml` 仍包含 `tauri-plugin-http = "2"`
- [x] `src-tauri/src/lib.rs` 仍注册 `.plugin(tauri_plugin_http::init())`