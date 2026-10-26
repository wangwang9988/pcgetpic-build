# 管理后台仪表盘增强 Spec

## Why
当前仪表盘数据维度单一，仅有累计激活码数、已激活设备数、今日激活数、使用率、总销售额、今日订单数 6 个指标，缺少销售额/订单的日维度对比和趋势可视化，管理员无法快速了解业务动态。

## What Changes
- 新增统计卡片：今日销售额、昨日销售额、昨日订单数、总退款金额、今日退款金额
- 新增销售额近7天趋势折线图
- 新增订单数近7天趋势折线图
- 新增激活设备数近7天趋势折线图
- 优化总销售额卡片，标注"已去除退款"
- 后端 Dashboard API 扩展返回字段
- 前端 DashboardStats 类型定义补全

## Impact
- Affected code:
  - `server/src/routes/admin/dashboard.ts` — 扩展 stats API 返回字段
  - `admin-panel/src/api/dashboard.ts` — 更新类型定义
  - `admin-panel/src/views/Dashboard.vue` — 重构 UI 布局，增加图表
  - `admin-panel/package.json` — 新增 echarts 依赖

## ADDED Requirements

### Requirement: 仪表盘日维度销售统计
系统 SHALL 在仪表盘展示以下日维度统计卡片：
- 今日销售额（今日0点起 status='paid' 订单 amount 之和）
- 昨日销售额（昨日0点~昨日24点 status='paid' 订单 amount 之和）
- 昨日订单数（昨日0点~昨日24点 status='paid' 且 paid_at 在范围内）
- 今日退款金额（今日0点起 status='refunded' 订单 amount 之和）
- 总退款金额（所有 status='refunded' 订单 amount 之和）

#### Scenario: 管理员查看日维度销售数据
- **WHEN** 管理员打开仪表盘页面
- **THEN** 页面展示今日销售额、昨日销售额、昨日订单数、今日退款金额、总退款金额

### Requirement: 总销售额标注退款排除
系统 SHALL 在总销售额卡片标签中标注"已去除退款"，明确数据语义。

#### Scenario: 管理员查看总销售额
- **WHEN** 管理员查看总销售额卡片
- **THEN** 卡片标签显示"总销售额（已去除退款）"

### Requirement: 近7天趋势折线图
系统 SHALL 在仪表盘展示3个趋势折线图：
1. 销售额趋势：近7天每日销售额（status='paid' 订单 amount 之和）
2. 订单数趋势：近7天每日订单数（status='paid' 订单数量）
3. 激活设备数趋势：近7天每日激活设备数

每个图表 SHALL 使用 ECharts 渲染，暗色主题风格与现有 UI 一致。

#### Scenario: 管理员查看销售趋势
- **WHEN** 管理员打开仪表盘页面
- **THEN** 页面展示近7天销售额、订单数、激活设备数三个折线图

### Requirement: 后端 Dashboard API 扩展
后端 `/api/admin/dashboard/stats` API SHALL 扩展返回以下字段：
- `today_sales`: number — 今日销售额
- `yesterday_sales`: number — 昨日销售额
- `yesterday_orders`: number — 昨日订单数
- `total_refunds`: number — 总退款金额
- `today_refunds`: number — 今日退款金额
- `sales_trend`: Array<{date: string, amount: number}> — 近7天每日销售额
- `orders_trend`: Array<{date: string, count: number}> — 近7天每日订单数

已有的 `dailyTrend` 字段（近7天每日激活数）继续保留，前端用于激活设备数趋势图。

#### Scenario: API 返回扩展数据
- **WHEN** 前端请求 `/api/admin/dashboard/stats`
- **THEN** 响应包含 today_sales、yesterday_sales、yesterday_orders、total_refunds、today_refunds、sales_trend、orders_trend 字段

## MODIFIED Requirements

### Requirement: 前端 DashboardStats 类型定义
前端 `DashboardStats` 接口 SHALL 补全所有后端返回字段，包括已有的 `activatedCodes`、`disabledCodes`、`statusBreakdown`、`packageDistribution`、`dailyTrend` 以及新增字段。

## REMOVED Requirements
无
