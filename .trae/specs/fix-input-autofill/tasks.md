# Tasks

- [x] Task 1: 修正 autocomplete 传递方式 + 增强 JS 清除
  - [x] 将 NInput 上的直接 `autocomplete="off"` 改为 `:input-props="{ autocomplete: 'off' }"`（Naive UI 仅通过 `inputProps` 传递原生属性到 DOM `<textarea>`）
  - [x] 在 `onMounted` 中保留 `await nextTick()` 清空后，追加 `setTimeout(() => { rawText.value = '' }, 100)` 延迟清除，对抗 WebView2 的异步 autofill 时序
  - [x] 确保 `onMounted` 和 `nextTick` 已从 `vue` 导入

- [x] Task 2（可选）: 追加 Chromium 引擎参数
  - [x] 在 `tauri.conf.json` 的 `additionalBrowserArgs` 中，将 `--disable-features` 的值扩展为 `msWebOOUI,msPdfOOUI,msSmartScreenProtection,AutofillServerCommunication`
  - [x] 验证 JSON 格式有效性

- [x] Task 3: 验证
  - [x] 运行 `vue-tsc --noEmit` 确认前端无类型错误
  - [x] 确认 `tauri.conf.json` JSON 格式有效（如执行 Task 2）

# Task Dependencies
- Task 1 和 Task 2 可并行执行
- Task 3 依赖 Task 1 和 Task 2