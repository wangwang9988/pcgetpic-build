---
name: dashboard-finance-section-restructure
overview: 重构 Dashboard.vue 中"运营与财务"板块为 5 行布局（今日/昨日/近7天/近30天/累计），在后端补齐缺失字段并新增30天聚合数据查询。
todos:
  - id: add-backend-fields
    content: 在 server/src/routes/admin/dashboard.ts 中新增 thirtyDaysAgo 常量，添加 yesterday_refunds、total_orders、last_7_days_refunds、last_30_days_sales、last_30_days_orders、last_30_days_refunds 共6个查询并返回
    status: pending
  - id: update-api-types
    content: 在 admin-panel/src/api/dashboard.ts 的 DashboardStats 接口追加6个新字段
    status: pending
    dependencies:
      - add-backend-fields
  - id: restructure-frontend
    content: 重构 Dashboard.vue：更新 defaultStats，添加 last7Sales/last7Orders computed，将"运营与财务"区改为5行布局
    status: pending
    dependencies:
      - update-api-types
---

## 产品概述

在管理后台仪表盘中，将"运营与财务"板块从当前单层网格布局改为按时间维度分5行展示。

## 核心功能

1. **第1行（今天）**：展示今日销售额、今日订单数、今日退款额
2. **第2行（昨天）**：展示昨日销售额、昨日订单数、昨日退款额
3. **第3行（最近7天）**：展示近7天总销售额、近7天总订单数、近7天总退款额
4. **第4行（最近30天）**：展示近30天总销售额、近30天总订单数、近30天总退款额（新增）
5. **第5行（累计）**：展示总销售额、累计订单数、累计退款额

采用"后端补齐缺失字段 + 前端一起改"方案。

## 技术栈

- 后端：Node.js + Express + TypeScript + SQLite (better-sqlite3)
- 前端：Vue 3 + TypeScript + Naive UI + ECharts

## 实现方案

### 一、后端修改（server/src/routes/admin/dashboard.ts）

在 `/dashboard/stats` 接口中新增 **6 个**查询字段。需新增一个 `thirtyDaysAgo` 时间常量（复用现有 `addDays(todayStart, -29).getTime()` 模式），其他复用现有时间常量。

#### 1. yesterday_refunds —— 昨日退款总额

```sql
SELECT COALESCE(SUM(amount), 0) as total FROM orders
WHERE status = 'refunded' AND refunded_at >= ? AND refunded_at < ?
```

参数：`yesterdayTimestamp`、`todayTimestamp`

#### 2. total_orders —— 累计已支付订单数

```sql
SELECT COUNT(*) as cnt FROM orders WHERE status = 'paid'
```

#### 3. last_7_days_refunds —— 近7天退款总额

```sql
SELECT COALESCE(SUM(amount), 0) as total FROM orders
WHERE status = 'refunded' AND refunded_at >= ? AND refunded_at < ?
```

参数：`sevenDaysAgo`、`tomorrowTimestamp`

#### 4. last_30_days_sales —— 近30天销售额

```sql
SELECT COALESCE(SUM(amount), 0) as total FROM orders
WHERE status = 'paid' AND paid_at >= ? AND paid_at < ?
```

参数：`thirtyDaysAgo`、`tomorrowTimestamp`

#### 5. last_30_days_orders —— 近30天订单数

```sql
SELECT COUNT(*) as cnt FROM orders
WHERE status = 'paid' AND paid_at >= ? AND paid_at < ?
```

参数：`thirtyDaysAgo`、`tomorrowTimestamp`

#### 6. last_30_days_refunds —— 近30天退款总额

```sql
SELECT COALESCE(SUM(amount), 0) as total FROM orders
WHERE status = 'refunded' AND refunded_at >= ? AND refunded_at < ?
```

参数：`thirtyDaysAgo`、`tomorrowTimestamp`

**关键技术决策**：

- 近7天销售额和订单数不从后端新增字段，前端从 `sales_trend`/`orders_trend` 数组 `reduce` 汇总，避免数据冗余
- 近30天数据因不存在对应 trend 数组，故后端独立查询聚合值
- 退款数据不包含在任何现有 trend 数组中，所以全部后端独立查询
- 完全复用现有代码模式（`db.prepare().get()`、`TotalRow`/`CountRow` 类型）

### 二、前端类型定义修改（admin-panel/src/api/dashboard.ts）

在 `DashboardStats` 接口末尾追加6个字段：

```typescript
yesterday_refunds: number
total_orders: number
last_7_days_refunds: number
last_30_days_sales: number
last_30_days_orders: number
last_30_days_refunds: number
```

### 三、前端视图重构（admin-panel/src/views/Dashboard.vue）

将"运营与财务"区域的单层 grid 改为 **5 个垂直堆叠的 grid**，每行 3 列指标卡片：

```
第1行（今天）：    [今日销售额]   [今日订单数]   [今日退款额]
第2行（昨天）：    [昨日销售额]   [昨日订单数]   [昨日退款额]
第3行（近7天）：   [近7天销售额]  [近7天订单数]  [近7天退款额]
第4行（近30天）：  [近30天销售额] [近30天订单数] [近30天退款额]
第5行（累计）：    [总销售额]     [累计订单数]   [累计退款额]
```

**计算助手**（computed，用于7天汇总）：

```typescript
const last7Sales = computed(() =>
  stats.value.sales_trend.reduce((sum, item) => sum + item.amount, 0)
)
const last7Orders = computed(() =>
  stats.value.orders_trend.reduce((sum, item) => sum + item.count, 0)
)
```

**defaultStats 更新**：为所有6个新字段添加默认值 `0`。

**布局结构**：每个 grid 使用 `<n-grid cols="1 s:3">`，每行上方使用简短的时段标签（如"今天"、"昨天"等），卡片样式复用现有 `.metric-card` 类。

### 四、涉及文件清单

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| server/src/routes/admin/dashboard.ts | 修改 | 新增 thirtyDaysAgo 常量 + 6个查询字段，返回中追加 |
| admin-panel/src/api/dashboard.ts | 修改 | DashboardStats 追加6个字段 |
| admin-panel/src/views/Dashboard.vue | 修改 | 更新 defaultStats、添加2个 computed、重构为5行布局 |


### 五、性能与可靠性

- 后端新增查询均为索引范围查询（时间戳 + 状态），复杂度 O(log n)，无性能风险
- 前端7天汇总计算仅7个元素，可在 computed 中完成，无渲染压力
- 所有新字段在 defaultStats 中赋默认值 0，确保后端尚未部署新代码时前端不会崩溃
- 不改动任何已有字段的行为，后端兼容旧前端
- 30天范围查询使用更大时间跨度，但仍是索引范围扫描，性能可接受

## 设计说明

不引入新视觉风格，完全复用现有暗色管理后台设计体系。仅在"运营与财务"区域内将布局从单层网格改为5行分栏。

## 布局变更

- 当前：1个 `<n-grid cols="1 s:2 m:3 l:4">` 混合排列6个卡片
- 改为：5个 `<n-grid cols="1 s:3">` 垂直堆叠，每行展示一个时间段（今天/昨天/近7天/近30天/累计），每行3个指标卡片

## 视觉细节

- 卡片：完全复用 `.metric-card` 类（min-height: 116px，flex column 居中内容）
- 行间距：grid 之间使用 margin-bottom: 16px
- 时间段标签：在每个 grid 上方添加一行小字描述（如"今天"、"昨天"、"近7天"、"近30天"、"累计"），使用 `.metric-note` 的文字样式