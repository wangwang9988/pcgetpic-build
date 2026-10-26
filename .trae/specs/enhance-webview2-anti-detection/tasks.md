# Tasks: 增强 WebView2 反检测能力

- [x] Task 1: 在 `open_login_window` 中添加内核参数和反检测脚本
  - 在 `src-tauri/src/commands.rs` 的 `open_login_window` 函数中：
    - 将 `.additional_browser_args(...)` 的参数字符串从仅含 `--user-agent` 改为**同一字符串内**追加 ` --disable-blink-features=AutomationControlled`（用空格分隔，不要拆成两次调用）
    - **新增** `.initialization_script()` 调用，注入反检测 JS 脚本（该窗口当前无此调用）
    - 反检测脚本内容：
      ```
      // 兜底覆盖 navigator.webdriver（内核参数已从根源禁掉，此处为双重保险）
      Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
      // 模拟真实 Chrome 的 chrome.runtime（WebView2 中可能不存在或形态异常）
      if (!window.chrome) window.chrome = {};
      if (!window.chrome.runtime) window.chrome.runtime = { id: undefined };
      ```

- [x] Task 2: 在 `do_dispatch` 中添加内核参数和反检测脚本
  - 在 `src-tauri/src/dispatch.rs` 的 `do_dispatch` 函数中：
    - 将 `.additional_browser_args(...)` 的参数字符串改为包含 ` --disable-blink-features=AutomationControlled`
    - 在现有 `set_metadata` 字符串末尾**追加**反检测 JS 脚本（不能覆盖原有 `window.__WORKER_TASK_ID__` 等设置）
    - 反检测脚本内容与 Task 1 相同

- [x] Task 3: 编译验证
  - 执行 `cargo build` 确保 Rust 代码编译通过
  - 验证无语法错误、无类型错误 ✓（仅有一个预存的 TemplateLoginStrategy 警告，无新增错误）

# Task Dependencies
- Task 1 和 Task 2 相互独立，可并行执行
- Task 3 依赖 Task 1 和 Task 2 均完成