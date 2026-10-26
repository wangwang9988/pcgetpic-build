# 管理后台统计页面统一时间范围筛选 Spec

## Why
当前管理后台的「插件统计」「新标签页统计」「插件卸载统计」「客户端统计」四个页面均提供了时间范围选择器，但选项仅包含 `7 天 / 30 天 / 90 天`，缺少管理员常用的「今天」「昨天」「累计」快捷视角；且各页面实现方式相似但选项不统一。需要以最小改动统一四个页面的时间筛选能力，使选择器切换后趋势图与分布图即时按所选范围更新。

## What Changes
- **统一四个统计页面的时间范围选项**：`今天 / 昨天 / 7 天 / 30 天 / 累计`。
- **扩展服务端 detail 接口**：`plugin-analytics`、`plugin-newtab`、`plugin-uninstall`、`client-analytics` 的趋势与分布接口支持 `range` 参数（`today / yesterday / 7d / 30d / all`）。
- **扩展前端 API 层**：对应 API 文件支持传入 `range` 字符串。
- **改造四个 Vue 页面**：统一选择器、统一刷新逻辑，切换范围后图表与分布数据自动更新。
- **Summary 卡片保持固定**：继续展示「今日 / 昨日 / 近 7 日 / 近 30 日 / 累计」核心指标，作为全局概览，不随选择器变化，避免指标语义混乱。

## Impact
- Affected pages: `admin-panel/src/views/PluginAnalytics.vue`、`PluginNewtab.vue`、`PluginUninstall.vue`、`ClientAnalytics.vue`
- Affected APIs: `admin-panel/src/api/pluginAnalytics.ts`、`pluginNewtab.ts`、`pluginUninstall.ts`、`clientAnalytics.ts`
- Affected server routes: `server/src/routes/admin/plugin-analytics.ts`、`plugin-newtab.ts`、`plugin-uninstall.ts`、`client-analytics.ts`

## ADDED Requirements

### Requirement: 统一时间范围选择器
四个统计页面 SHALL 在右上角提供相同的时间范围选择器，选项为：今天、昨天、7 天、30 天、累计。

#### Scenario: 切换时间范围
- **WHEN** 用户在任意统计页面切换选择器
- **THEN** 页面下方的趋势图与分布图立即按新范围重新请求并渲染
- **AND** 页面不重新加载

### Requirement: 服务端接口支持 range 参数
服务端四个统计模块的趋势与分布接口 SHALL 支持 `range` 查询参数，取值含义：
- `today`：仅统计今天
- `yesterday`：仅统计昨天
- `7d`：最近 7 天（含今天）
- `30d`：最近 30 天（含今天）
- `all`：不限制日期范围

#### Scenario: 兼容旧调用
- **WHEN** 请求未携带 `range` 但携带 `days`
- **THEN** 按原有 `days` 逻辑返回数据

### Requirement: 选择器触发数据刷新
前端页面 SHALL 监听选择器值变化，并统一调用数据获取函数。

#### Scenario: 选择「今天」
- **WHEN** 用户选择「今天」
- **THEN** 趋势图仅展示今天的数据点，分布图仅统计今天的数据

## MODIFIED Requirements

### Requirement: PluginAnalytics 页面时间筛选
`PluginAnalytics.vue` 的 `rangeOptions` 从 `[7, 30, 90]` 改为统一的字符串 range 选项；`fetchAnalytics` 调用 API 时传入 `range`。

### Requirement: PluginNewtab 页面时间筛选
`PluginNewtab.vue` 与 `PluginAnalytics.vue` 保持一致，使用统一选项与刷新逻辑。

### Requirement: PluginUninstall 页面时间筛选
`PluginUninstall.vue` 的趋势与分布接口使用 `range` 参数；最近卸载记录列表保持独立分页，不受时间范围影响。

### Requirement: ClientAnalytics 页面时间筛选
`ClientAnalytics.vue` 与上述页面保持一致，所有趋势图与分布图支持 `range` 参数。

## REMOVED Requirements
无移除功能。`90 天` 选项被替换为更常用的 `今天 / 昨天 / 累计`。
