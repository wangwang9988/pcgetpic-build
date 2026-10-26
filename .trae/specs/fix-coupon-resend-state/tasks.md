# Tasks

- [x] Task 1: 修改后端 SQL 查询逻辑
  - [x] 修改 `server/src/routes/admin/orders.ts` 列表查询：coupon_expired 改为"有过期券 AND 无有效券"时才为 1
  - [x] 新增 coupon_count 子查询：统计该订单关联的优惠券总数
  - [x] 新增 latest_coupon_status 子查询：取最新一张券的状态
  - [x] 详情查询做相同修改

- [x] Task 2: Admin 前端 API 适配
  - [x] `admin-panel/src/api/orders.ts` 的 OrderRecord 增加 `coupon_count?: number` 和 `latest_coupon_status?: string` 字段

- [x] Task 3: Admin 订单列表 UI 优化
  - [x] 新增"优惠券"列（在激活码列后面）：显示状态标签（有效/已过期/已使用）+ 发放次数
  - [x] "重发优惠券"按钮：latest_coupon_status === 'used' 时隐藏
  - [x] "重发优惠券"按钮：coupon_count >= 2 时增加二次确认弹窗

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1 + Task 2
