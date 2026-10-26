# Tasks

- [x] Task 1: 在 taskQueue.ts 的 removeTask 方法中补充清理下载状态逻辑
  - [x] SubTask 1.1: 在 `removeTask` 函数中增加 `downloadStore.resetDownloadState(taskId)` 调用
  - [x] SubTask 1.2: 在 `removeTask` 函数顶部引入 `useDownloadStateStore`
- [x] Task 2: 在 ResultPreview.vue 中添加删除按钮及交互逻辑
  - [x] SubTask 2.1: 在 template 中重试按钮右侧添加 NPopconfirm 包裹的删除按钮
  - [x] SubTask 2.2: 在 script 中导入 NPopconfirm 组件
  - [x] SubTask 2.3: 实现 handleDelete 函数，调用 taskQueueStore.removeTask 并显示 message 提示
  - [x] SubTask 2.4: 添加删除按钮的禁用条件判断（running 或 downloading 时禁用）

# Task Dependencies
- [Task 2] depends on [Task 1] (removeTask 需先完善下载状态清理逻辑)
