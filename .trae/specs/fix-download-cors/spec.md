# 修复下载 CORS 跨域限制 Spec

## Why
Tauri v2 WebView 中前端原生 `fetch` 请求外部 CDN 资源（如 `img.alicdn.com`）时受浏览器同源策略（CORS）限制，导致图片/视频下载和元数据获取（HEAD 请求）全部失败，日志报 `TypeError`（`error.message` 为 `undefined`）。

## What Changes
- Rust 后端新增 `tauri-plugin-http` 插件依赖，注册 HTTP 插件并配置权限
- 前端新增 `@tauri-apps/plugin-http` npm 包，替换所有下载和元数据获取中的原生 `fetch`
- `downloadManager.ts`：下载资源获取改用 Tauri HTTP `fetch`
- `ImageDisplay.vue`：获取图片文件大小改用 Tauri HTTP `fetch`
- `VideoDisplay.vue`：获取视频文件大小改用 Tauri HTTP `fetch`
- 增强错误日志，正确打印非 Error 对象的异常信息

## Impact
- Affected specs: fix-download-cors（新）
- Affected code:
  - `src-tauri/Cargo.toml` — 新增 Rust 依赖
  - `src-tauri/src/lib.rs` — 注册插件
  - `src-tauri/capabilities/default.json` — 权限配置
  - `package.json` — 新增前端依赖
  - `src/utils/downloadManager.ts` — 替换 fetch
  - `src/components/ImageDisplay.vue` — 替换 fetch
  - `src/components/VideoDisplay.vue` — 替换 fetch

## ADDED Requirements
### Requirement: Tauri HTTP 插件集成
系统 SHALL 在 Rust 后端集成 `tauri-plugin-http` v2 插件，并在前端使用对应的 npm 包 `@tauri-apps/plugin-http`。

#### Scenario: 插件正确注册
- **WHEN** 应用启动
- **THEN** `tauri-plugin-http` 插件已初始化，前端可通过 `import { fetch } from '@tauri-apps/plugin-http'` 发起请求

#### Scenario: HTTP 权限已授权
- **WHEN** 前端调用 Tauri HTTP `fetch`
- **THEN** 请求不受 CORS 限制，可访问任意 `https://*` 和 `http://*` 域名

### Requirement: 下载请求绕过 CORS
系统 SHALL 使用 `@tauri-apps/plugin-http` 的 `fetch` 替换 `downloadManager.ts` 中原生 `fetch`，使图片和视频下载请求走 Rust 后端。

#### Scenario: 下载阿里 CDN 图片
- **WHEN** 用户点击下载淘宝商品图片（域名 `gw.alicdn.com` 或 `img.alicdn.com`）
- **THEN** 下载成功，资源正确写入本地文件系统

#### Scenario: 下载失败日志清晰
- **WHEN** HTTP 请求失败
- **THEN** 控制台输出包含 HTTP 状态码和错误描述的日志，不再出现 `undefined`

### Requirement: 元数据获取绕过 CORS
系统 SHALL 使用 `@tauri-apps/plugin-http` 的 `fetch` 替换 `ImageDisplay.vue` 和 `VideoDisplay.vue` 中获取文件大小（HEAD 请求）的原生 `fetch`。

#### Scenario: 获取图片文件大小
- **WHEN** 图片列表渲染完成
- **THEN** `ImageDisplay.vue` 能正确获取 `Content-Length`，显示精确文件大小而非"估算值"或"无法获取"

#### Scenario: 获取视频文件大小
- **WHEN** 视频列表渲染完成
- **THEN** `VideoDisplay.vue` 能正确获取 `Content-Length`，显示精确文件大小