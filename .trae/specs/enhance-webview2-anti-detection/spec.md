# 增强 WebView2 反检测能力 Spec

## Why
1688 平台会主动检测嵌入式 WebView 环境（如 `navigator.webdriver`、`chrome.runtime` 等特征属性），导致登录页无法正常加载或登录流程中断。需要从 **Chromium 内核参数**（治本）和 **initialization_script**（治标兜底）两个层面同时入手，彻底消除 WebView2 的自动化环境特征。

## What Changes
- **治本**：在 `additional_browser_args` 中增加 `--disable-blink-features=AutomationControlled`，从 Chromium 内核层面禁止 `navigator.webdriver` 属性的创建
- **治标兜底**：在所有 WebView2 窗口的 `initialization_script` 中注入反检测 JS 脚本
- `open_login_window`（commands.rs）：**新增** `.initialization_script()` 调用（当前没有）
- `do_dispatch`（dispatch.rs）：在现有 `set_metadata` 脚本中**追加**反检测脚本（不能覆盖原有内容）
- 反检测脚本覆盖 `navigator.webdriver`、`chrome.runtime` 等 WebView2 特征属性

## Impact
- Affected specs: 无（纯增强，不影响现有功能）
- Affected code: `src-tauri/src/commands.rs`、`src-tauri/src/dispatch.rs`

## ADDED Requirements
### Requirement: Chromium 内核级反检测（治本）
系统 SHALL 在所有 WebView2 窗口的启动参数中添加 `--disable-blink-features=AutomationControlled`，从 Chromium Blink 引擎层面禁止 `navigator.webdriver` 属性的创建。

#### Scenario: 内核参数生效
- **WHEN** WebView2 窗口启动
- **THEN** Chromium 内核不会在 `navigator` 上创建 `webdriver` 属性
- **THEN** `'webdriver' in navigator` 返回 `false`
- **THEN** `navigator.hasOwnProperty('webdriver')` 返回 `false`

### Requirement: JS 层反检测兜底（治标）
系统 SHALL 在 `initialization_script` 中注入 JS 反检测脚本，覆盖以下 WebView2 特征：
- `navigator.webdriver` → 使用 `Object.defineProperty` 设置 getter 返回 `false`
- `chrome.runtime` → 模拟真实 Chrome 浏览器的 `chrome.runtime` 对象（WebView2 的 `chrome.runtime` 形态不同）

#### Scenario: 登录窗口创建时注入反检测脚本
- **WHEN** `open_login_window` 创建登录 WebView2 窗口
- **THEN** `.initialization_script()` 包含反检测 JS 脚本
- **THEN** 首次调用 `.initialization_script()`（当前该窗口无此调用）

#### Scenario: Worker 窗口创建时注入反检测脚本
- **WHEN** `do_dispatch` 创建 Worker WebView2 窗口
- **THEN** 反检测脚本追加到现有 `set_metadata` 脚本之后
- **THEN** 不覆盖原有的 `window.__WORKER_TASK_ID__` 等元数据设置

#### Scenario: 1688 平台无法检测到 WebView2 环境
- **WHEN** 1688 页面 JavaScript 执行反爬检测逻辑
- **THEN** `navigator.webdriver` 返回 `undefined` 或 `false`
- **THEN** `'webdriver' in navigator` 返回 `false`
- **THEN** `delete navigator.webdriver` 后属性不再出现

#### Scenario: 不影响正常浏览器功能
- **WHEN** 页面 JavaScript 读取 `navigator.userAgent` 或其他标准属性
- **THEN** 应返回正常的 Chrome UA 字符串，不受反检测脚本影响