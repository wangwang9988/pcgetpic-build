# Tasks

- [x] Task 1: 在 `lib.rs` 的 `do_dispatch()` 中实现 Worker 窗口级联偏移定位
  - [x] SubTask 1.1: 获取主显示器尺寸，计算居中基准坐标（center_x, center_y）
  - [x] SubTask 1.2: 根据 worker_id 计算级联偏移：`x = center_x + worker_id * 40.0`，`y = center_y + worker_id * 40.0`
  - [x] SubTask 1.3: 实现视口边界钳制：确保 `x + window_width <= screen_width` 且 `y + window_height <= screen_height`
  - [x] SubTask 1.4: 将 `.center()` 替换为 `.position(x, y)` 使用计算出的坐标

# Task Dependencies
- 无外部依赖，Task 1 为独立任务
