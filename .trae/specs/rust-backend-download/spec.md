# Rust 后端下载命令 Spec

## Why
`@tauri-apps/plugin-http` + 前端 `@tauri-apps/plugin-fs` 方案存在两个致命缺陷：
1. HTTP 插件权限配置在 Tauri v2 中容易因格式问题导致启动失败
2. `@tauri-apps/plugin-fs` 有沙箱限制，即使下载成功也无法写入用户选择的外部目录（如 `D:\Downloads`）

改用 Rust 后端 `reqwest` 直接执行下载+写入，彻底绕过 CORS 和前端 FS 权限限制。

## What Changes
- **BREAKING**：回退 `tauri-plugin-http` Rust 依赖，移除 `.plugin(tauri_plugin_http::init())`
- **BREAKING**：回退 `@tauri-apps/plugin-http` 前端依赖，恢复原生 `fetch`（仅用于 HEAD 元数据请求）
- Rust 后端新增 `reqwest` 依赖，实现 `download_file` Tauri command
- `downloadManager.ts` 移除前端 fetch 和 writeFile，改为 `invoke('download_file', ...)`
- `default.json` 移除 `http:default` 权限声明（不再需要）

## Impact
- Affected specs: fix-download-cors（覆盖替换）、fix-startup-regression（覆盖替换）
- Affected code:
  - `src-tauri/Cargo.toml` — `tauri-plugin-http` → `reqwest`
  - `src-tauri/src/lib.rs` — 移除 HTTP 插件，新增 `download_file` 命令
  - `src-tauri/capabilities/default.json` — 移除 `http:default`
  - `package.json` — 移除 `@tauri-apps/plugin-http`
  - `src/utils/downloadManager.ts` — fetch → invoke
  - `src/components/ImageDisplay.vue` — 恢复原生 fetch
  - `src/components/VideoDisplay.vue` — 恢复原生 fetch

## ADDED Requirements
### Requirement: Rust 后端下载命令
系统 SHALL 在 Rust 后端提供 `download_file` Tauri command，使用 `reqwest` 获取远程资源并通过 `std::fs::write` 写入本地磁盘。

#### Scenario: 下载图片到用户选择目录
- **WHEN** 前端调用 `invoke('download_file', { url, filePath })`
- **THEN** Rust 后端通过 reqwest 发起 GET 请求（带 User-Agent 和 Referer），将响应体写入指定路径，自动创建父目录

#### Scenario: HTTP 错误码处理
- **WHEN** 远程服务器返回非 2xx 状态码
- **THEN** 返回包含具体状态码的错误信息（不重试 3 次后仍然显示 `undefined`）

#### Scenario: 不受 CORS 限制
- **WHEN** 请求 `https://gw.alicdn.com/**` 等外部 CDN 资源
- **THEN** 请求成功，不受浏览器同源策略限制

## REMOVED Requirements
### Requirement: tauri-plugin-http 集成
**Reason**：HTTP 插件权限配置易出错且不能解决 FS 沙箱问题，替换为 Rust 原生 reqwest
**Migration**：移除 Cargo 依赖和 Rust 插件注册，移除前端 npm 包，恢复 `default.json`

### Requirement: 前端 Tauri HTTP fetch
**Reason**：下载逻辑全部移至 Rust 后端，前端仅保留浏览器原生 fetch 用于元数据 HEAD 请求
**Migration**：`downloadManager.ts` 中 fetch 替换为 invoke，组件中恢复原生 fetch