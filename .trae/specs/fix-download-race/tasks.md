# Tasks

- [x] Task 1: 修复 `downloadManager.ts` 的 `waitForProductData` 串扰问题
  - [x] SubTask 1.1: `productMeta` 类型增加 `taskId?: string` 字段
  - [x] SubTask 1.2: 初始回退改用 `store.results.get(meta.taskId)` 替代 `store.currentResult`
  - [x] SubTask 1.3: 轮询等待循环同样改用 `store.results.get(targetTaskId)` 精确查找

- [x] Task 2: ImageDisplay.vue 新增 `resultId` prop 并传入 download
  - [x] SubTask 2.1: props 定义中新增 `resultId: { type: String, default: "" }`
  - [x] SubTask 2.2: 所有 3 处 `startDownload` 调用的 `productMeta` 中添加 `taskId: props.resultId`

- [x] Task 3: VideoDisplay.vue 新增 `resultId` prop 并传入 download
  - [x] SubTask 3.1: props 定义中新增 `resultId: { type: String, default: "" }`
  - [x] SubTask 3.2: 所有 `startDownload` 调用的 `productMeta` 中添加 `taskId: props.resultId`

- [x] Task 4: ResultPreview.vue 传递 `resultId` + 修复 `expandedNames` 类型
  - [x] SubTask 4.1: 所有 ImageDisplay 和 VideoDisplay 实例添加 `:resultId="result.taskId"`
  - [x] SubTask 4.2: `expandedNames` 类型从 `ref<string[]>([])` 改为 `ref<string | null>(null)`

- [x] Task 5: 编译验证
  - [x] SubTask 5.1: `vue-tsc --noEmit` 通过
  - [x] SubTask 5.2: `npm run build` 通过

# Task Dependencies
- [Task 1] independent（可先执行）
- [Task 2] depends on [Task 1]（需要 downloadManager 接口就绪）
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2, Task 3]（需要 ImageDisplay/VideoDisplay 的 resultId prop 已定义）
- [Task 5] depends on [Task 1, Task 2, Task 3, Task 4]