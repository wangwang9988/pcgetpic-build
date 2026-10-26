# Tasks

- [x] Task 1: 服务端 create-order 接口新增 pay_url 字段
  - [x] SubTask 1.1: 在 `server/src/services/payment.ts` 的 `createOrder` 函数中，新增 `alipay.trade.page.pay` 调用，生成网页支付 URL，失败时静默降级（不阻断订单创建）
  - [x] SubTask 1.2: 修改 `CreateOrderResult` 类型，新增 `pay_url?: string` 可选字段
  - [x] SubTask 1.3: 在 `server/src/routes/payment.ts` 的 `create-order` 路由中，将 `pay_url` 包含在响应中（无需修改，已透传 result）
  - [x] SubTask 1.4: 验证 `alipay.trade.page.pay` 与现有 `alipay.trade.precreate` 共用同一支付宝应用和回调地址（共用同一 alipaySdk 实例和 notifyUrl）

- [x] Task 2: 收银台前端适配 pay_url
  - [x] SubTask 2.1: 在 `store/src/api/index.ts` 的 `CreateOrderData` 接口中新增 `pay_url?: string` 可选字段
  - [x] SubTask 2.2: 修改 `PaymentQRCode.vue`，在二维码下方新增"无法扫码？使用支付宝账号登录支付"链接，使用 `v-if="orderData.pay_url"` 条件渲染
  - [x] SubTask 2.3: 点击链接时通过 `<a :href target="_blank">` 在新窗口打开支付宝官方收银台
  - [x] SubTask 2.4: 当前页面继续轮询订单状态，支付成功后自动跳转成功页面（复用现有轮询逻辑，无需修改）

- [ ] Task 3: 端到端测试验证
  - [ ] SubTask 3.1: 验证扫码支付流程不受影响
  - [ ] SubTask 3.2: 验证账号支付链接点击后新窗口打开支付宝收银台
  - [ ] SubTask 3.3: 验证 `pay_url` 为空时链接不展示
  - [ ] SubTask 3.4: 验证账号支付完成后轮询检测到支付成功

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
