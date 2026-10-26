# Checklist — 自动下载按钮与智能调度

- [x] downloadStateStore 四态类型定义正确（idle / downloading / downloaded / partial-failed）
- [x] addAutoDownloadTask 防重入守卫为 `if (status !== 'idle') return;`
- [x] 无资源任务直接标记 downloaded，不调用 DownloadManager
- [x] processAutoDownloadQueue 有路径时 fire-and-forget 并行启动
- [x] processAutoDownloadQueue 无路径时互斥弹窗，选定后批量释放所有等待任务
- [x] 用户取消路径选择时当前任务恢复 idle，下一个继续弹窗
- [x] resetDownloadState 同时从 taskStates 和 pendingPathTasks 中移除
- [x] startDownload() 的 explicitFolderPath 参数向后兼容
- [x] triggerDownload 各类型独立编号（主图0,1,2... SKU图0,1,2...）
- [x] triggerDownload onComplete 中根据 failedFiles 判断 downloaded 或 partial-failed
- [x] completeTask() 末尾正确调用 addAutoDownloadTask
- [x] retryTask() 中正确调用 resetDownloadState
- [x] 下载按钮四态 UI 展示正确（idle/downloading/downloaded/partial-failed）
- [x] downloaded 状态点击打开文件夹，partial-failed 状态点击重试
- [x] TypeScript 编译通过
- [ ] 故障隔离：某任务下载失败不影响其他任务
