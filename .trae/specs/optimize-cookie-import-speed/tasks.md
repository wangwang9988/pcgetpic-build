# Tasks

- [ ] Task 1: 拆分 `injector.rs` — 新增 `prepare_temp_window()` 和 `inject_cookies_into_window()` 两阶段 API
  - [ ] 从 `inject_cookies_to_data_dir_multi` 中提取窗口创建 + 等待首次页面加载的逻辑，封装为 `prepare_temp_window()`
  - [ ] `prepare_temp_window()` 返回一个 `PreparedWindow` 结构体，包含 `WebviewWindow` 句柄和 `Arc<AtomicU32>` 加载计数器
  - [ ] 将 Cookie 注入、跨域名导航、窗口关闭逻辑封装为 `inject_cookies_into_window()`
  - [ ] 保持原 `inject_cookies_to_data_dir_multi` 函数兼容（内部调用上述两个函数）
  - [ ] 添加详细日志（窗口准备耗时、注入耗时等）

- [ ] Task 2: 修改 `cookie_import/mod.rs` — 注册新函数
  - [ ] 导出 `PreparedWindow` 结构体
  - [ ] 导出 `prepare_temp_window` 和 `inject_cookies_into_window` 函数

- [ ] Task 3: 修改 `commands/login.rs` — 并行化 `confirm_external_login`
  - [ ] 在 CDP 获取 Cookie 的同时，启动 `prepare_temp_window()` 创建临时窗口
  - [ ] 使用 `tauri::async_runtime::spawn_blocking` 分别启动两个后台任务
  - [ ] 两者都完成后，调用 `inject_cookies_into_window()` 注入 Cookie
  - [ ] 保持现有的日志输出和错误处理

- [ ] Task 4: 修改 `cdp.rs` — 优化 CDP 重试策略
  - [ ] 重试次数从 15 改为 3
  - [ ] 重试间隔从 500ms 改为 200ms
  - [ ] 保持首次连接成功即退出的逻辑

- [ ] Task 5: 修改 `injector.rs` — 缩短窗口关闭等待时间
  - [ ] `inject_cookies_into_window()` 中窗口关闭等待从 3s 改为 1s

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3 依赖 Task 1 和 Task 2
- Task 4 独立，可并行执行
- Task 5 依赖 Task 1（在同一个文件中）