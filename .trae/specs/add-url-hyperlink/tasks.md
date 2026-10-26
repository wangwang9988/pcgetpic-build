# Tasks
- [x] Task 1: 将 ResultPreview.vue 中 result.url 的纯文本展示改为超链接
  - [x] SubTask 1.1: 将 `<NText depth="3" class="result-url">{{ result.url }}</NText>` 改为使用 `<a>` 标签包裹，设置 `href` 为 `result.url`，`target="_blank"`，`rel="noopener noreferrer"`
  - [x] SubTask 1.2: 更新 `.result-url` 相关样式，确保链接颜色与现有 `NText depth="3"` 一致，悬停时有合适的交互反馈

# Task Dependencies
- 无外部依赖，Task 1 可独立完成
