# Tasks

- [x] Task 1: 修复 App.vue 中 NSplit 拖拽不生效问题
  - [x] SubTask 1.1: 将 NSplit 从受控模式（`:size`）切换为非受控模式（`:default-size`），使用 localStorage 中的值作为初始宽度
  - [x] SubTask 1.2: 修复 `handleUpdateSize` 回调，正确解析像素字符串参数（如 `"350px"` → 350），仅做持久化不再反向控制组件
  - [x] SubTask 1.3: 移除不再需要的 `siderWidth` ref、`siderSize` computed、`splitRef` ref 等受控模式相关代码
  - [x] SubTask 1.4: 验证类型检查和构建通过

# Task Dependencies
- 无外部依赖，Task 1 内部子任务顺序执行
