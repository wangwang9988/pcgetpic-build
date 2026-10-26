# 修复 TaskQueue 多平台任务不显示 - 检查清单

- [x] TaskQueue.vue 不再接收 platform prop
- [x] TaskQueue.vue 显示所有平台的任务（不按平台过滤）
- [x] TaskQueue.vue 每个任务条目显示平台标签（如"淘宝/天猫"、"京东"）
- [x] App.vue 中 TaskQueue 组件不再传递 platform prop
- [x] 新增平台（唯品会等）的任务自动出现在 TaskQueue 中，无需修改 TaskQueue 代码
- [x] `vue-tsc --noEmit` 编译通过
