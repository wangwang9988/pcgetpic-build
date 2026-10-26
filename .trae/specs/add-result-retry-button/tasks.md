# 结果预览条目增加重试按钮 任务列表

- [ ] 任务1: 在 ResultPreview.vue 中引入 taskQueueStore 并添加重试按钮 UI
  - [ ] 子任务 1.1: 在 `ResultPreview.vue` 的 `<script setup>` 中导入 `useTaskQueueStore`
  - [ ] 子任务 1.2: 在 `NCollapseItem` 的 `#header-extra` 插槽中，现有 `NSpace` 标签组之后条件渲染一个 `NButton`（size="tiny"，文字为"重试"）
  - [ ] 子任务 1.3: 按钮显示条件：`taskQueueStore.tasks` 中找到对应 `taskId` 的任务，其 `status === 'failed'` 时显示；若任务状态为 `completed` 或 `running` 则不显示
  - [ ] 子任务 1.4: 为按钮添加 `@click.stop` 防止触发折叠面板的展开/收起
  - [ ] 验证：失败任务条目头部出现"重试"按钮，成功任务不出现

- [ ] 任务2: 实现重试按钮的点击处理逻辑
  - [ ] 子任务 2.1: 在 `ResultPreview.vue` 中新增 `handleRetry(taskId: string)` 方法
  - [ ] 子任务 2.2: 方法内先通过 `taskQueueStore.tasks` 找到对应任务，获取其 `url` 和 `platform`
  - [ ] 子任务 2.3: 调用 `taskQueueStore.retryTask(taskId)` 将任务状态重置为 `pending`
  - [ ] 子任务 2.4: 调用 `scrapeResultStore.resetResult(taskId, url, platform)` 清空该条目的旧结果数据
  - [ ] 子任务 2.5: 使用 `useMessage` 显示 `message.info('已重新加入队列')`
  - [ ] 验证：点击重试后，该条目标题恢复为"等待获取中..."，所有图片/视频数据清空

- [ ] 任务3: 处理运行中状态自动重抓的兼容性
  - [ ] 子任务 3.1: 确认 `taskQueueStore.startNextTask()` 会自动从 `pending` 任务中选取任务
  - [ ] 子任务 3.2: 验证当 `isRunning === true` 时，重试后的任务会被空闲 Worker 自动拾取
  - [ ] 子任务 3.3: 若当前未在运行中，重试后任务保持 `pending`，等待用户点击"开始抓取"
  - [ ] 验证：运行中点击重试，任务被重新执行；未运行时点击重试，任务等待下次启动

# 任务依赖
- 任务2 依赖 任务1 完成
- 任务3 依赖 任务2 完成
