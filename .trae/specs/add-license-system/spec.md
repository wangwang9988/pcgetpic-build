# 软件授权系统 Phase 1 — 最小可用激活闭环

## Why

PcGetPic 需要商业化付费机制：激活码授权，一码三机。当前软件无任何授权验证，任何人可免费使用全部功能。Phase 1 的目标是跑通最小闭环——用户输入激活码激活软件，管理员能生成和管理激活码。

## 方案综合分析结论

阅读了 `docs/软件授权方案-0607/` 下全部 20 个方案文档后，提炼出以下共识与分歧：

### 全方案共识（无需再讨论）
- 激活码格式：`PCGP-XXXXX-XXXXX-XXXXX-XXXXX`（Crockford Base32）
- 一码三机：每个激活码最多绑定 3 台设备
- 三端物理隔离：客户端 / 服务端 / 管理后台，代码零交叉
- 设备指纹：硬件级（CPU + 硬盘 + MAC + 主板等 → SHA256）
- AES-256-GCM 本地加密存储，密钥从设备指纹派生
- HMAC-SHA256 请求签名防伪造
- 多时间点验证（启动时、关键操作前）
- Release 编译优化（LTO + strip + codegen-units=1）
- 部署在现有阿里云 2C2G + 宝塔面板

### 关键分歧与 Phase 1 决策

| 分歧点 | 方案阵营 | Phase 1 决策 | 理由 |
|--------|---------|-------------|------|
| 数据库 | SQLite（零配置）vs MySQL/MariaDB（宝塔自带）vs PostgreSQL | **SQLite (better-sqlite3)** | 2C2G 服务器 MySQL 常驻 300-600MB 内存，SQLite 零常驻；5 张表完全够用；后期一行命令可迁 MySQL |
| 服务端语言 | Node.js/Express（多数）vs Go/Gin（单二进制）vs Hono | **Node.js + Express + TypeScript** | 与 admin-panel 共享 TS 类型；Express 路由 < 15 个无需 NestJS；生态成熟 |
| 管理后台 UI | Naive UI vs Element Plus | **Naive UI** | 与客户端项目一致，减少认知负担 |
| 密钥管理 | CLI 工具 vs 管理后台点按钮 | **管理后台一键生成** | 新方案共识：零命令行，点按钮生成 RSA 密钥对和激活码 |
| 请求签名 | HMAC-SHA256 vs RSA-PSS | **HMAC-SHA256** | Phase 1 足够；RSA-PSS 可 Phase 2 升级 |
| 邮件服务 | Resend（海外）vs 163 SMTP（国内）vs 阿里 DirectMail | **Phase 1 不接邮件** | 邮件属于自动发卡流程，Phase 2 再接 |
| 支付 | 支付宝+微信 vs 虎皮椒聚合支付 | **Phase 1 不接支付** | 支付属于自动售卡流程，Phase 2 再接 |

## What Changes

### 客户端（PcGetPic 本体）
- **新增** `src-tauri/src/license/` Rust 授权模块（6 个文件）
- **新增** `src/components/ActivationDialog.vue` 激活码输入弹窗
- **新增** `src/components/LicenseStatus.vue` 授权状态指示器
- **新增** `src/stores/licenseStore.ts` Pinia 状态管理
- **新增** `src/types/license.ts` 类型定义
- **修改** `src-tauri/src/lib.rs` 注册 license commands
- **修改** `src-tauri/src/state.rs` AppState 新增 license_status 字段
- **修改** `src-tauri/Cargo.toml` 新增依赖（hmac, sha2, aes-gcm, base32, rand, machine-uid）
- **修改** `src/utils/downloadManager.ts` 下载前检查激活状态

### 服务端（新增独立工程）
- **新增** `server/` 目录 — Node.js + Express + SQLite 后端
  - 激活验证 API（POST /api/v1/activate）
  - 吊销检查 API（GET /api/v1/check-revoke）
  - 管理员 API（JWT 鉴权）
  - 激活码批量生成
  - RSA 密钥对管理
  - 5 张 SQLite 表

### 管理后台（新增独立工程）
- **新增** `admin-panel/` 目录 — Vue 3 + Naive UI + Vite
  - 管理员登录
  - 激活码管理（列表、批量生成、禁用/启用）
  - 密钥管理（一键生成、查看公钥）
  - 基础仪表盘（4 个核心指标）

### 不在 Phase 1 范围内
- 支付集成（支付宝/微信）→ Phase 2
- 购买页面 → Phase 2
- 邮件自动发卡 → Phase 2
- 微信支付 → Phase 2
- 数据可视化图表（ECharts）→ Phase 3
- 反调试/防破解加固 → 后续
- 心跳机制 → 后续
- CDN 缓存层 → 后续

## Impact

- Affected code: `src-tauri/src/`（新增 license 模块，修改 lib.rs/state.rs/Cargo.toml）、`src/`（新增组件和 store）
- New projects: `server/`、`admin-panel/`
- Build: 客户端 Cargo.toml 新增 6 个 crate 依赖，预估 exe 增大 3-5MB

## ADDED Requirements

### Requirement: 客户端 Rust 授权模块

系统 SHALL 在 `src-tauri/src/license/` 下实现以下 6 个模块：

| 文件 | 职责 |
|------|------|
| `mod.rs` | 模块入口，声明子模块 + 重导出公共类型 |
| `crypto.rs` | HMAC-SHA256 签名、AES-256-GCM 加解密、设备指纹生成 |
| `storage.rs` | 本地加密存储（AppData 目录），密钥从设备指纹派生 |
| `validator.rs` | 验证编排：本地解密 → 联网激活 → 吊销检查 |
| `http_client.rs` | reqwest 封装，调服务端 API |
| `commands.rs` | Tauri Command：activate_license / check_license_status / deactivate_license |

#### Scenario: 首次激活成功
- **WHEN** 用户输入有效激活码并点击激活
- **THEN** 客户端采集设备指纹 → HMAC 签名 → POST /api/v1/activate → 服务端返回成功 → 本地加密存储激活状态 → 解锁功能

#### Scenario: 设备超限
- **WHEN** 激活码已绑定 3 台设备，第 4 台尝试激活
- **THEN** 服务端返回 DEVICE_LIMIT_EXCEEDED → 客户端显示错误提示

#### Scenario: 离线使用
- **WHEN** 客户端已激活且本地缓存未过期（30 天内）
- **THEN** 启动时本地验证通过，无需联网

#### Scenario: 吊销检查
- **WHEN** 客户端启动且距上次检查超过 7 天
- **THEN** 向服务端 GET /api/v1/check-revoke 检查激活码是否被吊销

### Requirement: 设备指纹采集

系统 SHALL 使用以下策略采集设备指纹：
1. **首选**：`machine-uid` crate 获取 BIOS UUID / 主板序列号（最稳定）
2. **降级**：hostname + username + CPU brand + RAM → SHA256
3. 指纹用于：AES 密钥派生 + 服务端设备绑定

### Requirement: 本地加密存储

系统 SHALL 将激活状态加密存储在 AppData 目录：
- 文件路径：`{app_data_dir}/.license.dat`
- 加密方式：AES-256-GCM
- 密钥派生：设备指纹 → SHA256 → 取前 32 字节
- 存储内容：`{ code, device_id, expires_at, last_check_revoke, activated_at }`
- 防时间回拨：记录最大历史时间，检测系统时间回退

### Requirement: 服务端激活 API

系统 SHALL 提供以下客户端 API：

**POST /api/v1/activate**
- 请求：`{ code, device_id, device_name, timestamp, signature }`
- 签名：HMAC-SHA256(code + device_id + timestamp, APP_SECRET)
- 服务端逻辑：
  1. 校验时间戳 ±5 分钟防重放
  2. 验证 HMAC 签名
  3. 查询激活码状态
  4. 检查设备绑定数 < max_devices(3)
  5. 绑定设备或返回超限错误
- 响应：`{ success, expires_at, duration_type, max_devices, current_device_count }`

**GET /api/v1/check-revoke**
- 请求：`?code=xxx&device_id=xxx&timestamp=xxx&signature=xxx`
- 响应：`{ revoked, expires_at }`

### Requirement: 服务端管理员 API

系统 SHALL 提供以下管理员 API（JWT 鉴权）：

**认证**
- POST /api/admin/login — 管理员登录，返回 JWT

**激活码管理**
- GET /api/admin/codes — 激活码列表（分页、筛选）
- POST /api/admin/codes/generate — 批量生成激活码
- PATCH /api/admin/codes/:id/status — 禁用/启用激活码
- GET /api/admin/codes/export — 导出 CSV

**密钥管理**
- GET /api/admin/keys — 密钥列表
- POST /api/admin/keys/generate — 一键生成 RSA-2048 密钥对
- 服务端首次启动自动生成 v1 密钥对

**仪表盘**
- GET /api/admin/dashboard/stats — 基础统计（4 个核心指标）

**渠道与套餐**
- CRUD /api/admin/channels — 渠道管理
- CRUD /api/admin/packages — 套餐管理

### Requirement: 数据库 Schema（SQLite）

系统 SHALL 创建以下 5 张表：

1. **activation_codes** — 激活码表（code, package_id, channel_id, duration_type, duration_days, max_devices=3, status, batch_note）
2. **activated_devices** — 设备绑定表（code_id, device_fingerprint, hostname, os_type, first_seen_at, last_check_at）
3. **packages** — 套餐表（name, duration_type, duration_days, price, max_devices=3）
4. **channels** — 渠道表（name, code）
5. **admin_users** — 管理员表（username, password_hash）

### Requirement: 管理后台

系统 SHALL 提供基于 Vue 3 + Naive UI 的管理后台：
- 登录页（JWT 认证）
- 激活码管理页（列表、批量生成、禁用/启用、导出 CSV）
- 密钥管理页（一键生成、查看公钥）
- 渠道管理页
- 套餐管理页
- 基础仪表盘（累计激活码数、已激活设备数、今日激活数、激活码使用率）

### Requirement: 打包隔离保障

系统 SHALL 确保服务端和管理后台代码不被打包进客户端 exe：
1. 物理目录隔离：server/ 和 admin-panel/ 为独立子工程
2. 禁止跨工程引用：客户端代码不得 import/require/mod 任何 server/ 或 admin-panel/ 文件
3. tauri.conf.json 资源白名单不包含 server/ 和 admin-panel/
4. .gitignore 排除 server/.env、server/node_modules、admin-panel/dist

### Requirement: 客户端激活 UI

系统 SHALL 在客户端提供以下 Vue 组件：
- **ActivationDialog.vue**：模态弹窗，激活码输入框（自动按 `-` 分段），"立即激活"按钮，"获取激活码"按钮（Phase 1 暂显示提示文字，Phase 2 跳转购买页）
- **LicenseStatus.vue**：授权状态指示器（已激活/未激活/已过期），显示到期时间
- 未激活时，批量下载等核心功能被 Rust 层锁定

## MODIFIED Requirements

### Requirement: 下载前激活检查

`src/utils/downloadManager.ts` 的下载流程 SHALL 在启动前调用 `invoke('check_license_status')`，若未激活或过期则拒绝执行并弹出 ActivationDialog。

### Requirement: AppState 扩展

`src-tauri/src/state.rs` 的 AppState SHALL 新增 `license_status: Arc<RwLock<LicenseStatus>>` 字段。

## REMOVED Requirements

无移除的需求。
