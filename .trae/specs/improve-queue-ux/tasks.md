# 队列输入与结果预览交互优化 任务列表

- [x] 任务1: 移除 LinkInput.vue 中 addToQueue 的清空逻辑
  - 在 `src/components/LinkInput.vue` 的 `addToQueue()` 函数中删除了 `rawText.value = ''` 一行
  - 验证：点击"添加到队列"后，输入框内容保持不变

- [x] 任务2: 在 ControlBar.vue 中预初始化所有待抓取任务的结果条目
  - 在 `src/components/ControlBar.vue` 中导入 `useScrapeResultStore`
  - 在 `startCurrentPlatform()` 中：确定本次要抓取的 pending 任务列表后，调用 IPC 之前，遍历所有待抓取任务并调用 `resultStore.resetResult(task.id, task.url, task.platform)`
  - 在 `startAllPlatforms()` 中：同理，在所有 pending 任务提交给 IPC 之前，遍历所有待抓取任务并调用 `resultStore.resetResult(task.id, task.url, task.platform)`
  - 注入点位于 tasks 列表构建之后、空检查之前，使结果面板能在任务提交前同步刷新
  - 使用 `resetResult`（强制覆盖）而非 `initResult`（仅新建），确保停止后重新抓取时旧数据被清除
  - 验证：点击"开始抓取"后，ResultPreview 立即显示所有待抓取链接的条目

- [x] 任务3: 验证 ResultPreview.vue 兼容性并补充 resetResult
  - 确认 `ResultPreview.vue` 中已有 `resultTitle()` 函数对无 `productTitle` 的结果显示"等待获取中..."（第 122-133 行已有此逻辑）
  - 确认空结果条目（无图片/视频）能正常展示折叠面板且不会报错（使用 `v-if="result.xxx.length > 0"` 条件渲染）
  - 在 `scrapeResultStore` 中新增 `resetResult()` 方法，支持强制覆盖已有结果条目，解决停止后重新抓取时旧数据残留的问题

# 任务依赖
- 任务1 和 任务2 无依赖关系，已并行执行
- 任务3 依赖任务2 完成

# 补充更改
- `src/stores/scrapeResult.ts`: 新增 `resetResult()` 方法（始终覆盖写入），并在 store 返回值中导出