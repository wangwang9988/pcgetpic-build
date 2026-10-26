# 修复登录/验证码重定向后爬虫脚本不重新注入 Spec

## Why

当用户输入的商品链接触发登录页或滑块验证码拦截时，用户在 Worker 窗口手动完成登录/过验证码后，页面自动重定向回商品详情页，但爬虫脚本未重新注入，导致任务永久卡在"等待获取中"。根本原因是当前的注入机制采用 `sleep(5)` + 单次 `eval()` 的静态策略，无法感知页面重载事件。

## 同事方案评审结论

同事的方案**核心思路正确**，分析准确，方案可行。具体评审如下：

### ✅ 正确的部分
1. **根因分析准确**：`sleep(5)` + 单次 `eval()` 在页面重定向后 JS 上下文销毁，脚本丢失且无重新注入机制
2. **`on_page_load` 方案正确**：Tauri v2 的 `WebviewWindowBuilder::on_page_load` API 确认可用，支持 `PageLoadEvent::Finished` 事件
3. **URL 过滤策略合理**：登录页/验证码页跳过注入，商品详情页自动注入
4. **移除硬延迟合理**：`sleep(5)` 效率低且不可靠

### ⚠️ 需要补充/调整的部分
1. **保留 `on_navigation` 回调**：`on_navigation` 在导航前触发，用于早期登录检测和 UI 通知；`on_page_load` 在页面加载完成后触发，用于重新注入。两者职责不同，不应替代而应共存
2. **防重复注入**：`on_page_load` 在 SPA 页面或 iframe 加载时可能多次触发，需确保 bundle 不会在同一页面上重复执行导致数据重复发送
3. **首次加载也走 `on_page_load`**：移除 `sleep(5)` 后，首次页面加载的注入也应统一由 `on_page_load` 回调处理，而非 `build()` 后手动 `eval()`
4. **`on_page_load` 闭包中的 `eval`**：闭包参数是 `Webview<R>` 而非 `WebviewWindow`，可直接调用 `webview.eval()`，无需再通过 `app_handle.get_webview_window()` 获取窗口

## What Changes
- 将 `do_dispatch` 中的 `sleep(5)` + 单次 `eval()` 注入机制替换为 `on_page_load` 动态注入
- 在 `on_page_load` 回调中根据 URL 判断是否为拦截页（登录/验证码），非拦截页自动注入 bundle
- 保留现有 `on_navigation` 回调用于登录检测通知
- 在注入脚本侧增加防重复注入标记（`window.__SCRAPER_INJECTED__`）

## Impact
- Affected code: `src-tauri/src/lib.rs`（核心修改）、`scraper-scripts/shared/tauri-bridge.ts`（防重复标记）
- Affected specs: Worker 窗口生命周期管理、脚本注入流程

## ADDED Requirements

### Requirement: 基于 on_page_load 的动态注入机制
系统 SHALL 在 Worker 窗口的 `WebviewWindowBuilder` 上注册 `on_page_load` 回调，在 `PageLoadEvent::Finished` 事件触发时，根据当前页面 URL 决定是否注入爬虫脚本。

#### Scenario: 正常商品页首次加载
- **WHEN** Worker 窗口加载商品详情页，`on_page_load` 触发 `Finished` 事件
- **AND** URL 不匹配登录页/验证码页模式
- **THEN** 系统自动注入 `window.__WORKER_TASK_ID__` 和 bundle 脚本
- **AND** 发送 `bundle-injected` IPC 事件

#### Scenario: 页面重定向到登录页
- **WHEN** Worker 窗口因未登录重定向到登录页，`on_page_load` 触发 `Finished` 事件
- **AND** URL 匹配登录页模式（`detect_login_redirect` 返回 Some）
- **THEN** 跳过 bundle 注入
- **AND** 发送 `login-required` IPC 事件（由 `on_navigation` 负责）

#### Scenario: 登录成功后重定向回商品页
- **WHEN** 用户在 Worker 窗口完成登录，页面自动重定向回商品详情页
- **AND** `on_page_load` 触发 `Finished` 事件，URL 不匹配拦截页模式
- **THEN** 系统自动重新注入 `window.__WORKER_TASK_ID__` 和 bundle 脚本
- **AND** 爬虫脚本正常执行并回传数据

#### Scenario: 验证码页面
- **WHEN** Worker 窗口加载验证码页面，`on_page_load` 触发 `Finished` 事件
- **AND** URL 匹配验证码页模式（`is_captcha_page` 返回 true）
- **THEN** 跳过 bundle 注入
- **AND** 发送 `captcha-detected` IPC 事件

### Requirement: 移除硬延迟注入
系统 SHALL 移除 `do_dispatch` 中 `build()` 成功后的 `std::thread::sleep(5)` 和手动 `eval()` 注入逻辑，统一由 `on_page_load` 回调处理所有注入时机。

#### Scenario: 移除旧注入代码
- **WHEN** `WebviewWindowBuilder::build()` 成功
- **THEN** 不再执行 `sleep(5)` 和手动 `eval(bundle_content)`
- **AND** 仅打印窗口创建成功日志

### Requirement: 防止重复注入
系统 SHALL 在注入 bundle 前检查 `window.__SCRAPER_INJECTED__` 标记，避免同一页面多次注入导致数据重复发送。

#### Scenario: 同一页面 on_page_load 多次触发
- **WHEN** `on_page_load` 的 `Finished` 事件在同一页面上多次触发（如 iframe 加载）
- **AND** `window.__SCRAPER_INJECTED__` 已存在
- **THEN** 跳过注入，打印日志"已注入，跳过"

#### Scenario: 页面刷新/重定向后重新注入
- **WHEN** 页面发生刷新或重定向，JS 上下文销毁
- **THEN** `window.__SCRAPER_INJECTED__` 标记随之消失
- **AND** `on_page_load` 在新页面加载完成后正常注入

## MODIFIED Requirements

### Requirement: on_navigation 回调保留
现有 `on_navigation` 回调继续用于导航前的登录检测和 UI 通知，与 `on_page_load` 各司其职，不做修改。
