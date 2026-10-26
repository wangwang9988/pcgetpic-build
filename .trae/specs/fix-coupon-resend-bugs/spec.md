# 修复优惠券重发严重 Bug Spec

## Why
优惠券重发功能存在多个严重 bug：对话框显示的面值与实际发送的不一致（根因是并发创建导致多张 active 券 + 前后端排序不一致）、无防抖导致可重复发送、操作后列表数据不刷新。

## What Changes
- 后端 `resendCoupon` 接口添加 `ORDER BY id DESC LIMIT 1`，确保返回最新的有效券
- 后端 `createCoupon` 接口用 `db.transaction` 包裹"作废旧券+创建新券"，邮件发送放在事务外，杜绝并发产生多张 active 券
- 前端重发操作利用 Naive UI dialog 的 Promise 返回值自动 loading 防抖
- 前端新建优惠券弹窗添加 loading 状态防重复点击
- 前端重发成功后调用 `fetchOrders()` 刷新列表数据

## Impact
- Affected specs: optimize-coupon-resend-ux
- Affected code:
  - `server/src/routes/admin/orders.ts` — resendCoupon SQL 添加 ORDER BY + createCoupon 事务化
  - `admin-panel/src/views/Orders.vue` — 防抖 + 刷新列表

## MODIFIED Requirements

### Requirement: resendCoupon 返回最新有效券
后端 `POST /:id/resend-coupon` 查询有效券时必须按 `id DESC` 排序，确保重发的是最新创建的有效券，与前端 `getCouponList` 展示的信息一致。

#### Scenario: 多张有效券时重发最新的
- **WHEN** 订单存在多张有效券（如先创建 20 元后创建 30 元）
- **AND** 管理员点击"重发当前券邮件"
- **THEN** 系统重发的是最新创建的 30 元券，与对话框中显示的面值一致

### Requirement: createCoupon 事务原子性
后端 `POST /:id/create-coupon` 中"作废旧券"和"创建新券"必须在同一个数据库事务中执行，邮件发送放在事务提交后，防止并发请求交错导致多张 active 券。

#### Scenario: 并发创建优惠券
- **WHEN** 管理员快速多次点击创建优惠券
- **THEN** 事务保证"作废+创建"的原子性，不会出现多张 active 券并存

### Requirement: 重发操作防抖
管理员点击重发按钮后，在请求完成前应禁止重复操作。利用 Naive UI dialog 的 `onPositiveClick` 返回 Promise 时自动 loading 的特性。

#### Scenario: 快速多次点击重发
- **WHEN** 管理员点击"重发当前券邮件"后快速再次点击
- **THEN** 按钮自动进入 loading 状态，第二次点击不触发新的请求，仅发送一封邮件

### Requirement: 新建优惠券防抖
新建优惠券弹窗的"创建并发送"按钮在请求期间应显示 loading 并禁用。

#### Scenario: 快速多次点击创建
- **WHEN** 管理员点击"创建并发送"后快速再次点击
- **THEN** 按钮处于 loading 状态，不会重复创建

### Requirement: 重发后刷新列表
重发优惠券邮件成功后，订单列表应自动刷新以更新优惠券状态和次数。

#### Scenario: 重发成功后数据更新
- **WHEN** 管理员成功重发优惠券邮件
- **THEN** 订单列表自动刷新，优惠券列显示最新的状态和次数
