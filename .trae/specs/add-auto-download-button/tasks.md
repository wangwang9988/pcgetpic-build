# Tasks — 自动下载按钮与智能调度

- [x] Task 1: 创建 `src/stores/downloadState.ts`
  - [x] 1.1 定义 DownloadStatus 四态类型和 TaskDownloadState 接口
  - [x] 1.2 实现 getTaskStatus / getTaskState / setTaskStatus / incrementCompleted / incrementFailed / resetDownloadState
  - [x] 1.3 实现 addAutoDownloadTask（防重入守卫：`if (status !== 'idle') return;`，无资源直接标记 downloaded）
  - [x] 1.4 实现 processAutoDownloadQueue 互斥锁 + 批量释放调度器
  - [x] 1.5 实现 triggerDownload / triggerManualDownload / retryFailedDownloads

- [x] Task 2: 扩展 `src/utils/downloadManager.ts`
  - [x] 2.1 startDownload() 增加 explicitFolderPath 可选参数
  - [x] 2.2 triggerDownload 在 downloadState store 中实现资源收集（各类型独立编号），调用 DownloadManager.startDownload()

- [x] Task 3: 修改 `src/stores/taskQueue.ts`
  - [x] 3.1 completeTask() 末尾增加 `downloadStateStore.addAutoDownloadTask(taskId)`
  - [x] 3.2 retryTask() 中增加 `downloadStateStore.resetDownloadState(taskId)`

- [x] Task 4: 修改 `src/components/ResultPreview.vue`
  - [x] 4.1 header-extra 区域重试按钮前增加四态下载按钮
  - [x] 4.2 实现按钮点击逻辑（idle→触发下载，downloaded→打开文件夹，partial-failed→重试）
  - [x] 4.3 添加 downloadStore 引入和按钮状态绑定

- [x] Task 5: 端到端验证
  - [x] 5.1 TypeScript 编译通过
  - [ ] 5.2 已设置路径：多任务并行下载
  - [ ] 5.3 未设置路径：单弹窗 + 批量释放
  - [ ] 5.4 取消弹窗：恢复 idle + 下一个弹窗
  - [ ] 5.5 部分失败：partial-failed 状态 + 重试
  - [ ] 5.6 故障隔离：某任务失败不影响其他
  - [ ] 5.7 资源编号：各类型独立编号

# Task Dependencies
- Task 1 → Task 2（downloadState store 是 DownloadManager 扩展的依赖）
- Task 2 → Task 3（startDownloadForTask 是自动下载触发的依赖）
- Task 1 → Task 3（addAutoDownloadTask 在 downloadState store 中定义）
- Task 1 → Task 4（downloadState store 是 UI 渲染的依赖）
- Task 4 → Task 5（UI 需要端到端验证）
