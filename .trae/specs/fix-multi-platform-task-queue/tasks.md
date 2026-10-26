# 修复 TaskQueue 多平台任务不显示 - 任务列表

- [x] Task 1: 修改 TaskQueue.vue 移除平台过滤，显示所有任务
  - [x] 移除 `platform` prop 定义
  - [x] 将 `platformTasks` 计算属性改为直接使用 `taskQueueStore.tasks`
  - [x] 在任务条目中增加平台标签显示（使用 `PLATFORM_LABELS[task.platform]`）
  - [x] 导入 `PLATFORM_LABELS` 和 `PLATFORM_ICONS`

- [x] Task 2: 修改 App.vue 移除传递给 TaskQueue 的 platform prop
  - [x] 将 `<TaskQueue :platform="selectedPlatform" />` 改为 `<TaskQueue />`

- [x] Task 3: 验证修复效果
  - [x] `vue-tsc --noEmit` 前端 TypeScript 编译通过
  - [x] 确认 TaskQueue 不再依赖 platform prop

# Task Dependencies
- Task 1 和 Task 2 可并行执行
- Task 3 依赖 Task 1 和 Task 2
