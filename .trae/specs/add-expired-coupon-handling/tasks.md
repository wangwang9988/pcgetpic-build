# Tasks

- [x] Task 1: Server 订单查询返回 coupon_expired 字段
  - [x] 修改 `server/src/routes/admin/orders.ts` 的列表查询 SQL，增加子查询判断优惠券是否过期
  - [x] 修改详情查询 SQL，同样增加 coupon_expired 子查询
  - [x] coupon_expired 逻辑：有优惠券且 expires_at <= 当前时间 → 1，否则 → 0

- [x] Task 2: Server 新增创建优惠券 API
  - [x] 在 `server/src/routes/admin/orders.ts` 新增 `POST /:id/create-coupon` 路由
  - [x] 接收参数：amount（面值，默认20）、expiresDays（有效期天数，默认3）
  - [x] 校验订单存在且已支付
  - [x] 将该订单旧的过期优惠券标记为 expired
  - [x] 调用 coupon.ts 中的 generateCustomCoupon 创建新优惠券
  - [x] 返回新优惠券信息

- [x] Task 3: coupon.ts 支持自定义面值和有效期
  - [x] 新增 `generateCustomCoupon(orderId, email, amount, expiresDays)` 函数
  - [x] 与 `generateUpgradeCoupon` 类似，但 amount 和 expiresDays 由参数传入

- [x] Task 4: Admin 前端 API 适配
  - [x] `admin-panel/src/api/orders.ts` 的 OrderRecord 增加 `coupon_expired?: number` 字段
  - [x] 新增 `createCoupon(id: number, amount: number, expiresDays: number)` API 函数

- [x] Task 5: Admin 订单列表 UI 改造
  - [x] "重发优惠券"按钮：coupon_expired === 1 时显示红色（type='error'），否则 warning 橙色
  - [x] "重发邮件"按钮：coupon_expired === 1 时显示红色（type='error'），否则 primary 蓝色
  - [x] 点击红色"重发优惠券"按钮：弹出新建优惠券对话框（面值默认20，有效期天数默认3）
  - [x] 创建成功后自动重发优惠券邮件，刷新列表
  - [x] 点击正常颜色"重发优惠券"按钮：直接重发，不变

# Task Dependencies
- Task 2 depends on Task 3（需要 generateCustomCoupon 函数）
- Task 5 depends on Task 2 + Task 4（需要 API 就绪）
- Task 1 和 Task 3 可并行
