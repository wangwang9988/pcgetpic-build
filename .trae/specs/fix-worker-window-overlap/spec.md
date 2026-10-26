# Worker 窗口错位显示 Spec

## Why
当并发数大于 1 时，多个 Worker 窗口均使用 `.center()` 居中定位，导致所有窗口完全重叠在屏幕中央，用户无法区分和操作不同 Worker，体验极差。

## What Changes
- 移除 Worker 窗口创建时的 `.center()` 调用
- 采用**级联偏移（Cascade）**模式：每个 Worker 窗口相对基准位置按内部 `worker_id * offset` 递增偏移
- 偏移方向为右下方（经典窗口级联方向），确保每个窗口的标题栏可见
- 增加视口边界钳制，确保窗口不超出屏幕可视区域

## Impact
- Affected code: `src-tauri/src/lib.rs` 中 `do_dispatch()` 函数的窗口创建逻辑

## 设计说明

### 内部标识 vs 用户可见标识
- **内部 `worker_id`**（0-indexed）：用于 WorkerPool 数组索引、窗口 label 命名、级联偏移计算等内部逻辑，0 开始符合 Rust/TypeScript 编程规范
- **用户可见标识**：当前窗口标题为 `Worker {id} - {platform}`，属于展示层，后期可独立替换为更语义化的名称（如"抓取器 1"、"抓取器 2"），不影响偏移计算逻辑
- 本 Spec 中所有偏移计算均基于**内部 `worker_id`**，与用户可见的展示名称无关

## ADDED Requirements

### Requirement: Worker 窗口级联错位定位
系统 SHALL 为每个 Worker 窗口计算独立的级联偏移位置，使多个并发 Worker 窗口不会完全重叠。

#### Scenario: 单 Worker（并发数=1）
- **WHEN** 用户设置并发数为 1 并开始抓取
- **THEN** Worker 0 窗口居中显示，与当前行为一致

#### Scenario: 多 Worker 级联偏移
- **WHEN** 用户设置并发数大于 1 并开始抓取
- **THEN** Worker 0 居中显示作为基准
- **THEN** 内部 worker_id 为 N（N > 0）的 Worker 相对居中位置向右下方偏移 `N * (dx, dy)`
- **THEN** dx 约为 40px，dy 约为 40px（确保每个窗口标题栏可见）
- **THEN** 任意两个 Worker 窗口不会完全重叠

#### Scenario: 视口边界保护
- **WHEN** 计算出的窗口位置会导致窗口超出屏幕可视区域
- **THEN** 窗口位置被自动钳制（clamp），确保窗口完全在屏幕范围内

#### Scenario: 可扩展性
- **WHEN** 后期并发数上限增加（如从 4 增加到 8 或更多）
- **THEN** 级联偏移算法无需修改，自动适应任意 Worker 数量
