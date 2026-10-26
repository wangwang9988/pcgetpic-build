# Checklist: 增强 WebView2 反检测能力

- [x] `open_login_window` 的 `additional_browser_args` 字符串包含 `--disable-blink-features=AutomationControlled`（与 `--user-agent` 在同一字符串内，空格分隔）
- [x] `do_dispatch` 的 `additional_browser_args` 字符串包含 `--disable-blink-features=AutomationControlled`（与 `--user-agent` 在同一字符串内，空格分隔）
- [x] `open_login_window` 新增了 `.initialization_script()` 调用（当前无此调用）
- [x] `do_dispatch` 的 `set_metadata` 初始化脚本中追加了反检测 JS（不覆盖原有内容）
- [x] 反检测 JS 用 `Object.defineProperty` 覆盖 `navigator.webdriver` getter 返回 `false`
- [x] 反检测 JS 模拟了 `chrome.runtime` 为 `{ id: undefined }`（仅当不存在时创建，不覆盖真实 Chrome 的 `chrome.runtime`）
- [x] `--disable-blink-features=AutomationControlled` 从 Chromium 内核级禁止 `navigator.webdriver` 属性创建
- [x] `cargo build` 编译通过