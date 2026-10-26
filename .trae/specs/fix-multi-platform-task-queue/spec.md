# 修复 TaskQueue 多平台任务不显示 Spec

## Why
TaskQueue 组件按 `selectedPlatform` 过滤任务，当用户同时输入多个平台的链接时，只能看到当前选中平台的任务。例如输入 4 个天猫 + 3 个京东链接，全部抓取成功后，TaskQueue 的"已成功完成"只显示 4（仅天猫），京东任务完全不可见。此问题会影响所有后续新增平台（唯品会、拼多多等）。

## What Changes
- **TaskQueue.vue**: 移除按平台过滤逻辑，改为显示所有平台的任务
- **App.vue**: 移除传递给 TaskQueue 的 `platform` prop（不再需要）
- **TaskQueue.vue**: 在每个任务条目中增加平台标识显示，以便用户区分不同平台的任务

## Impact
- Affected specs: 无
- Affected code: `src/components/TaskQueue.vue`, `src/App.vue`

---

## ADDED Requirements

### Requirement: TaskQueue 显示所有平台任务
TaskQueue 组件 SHALL 显示所有平台的任务，不再按 `selectedPlatform` 过滤。用户无需切换平台标签即可看到全部任务的进行状态。

#### Scenario: 多平台任务同时可见
- **GIVEN** 用户输入了 4 个天猫链接和 3 个京东链接
- **WHEN** 所有 7 个链接抓取完成
- **THEN** TaskQueue 的"已成功完成"折叠面板显示 7 个任务
- **AND** 天猫和京东任务均可见

#### Scenario: 单平台任务不受影响
- **GIVEN** 用户仅输入天猫链接
- **WHEN** 抓取完成
- **THEN** TaskQueue 行为与修改前一致

### Requirement: 任务条目显示平台标识
TaskQueue 中每个任务条目 SHALL 显示该任务所属平台的标签（如"淘宝/天猫"、"京东"），以便用户在混合任务列表中快速区分不同平台。

#### Scenario: 平台标签可见
- **GIVEN** TaskQueue 中有天猫和京东的混合任务
- **WHEN** 渲染任务条目
- **THEN** 天猫任务条目显示"淘宝/天猫"标签
- **AND** 京东任务条目显示"京东"标签

### Requirement: 未来平台自动支持
当新增唯品会、拼多多等平台时，TaskQueue SHALL 自动显示该平台的任务，无需修改 TaskQueue 组件代码。

#### Scenario: 新增平台自动可见
- **GIVEN** 系统新增了唯品会平台支持
- **WHEN** 用户输入唯品会链接并抓取
- **THEN** 唯品会任务自动出现在 TaskQueue 中
- **AND** 任务条目显示"唯品会"标签

## MODIFIED Requirements
无

## REMOVED Requirements
无
