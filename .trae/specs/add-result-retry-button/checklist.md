# 结果预览条目增加重试按钮 验收检查清单

- [ ] **CP-1**: `ResultPreview.vue` 中导入了 `useTaskQueueStore`
- [ ] **CP-2**: 失败任务（`status === 'failed'`）对应的折叠条目头部右侧显示"重试"按钮
- [ ] **CP-3**: 成功任务（`status === 'completed'`）对应的折叠条目头部不显示重试按钮
- [ ] **CP-4**: 运行中任务（`status === 'running'`）对应的折叠条目头部不显示重试按钮
- [ ] **CP-5**: 点击重试按钮不会触发折叠面板的展开/收起（使用了 `@click.stop`）
- [ ] **CP-6**: 点击重试按钮后调用 `taskQueueStore.retryTask(taskId)` 将任务状态重置为 `pending`
- [ ] **CP-7**: 点击重试按钮后调用 `scrapeResultStore.resetResult(taskId, url, platform)` 清空旧结果数据
- [ ] **CP-8**: 点击重试按钮后页面显示 `message.info('已重新加入队列')` 提示
- [ ] **CP-9**: 重试后该条目标题恢复为"等待获取中..."
- [ ] **CP-10**: 若抓取正在运行中（`isRunning === true`），重试后的任务会被空闲 Worker 自动重新拾取执行
- [ ] **CP-11**: 若抓取未在运行中，重试后的任务保持 `pending` 状态，等待下次启动
- [ ] **CP-12**: TypeScript 编译无新增类型错误
