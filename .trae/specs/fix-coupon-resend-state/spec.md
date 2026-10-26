# 修复优惠券重发后按钮仍为红色 + 优惠券状态展示 Spec

## Why
管理员为过期优惠券订单新建优惠券后，"重发优惠券"按钮仍为红色（旧过期券仍在数据库中）。同时管理员无法判断某订单是否重发过优惠券、重发了几次，可能导致重复发放。

## What Changes
- 修改 `coupon_expired` SQL：有过期券 **且** 无有效券时才为 1（新建有效券后自动恢复为 0）
- 新增 `coupon_count` 字段：该订单累计优惠券总数
- 新增 `latest_coupon_status` 字段：最新一张券的状态（active/expired/used）
- Admin 订单列表新增"优惠券"列，显示状态标签 + 发放次数
- 优惠券已使用时隐藏"重发优惠券"按钮
- 重发≥2次时增加二次确认

## Impact
- Affected code:
  - `server/src/routes/admin/orders.ts` — 修改 coupon_expired SQL + 新增 coupon_count/latest_coupon_status
  - `admin-panel/src/api/orders.ts` — OrderRecord 增加字段
  - `admin-panel/src/views/Orders.vue` — 新增优惠券列 + 按钮逻辑优化

## MODIFIED Requirements

### Requirement: coupon_expired 判断逻辑修正
`coupon_expired` 应仅在"有过期券且无有效券"时为 1。新建有效券后，`coupon_expired` 变为 0，按钮恢复正常。

#### Scenario: 新建优惠券后按钮恢复
- **WHEN** 管理员为过期订单新建优惠券
- **THEN** `coupon_expired` 变为 0，`has_coupon` 变为 1，"重发优惠券"按钮恢复为 warning 橙色

#### Scenario: 仅有过期券无有效券
- **WHEN** 订单仅有过期优惠券，无有效优惠券
- **THEN** `coupon_expired` 为 1，按钮为红色

## ADDED Requirements

### Requirement: 优惠券状态列
订单列表应显示每个订单的优惠券信息。

#### Scenario: 有优惠券
- **WHEN** 订单有关联的优惠券
- **THEN** "优惠券"列显示状态标签（有效/已过期/已使用）+ 发放次数（如"共2次"）

#### Scenario: 无优惠券
- **WHEN** 订单无关联优惠券
- **THEN** "优惠券"列显示"-"

### Requirement: 已使用优惠券隐藏重发按钮
#### Scenario: 优惠券已使用
- **WHEN** 最新优惠券状态为 `used`
- **THEN** "重发优惠券"按钮隐藏（用户已升级，无需再发）

### Requirement: 重发二次确认
#### Scenario: 已重发过优惠券
- **WHEN** 管理员点击"重发优惠券"且该订单已有 ≥2 张优惠券
- **THEN** 弹出二次确认："该用户已重发过 N 次优惠券，是否继续发放？"
