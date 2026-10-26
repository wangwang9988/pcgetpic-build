# 优化 Cookie 导入速度 Spec（修订版 v2）

## Why

用户反馈：1688 平台外部浏览器登录后，Cookie 导入到 Worker 可用时间偏慢（约 4-10 秒）。同事已做部分优化，但上级方案（直写 SQLite）经实测**反而更慢且 Cookie 不可用**，原因是绕过了 WebView2 的 CookieManager 内部状态管理机制。

**根本瓶颈**：当前 `confirm_external_login` 的 CDP 获取 Cookie 和创建临时 WebView2 窗口是**串行执行**的，二者独立无依赖，完全可以并行。

## What Changes

### 核心思路：并行化 CDP 获取与窗口创建

当前流程（串行）：
```
CDP 获取 Cookie (1-2s) → 过滤/分组 → 创建临时窗口 (0.5s) → 等待页面加载 (1-2s) → 注入组1 → 导航组2 (1-2s) → 注入组2 → 关闭窗口 (1-3s)
总耗时: ~4-10s
```

优化后流程（并行）：
```
CDP 获取 Cookie (1-2s) ─┐
                          ├→ 过滤/分组 → 注入组1 → 导航组2 (1-2s) → 注入组2 → 关闭窗口 (1s)
创建窗口+等待加载 (1-2s) ─┘
总耗时: ~3-5s（省去窗口创建+页面加载的 1-2s）
```

### 具体改动

#### 1. 拆分 `inject_cookies_to_data_dir_multi` 为两阶段 API

**新增 `prepare_temp_window()`**：创建临时 WebView2 窗口 + 等待首次页面加载完成，返回窗口句柄和加载计数器。此函数可在 CDP 获取 Cookie 的同时并行执行。

**新增 `inject_cookies_into_window()`**：接收预创建的窗口，执行 Cookie 注入、跨域名导航、窗口关闭。此函数需要 Cookie 数据作为输入。

#### 2. 修改 `confirm_external_login` 并行化

- 在 `spawn_blocking` 中同时启动 CDP 获取和窗口准备
- 使用 `tokio::join!` 或 `tauri::async_runtime::spawn_blocking` 并行等待
- 两者都完成后，再执行 Cookie 注入

#### 3. CDP 重试策略优化

- 重试次数：15 次 → 3 次（用户已登录，浏览器已运行，首次连接几乎必定成功）
- 重试间隔：500ms → 200ms
- 最坏情况等待：7.5s → 0.6s

#### 4. 窗口关闭等待时间缩短

- 关闭等待：3s → 1s（`AddOrUpdateCookie` 是同步写入，不需要长时间等待 flush）

### 为什么不用直写 SQLite

直写 SQLite 方案失败原因：
1. WebView2 的 Cookie 持久化不仅仅是 SQLite 记录，还涉及内存中的 `CookieMonster` 状态、`LocalStorage` 关联数据等
2. 绕过 `ICoreWebView2CookieManager::AddOrUpdateCookie` API 会导致 Cookie 的 `source_scheme`、`source_port`、`last_access_utc` 等元数据字段不正确
3. WebView2 进程在读取 Cookie 时可能会因为元数据不一致而忽略/拒绝这些 Cookie

**结论**：必须通过 WebView2 CookieManager API 注入，不能绕过。

## Impact

- Affected specs: `fix-1688-external-chrome-login`
- Affected code:
  - `src-tauri/src/cookie_import/injector.rs` — 拆分出 `prepare_temp_window()` + `inject_cookies_into_window()`
  - `src-tauri/src/cookie_import/mod.rs` — 注册新函数
  - `src-tauri/src/commands/login.rs` — 并行化 `confirm_external_login`
  - `src-tauri/src/cdp.rs` — 减少 CDP 重试次数和间隔
- Affected platforms: 所有使用外部浏览器登录的平台（30+ 平台）
- **BREAKING**: 无（内部重构，API 兼容）

## ADDED Requirements

### Requirement: 两阶段 Cookie 注入 API

系统 SHALL 提供分离的窗口准备和 Cookie 注入接口，允许窗口创建与 CDP 获取并行执行。

#### Scenario: 并行执行窗口准备和 CDP 获取
- **WHEN** `confirm_external_login` 被调用
- **THEN** 系统同时启动两个后台任务：CDP 获取 Cookie 和创建临时 WebView2 窗口
- **THEN** 两个任务独立执行，互不阻塞
- **THEN** 两者都完成后才开始 Cookie 注入

#### Scenario: 窗口准备阶段
- **WHEN** `prepare_temp_window()` 被调用
- **THEN** 创建 1×1 像素不可见 WebView2 窗口
- **THEN** 导航到首个目标 URL
- **THEN** 等待 `PageLoadEvent::Started` 事件触发
- **THEN** 返回窗口句柄和加载计数器

#### Scenario: Cookie 注入阶段
- **WHEN** `inject_cookies_into_window()` 被调用
- **THEN** 使用已准备好的窗口，通过 CookieManager API 注入 Cookie
- **THEN** 跨域名导航时复用同一窗口
- **THEN** 注入完成后关闭窗口
- **THEN** 返回成功注入的 Cookie 数量

## MODIFIED Requirements

### Requirement: confirm_external_login 并行化

`confirm_external_login` 命令 SHALL 并行执行 CDP 获取和窗口创建，减少总耗时。

#### Scenario: 1688 平台导入（2 组域名）
- **WHEN** 用户确认 1688 外部登录完成
- **THEN** CDP 获取和窗口创建并行执行
- **THEN** 总耗时比串行方案减少约 1-2 秒
- **THEN** Cookie 导入功能正常，Worker 可正常使用登录态

### Requirement: CDP 重试策略

`cdp_fetch_all_cookies` SHALL 使用更高效的重试策略。

#### Scenario: 快速重试
- **WHEN** CDP 连接首次失败
- **THEN** 最多重试 3 次（原 15 次）
- **THEN** 重试间隔 200ms（原 500ms）
- **THEN** 总超时时间约 0.6s（原 7.5s）