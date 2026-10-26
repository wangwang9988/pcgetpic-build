# Tasks

- [x] Task 1: 在 `do_dispatch` 中添加 `on_page_load` 回调，实现动态注入逻辑
  - [x] SubTask 1.1: 在 `WebviewWindowBuilder` 链式调用中添加 `.on_page_load()` 回调
  - [x] SubTask 1.2: 在回调中判断 `PageLoadEvent::Finished` 事件，获取 `payload.url()`
  - [x] SubTask 1.3: 使用 `CookieManager::detect_login_redirect` 和 `CookieManager::is_captcha_page` 过滤拦截页
  - [x] SubTask 1.4: 对非拦截页，通过 `webview.eval()` 注入 `__WORKER_TASK_ID__` 和 bundle 脚本
  - [x] SubTask 1.5: 在注入前检查 `window.__SCRAPER_INJECTED__` 防重复注入
  - [x] SubTask 1.6: 注入成功后发送 `bundle-injected` IPC 事件，失败发送 `bundle-inject-failed`
  - [x] SubTask 1.7: 验证码页发送 `captcha-detected` IPC 事件

- [x] Task 2: 移除旧的 `sleep(5)` + 手动 `eval()` 注入逻辑
  - [x] SubTask 2.1: 删除 `build()` 成功后的 `std::thread::sleep(Duration::from_secs(5))` 代码
  - [x] SubTask 2.2: 删除 `build()` 成功后的手动 `wv.eval(&set_task_id)` 和 `wv.eval(&item.bundle_content)` 代码
  - [x] SubTask 2.3: 保留 `build()` 成功后的窗口创建成功日志

- [x] Task 3: 在 scraper-scripts 共享模块中添加防重复注入标记
  - [x] SubTask 3.1: 在 Rust 侧通过 `if (!window.__SCRAPER_INJECTED__)` 包装实现防重复注入（无需修改 scraper-scripts）
  - [x] SubTask 3.2: 确认 `initialization_script` 中的 `__WORKER_TASK_ID__` 在页面刷新后仍能正确注入（由 Tauri 的 initialization_script 机制保证）

- [x] Task 4: 编译验证与手动测试
  - [x] SubTask 4.1: 运行 `cargo build` 确认编译通过 ✅
  - [ ] SubTask 4.2: 运行 `npm run tauri dev` 启动客户端（需用户手动测试）
  - [ ] SubTask 4.3: 输入4个链接（含可能触发登录/验证码的链接），验证正常页面能自动注入并获取数据（需用户手动测试）
  - [ ] SubTask 4.4: 验证登录/验证码页面跳过注入，登录成功后自动重新注入（需用户手动测试）

# Task Dependencies
- [Task 2] depends on [Task 1]（先建新逻辑再删旧逻辑）
- [Task 3] independent（可与 Task 1 并行）
- [Task 4] depends on [Task 1, Task 2, Task 3]
