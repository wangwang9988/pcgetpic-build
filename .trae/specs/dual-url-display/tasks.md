# Tasks

- [ ] Task 1: 重构 `LinkInput.vue` 为双区布局
  - [ ] 保留上方原始 URL 输入 textarea，移除 `normalizeInput` 中的原地替换逻辑，改为仅触发下方表格更新
  - [ ] 新增下方处理后 URL 表格展示区，使用 Naive UI 的 `NDataTable` 或自定义表格
  - [ ] 表格列：序号（`#`）、平台（图标 + 标签）、处理后的 URL（可编辑 `NInput`）
  - [ ] 表格数据通过 computed 属性从 `rawText` 计算而来（逐行 `cleanUrl` + `detectPlatform`）
  - [ ] 表格中 URL 列使用 `NInput` 支持行内编辑，编辑后的值存入响应式数组
  - [ ] "添加到队列"按钮使用表格中编辑后的 URL 列表（而非 computed 的 `validLinks`）
  - [ ] 空表格时显示空状态提示
  - [ ] 保持剪贴板导入、文件拖拽导入、清空功能正常工作

- [ ] Task 2: 验证与调试
  - [ ] 测试粘贴带参数的淘宝链接，确认表格正确显示清洗后 URL
  - [ ] 测试粘贴多行混合平台链接，确认每行正确识别平台
  - [ ] 测试在表格中手动修改 URL 后点击"添加到队列"，确认队列收到修改后的 URL
  - [ ] 测试从剪贴板导入和拖拽 .txt 文件导入功能不变

# Task Dependencies
- Task 2 依赖 Task 1