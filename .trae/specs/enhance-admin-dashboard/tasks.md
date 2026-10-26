# Tasks

- [ ] Task 1: 后端 Dashboard API 扩展 — 在 `server/src/routes/admin/dashboard.ts` 中新增查询逻辑
  - [ ] SubTask 1.1: 新增 today_sales 查询（今日0点起 status='paid' 订单 amount 之和）
  - [ ] SubTask 1.2: 新增 yesterday_sales 查询（昨日0点~昨日24点 status='paid' 订单 amount 之和）
  - [ ] SubTask 1.3: 新增 yesterday_orders 查询（昨日0点~昨日24点 status='paid' 订单数量）
  - [ ] SubTask 1.4: 新增 total_refunds 查询（所有 status='refunded' 订单 amount 之和）
  - [ ] SubTask 1.5: 新增 today_refunds 查询（今日0点起 status='refunded' 订单 amount 之和）
  - [ ] SubTask 1.6: 新增 sales_trend 查询（近7天每日销售额，按 date(paid_at) 分组）
  - [ ] SubTask 1.7: 新增 orders_trend 查询（近7天每日订单数，按 date(paid_at) 分组）
  - [ ] SubTask 1.8: 将所有新字段合并到 stats 响应对象中返回

- [ ] Task 2: 前端 API 类型定义更新 — 更新 `admin-panel/src/api/dashboard.ts`
  - [ ] SubTask 2.1: DashboardStats 接口补全已有后端字段（activatedCodes、disabledCodes、statusBreakdown、packageDistribution、dailyTrend）
  - [ ] SubTask 2.2: DashboardStats 接口新增 today_sales、yesterday_sales、yesterday_orders、total_refunds、today_refunds、sales_trend、orders_trend

- [ ] Task 3: 安装 ECharts 依赖
  - [ ] SubTask 3.1: 在 admin-panel 目录安装 echarts 和 vue-echarts

- [ ] Task 4: 仪表盘 UI 重构 — 重写 `admin-panel/src/views/Dashboard.vue`
  - [ ] SubTask 4.1: 统计卡片区域重构 — 第一行：累计激活码数、已激活设备数、今日激活数、激活码使用率；第二行：总销售额（已去除退款）、今日销售额、昨日销售额、总退款金额；第三行：今日订单数、昨日订单数、今日退款金额
  - [ ] SubTask 4.2: 新增销售额近7天趋势折线图（使用 ECharts，暗色主题）
  - [ ] SubTask 4.3: 新增订单数近7天趋势折线图（使用 ECharts，暗色主题）
  - [ ] SubTask 4.4: 新增激活设备数近7天趋势折线图（使用 ECharts，暗色主题，数据来自 dailyTrend）
  - [ ] SubTask 4.5: 图表区域使用 n-grid 布局，3列排列

# Task Dependencies
- [Task 2] depends on [Task 1] — 类型定义需要与后端返回字段对齐
- [Task 4] depends on [Task 2] and [Task 3] — UI 重构需要类型定义和 ECharts 依赖
