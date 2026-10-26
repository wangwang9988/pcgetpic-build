# 数据驱动的智能滚动增强 Spec

## Why

当前 `simulateScroll()` 在初始等待阶段（`waitForInitialSubstantialData`）仍执行 80px 探测滚动，在未获取到任何实质性数据（MainPic/DetailPic/SkuPic/VideoInfo/VideoUrls）前就开始滚动页面。对于强风控平台，空数据阶段的滚动可能触发反爬检测；同时初始等待仅 3s 超时，超时后即进入无数据探测模式，可能过早滚动导致页面状态异常。

## What Changes

- **初始阶段完全禁止滚动**：在收到至少一条实质性数据前，不执行任何滚动（包括当前 80px 探测滚动）
- **数据到达后启动正常滚动**：收到实质性数据后，从页面顶部开始正常步进滚动
- **10s 数据静默停止滚动**：保持现有 `idleStopMs: 10000` 逻辑不变
- **增加初始数据等待超时**：为避免无限等待，设置初始数据等待最大时长（如 30s），超时后以极小步进（50px）做有限探测

## Impact

- Affected code: `scraper-scripts/shared/utils.ts`（`simulateScroll` / `waitForInitialSubstantialData` / `scrollOneTarget`）
- Affected code: `scraper-scripts/shared/tauri-bridge.ts`（`lastSubstantialDataChangeAt` 时间戳，已有）
- 影响范围：所有 40 个平台的 scraper 脚本（均通过 `simulateScroll` 调用）
- **无 Rust 端变更**，无前端 Vue 组件变更

## ADDED Requirements

### Requirement: 初始阶段零滚动等待

在 Worker WebView 加载商品页后、scraper 脚本注入并启动 `simulateScroll()` 时，系统 SHALL 在未收到任何实质性数据前完全禁止页面滚动（包括探测滚动）。

#### Scenario: 页面加载后尚未获取到任何图片/视频数据
- **WHEN** scraper 脚本启动 `simulateScroll()` 且 `lastSubstantialDataChangeAt` 为 0（从未收到实质性数据）
- **THEN** 不执行任何滚动操作，仅轮询等待实质性数据到达

#### Scenario: 收到第一条实质性数据
- **WHEN** `tauriBridge.send()` 上报 MainPic/DetailPic/SkuPic/VideoInfo/VideoUrls 且值非空
- **THEN** `lastSubstantialDataChangeAt` 更新为当前时间戳，`simulateScroll()` 从页面顶部开始正常步进滚动

#### Scenario: 初始数据等待超时
- **WHEN** 启动后超过 `initialDataWaitMs`（默认 30s）仍未收到任何实质性数据
- **THEN** 以极小步进（50px）做有限探测滚动（最多 3 轮，每轮 500px），若仍无数据则停止滚动，等待 `waitForCompletion()` 超时机制接管

### Requirement: 数据静默停止滚动（已有，保持不变）

系统 SHALL 在最后一次收到实质性数据后 10 秒（`idleStopMs`）无新数据时停止滚动。

#### Scenario: 滚动中 10s 无新数据
- **WHEN** 正常滚动过程中 `lastSubstantialDataChangeAt` 距今超过 `idleStopMs`（10s）
- **THEN** 停止滚动，回到页面顶部

## MODIFIED Requirements

### Requirement: waitForInitialSubstantialData 行为变更

原有行为：等待最多 3s，期间每 900ms 做 80px 探测滚动，超时后回滚顶部进入无数据探测模式。

新行为：等待实质性数据到达（无固定短超时），期间完全不滚动；超过 `initialDataWaitMs`（30s）后做有限探测。

## REMOVED Requirements

无。
