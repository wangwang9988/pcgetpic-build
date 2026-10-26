# Checklist — 下载按钮增加「部分下载」状态

- [ ] `ResultPreview.vue` 中 `partial-failed` 状态按钮文案显示为「部分下载」
- [ ] `ResultPreview.vue` 中 `downloaded` 状态按钮文案仍为「已下载」
- [ ] `downloaded` 状态按钮 `type` 为 `success` 且 `ghost` 为 true
- [ ] `partial-failed` 状态按钮 `type` 为 `warning` 且 `ghost` 为 false（实心警告色）
- [ ] `partial-failed` 状态按钮 `loading` 为 false、`disabled` 为 false，可正常点击
- [ ] `idle` 状态按钮文案为「下载」，`type` 为 `default`
- [ ] `downloading` 状态按钮文案为「下载中」，`type` 为 `warning`，`loading` 为 true
- [ ] `partial-failed` 状态悬停显示 Tooltip「部分资源下载失败（成功 N / 共 M），点击重试」
- [ ] 非 `partial-failed` 状态不显示上述 Tooltip
- [ ] `partial-failed` 状态下点击按钮触发 `retryFailedDownloads` 重试逻辑
- [ ] `downloaded` 状态下点击按钮仍打开下载目录
- [ ] `downloadState.ts` 状态机未修改（仅前端 UI 表现变化）
- [ ] TypeScript 编译通过
