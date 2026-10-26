# Checklist

- [ ] `injector.rs` 新增 `PreparedWindow` 结构体，包含 `WebviewWindow` 和 `Arc<AtomicU32>` 加载计数器
- [ ] `prepare_temp_window()` 函数创建临时窗口并等待首次页面加载 Started 事件
- [ ] `inject_cookies_into_window()` 函数接收预创建窗口，执行 Cookie 注入、跨域名导航、关闭
- [ ] 原 `inject_cookies_to_data_dir_multi` 保持兼容（内部调用新函数）
- [ ] `cookie_import/mod.rs` 正确导出 `PreparedWindow`、`prepare_temp_window`、`inject_cookies_into_window`
- [ ] `confirm_external_login` 中 CDP 获取和窗口创建并行执行
- [ ] CDP 重试次数从 15 改为 3
- [ ] CDP 重试间隔从 500ms 改为 200ms
- [ ] 窗口关闭等待从 3s 改为 1s
- [ ] 项目编译通过（`cargo build`）
- [ ] 1688 平台外部登录后 Cookie 导入功能正常，Worker 可使用登录态
- [ ] 导入耗时比此前缩短（对比优化前后日志中的 `总耗时`）