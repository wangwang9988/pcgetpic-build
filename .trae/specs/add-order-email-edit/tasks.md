# Tasks

- [x] Task 1: 数据库迁移 — orders 表新增 `original_email` 和 `is_email_modified` 字段
  - [x] 在 `server/src/db.ts` 的迁移区域添加 ALTER TABLE 语句
  - [x] `original_email TEXT DEFAULT NULL`，`is_email_modified INTEGER DEFAULT 0`

- [x] Task 2: 服务端新增修改邮箱 API
  - [x] 在 `server/src/routes/admin/orders.ts` 新增 `PUT /:id/email` 路由
  - [x] 校验订单存在性、邮箱格式
  - [x] 更新 email、original_email（保存修改前的邮箱）、is_email_modified = 1
  - [x] 返回更新后的订单信息

- [x] Task 3: Admin 前端 API 层适配
  - [x] 在 `admin-panel/src/api/orders.ts` 的 `OrderRecord` 接口增加 `original_email?: string` 和 `is_email_modified?: number`
  - [x] 新增 `updateOrderEmail(id: number, email: string)` 函数

- [x] Task 4: Admin 订单列表 UI 改造
  - [x] 邮箱列：`is_email_modified === 1` 时，邮箱后显示 NTag "已修改"，NTooltip 悬浮显示 original_email
  - [x] 操作列：对 Paid 状态订单增加"修改邮箱"按钮
  - [x] 修改邮箱交互：点击按钮弹出 NModal，输入新邮箱，确认后调用 API，成功后刷新列表

- [x] Task 5: Store 收银台联系客服功能
  - [x] 复制 `GetPic/public/Wechat.png` 到 `store/public/Wechat.png`
  - [x] 在 `store/src/views/home/Home.vue` 中添加"联系客服"悬浮按钮
  - [x] 点击弹出 NModal，显示提示文案和微信二维码图片

# Task Dependencies
- Task 2 depends on Task 1（需要数据库字段先存在）
- Task 4 depends on Task 2 + Task 3（需要 API 就绪）
- Task 5 无依赖，可并行
