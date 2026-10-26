# 结果预览条目增加删除按钮 Spec

## Why
当前结果预览（ResultPreview）中，用户无法从列表中移除不需要的链接条目。当用户输入了错误的链接、或某个链接始终抓取失败不想再处理时，只能通过左侧任务队列右键菜单删除，操作路径不直观。需要在右侧结果预览的每个条目头部直接提供删除按钮，让用户可以一键移除不需要的条目。

## 按钮位置评估

### 当前按钮布局（从左到右）
```
[主图N] [SKU N] [详情N] [视频N] | [下载] [重试]
  ↑ 信息标签                          ↑ 操作按钮
```

### 方案对比

| 方案 | 布局 | 优势 | 劣势 |
|------|------|------|------|
| A: 删除在重试左边 | [下载] [删除] [重试] | 无明显优势 | 破坏建设性→破坏性的逻辑流；删除夹在两个建设性操作之间，容易误触 |
| **B: 删除在重试右边** ✅ | [下载] [重试] [删除] | 符合通用UI原则（建设性→中性→破坏性）；破坏性操作离主操作最远，防误触；视觉流自然：下载(积极)→重试(中性)→删除(消极) | 无 |

### 最终决策：删除按钮放在重试按钮的**右边**

理由：
1. **通用UI原则**：从左到右按"建设性→中性→破坏性"排列，这是 macOS、Windows、Gmail 等主流系统的标准模式
2. **防误触**：破坏性操作放在最右侧，离主操作（下载）最远，减少误点击风险
3. **视觉流自然**：用户视线从左到右扫过，最后才看到删除选项，符合"最后考虑删除"的心理预期
4. **与重试按钮风格统一**：两个辅助操作（重试、删除）紧邻排列，视觉上形成操作组，与下载主按钮有所区分

## What Changes
- **ResultPreview.vue**: 在每个折叠条目头部右侧的重试按钮之后增加删除按钮
- **删除按钮样式**: 使用 `type="error"` + `quaternary` 风格，与重试按钮视觉权重一致但用红色标识破坏性
- **删除确认**: 使用 `NPopconfirm` 弹出确认气泡，防止误操作
- **删除行为**: 调用 `taskQueueStore.removeTask(taskId)` 移除任务及关联结果，同时清理下载状态
- **taskQueue.ts**: `removeTask` 方法需额外清理 `downloadStateStore` 中的下载状态

## Impact
- Affected specs: 无现有 spec 受影响
- Affected code: `src/components/ResultPreview.vue`, `src/stores/taskQueue.ts`

## ADDED Requirements

### Requirement: 每个结果条目头部显示删除按钮
`ResultPreview.vue` 的每个 `NCollapseItem` 头部右侧，在重试按钮之后必须渲染一个删除按钮。

#### Scenario: 正常显示删除按钮
- **GIVEN** 右侧结果预览中有抓取结果条目
- **WHEN** 用户查看任意条目的头部操作区
- **THEN** 该条目头部在重试按钮右侧显示一个删除按钮

#### Scenario: 任务正在运行时禁用删除按钮
- **GIVEN** 某个条目的任务状态为 `running`
- **WHEN** 用户查看该条目的头部操作区
- **THEN** 删除按钮处于禁用状态（disabled），防止运行中误删

#### Scenario: 任务正在下载时禁用删除按钮
- **GIVEN** 某个条目的下载状态为 `downloading`
- **WHEN** 用户查看该条目的头部操作区
- **THEN** 删除按钮处于禁用状态（disabled），防止下载中误删

### Requirement: 点击删除按钮需二次确认
删除操作不可逆，必须通过确认弹窗防止误操作。

#### Scenario: 点击删除按钮弹出确认
- **GIVEN** 用户点击某个条目的删除按钮
- **WHEN** 该按钮未被禁用
- **THEN** 弹出 `NPopconfirm` 确认气泡，提示"确定删除该链接？删除后不可恢复"
- **AND** 确认按钮为红色/危险样式

#### Scenario: 确认删除
- **GIVEN** 用户已点击删除按钮并看到确认弹窗
- **WHEN** 用户点击确认
- **THEN** 该条目从结果列表中移除
- **AND** 该任务从任务队列中移除
- **AND** 关联的下载状态被清理
- **AND** 页面显示 `message.info('已删除')` 提示

#### Scenario: 取消删除
- **GIVEN** 用户已点击删除按钮并看到确认弹窗
- **WHEN** 用户点击取消或点击弹窗外区域
- **THEN** 不执行任何删除操作，界面保持不变

### Requirement: 删除时完整清理关联状态
删除条目时必须同步清理所有关联的 store 状态，避免内存泄漏和状态残留。

#### Scenario: 删除时清理任务队列、结果数据、下载状态
- **GIVEN** 用户确认删除某个条目
- **WHEN** 删除操作执行
- **THEN** `taskQueueStore.removeTask(taskId)` 被调用（移除任务 + 结果数据）
- **AND** `downloadStore.resetDownloadState(taskId)` 被调用（清理下载状态）

## MODIFIED Requirements
无

## REMOVED Requirements
无
