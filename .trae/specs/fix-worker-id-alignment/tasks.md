# Tasks

- [ ] Task 1: 修复 `initWorkers` 中 Worker ID 从 0 开始编号
  - [ ] SubTask 1.1: 修改 `taskQueue.ts` 中 `initWorkers` 函数，将 `{ id: i + 1 }` 改为 `{ id: i }`

- [ ] Task 2: 修复 `login-required` 事件中 `workerId > 0` 判断
  - [ ] SubTask 2.1: 修改 `useIpcListener.ts` 中 `login-required` case 的 `workerId != null && workerId > 0` 为 `workerId != null`

- [ ] Task 3: 编译验证
  - [ ] SubTask 3.1: 运行 `npm run build` 确认前端编译通过（TypeScript 无错误）

# Task Dependencies
- [Task 1] 和 [Task 2] 可并行执行（不同文件）
- [Task 3] depends on [Task 1, Task 2]