# 统一支付邮件模板 Spec

## Why
支付成功后，体验包用户收到 2 封邮件（激活码 + 独立抵扣券），而管理员重发邮件只发 1 封（合并）。用户应该始终只收到 1 封包含激活码和抵扣券的邮件。

## What Changes
- 修改 `sendOrderActivationEmail()` 内部增加抵扣券查询逻辑（与 `resendOrderEmail()` 一致），将 `couponInfo` 传递给 `sendActivationEmail()`
- 修改支付回调 `handleAlipayNotify()`：删除单独调用 `sendUpgradeCouponEmail()` 的代码块
- 管理员"重发优惠券"按钮仍保留独立发送 `sendUpgradeCouponEmail()` 的能力

## Impact
- Affected code: `server/src/services/order.ts`、`server/src/services/payment.ts`
- Affected specs: 邮件发送流程
- **无破坏性变更**：`sendUpgradeCouponEmail()` 函数保留，仅支付回调不再调用它

## ADDED Requirements

### Requirement: 支付邮件合并发送
支付成功后，系统 SHALL 只发送一封邮件，同时包含激活码和抵扣券信息（如有）。

#### Scenario: 体验包支付成功（有抵扣券）
- **WHEN** 用户购买体验包支付成功
- **THEN** 系统发送一封邮件，同时包含激活码区域和抵扣券区域
- **AND** 不再单独发送抵扣券邮件

#### Scenario: 非体验包支付成功（无抵扣券）
- **WHEN** 用户购买非体验包支付成功
- **THEN** 系统发送一封仅包含激活码的邮件（与当前行为一致）

#### Scenario: 管理员重发邮件
- **WHEN** 管理员点击"重发邮件"按钮
- **THEN** 行为不变，发送合并邮件（已有 couponInfo 逻辑）

#### Scenario: 管理员重发优惠券
- **WHEN** 管理员点击"重发优惠券"按钮
- **THEN** 行为不变，单独发送抵扣券邮件
