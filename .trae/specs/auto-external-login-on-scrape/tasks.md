# Tasks

- [x] Task 1: 修改 ControlBar.vue 的 `checkPreLoginGate()` 函数，增加 `externalLoginPending` 状态平台的自动 Cookie 导入逻辑
  - [x] SubTask 1.1: 在 `checkPreLoginGate()` 中检测未登录平台是否有 `isExternalLoginPending` 为 true 的平台
  - [x] SubTask 1.2: 对 `externalLoginPending` 平台，自动调用 `confirmExternalLogin()` 导入 Cookie（不打开浏览器，不弹对话框）
  - [x] SubTask 1.3: 导入成功后标记平台已登录，继续原有流程
  - [x] SubTask 1.4: 导入失败时显示错误提示，返回 false 不启动抓取
  - [x] SubTask 1.5: 对非 `externalLoginPending` 的未登录平台，保持原有对话框逻辑不变
