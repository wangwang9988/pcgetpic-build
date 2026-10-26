# Tasks

- [x] Task 1: 后端 resendCoupon SQL 添加 ORDER BY id DESC
  - [x] `server/src/routes/admin/orders.ts` 的 `resendCoupon` 查询添加 `ORDER BY id DESC LIMIT 1`

- [x] Task 2: 后端 createCoupon 事务化
  - [x] `server/src/routes/admin/orders.ts` 用 `db.transaction` 包裹"作废旧券+创建新券"操作
  - [x] 邮件发送 `sendUpgradeCouponEmail` 放在事务外部执行

- [x] Task 3: 前端防抖 + 刷新列表
  - [x] `Orders.vue` `doResendCoupon` 的 `onPositiveClick` 返回 Promise，利用 Naive UI 自动 loading 防抖
  - [x] `Orders.vue` 重发成功后调用 `fetchOrders()` 刷新列表
  - [x] `Orders.vue` 新建优惠券弹窗添加 `createCouponLoading` ref，`handleConfirmCreateCoupon` 中设置 loading 防重复点击

# Task Dependencies
- Task 1 和 Task 2 可并行执行
- Task 3 独立于 Task 1/2
