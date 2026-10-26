# 订单邮箱修改与收银台联系方式 Spec

## Why
用户在收银台支付时可能填错邮箱，导致无法收到激活码邮件。需要：1）收银台提供客服联系方式，方便用户求助；2）管理后台支持修改订单邮箱并重发邮件。

## What Changes
- Store 收银台增加"联系客服"悬浮按钮，点击弹出微信二维码
- Server 数据库 orders 表新增 `original_email` 和 `is_email_modified` 字段
- Server 新增 `PUT /api/admin/orders/:id/email` 接口
- Admin 订单列表邮箱列增加"已修改"标识，操作列增加"修改邮箱"按钮

## Impact
- Affected code:
  - `store/src/` — 新增联系客服组件
  - `server/src/db.ts` — 数据库迁移
  - `server/src/routes/admin/orders.ts` — 新增修改邮箱接口
  - `admin-panel/src/api/orders.ts` — 新增 API 函数和类型
  - `admin-panel/src/views/Orders.vue` — 邮箱列渲染 + 修改交互

## ADDED Requirements

### Requirement: 收银台联系客服入口
系统应在收银台页面提供客服联系方式入口，方便填错邮箱的用户联系客服。

#### Scenario: 用户点击联系客服
- **WHEN** 用户在收银台任意步骤点击"联系客服"悬浮按钮
- **THEN** 弹出 Modal，显示提示文案"如果邮箱填写错误导致未收到邮件，请扫码联系客服协助修改"和微信二维码图片

### Requirement: 管理员修改订单邮箱
系统应允许管理员修改已支付订单的收件邮箱，并记录原始邮箱供审计。

#### Scenario: 管理员修改邮箱
- **WHEN** 管理员在订单列表点击"修改邮箱"按钮，输入新邮箱并确认
- **THEN** 系统更新订单的 `email` 字段为新邮箱，将原邮箱存入 `original_email`，`is_email_modified` 置为 1

#### Scenario: 邮箱修改标识
- **WHEN** 订单的 `is_email_modified` 为 1
- **THEN** 订单列表邮箱列在邮箱地址后显示"已修改"标签，悬浮标签可查看原始邮箱

#### Scenario: 修改后重发邮件
- **WHEN** 管理员对已修改邮箱的订单点击"重发邮件"
- **THEN** 系统将激活码邮件（含抵扣券邮件，如有）发送到修改后的新邮箱

### Requirement: 修改邮箱接口
服务端提供修改订单邮箱的 API。

#### Scenario: 正常修改
- **WHEN** 管理员调用 `PUT /api/admin/orders/:id/email`，传入有效邮箱
- **THEN** 更新 orders 表的 email、original_email、is_email_modified 字段，返回成功

#### Scenario: 邮箱格式无效
- **WHEN** 传入的邮箱格式不合法
- **THEN** 返回 400 错误，提示邮箱格式无效

#### Scenario: 订单不存在
- **WHEN** 传入的订单 ID 不存在
- **THEN** 返回 404 错误
