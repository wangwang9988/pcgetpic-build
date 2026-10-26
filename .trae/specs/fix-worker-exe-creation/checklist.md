# Checklist

- [x] `tauri.conf.json` 的 `bundle` 对象中包含 `"resources"` 字段，值为 `{ "../dist-scripts/*": "bundles/" }`
- [x] `lib.rs` 的 `setup` 闭包中调用 `app.path().resource_dir()` 获取资源目录
- [x] `lib.rs` 中 `AppState::new(data_dir, resource_dir)` 传递两个参数
- [x] `state.rs` 中 `AppState::new` 签名包含 `resource_dir: PathBuf` 参数
- [x] `state.rs` 中 `bundles_dir` 设为 `resource_dir.join("bundles")` 而非 `app_data_dir.join("bundles")`
- [x] `cargo check` 编译通过，无编译错误
- [ ] 前端 `npm run build` 编译通过
- [ ] 安装版 exe 中 `resource_dir/bundles/` 目录包含所有平台的 `.bundle.js` 文件
- [ ] 安装版 exe 中抓取 Worker 窗口能正常弹出
- [ ] 安装版 exe 中登录 Worker 窗口不受影响（回归验证）
- [ ] 开发模式（npm run dev）中 Worker 窗口不受影响（回归验证）
- [x] `ScriptInjector::find_dev_bundles_dir()` 逻辑未变更（开发模式仍然从 `dist-scripts/` 加载）