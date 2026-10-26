# Tasks

- [x] Task 1: 修改 `sendOrderActivationEmail()` 内部增加抵扣券查询逻辑
  - [x] 在 `server/src/services/order.ts` 的 `sendOrderActivationEmail()` 中，调用 `sendActivationEmail()` 之前，查询 `upgrade_coupons` 表中属于该订单且 `status='active'` 且未过期的抵扣券
  - [x] 如果查到抵扣券，将其格式化为 `couponInfo` 对象传入 `sendActivationEmail()`
  - [x] 查询逻辑与 `resendOrderEmail()` 中的完全一致

- [x] Task 2: 修改支付回调，删除独立发送抵扣券邮件的代码
  - [x] 在 `server/src/services/payment.ts` 的 `handleAlipayNotify()` 中，删除第 277-289 行 `if (newCouponCode) { ... }` 发送 `sendUpgradeCouponEmail` 的代码块
  - [x] 清理不再需要的 `sendUpgradeCouponEmail` 导入和 `newCouponCode` 变量

# Task Dependencies
- Task 2 depends on Task 1
