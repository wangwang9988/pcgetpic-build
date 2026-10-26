# Tasks

- [x] Task 1: 后端新增优惠券列表查询接口
  - [x] `server/src/routes/admin/orders.ts` 新增 `GET /:id/coupons` 接口，返回该订单所有优惠券（code, amount, status, created_at, expires_at）

- [x] Task 2: Admin 前端 API 适配
  - [x] `admin-panel/src/api/orders.ts` 新增 `CouponDetail` 类型和 `getCouponList(id)` 函数

- [x] Task 3: 优化重发优惠券交互
  - [x] `Orders.vue` 有效券重发时：确认弹窗显示当前优惠券面值和有效期
  - [x] `Orders.vue` 重复发放警告后：点击"继续发放"弹出新建抵扣券对话框

- [x] Task 4: 新增优惠券详情弹窗
  - [x] `Orders.vue` 优惠券列标签可点击，弹出该订单所有优惠券列表
  - [x] 每张券显示：券码、面值、状态（标签颜色）、创建时间、过期时间

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2（需要后端返回优惠券信息）
- Task 4 depends on Task 1 + Task 2
