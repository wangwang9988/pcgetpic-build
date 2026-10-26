# 自动下载按钮与智能调度 Spec

## Why
ResultPreview.vue 缺少一键下载入口，抓取成功后无法自动下载。需要：1）header-extra 增加下载按钮（四态）；2）抓取完成自动触发下载；3）路径弹窗防拥堵；4）并行下载故障隔离。

## What Changes
- **新增** `src/stores/downloadState.ts` — 独立下载状态管理（四态 + 互斥锁 + 批量释放队列）
- **修改** `src/stores/taskQueue.ts` — `completeTask()` 末尾触发自动下载 + `retryTask()` 重置下载状态
- **修改** `src/components/ResultPreview.vue` — 重试按钮前增加四态下载按钮
- **修改** `src/utils/downloadManager.ts` — `startDownload()` 增加 `explicitFolderPath` 参数 + 新增 `startDownloadForTask()`

**不需修改**：useIpcListener.ts（触发内聚在 completeTask 中）、scrapeResult.ts、ipc.ts

## ADDED Requirements

### Requirement: 下载按钮四态
在 ResultPreview header-extra 区域（重试按钮之前）显示下载按钮：

| 状态 | type | ghost | loading | disabled | 图标 | 文案 | 点击行为 |
|------|------|-------|---------|----------|------|------|----------|
| idle | default | false | false | false | ⬇️ Download | 下载 | 触发下载 |
| downloading | warning | false | true | true | — | 下载中 | 无 |
| downloaded | success | true | false | false | ✅ CheckmarkCircle | 已下载 | 打开文件夹 |
| partial-failed | warning | true | false | false | ⚠️ Warning | 已下载 | 重试失败项 |

partial-failed 悬停提示"部分资源下载失败，点击重试"。

### Requirement: 自动下载触发
触发源：`taskQueue.completeTask()` 方法末尾调用 `downloadStateStore.addAutoDownloadTask(taskId)`。

- 正常完成（task-complete → completeTask）→ 触发
- 看门狗恢复（task-failed → hasData → completeTask）→ 触发
- 任务失败（非看门狗恢复）→ 不触发
- 无资源任务 → 直接标记 downloaded
- 重试任务 → `retryTask()` 中调用 `resetDownloadState(taskId)` 清空状态

### Requirement: 互斥锁 + 批量释放防拥堵

```
任务抓取成功完成
       │
       ▼
 isSelectingFolder === true ?
        ├── YES ──► 加入 pendingPathTasks 队列（静默挂起）
        └── NO  ──► 设 isSelectingFolder = true, 弹出路径选择框
                              │
                   ┌──────────┴──────────┐
                   ▼                     ▼
               用户选定路径           用户取消弹窗
                   │                     │
          ┌────────┴────────┐            ▼
          │ 1. 释放互斥锁    │      1. 当前任务恢复 idle
          │ 2. 启动当前任务 │      2. 取出下一个任务再次弹窗
          │ 3. 队列中所有   │
          │    任务批量释放 │
          │    并行拉起下载 │
          └─────────────────┘
```

- 已有路径 → 全部 fire-and-forget 并行启动
- 用户选定路径后 → 当前任务 + 等待队列所有任务批量并行启动
- 用户取消 → 当前恢复 idle，下一个继续弹窗

### Requirement: 并行下载与故障隔离
- 各任务创建独立 DownloadBatch，共享全局并发槽位（MAX_CONCURRENT=5）
- 某任务下载失败 → 标记 partial-failed，不影响其他任务
- 失败后槽位立即释放，队列继续调度

### Requirement: 资源编号规则
各类型独立从 0 开始编号（主图0,1,2... SKU图0,1,2... 详情图0,1,2... 视频0,1,2...），与 `generateResourceName` 命名规则一致。

## MODIFIED Requirements

### Requirement: DownloadManager.startDownload() 接口扩展
增加可选参数 `explicitFolderPath?: string`，传入时直接使用该路径跳过弹窗。

## REMOVED Requirements
无

## 状态流转

```
         idle ──触发──► downloading ──完成──► downloaded
                            │
                            └──部分失败──► partial-failed ──重试──► downloading
```

## 边界情况

| 场景 | 策略 |
|------|------|
| 无资源 | 直接标记 downloaded |
| 快速点击 | downloading 时 disabled |
| 重试任务 | resetDownloadState 清空 |
| 清除路径 | 不影响进行中下载 |
| 全部失败 | 标记 partial-failed |
| 取消弹窗 | 恢复 idle，下一个弹窗 |
| 重启 | 不持久化，全部 idle |
