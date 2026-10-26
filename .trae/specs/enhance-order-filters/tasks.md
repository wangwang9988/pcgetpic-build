# Tasks

- [x] Task 1: 后端 — 扩展订单查询接口支持多维度筛选
  - [x] 1.1: 修改 `GET /` 接口，解析新增查询参数 (orderNo, tradeNo, email, packageId, amount, activationCode, paidAtStart, paidAtEnd, createdAtStart, createdAtEnd)
  - [x] 1.2: 动态拼接 SQL WHERE 条件，注意 activationCode 需通过 JOIN activation_codes 表的 c.code LIKE 匹配
  - [x] 1.3: 修复 COUNT 查询，始终包含 LEFT JOIN packages 和 LEFT JOIN activation_codes
  - [x] 1.4: 修改 `GET /export` 接口，同步所有新增筛选参数和 WHERE 条件
  - [x] 1.5: 移除旧的 `keyword` 参数（已被 orderNo + tradeNo 替代）

- [x] Task 2: 前端 API — 扩展 OrderListParams 类型
  - [x] 2.1: 在 `OrderListParams` 中增加新字段 (orderNo, tradeNo, email, packageId, amount, activationCode, paidAtStart, paidAtEnd, createdAtStart, createdAtEnd)
  - [x] 2.2: 更新 `exportOrders` 函数参数类型，支持传递所有筛选参数

- [x] Task 3: 前端 UI — Orders.vue 增加筛选表单
  - [x] 3.1: 添加筛选状态对象 `filterParams`，包含所有筛选维度
  - [x] 3.2: 实现可折叠筛选区域 UI（n-grid 布局，默认折叠仅显示状态筛选）
  - [x] 3.3: 添加套餐下拉选择器（onMounted 调用 getPackages 获取列表）
  - [x] 3.4: 添加时间范围选择器（n-date-picker daterange 模式）
  - [x] 3.5: 添加"查询"和"重置"按钮逻辑
  - [x] 3.6: 修改 fetchOrders 传递所有筛选参数
  - [x] 3.7: 修改 handleExport 传递所有筛选参数

# Task Dependencies
- Task 2 depends on Task 1 (参数类型需与后端对齐)
- Task 3 depends on Task 2 (UI 需要使用扩展后的 API 类型)
