# 结果预览条目增加重试按钮 Spec

## Why
当前抓取结果预览（ResultPreview）中，当某个链接因验证码或其他原因抓取失败时，用户只能在左侧任务队列中通过右键菜单重试，操作路径不直观。需要在右侧结果预览的每个条目头部直接提供重试按钮，让用户可以一键将失败或卡住的链接重新加入抓取队列。

## What Changes
- **ResultPreview.vue**: 在每个折叠条目头部右侧（标签之后）增加重试按钮
- **重试按钮显示规则**: 当该条目的任务状态为 `failed` 或该条目仍处于"等待获取中..."（即 `productTitle` 为空且长时间未更新）时显示重试按钮
- **点击行为**: 调用 `taskQueueStore.retryTask(taskId)` 将任务重置为 `pending` 状态，并清空已有结果数据；若当前正在运行中，则任务会自动被 Worker 重新拾取执行
- **scrapeResult.ts**: 增加 `hasError` 或 `isFailed` 标记，或复用 `taskQueueStore` 中的任务状态进行联动判断

## Impact
- Affected specs: 无现有 spec 受影响
- Affected code: `src/components/ResultPreview.vue`, `src/stores/scrapeResult.ts` (可选，增加状态标记)

## ADDED Requirements

### Requirement: 每个结果条目头部显示重试按钮
`ResultPreview.vue` 的每个 `NCollapseItem` 头部右侧（现有标签之后）必须根据任务状态条件渲染一个重试按钮。

#### Scenario: 失败任务显示重试按钮
- **GIVEN** 右侧结果预览中有多个抓取结果条目
- **WHEN** 某个条目的任务状态为 `failed`
- **THEN** 该条目头部右侧标签区域之后显示一个"重试"按钮

#### Scenario: 等待中获取超时后显示重试按钮
- **GIVEN** 某个条目一直处于"等待获取中..."状态（无 productTitle）
- **WHEN** 该任务对应的 `taskQueue` 中状态为 `failed` 或 `pending` 但长时间未更新（或统一按 `taskQueue` 的 `failed` 状态判断）
- **THEN** 该条目头部显示重试按钮

#### Scenario: 成功任务不显示重试按钮
- **GIVEN** 某个条目已成功获取到商品标题和图片数据
- **WHEN** 任务状态为 `completed`
- **THEN** 该条目头部不显示重试按钮（保持现有 UI 不变）

### Requirement: 点击重试按钮重新排队抓取
点击重试按钮后，系统必须将该任务重置为待抓取状态。

#### Scenario: 点击重试
- **GIVEN** 用户看到一个失败条目的重试按钮
- **WHEN** 用户点击该按钮
- **THEN** 调用 `taskQueueStore.retryTask(taskId)` 将该任务状态重置为 `pending`
- **AND** 调用 `scrapeResultStore.resetResult(taskId, url, platform)` 清空该条目的旧结果数据
- **AND** 该条目标题恢复为"等待获取中..."
- **AND** 若当前抓取正在运行中，该任务会被空闲 Worker 自动重新拾取执行
- **AND** 页面顶部或按钮附近显示 `message.info('已重新加入队列')` 提示

#### Scenario: 重试后自动被 Worker 执行
- **GIVEN** 用户点击重试时，整体抓取流程仍在运行中（`isRunning === true`）
- **WHEN** 任务被重置为 `pending`
- **THEN** 空闲 Worker 通过 `startNextTask()` 自动拾取该任务并重新执行抓取

## MODIFIED Requirements
无

## REMOVED Requirements
无
