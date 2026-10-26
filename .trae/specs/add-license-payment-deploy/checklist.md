# Checklist — 软件授权系统 Phase 2

## 服务器环境
- [ ] 宝塔面板安装 Node.js 20 LTS
- [ ] 3 个域名 DNS 解析到 139.196.170.245
- [ ] 3 个网站在宝塔创建成功
- [ ] 3 个域名 SSL 证书申请成功（Let's Encrypt）
- [ ] api.downpictures.com Nginx 反向代理到 localhost:3001
- [ ] admin.downpictures.com 静态文件服务正常
- [ ] store.downpictures.com 静态文件服务正常
- [ ] 防火墙仅开放 80/443，3001 端口外部不可访问
- [ ] PM2 安装并配置开机自启

## 服务端部署
- [ ] server/ 代码上传到服务器
- [ ] npm install 成功
- [ ] 生产 .env 配置正确（强随机密钥）
- [ ] PM2 启动服务端成功
- [ ] https://api.downpictures.com/health 返回正常
- [ ] https://api.downpictures.com/api/admin/login 可登录

## 支付模块
- [ ] alipay-sdk 依赖安装成功
- [ ] nodemailer 依赖安装成功
- [ ] orders 表创建成功
- [ ] POST /api/v1/payment/packages 返回套餐列表
- [ ] POST /api/v1/payment/create-order 创建订单并返回二维码链接
- [ ] POST /api/v1/payment/alipay-notify 回调验签正常
- [ ] GET /api/v1/payment/order-status 轮询正常
- [ ] 支付宝沙箱联调成功（扫码 → 回调 → 发卡）
- [ ] 沙箱/生产模式可通过 .env 配置切换

## 邮件发卡
- [ ] SMTP 连接成功（smtp.yeah.net:465 SSL）
- [ ] 测试邮件发送到测试邮箱成功
- [ ] 支付成功后自动发送激活码邮件
- [ ] 邮件 HTML 模板显示正常（激活码、套餐名、有效期、激活步骤）
- [ ] 邮件发送失败时记录日志

## 购买页面
- [ ] store/ 项目构建成功
- [ ] 套餐展示页正常显示（卡片式布局）
- [ ] 邮箱输入 + 套餐选择 + 购买按钮正常工作
- [ ] 二维码弹窗正常显示（倒计时 + 轮询）
- [ ] 支付成功后显示激活码
- [ ] 响应式设计（手机/PC 均正常）
- [ ] 深色模式正常
- [ ] 部署到 store.downpictures.com 可访问

## 管理后台
- [ ] admin-panel 构建并部署到 admin.downpictures.com
- [ ] 管理后台登录正常
- [ ] 订单管理页正常显示（列表、状态筛选）
- [ ] 手动重发邮件功能正常
- [ ] 仪表盘新增订单统计指标

## 客户端
- [ ] server_url 改为 https://api.downpictures.com
- [ ] hmac_secret 与服务器生产 .env 一致
- [ ] "获取激活码"按钮跳转 store.downpictures.com
- [ ] cargo check 编译通过
- [ ] 客户端激活流程端到端正常

## 端到端测试
- [ ] 完整购买流程：购买页选套餐 → 扫码付款 → 收到邮件 → 客户端激活成功
- [ ] 管理后台查看订单 → 重发邮件
- [ ] HTTPS 全链路正常
- [ ] 支付宝审核通过后切换生产环境正常
