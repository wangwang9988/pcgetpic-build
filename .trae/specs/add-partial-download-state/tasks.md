# Tasks — 下载按钮增加「部分下载」状态

- [ ] Task 1: 修改 `src/components/ResultPreview.vue` 的下载按钮渲染
  - 1.1 拆分 `isDownloadedOrFailed` 为 `isDownloaded` + `isPartialFailed`，保留原函数兼容（如有外部引用）
  - 1.2 修改 `downloadButtonType`：保持 `downloaded` → `success`，其余不变
  - 1.3 修改 `downloadButtonText`：将 `partial-failed` 的文案从 `'已下载'` 改为 `'部分下载'`
  - 1.4 调整按钮 `:ghost` 绑定为 `isDownloaded`（仅全成功用 ghost）
  - 1.5 确认 `partial-failed` 状态下 `loading` 与 `disabled` 均为 false

- [ ] Task 2: 为 `partial-failed` 状态增加 NTooltip 悬停提示
  - 2.1 在下载按钮外层包裹 NTooltip（trigger="hover"）
  - 2.2 Tooltip 内容：`部分资源下载失败（成功 N / 共 M），点击重试`，N/M 取自 `downloadStore.getTaskState(taskId)`
  - 2.3 仅 `partial-failed` 状态下显示，其他状态传空字符串或禁用 Tooltip

- [ ] Task 3: 端到端验证
  - 3.1 单元验证：`idle` → 「下载」+ `default` 类型 + 实心
  - 3.2 单元验证：`downloading` → 「下载中」+ `warning` + loading
  - 3.3 单元验证：`downloaded` → 「已下载」+ `success` + ghost
  - 3.4 单元验证：`partial-failed` → 「部分下载」+ `warning` + 实心（非 ghost）+ 可点击
  - 3.5 集成验证：模拟部分下载失败场景，确认按钮文案与样式符合预期
  - 3.6 集成验证：悬停 `partial-failed` 按钮，Tooltip 正确显示成功/总数

# Task Dependencies
- Task 1 独立可执行
- Task 2 依赖 Task 1（需要先确定 isPartialFailed 函数存在）
- Task 3 依赖 Task 1、Task 2
