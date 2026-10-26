# 软件授权系统 Phase 2 — 支付集成 + 自动发卡 + 服务器部署

## Why

Phase 1 已完成激活码验证闭环，但用户只能通过管理员手动获取激活码。Phase 2 要实现：用户自助购买 → 支付宝扫码付款 → 自动分配激活码 → 邮件发送，同时将服务端和管理后台部署到阿里云服务器。

## 前置条件（用户已准备）

| 项目 | 值 |
|------|---|
| 服务器 | 阿里云 2C2G，IP 139.196.170.245 |
| API 域名 | api.downpictures.com |
| 管理后台域名 | admin.downpictures.com |
| 购买页域名 | store.downpictures.com |
| 支付宝 APPID | 2021006160634824（审核中） |
| 支付宝账号 | abovewang@126.com |
| 应用私钥 | 已提供（见 docs/邮箱、支付宝等信息.md） |
| 支付宝公钥 | 已提供（见 docs/邮箱、支付宝等信息.md） |
| 发信邮箱 | caredun@yeah.net |
| SMTP 授权密码 | 已提供 |
| SMTP 服务器 | smtp.yeah.net:465（SSL） |

## What Changes

### 一、服务器部署（宝塔面板配置）
- **新增** Nginx 反向代理配置（3 个域名 → 同一台服务器不同端口）
- **新增** SSL 证书（Let's Encrypt 免费证书，3 个域名各一份）
- **新增** PM2 进程守护（Node.js 服务端常驻）
- **修改** 客户端 Rust 代码中 `server_url` 从 `http://localhost:3001` → `https://api.downpictures.com`
- **修改** 客户端 Rust 代码中 `hmac_secret` 从硬编码开发值 → 生产值
- **修改** 服务端 `.env` 配置为生产值（JWT_SECRET / HMAC_SECRET / MASTER_KEY）

### 二、支付集成（支付宝当面付）
- **新增** `server/src/routes/payment.ts` — 支付路由
  - POST /api/v1/payment/packages — 获取可购买套餐列表
  - POST /api/v1/payment/create-order — 创建支付订单，返回支付宝二维码链接
  - POST /api/v1/payment/alipay-notify — 支付宝异步回调通知
  - GET /api/v1/payment/order-status — 前端轮询订单状态
- **新增** `server/src/services/payment.ts` — 支付业务逻辑
  - alipay-sdk 集成
  - 订单创建 → 支付宝预下单 → 二维码生成
  - 回调验签 → 订单状态更新 → 触发自动发卡
- **新增** `server/src/services/email.ts` — 邮件发送服务
  - nodemailer + 163 SMTP
  - 激活码邮件模板（HTML）
- **新增** 数据库表 `orders`（订单表）
- **修改** `server/package.json` — 新增依赖 alipay-sdk, nodemailer, qrcode

### 三、购买页面（store）
- **新增** `store/` 目录 — Vue 3 + Vite + Naive UI 移动端优先购买页
  - 套餐展示（卡片式，突出推荐套餐）
  - 邮箱输入 + 套餐选择
  - 支付宝扫码弹窗（二维码 + 倒计时 + 轮询状态）
  - 支付成功 → 显示激活码 + 发送邮件提示
  - 响应式设计（手机/PC 均可）

### 四、客户端联动
- **修改** `src/components/ActivationDialog.vue` — "获取激活码"按钮跳转 `https://store.downpictures.com`
- **修改** `src-tauri/src/state.rs` — server_url 改为 `https://api.downpictures.com`
- **修改** `src-tauri/src/state.rs` — hmac_secret 改为生产密钥

### 不在 Phase 2 范围内
- 微信支付 → Phase 3（需要微信商户号）
- 数据可视化图表（ECharts）→ Phase 3
- 反调试/防破解加固 → 后续
- 心跳机制 → 后续

## Impact

- Affected code: `server/src/`（新增支付/邮件/订单模块）、`src-tauri/src/state.rs`（生产 URL/密钥）、`src/components/ActivationDialog.vue`（跳转链接）
- New project: `store/`（购买页面）
- Infrastructure: 阿里云服务器 + 宝塔 + Nginx + PM2 + SSL
- **BREAKING**: 客户端 server_url 变更，旧版客户端需更新

## ADDED Requirements

### Requirement: 支付宝当面付集成

系统 SHALL 集成支付宝当面付（扫码支付），实现以下流程：

1. 用户在购买页选择套餐 → 输入邮箱 → 点击购买
2. 服务端创建订单 → 调用支付宝 alipay.trade.precreate API → 返回二维码链接
3. 前端展示二维码 → 用户用支付宝扫码付款
4. 支付宝异步通知 → 服务端验签 → 更新订单状态 → 分配未使用的激活码 → 发送邮件
5. 前端轮询订单状态 → 支付成功 → 展示激活码

#### Scenario: 正常购买流程
- **WHEN** 用户在 store.downpictures.com 选择套餐并输入邮箱
- **THEN** 系统创建订单 → 生成支付宝二维码 → 用户扫码付款 → 自动分配激活码 → 邮件发送

#### Scenario: 支付宝审核未通过
- **WHEN** 支付宝应用仍在审核中
- **THEN** 使用支付宝沙箱环境测试（沙箱 APPID + 沙箱网关），审核通过后一行配置切换到生产环境

#### Scenario: 回调验签失败
- **WHEN** 收到非法的支付宝回调请求
- **THEN** 服务端验签失败 → 忽略该请求 → 记录日志

### Requirement: 订单数据库表

系统 SHALL 新增 `orders` 表：

```sql
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,         -- 内部订单号（UUID）
  trade_no TEXT,                          -- 支付宝交易号
  package_id INTEGER NOT NULL,
  email TEXT NOT NULL,                    -- 买家邮箱
  amount DECIMAL(10,2) NOT NULL,          -- 支付金额
  status TEXT DEFAULT 'pending',          -- pending/paid/failed/refunded
  assigned_code_id INTEGER,               -- 分配的激活码 ID
  alipay_qrcode TEXT,                     -- 支付宝二维码链接
  paid_at INTEGER,                        -- 支付时间
  created_at INTEGER NOT NULL,
  expired_at INTEGER,                     -- 订单过期时间（30 分钟）
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (assigned_code_id) REFERENCES activation_codes(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
```

### Requirement: 邮件自动发卡

系统 SHALL 在支付成功后自动发送激活码邮件：

- SMTP 配置：smtp.yeah.net:465（SSL），发件人 caredun@yeah.net
- 邮件内容：HTML 模板，包含激活码、套餐名称、有效期、激活步骤说明
- 邮件主题：`您的 PcGetPic 激活码 - {套餐名称}`
- 发送失败时：记录日志，管理后台可手动重发

#### Scenario: 发卡邮件发送成功
- **WHEN** 支付宝回调确认支付成功
- **THEN** 系统分配一个未使用的激活码 → 更新订单 assigned_code_id → 发送邮件 → 更新激活码状态为已激活

#### Scenario: 无可用激活码
- **WHEN** 支付成功但该套餐无未使用的激活码
- **THEN** 记录告警日志 → 邮件内容改为"激活码将在 24 小时内发送" → 管理后台显示待处理订单

### Requirement: 购买页面（store）

系统 SHALL 提供基于 Vue 3 + Naive UI 的购买页面：

- **套餐展示**：卡片式布局，突出推荐套餐（1 年），显示价格和功能对比
- **购买流程**：选择套餐 → 输入邮箱 → 点击购买 → 弹出二维码
- **二维码弹窗**：显示支付宝二维码 + 5 分钟倒计时 + 轮询订单状态（每 3 秒）
- **支付成功**：关闭二维码弹窗 → 显示激活码 + "激活码已发送至您的邮箱"提示
- **响应式**：移动端优先设计，手机和 PC 均可使用
- **深色模式**：与客户端风格一致

### Requirement: 服务器部署配置

系统 SHALL 在阿里云服务器上完成以下部署：

**Nginx 反向代理**：
- `api.downpictures.com` → localhost:3001（Node.js 服务端）
- `admin.downpictures.com` → localhost:5174（管理后台静态文件）
- `store.downpictures.com` → localhost:5175（购买页静态文件）

**SSL 证书**：
- 3 个域名均配置 Let's Encrypt 免费 SSL
- 强制 HTTPS 重定向
- HTTP/2 启用

**PM2 进程守护**：
- Node.js 服务端使用 PM2 守护
- 开机自启：`pm2 startup` + `pm2 save`
- 日志管理：`pm2 logs`

**宝塔面板**：
- Node.js 版本管理器安装 Node.js 20 LTS
- 防火墙开放 80/443 端口
- 3001 端口仅本地访问（Nginx 代理）

### Requirement: 客户端生产配置

系统 SHALL 将客户端硬编码的开发配置改为生产值：

- `server_url`：`http://localhost:3001` → `https://api.downpictures.com`
- `hmac_secret`：开发密钥 → 生产密钥（与服务器 .env 中 HMAC_SECRET 一致）
- 服务端 `.env` 中 HMAC_SECRET 和 JWT_SECRET 必须使用强随机值

### Requirement: 支付宝沙箱支持

系统 SHALL 支持支付宝沙箱环境，便于审核期间测试：

- `.env` 新增 `ALIPAY_SANDBOX=true` 配置项
- 沙箱模式使用沙箱网关 `https://openapi.alipaydev.com/gateway.do`
- 生产模式使用正式网关 `https://openapi.alipay.com/gateway.do`
- 切换方式：修改 .env 中 `ALIPAY_SANDBOX` 值，重启服务

## MODIFIED Requirements

### Requirement: ActivationDialog 获取激活码按钮

`src/components/ActivationDialog.vue` 的"获取激活码"按钮 SHALL 在 Phase 2 中跳转到 `https://store.downpictures.com`，而非显示提示文字。

### Requirement: 服务端配置扩展

`server/src/config.ts` SHALL 新增以下配置项：
- `alipayAppId` — 支付宝 APPID
- `alipayPrivateKey` — 应用私钥
- `alipayPublicKey` — 支付宝公钥
- `alipaySandbox` — 是否沙箱模式
- `smtpHost` — SMTP 服务器地址
- `smtpPort` — SMTP 端口
- `smtpUser` — SMTP 用户名
- `smtpPass` — SMTP 授权密码
- `storeUrl` — 购买页 URL

## REMOVED Requirements

无移除的需求。
