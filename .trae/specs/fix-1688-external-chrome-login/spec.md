# 1688 外部 Chrome 登录方案 Spec

## Why

1688（阿里系）平台使用了阿里云 WAF + AWSC/Baxia 安全防护系统，该系统在 TLS 握手阶段（JA3/JA4 指纹）即可识别出 WebView2 不是标准 Chrome 浏览器，从而阻断或降级登录流程。即使 JS 层面所有指纹维度全部修完，TLS 层的指纹差异仍然无法通过 JS 解决。

**根本原因**：WebView2 的 TLS 握手指纹（JA4）与标准 Chrome 131 不同，阿里云 WAF 在 TLS 层就已经将请求标记为"非标准浏览器"，导致登录流程被阻断（强制短信验证、拒绝 cookie 写入等）。

**对比**：京东、淘宝、唯品会等平台不依赖 TLS 指纹做登录拦截，因此 WebView2 可以正常登录；1688 是目前唯一因 TLS 指纹导致无法登录的平台。

## What Changes

### 核心思路
对 1688（及后续可能发现的同类型平台）特殊处理：预登录时不创建 WebView2 窗口，而是**打开系统默认浏览器**让用户完成登录，然后通过 Cookie 导入机制将登录态同步到 WebView2。

### 已实现的方案

#### 1. 平台配置扩展
- `Platform` 枚举增加 `use_external_browser_login()` 方法，标记 `Ali1688` 返回 `true`
- `Platform` 枚举增加 `external_login_url()` 方法，返回外部登录页 URL

#### 2. 修改 `open_login_window` 命令
- 当 `Platform::from_url()` 识别到 1688 时，使用 `cmd /c start` 打开系统默认浏览器
- 返回 `"external"` 标记告知前端此平台使用外部浏览器登录
- 其他平台继续使用 WebView2 窗口登录（行为不变）

#### 3. Cookie 导入机制（方案 A - 直接读取浏览器 Cookie 数据库）
- 新增 `cookie_import.rs` 模块
- 依次尝试 Chrome 和 Edge 的 Cookie SQLite 数据库
- 复制到临时文件避免锁定冲突
- 从 `Local State` 文件读取 `os_crypt.encrypted_key`，DPAPI 解密得到 AES-256 密钥
- 使用 `aes-gcm` crate 做 AES-256-GCM 解密 Cookie 的 `encrypted_value`
- 创建临时 WebView2 窗口，通过 `document.cookie` 注入 Cookie
- 关闭窗口后 Cookie 持久化到 `data_directory`

#### 4. 新增 Tauri 命令
- `confirm_external_login(platform)` — 用户确认登录后调用，读取系统浏览器 Cookie 并注入 WebView2
- `is_external_browser_login(platform)` — 检查平台是否需要外部浏览器登录

#### 5. 前端 UI 适配
- `taskQueue.ts` 增加 `externalBrowserPlatforms` 和 `externalLoginPending` 状态
- `openLogin()` 方法自动检测是否需要外部浏览器登录
- `PlatformDetect.vue` 中 1688 卡片显示"🌐 浏览器登录"按钮
- 登录中显示"✅ 已完成登录"确认按钮 + 蓝色提示条
- `confirmExternalLogin()` 调用后端导入 Cookie 并更新状态

### 依赖变更
- `rusqlite` (0.31, bundled) — 读取 Chrome/Edge Cookie SQLite 数据库
- `aes-gcm` (0.10) — AES-256-GCM 解密 Cookie 值
- `windows` (0.58, Win32_Security_Cryptography + Win32_Foundation) — Windows DPAPI 解密

## Impact

- Affected code:
  - `src-tauri/src/platform_resolver.rs` — 增加 `use_external_browser_login()` + `external_login_url()`
  - `src-tauri/src/commands.rs` — `open_login_window` 对 1688 特殊处理 + 新增命令
  - `src-tauri/src/cookie_import.rs` — 新增 Cookie 导入模块
  - `src-tauri/src/lib.rs` — 注册新模块和命令
  - `src-tauri/Cargo.toml` — 新增依赖
  - `src/stores/taskQueue.ts` — 增加外部浏览器登录状态管理
  - `src/components/PlatformDetect.vue` — 1688 登录引导 UI
- Affected platforms: 仅 `ali1688`（及未来可能发现的同类型平台）
- 不影响其他平台的 WebView2 登录流程

## ADDED Requirements

### Requirement: 1688 使用外部浏览器登录

系统 SHALL 在用户对 1688 平台执行预登录时，打开系统默认浏览器（而非 WebView2 窗口）到 1688 登录页面。

#### Scenario: 用户点击 1688 登录按钮
- **WHEN** 用户对 1688 平台发起预登录
- **THEN** 系统打开系统默认浏览器到 `https://login.1688.com`
- **THEN** 不创建 WebView2 登录窗口
- **THEN** 平台卡片显示"🌐 浏览器登录"按钮
- **THEN** 点击后按钮变为"✅ 已完成登录"确认按钮 + 蓝色提示条

### Requirement: Cookie 从系统浏览器导入到 WebView2

系统 SHALL 在用户确认完成外部浏览器登录后，从系统浏览器的 Cookie 存储中读取 1688 相关 Cookie，并注入到 WebView2 的 data_directory 中。

#### Scenario: 用户完成外部浏览器登录后确认
- **WHEN** 用户在系统浏览器中完成 1688 登录，并在程序中点击"✅ 已完成登录"
- **THEN** 程序读取系统浏览器（Chrome 或 Edge）的 Cookie 数据库
- **THEN** 程序解密并提取 `.1688.com` 域名下的所有 Cookie
- **THEN** 程序将这些 Cookie 注入到 WebView2 的 Cookie 存储中
- **THEN** Worker 窗口打开时自动携带登录态
- **THEN** 平台卡片更新为 🟢 已登录

#### Scenario: 系统浏览器未安装或 Cookie 读取失败
- **WHEN** 无法读取系统浏览器 Cookie（未安装 Chrome/Edge、Cookie 数据库被锁定等）
- **THEN** 显示错误提示，建议用户关闭所有 Chrome/Edge 窗口后重试

### Requirement: 不影响其他平台

系统 SHALL 仅对标记了 `use_external_browser_login` 的平台使用外部浏览器登录，其他平台继续使用 WebView2 登录窗口。

#### Scenario: 淘宝平台登录
- **WHEN** 用户对淘宝平台发起预登录
- **THEN** 创建 WebView2 登录窗口（行为不变）

## 已知限制

1. **HttpOnly Cookie**：通过 `document.cookie` 方式无法注入 HttpOnly Cookie，后续可通过 WebView2 的 `CoreWebView2.CookieManager` API 精确注入（需要 Tauri 暴露底层 API）
2. **Cookie 数据库锁定**：如果用户正在使用 Chrome/Edge，Cookie 数据库可能被锁定。已通过复制到临时文件的方式缓解
3. **Cookie 时效**：Chrome 存储的 Cookie 可能在导入后不久过期，用户需要及时开始抓取
4. **仅 Windows**：DPAPI 解密仅支持 Windows 平台
