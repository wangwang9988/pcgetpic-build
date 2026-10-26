# 修复 WebView2 输入框自动回填上轮链接 Spec（修订版 v3）

## Why
Tauri 在 Windows 上使用 WebView2（基于 Chromium）作为 Web 渲染引擎。WebView2 的**表单数据恢复（Form Data Restoration）**会在页面加载后异步恢复 `<textarea>` 中上次输入的值。

**关键根因**：上一轮修复在 `NInput` 上直接写 `autocomplete="off"`，但 Naive UI 的 `NInput` 组件**不会将非组件 props 的属性透传到底层 DOM `<textarea>`**。查看 Naive UI 源码（`Input.mjs`），textarea 渲染为 `h("textarea", Object.assign({}, this.inputProps, {...}))`，仅 `inputProps` 中的属性会被应用到真实 DOM 元素。因此 `autocomplete="off"` 从未生效。

同时，WebView2 的 autofill 发生在 Vue 组件挂载之后、DOM 渲染完成之后，时序晚于 `onMounted` 和 `nextTick`，纯 JS 清除也会被覆盖。

## What Changes
- `src/components/LinkInput.vue`：
  - 将直接 `autocomplete="off"` 改为 `:input-props="{ autocomplete: 'off' }"`，通过 Naive UI 的 `inputProps` 正确传递到 DOM 层
  - 在 `onMounted` 中增加 `setTimeout(100ms)` 延迟清除，对抗 WebView2 的异步 autofill 时序
- `src-tauri/tauri.conf.json`（可选）：
  - 在 `additionalBrowserArgs` 的 `--disable-features` 中追加 `AutofillServerCommunication`，从 Chromium 引擎层面禁用表单数据持久化

## Impact
- Affected specs: fix-input-autofill（本 spec 的前两版）
- Affected code:
  - `src/components/LinkInput.vue` — 修正 `autocomplete` 传递方式 + 优化清除时序
  - `src-tauri/tauri.conf.json` — 追加 Chromium 禁用特性（可选）

## MODIFIED Requirements
### Requirement: 输入框禁止浏览器自动回填
系统 SHALL 通过 Naive UI 的 `inputProps` 正确将 `autocomplete="off"` 传递到 DOM 层，配合 JavaScript 延迟清除，彻底禁止 WebView2 在重启时恢复上一轮的输入值。

#### Scenario: 首次启动输入框为空
- **WHEN** 用户首次运行 `npm run dev` 启动客户端
- **THEN** 链接输入框显示为空，仅有 placeholder 提示文字

#### Scenario: 重启后输入框不保留上一轮链接
- **WHEN** 用户在上一次会话中输入了链接并关闭客户端，然后重新运行 `npm run dev`
- **THEN** 链接输入框显示为空，不出现上一次输入的 URL

#### Scenario: 正常输入不受影响
- **WHEN** 用户在输入框中手动输入或粘贴链接
- **THEN** 输入框正常响应用户输入，`v-model` 绑定正常工作