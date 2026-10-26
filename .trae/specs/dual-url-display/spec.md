# 双区链接输入与处理结果展示 Spec

## Why
当前 `LinkInput.vue` 只有一个 textarea 输入框，用户粘贴链接后 `cleanUrl()` 会**瞬间原地替换**输入的 URL（如淘宝链接被去掉 `id` 以外的参数），用户察觉不到是程序主动清理，误以为粘贴出了问题。需要将"原始输入"和"处理后的最终链接"分离为两个区域，让用户清楚看到 URL 的清洗结果，并支持手动修正。

## What Changes
- `LinkInput.vue` 重构为**双区布局**：上方为原始 URL 输入区（textarea），下方为处理后 URL 展示区（可编辑表格）
- 处理后 URL 展示区以**带序号表格**形式显示，每行一条 URL，支持**行内编辑**
- 后续添加到下载队列时**以表格中显示的 URL 为准**
- 表格中展示每条 URL 的**平台检测结果**（平台图标 + 名称标签）
- 保留现有的去重、剪贴板导入、拖拽文件导入等功能

## Impact
- Affected specs: 无现有 spec 冲突
- Affected code: `src/components/LinkInput.vue`（主要修改），`src/utils/platforms.ts`（可能需要暴露额外工具函数）

## ADDED Requirements

### Requirement: 双区链接输入布局
系统 SHALL 在 `LinkInput.vue` 中提供两个独立区域：上方为原始 URL 输入区，下方为处理后 URL 展示区。

#### Scenario: 用户粘贴淘宝链接
- **WHEN** 用户在 textarea 中粘贴 `https://item.taobao.com/item.htm?id=123456&spm=a1z09.2.0.0.xxx&_u=yyy`
- **THEN** 下方表格显示处理后的链接 `https://item.taobao.com/item.htm?id=123456`，并标注平台为"淘宝/天猫"

#### Scenario: 用户粘贴非淘宝链接
- **WHEN** 用户粘贴暂未实现清洗逻辑的平台链接（如京东链接）
- **THEN** 下方表格显示原始链接（不做清洗），并标注检测到的平台名称

#### Scenario: 用户粘贴非 URL 文本
- **WHEN** 用户粘贴不包含 `http://` 或 `https://` 的文本
- **THEN** 该行在表格中不显示（被过滤）

### Requirement: 处理后 URL 表格展示
系统 SHALL 以表格形式展示处理后的 URL，包含序号、平台信息、可编辑的 URL 列。

#### Scenario: 表格行格式
- **WHEN** 存在有效链接
- **THEN** 每行显示：序号（从 1 开始）、平台图标 + 名称标签、处理后的 URL（可编辑输入框）

#### Scenario: 表格中 URL 单独编辑
- **WHEN** 用户在表格中修改某条 URL
- **THEN** 该条 URL 的修改立即生效，添加到队列时以修改后的 URL 为准

#### Scenario: 空表格状态
- **WHEN** 没有有效链接时
- **THEN** 表格区域显示空状态提示（如"暂无有效链接"）

### Requirement: 队列添加以表格 URL 为准
系统 SHALL 在用户点击"添加到队列"时，以表格中显示的 URL 列表为准进行添加。

#### Scenario: 添加表格 URL 到队列
- **WHEN** 用户点击"添加到队列"
- **THEN** 使用表格中当前显示的 URL 列表（含用户手动修改的）作为 `taskQueueStore.addTasks()` 的参数

### Requirement: 平台检测信息展示
系统 SHALL 在表格中展示每条链接检测到的平台信息。

#### Scenario: 已识别平台
- **WHEN** URL 匹配到已知平台
- **THEN** 显示该平台的图标（emoji）和中文名称

#### Scenario: 未识别平台
- **WHEN** URL 不匹配任何已知平台
- **THEN** 显示"未知平台"标签，URL 保持原样