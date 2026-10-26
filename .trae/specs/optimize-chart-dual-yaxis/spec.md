# 趋势图双 Y 轴与数值显示优化 Spec

## Why
管理后台 4 个核心折线图中，不同量级的指标共用单 Y 轴导致数值较小的折线被压成近似水平直线，失去波形和对比意义。需要为这些图表引入双 Y 轴机制和"显示数值"开关，提升数据可读性。

## What Changes
- 将 `ClientAnalytics.vue`、`PluginAnalytics.vue`、`PluginNewtab.vue` 的单 Y 轴折线图改造为双 Y 轴配置
- 优化 `PluginUninstall.vue` 已有双 Y 轴（补充轴名称、刻度对齐、千分位格式化）
- 为 4 个页面的趋势图卡片添加"显示数值"开关
- 提取 `useChartLabel` composable 避免重复代码
- 统一双 Y 轴视觉规范：右轴隐藏 splitLine、刻度对齐、千分位格式化、轴名称标题
- Tooltip 增强为双轴感知，区分左右轴标签

## Impact
- Affected code:
  - `admin-panel/src/views/ClientAnalytics.vue` — 单 Y 轴改双 Y 轴 + 开关
  - `admin-panel/src/views/PluginAnalytics.vue` — 单 Y 轴改双 Y 轴 + 开关
  - `admin-panel/src/views/PluginNewtab.vue` — 单 Y 轴改双 Y 轴 + 开关
  - `admin-panel/src/views/PluginUninstall.vue` — 优化已有双 Y 轴 + 开关
  - `admin-panel/src/composables/useChartLabel.ts` — 新增 composable

## ADDED Requirements

### Requirement: 双 Y 轴配置
4 个趋势图 SHALL 根据指标量级差异配置独立的双 Y 轴，具体分配如下：

- **ClientAnalytics**：左轴 = DAU + 已激活活跃 + 未激活活跃（绿色系，堆叠面积图），右轴 = 下载文件（蓝色）
- **PluginAnalytics**：左轴 = DAU（绿色面积图），右轴 = 下载事件（蓝色）
- **PluginNewtab**：左轴 = DAU（绿色面积图），右轴 = 上报次数（蓝色）
- **PluginUninstall**：左轴 = 卸载数（红色面积图），右轴 = 平均使用天数（黄色）

#### Scenario: 不同量级指标同时展示
- **WHEN** 用户查看趋势图且两个指标量级差异超过 10 倍
- **THEN** 两条折线各自在其对应 Y 轴上有清晰可辨的波形

### Requirement: 双 Y 轴视觉规范
所有双 Y 轴图表 SHALL 遵循统一视觉规范：

- 左右 Y 轴均设置 `name` 标题（格式：`指标名 (单位)`，如 `活跃 (人)`、`下载 (次)`）
- 左右 Y 轴均启用 `alignTicks: true` 保证网格线对齐
- 右轴 `splitLine: { show: false }`，仅左轴显示网格线
- 左右 Y 轴 `axisLabel.formatter` 使用千分位格式化（如 `3000` → `3,000`）
- Tooltip `valueFormatter` 同样使用千分位格式化

#### Scenario: 刻度网格对齐
- **WHEN** 双 Y 轴同时渲染
- **THEN** 左右轴的横向网格分割线严格对齐，无双重虚线

### Requirement: 显示数值开关
每个趋势图卡片的右上角 SHALL 提供"显示数值"开关（n-switch），默认关闭。开启后折线上每个数据点显示具体数值标签。

- 当数据点 > 31 时，label 自动设置 `interval: 'auto'` 进行稀疏显示，避免标签重叠
- 开关状态通过 `useChartLabel` composable 统一管理

#### Scenario: 用户开启显示数值
- **WHEN** 用户点击"显示数值"开关
- **THEN** 折线上浮现具体数值标签，且标签不重叠

#### Scenario: 大数据量下自动稀疏
- **WHEN** 数据点 > 31 且开关开启
- **THEN** label 自动稀疏显示，仅部分关键点展示数值

### Requirement: Tooltip 双轴感知
双 Y 轴图表的 Tooltip SHALL 区分左右轴标签，使用 formatter 在数值后追加轴单位标识，让用户一目了然哪条线属于哪个轴。

#### Scenario: 悬停查看数据
- **WHEN** 用户悬停到数据点
- **THEN** Tooltip 中各项显示格式为 `指标名: 3,000 人` 或 `下载文件: 1,200 次`，带单位区分

### Requirement: useChartLabel composable
提取 `useChartLabel` composable 到 `admin-panel/src/composables/useChartLabel.ts`，封装：

- `showChartLabels` ref 状态
- `labelOption` computed（根据 showChartLabels 和数据点数量自动计算 label 配置）
- 4 个页面统一使用此 composable，避免重复代码

#### Scenario: 多页面复用
- **WHEN** 任意页面引入 `useChartLabel`
- **THEN** 获得响应式的 label 配置，无需在各页面重复编写开关逻辑

## MODIFIED Requirements

### Requirement: ClientAnalytics 趋势图
原单 Y 轴配置改为双 Y 轴：DAU/已激活活跃/未激活活跃 使用堆叠面积图共用左轴，下载文件使用右轴。堆叠面积图使总量-分量关系更直观。

### Requirement: PluginUninstall 双 Y 轴增强
已有双 Y 轴配置需补充：`name` 轴标题、`alignTicks: true`、千分位格式化、右轴 splitLine 隐藏。
