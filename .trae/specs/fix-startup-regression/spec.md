# 修复 CORS 修复引入的启动失败回归 Spec

## Why
上一轮 `fix-download-cors` 在 `default.json` 中仅添加了字符串形式的 `"http:default"` 权限。根据 `@tauri-apps/plugin-http` 源码文档，该插件强制要求**带 `allow` URL 作用域的对象格式 scope 配置**。缺少正确的作用域配置可能导致 Tauri capability 系统拒绝整个权限声明，造成应用启动失败或 WebView 加载异常。

## What Changes
- `src-tauri/capabilities/default.json`：将 `"http:default"` 字符串替换为带 `allow` URL 作用域的对象配置，允许所有 `https://*` 和 `http://*` URL
- `src/utils/downloadManager.ts`：复检 `fetch` 调用，确保 Tauri HTTP `fetch` 的参数兼容
- `src/components/ImageDisplay.vue`：保持 Tauri HTTP `fetch` 导入不变
- `src/components/VideoDisplay.vue`：保持 Tauri HTTP `fetch` 导入不变

## Impact
- Affected specs: fix-download-cors（已完成的 spec，本次修复其引入的回归）
- Affected code:
  - `src-tauri/capabilities/default.json` — 权限格式修正
  - 其他文件仅做验证性复检

## MODIFIED Requirements
### Requirement: HTTP 权限作用域配置
系统 SHALL 在 `default.json` 中使用对象格式的 `http:default` 权限，包含 `allow` 字段指定允许请求的 URL 范围。

#### Scenario: 权限正确配置后应用正常启动
- **WHEN** 用户运行 `npm run dev`
- **THEN** Tauri 应用正常编译启动，WebView 加载前端页面无异常

#### Scenario: HTTP 请求可发送到外部 CDN
- **WHEN** 前端通过 `@tauri-apps/plugin-http` 的 `fetch` 请求 `https://gw.alicdn.com/**` 等外部 URL
- **THEN** 请求成功发送，不触发权限拒绝错误

#### Scenario: 权限配置向后兼容
- **WHEN** 前端调用浏览器原生 `fetch` 请求本地资源
- **THEN** 行为不受 `http:default` 权限影响，正常运行