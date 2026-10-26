# 修复静默超时判定逻辑 Spec

## Why
同事的修改将用户设置的 `idleTimeout` 传递到前端脚本层，核心方向正确。但存在 3 个相互关联的 Bug，导致静默超时在实际运行中仍然无法正确触发，且 `maxWaitMs` 兜底机制也被突破。

## What Changes
- **scrape_handler.rs**：将 `update_data_change_time` 调用从无条件执行改为仅在 `is_substantial` 为 true 时执行，统一 Rust 端与前端的数据变化判定标准
- **tauri-bridge.ts**：为 `lastAnyDataChangeAt` 增加基于 key+序列化值的去重保护，避免重复数据无限刷新时间戳
- **utils.ts waitForCompletion**：修正图片/通用数据的优先级逻辑为合并判定；修复 `maxWaitMs` 兜底被突破的问题

## Impact
- Affected specs: optimize-completion-detection, login-aware-smart-timeout
- Affected code:
  - `src-tauri/src/scrape_handler.rs`（1 行逻辑调整）
  - `scraper-scripts/shared/tauri-bridge.ts`（增加去重 Map）
  - `scraper-scripts/shared/utils.ts`（修正判定逻辑 + 修复兜底突破）

## ADDED Requirements

### Requirement: lastAnyDataChangeAt 去重保护
系统 SHALL 对 `lastAnyDataChangeAt` 的更新实施与 `lastImageDataChangeAt` 同等强度的去重保护。仅当某个 key 对应的数据内容发生实质性变化（序列化后与上次不同）时，才刷新 `lastAnyDataChangeAt` 时间戳。

#### Scenario: 重复视频数据不刷新时间戳
- **WHEN** `jdGetVideo` 的 `onVideoFound` 因 requestAnimationFrame 循环反复调用 `tauriBridge.send('VideoUrls', videos)` 且视频列表内容未变
- **THEN** `lastAnyDataChangeAt` 不被刷新

#### Scenario: 新视频数据刷新时间戳
- **WHEN** 发现了之前未上报的新视频 URL，`tauriBridge.send('VideoUrls', videos)` 的内容与上次不同
- **THEN** `lastAnyDataChangeAt` 被刷新为当前时间

### Requirement: Rust 端与前端数据变化判定标准统一
系统 SHALL 确保 Rust 端 `timeout_monitor` 的 `update_data_change_time` 仅在收到实质性数据时才调用，与前端的 `lastAnyDataChangeAt` 逻辑保持一致。

#### Scenario: 非实质性数据不重置 Rust 端超时计时
- **WHEN** 前端脚本发送非实质性数据（如重复的标题、空数组等）
- **THEN** Rust 端的 `last_data_change` 和 `has_produced_data` 不被更新

#### Scenario: 实质性数据正常重置 Rust 端超时计时
- **WHEN** 前端脚本发送实质性数据（非空图片/视频/详情数组）
- **THEN** Rust 端的 `last_data_change` 和 `has_produced_data` 正常更新

### Requirement: maxWaitMs 硬性兜底不可突破
系统 SHALL 确保 `maxWaitMs` 作为硬性超时上限，不会被"最近 3 秒内有新数据"的宽限期无限延长。宽限期最多只能延长一次固定时长（如 5 秒），超过后必须强制完成。

#### Scenario: 数据持续流动但已达 maxWaitMs
- **WHEN** `totalElapsed >= maxWaitMs` 且 `timeSinceLastData < 3000`（数据仍在流动）
- **THEN** 最多再等待 5 秒宽限期，之后强制完成，不再继续延长

#### Scenario: 正常静默超时不受影响
- **WHEN** 数据在 `imageDataIdleMs` 内已静默
- **THEN** 正常触发静默超时完成，不受 `maxWaitMs` 逻辑影响

## MODIFIED Requirements

### Requirement: 图片与通用数据联合静默判定
原实现：有图片数据时完全忽略通用数据变化时间（互斥选择）。
修改为：取图片数据变化时间和通用数据变化时间中的较晚者作为"最后数据变化时间"，只有当所有数据流都静默超过阈值时才判定完成。

#### Scenario: 图片静默但视频仍在流动
- **WHEN** 图片数据已静默 7 秒，但视频数据在 3 秒前仍有更新
- **THEN** 不判定为完成，继续等待直到所有数据都静默

#### Scenario: 无图片数据但有通用数据
- **WHEN** 没有图片数据产出，但通用数据（标题、链接等）在持续更新
- **THEN** 使用通用数据的最后变化时间进行静默判定

### Requirement: tauriBridge.send() 数据变化追踪
原实现：`isNewSubstantialData` 仅检查 value 是否为非空数据结构即刷新 `lastAnyDataChangeAt`，无去重保护。
修改为：增加 `prevAnyDataValues` Map，按 key 存储上次序列化值，仅当序列化结果与上次不同时才视为新数据并刷新 `lastAnyDataChangeAt`。`IMAGE_DATA_KEYS` 的图片数据仍使用 `uploadedImageKeys` 做 URL 级精确去重。
