# 修复防拥堵登录验证机制 Spec

## Why
当前防拥堵登录验证机制存在两个致命 BUG：1) 看门狗未豁免 WaitingForLogin 状态，导致等待 Worker 在 60 秒后被强杀；2) data:text/html 沙箱限制导致强制开始按钮失效和自动导航被拦截。两者叠加导致跟随者 Worker 永远无法被唤醒。

## What Changes
- **看门狗豁免扩展**：60 秒看门狗同时豁免 `CaptchaBlocked` 和 `WaitingForLogin` 两种状态
- **废弃 data:text/html 等待页**：改用 Tauri App 内置本地页面（`WebviewUrl::App`），确保 `window.__TAURI__` API 可用且 `location.href` 导航不受限
- **前端新增等待页面组件**：App.vue 检测 URL 参数 `page=waiting`，条件渲染等待组件
- **verified_platforms 过期清理**：Worker 进入 CaptchaBlocked 时自动移除该平台的验证缓存，防止 Session 过期后误判
- **移除 lib.rs 中硬编码的 HTML 模板**：不再在 Rust 代码中拼接 data:text/html 字符串

## Impact
- Affected specs: fix-platform-login-strategy
- Affected code:
  - `src-tauri/src/lib.rs` — 看门狗豁免、等待页 URL 改造、verified_platforms 清理
  - `src/App.vue` — 新增等待页面条件渲染
  - `src-tauri/src/worker_pool.rs` — 新增 `unverify_platform()` 方法

## ADDED Requirements

### Requirement: 看门狗豁免 WaitingForLogin 状态
系统 SHALL 在 60 秒看门狗超时检查中，同时豁免 `CaptchaBlocked` 和 `WaitingForLogin` 两种状态的 Worker，确保等待中的跟随者 Worker 不会被看门狗强杀。

#### Scenario: 等待 Worker 不被看门狗强杀
- **WHEN** Worker 处于 `WaitingForLogin` 状态且已超过 60 秒
- **THEN** 看门狗跳过该 Worker，不执行强制清理和窗口关闭

### Requirement: 使用 Tauri App 内置本地等待页
系统 SHALL 废弃 `data:text/html` 方式加载等待页面，改用 `WebviewUrl::App` 加载 Tauri 前端应用内置的等待页面，通过 URL 参数传递平台名和 Worker ID。

#### Scenario: 等待页创建
- **WHEN** Worker 被分配为 WaitingForLogin 状态
- **THEN** 创建 WebView 窗口时使用 `WebviewUrl::App("index.html?page=waiting&platform={platform}&workerId={workerId}")` 加载等待页

#### Scenario: 等待页强制开始按钮可用
- **WHEN** 用户在等待页面点击"强制开始"按钮
- **THEN** 按钮通过 `invoke('force_start_worker', { workerId })` 成功调用 Tauri IPC 命令

#### Scenario: 自动释放导航成功
- **WHEN** 探路者验证成功，后端通过 `window.eval("location.href = '...'")` 导航跟随者到商品页
- **THEN** 导航成功执行，WebView2 不拦截从受信任本地页面到外部 HTTPS 的跳转

### Requirement: 前端等待页面组件
前端 SHALL 在 App.vue 中检测 URL 参数 `page=waiting`，当检测到时渲染全屏等待组件而非主程序界面。

#### Scenario: 等待页渲染
- **WHEN** WebView 加载 `index.html?page=waiting&platform=taobao&workerId=1`
- **THEN** 前端渲染深色渐变毛玻璃风格的等待页面，显示平台名和"强制开始"按钮

#### Scenario: 正常页面不受影响
- **WHEN** WebView 加载 `index.html`（无 page 参数）
- **THEN** 前端正常渲染主程序界面

### Requirement: 验证缓存过期自动清理
系统 SHALL 在 Worker 进入 CaptchaBlocked 状态时，自动将该平台从 verified_platforms 中移除，防止 Session 过期后验证缓存误判。

#### Scenario: 登录拦截时清理验证缓存
- **WHEN** Worker 检测到登录/验证码页面，状态变为 CaptchaBlocked
- **THEN** 该 Worker 所属平台从 verified_platforms 中移除，后续同平台新任务重新进入防守拦截

## MODIFIED Requirements

### Requirement: 看门狗超时检查
原有看门狗仅豁免 CaptchaBlocked，现扩展为同时豁免 CaptchaBlocked 和 WaitingForLogin。

### Requirement: 等待页面加载方式
原有方式为 Rust 代码拼接 data:text/html 字符串，现改为 WebviewUrl::App 加载前端内置页面。

## REMOVED Requirements

### Requirement: data:text/html 等待页面
**Reason**: WebView2 对 data: URL 启用严格沙箱，导致 window.__TAURI__ 不可用和 location.href 外部导航被拦截
**Migration**: 改用 WebviewUrl::App 加载前端内置等待页面
