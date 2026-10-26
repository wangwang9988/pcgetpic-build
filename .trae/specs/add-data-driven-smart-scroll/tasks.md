# Tasks

- [ ] Task 1: 修改 `waitForInitialSubstantialData()` 为零滚动等待模式
  - [ ] 移除初始等待阶段的 80px 探测滚动逻辑
  - [ ] 改为纯轮询等待 `lastSubstantialDataChangeAt > 0`（每 500ms 检查一次）
  - [ ] 增加 `initialDataWaitMs` 默认值从 3s 调整为 30s 作为兜底超时
  - [ ] 超时后执行有限探测滚动（50px 步进，最多 3 轮每轮 500px，无数据则停止）
- [ ] Task 2: 调整 `scrollOneTarget()` 的无数据探测分支
  - [ ] 移除原有的 `noDataProbeDistance` 逻辑（因初始阶段已不再探测滚动）
  - [ ] 保留正常滚动中的数据静默检测（`idleStopMs` 10s 逻辑不变）
- [ ] Task 3: 更新 `normalizeScrollOptions()` 默认参数
  - [ ] `initialDataWaitMs` 从 3000 调整为 30000
  - [ ] 移除 `noDataProbeDistance` 和 `probeStep` 参数（不再需要）
  - [ ] 保留 `idleStopMs: 10000` 不变
- [ ] Task 4: 验证所有 40 个平台 scraper 脚本兼容性
  - [ ] 确认所有平台调用 `simulateScroll()` 的方式无需变更（均通过 `getLastSubstantialDataChangeAt` 回调）
  - [ ] 确认 `tauri-bridge.ts` 的 `lastSubstantialDataChangeAt` 逻辑无需变更

# Task Dependencies
- [Task 2] depends on [Task 1]（移除初始探测后需调整 scrollOneTarget）
- [Task 3] depends on [Task 1]（参数调整与逻辑变更同步）
- [Task 4] depends on [Task 1, Task 2, Task 3]（所有逻辑变更完成后验证兼容性）
