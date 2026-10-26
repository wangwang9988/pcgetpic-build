# Tasks — 软件授权系统 Phase 2

## Task 0: 修复关键 Bug（Phase 0 — 同事方案发现）
- [x] 0.1 修复客户端 http_client.rs 时间戳从秒级改为毫秒级（与服务端 Date.now() 一致）
- [x] 0.2 修复客户端 ActivateResponse 补齐 error_code 字段（对齐服务端响应格式）
- [x] 0.3 修复服务端 calculateExpiresAt() 返回秒级时间戳（客户端期望秒级）
- [x] 0.4 修复服务端 isExpired() 独立使用毫秒级比较（不再依赖 calculateExpiresAt）
- [x] 0.5 cargo check 编译通过

## Task 1: 服务器基础环境搭建（宝塔 + Node.js + Nginx + SSL）
- [x] 1.1 宝塔面板安装 Node.js 20 LTS
- [x] 1.2 宝塔面板创建 3 个网站：api/admin/store.downpictures.com
- [x] 1.3 为 3 个域名申请 Let's Encrypt SSL 证书
- [x] 1.4 配置 Nginx 反向代理：api.downpictures.com → localhost:3001
- [x] 1.5 配置 Nginx 静态文件服务：admin.downpictures.com
- [x] 1.6 配置 Nginx 静态文件服务：store.downpictures.com
- [x] 1.7 防火墙配置：开放 80/443，关闭 3001 外部访问
- [x] 1.8 全局安装 PM2

## Task 2: 服务端代码上传 + 生产配置
- [ ] 2.1 将 server/ 目录上传到服务器 /www/wwwroot/api.downpictures.com/
- [ ] 2.2 在服务器上 `npm install` 安装依赖
- [ ] 2.3 确认生产 .env 文件（HMAC_SECRET=pcgetpic-prod-hmac-2024-secure）
- [ ] 2.4 用 PM2 启动服务端：`pm2 start "npx tsx src/app.ts" --name pcgetpic-api`
- [ ] 2.5 配置 PM2 开机自启：`pm2 startup` + `pm2 save`
- [ ] 2.6 验证 https://api.downpictures.com/health 返回正常

## Task 3: 服务端支付模块开发
- [x] 3.1 安装新依赖：alipay-sdk, nodemailer, qrcode
- [x] 3.2 修改 server/src/config.ts — 新增支付宝和 SMTP 配置项
- [x] 3.3 修改 server/src/db.ts — 新增 orders 表建表脚本
- [x] 3.4 创建 server/src/services/payment.ts — 支付宝预下单 + 回调验签 + 订单状态管理
- [x] 3.5 创建 server/src/services/email.ts — nodemailer + 163 SMTP + HTML 邮件模板
- [x] 3.6 创建 server/src/routes/payment.ts — 4 个支付 API
- [x] 3.7 修改 server/src/app.ts — 注册支付路由
- [ ] 3.8 支付宝沙箱联调测试（需服务器部署后进行）

## Task 4: 购买页面开发（store）
- [x] 4.1 创建 store/ 项目
- [x] 4.2 创建 API 封装
- [x] 4.3 创建 Home.vue（4 状态单页）
- [x] 4.4 深色模式 + 响应式设计
- [x] 4.5 构建成功（store/dist/ 已生成）
- [ ] 4.6 部署到服务器 /www/wwwroot/store.downpictures.com/

## Task 5: 管理后台部署 + 新增订单管理
- [x] 5.1 新增订单 API 和订单管理页
- [x] 5.2 仪表盘新增订单统计指标
- [x] 5.3 admin-panel 构建成功（admin-panel/dist/ 已生成）
- [ ] 5.4 部署到服务器 /www/wwwroot/admin.downpictures.com/

## Task 6: 客户端生产配置更新
- [x] 6.1 server_url 改为 https://api.downpictures.com
- [x] 6.2 hmac_secret 改为 pcgetpic-prod-hmac-2024-secure
- [x] 6.3 "获取激活码"按钮跳转 store.downpictures.com
- [x] 6.4 cargo check 编译通过

## Task 7: 端到端集成测试
- [ ] 7.1 管理后台登录 → 批量生成激活码
- [ ] 7.2 购买页选择套餐 → 沙箱支付宝扫码 → 支付成功 → 收到邮件
- [ ] 7.3 客户端输入激活码 → 激活成功 → 下载功能解锁
- [ ] 7.4 管理后台查看订单 → 手动重发邮件
- [ ] 7.5 验证 HTTPS 全链路正常

# 生产 HMAC_SECRET

客户端和服务端必须使用相同的 HMAC_SECRET：`pcgetpic-prod-hmac-2024-secure`
