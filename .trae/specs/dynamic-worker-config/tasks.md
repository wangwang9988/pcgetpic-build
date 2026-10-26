# 动态调节并发数和静默超时功能 - 实现计划

## [ ] Task 1: 修改前端 ControlBar.vue 组件
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 移除并发数选择器的 `:disabled="taskQueueStore.isRunning"` 限制
  - 移除静默超时选择器的 `:disabled="taskQueueStore.isRunning"` 限制
  - 修改 `handleWorkerCountChange` 函数，增加成功消息提示
  - 监听 `idleTimeout` 变化，发送 IPC 到后端并显示成功消息
- **Acceptance Criteria Addressed**: AC-1, AC-5
- **Test Requirements**:
  - `human-judgment` TR-1.1: 确认并发数选择器在运行时可点击
  - `human-judgment` TR-1.2: 确认超时时间选择器在运行时可点击
  - `human-judgment` TR-1.3: 修改后显示成功提示消息

## [ ] Task 2: 修改 Rust set_worker_count 命令，增加自动调度
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 在 `set_worker_count` 成功设置并发数后，调用 `do_dispatch` 触发任务调度
  - 确保新增的Worker能够立即分配到待抓取任务
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 调用 set_worker_count 增加并发数后，检查Worker数量增加
  - `programmatic` TR-2.2: 新Worker能够获取待抓取任务

## [ ] Task 3: 修改 Rust set_scraping_config 命令，确保即时生效
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 确认 `set_scraping_config` 已正确修改 `state.idle_timeout`
  - 由于 `timeout_monitor.rs` 每秒读取一次状态，修改会自动生效
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 修改超时时间后，检查状态中的值已更新
  - `programmatic` TR-3.2: 超时监控使用新的超时时间

## [ ] Task 4: 添加 worker-count-changed 事件监听（前端）
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 在前端监听 `worker-count-changed` 事件
  - 更新本地 workerCount 状态
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-4.1: 修改并发数后UI显示正确的数值

## [ ] Task 5: 测试和验证
- **Priority**: P1
- **Depends On**: Tasks 1-4
- **Description**: 
  - 测试并发数从2增加到4的场景
  - 测试并发数从4减少到2的场景
  - 测试超时时间从60秒改为30秒的场景
- **Acceptance Criteria Addressed**: 所有AC
- **Test Requirements**:
  - `human-judgment` TR-5.1: 端到端测试所有功能正常工作