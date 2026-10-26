# 过期优惠券处理与新建优惠券 Spec

## Why
管理员重发优惠券或重发邮件时，如果优惠券已过期，需要提醒管理员并支持新建优惠券后重发，避免用户因优惠券过期无法享受优惠。

## What Changes
- Admin 订单列表：优惠券过期时，"重发优惠券"和"重发邮件"按钮变红色
- Admin 订单列表：点击红色"重发优惠券"按钮，弹出新建优惠券对话框（面值默认20元，有效期默认3天）
- Server 新增 `POST /api/admin/orders/:id/create-coupon` 接口，创建新优惠券并关联订单
- Server 订单列表查询返回优惠券过期状态字段 `coupon_expired`

## Impact
- Affected code:
  - `server/src/routes/admin/orders.ts` — 新增创建优惠券接口 + 查询返回 coupon_expired
  - `admin-panel/src/api/orders.ts` — 新增 createCoupon API + OrderRecord 增加 coupon_expired 字段
  - `admin-panel/src/views/Orders.vue` — 按钮颜色逻辑 + 新建优惠券弹窗

## ADDED Requirements

### Requirement: 过期优惠券按钮变红
系统应在订单的优惠券已过期时，将"重发优惠券"和"重发邮件"按钮显示为红色，提醒管理员优惠券已失效。

#### Scenario: 优惠券有效
- **WHEN** 订单有可用优惠券（未过期）
- **THEN** "重发优惠券"按钮显示为 warning 橙色，"重发邮件"按钮显示为 primary 蓝色

#### Scenario: 优惠券已过期
- **WHEN** 订单的优惠券已过期
- **THEN** "重发优惠券"按钮和"重发邮件"按钮均显示为 error 红色

### Requirement: 新建优惠券对话框
管理员点击红色"重发优惠券"按钮时，应弹出新建优惠券对话框，创建后可正常重发。

#### Scenario: 点击红色重发优惠券按钮
- **WHEN** 管理员点击红色（优惠券已过期）的"重发优惠券"按钮
- **THEN** 弹出新建优惠券对话框，包含面值（默认20元）、有效期天数（默认3天）两个输入项
- **AND** 确认后调用创建优惠券接口，成功后按钮恢复为正常颜色
- **AND** 自动触发重发优惠券邮件

#### Scenario: 点击正常重发优惠券按钮
- **WHEN** 管理员点击正常颜色（优惠券有效）的"重发优惠券"按钮
- **THEN** 直接重发优惠券邮件，不弹出新建对话框

### Requirement: 创建优惠券接口
服务端提供为指定订单创建新优惠券的 API。

#### Scenario: 正常创建
- **WHEN** 管理员调用 `POST /api/admin/orders/:id/create-coupon`，传入 amount 和 expiresDays
- **THEN** 创建新的优惠券记录关联到该订单，将旧过期优惠券标记为 expired，返回新优惠券信息

#### Scenario: 订单不存在或未支付
- **WHEN** 订单不存在或未支付
- **THEN** 返回相应错误

## MODIFIED Requirements

### Requirement: 订单列表查询返回优惠券过期状态
订单列表和详情查询应返回 `coupon_expired` 字段，表示该订单的优惠券是否已过期（0=有效/无优惠券，1=已过期）。
