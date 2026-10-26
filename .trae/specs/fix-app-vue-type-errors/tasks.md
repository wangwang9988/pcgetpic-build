# Tasks

- [x] Task 1: 修复 handleUpdateSize 类型签名与逻辑 Bug
  - [x] SubTask 1.1: 修改 handleUpdateSize 函数签名，使用内联箭头函数绕过 naive-ui SplitOnUpdateSize 的 `string & number` 交叉类型 Bug
  - [x] SubTask 1.2: 修复数字比例值转像素的逻辑：当 size 为数字时，通过容器实际宽度计算像素值而非 `size * 100`
  - [x] SubTask 1.3: 验证修改后 `vue-tsc --noEmit` 仍然通过

# Task Dependencies
- 无外部依赖，Task 1 可独立完成
