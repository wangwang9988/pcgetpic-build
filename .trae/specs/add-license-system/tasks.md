# Tasks — 软件授权系统 Phase 1

## Task 1: 服务端骨架搭建 + 数据库初始化
- [x] 1.1 创建 `server/` 目录，初始化 Node.js + Express + TypeScript 项目
- [x] 1.2 安装核心依赖：express, better-sqlite3, jsonwebtoken, bcrypt, uuid, cors, dotenv
- [x] 1.3 创建 `server/src/db.ts` — SQLite 连接 + 5 张表建表脚本（activation_codes, activated_devices, packages, channels, admin_users）
- [x] 1.4 创建 `server/src/app.ts` — Express 应用入口，注册路由和中间件
- [x] 1.5 创建 `server/src/config.ts` — 从 .env 加载配置（PORT, JWT_SECRET, HMAC_SECRET, MASTER_KEY）
- [x] 1.6 创建 `server/.env.example` — 配置模板
- [x] 1.7 创建默认管理员账号（admin/admin123，首次启动时自动插入）
- [x] 1.8 创建默认套餐（3天试用、1个月、1年、永久）
- [x] 1.9 服务端首次启动自动生成 v1 RSA-2048 密钥对

## Task 2: 服务端激活 API
- [x] 2.1 创建 `server/src/middleware/hmac.ts` — HMAC-SHA256 签名验证中间件
- [x] 2.2 创建 `server/src/middleware/auth.ts` — JWT 鉴权中间件
- [x] 2.3 创建 `server/src/routes/activate.ts` — POST /api/v1/activate（签名验证 + 激活码查询 + 设备绑定 + 有效期返回）
- [x] 2.4 创建 `server/src/routes/check-revoke.ts` — GET /api/v1/check-revoke（吊销状态检查）
- [x] 2.5 创建 `server/src/services/license.ts` — 激活码核销业务逻辑（设备数检查、绑定/解绑）
- [x] 2.6 创建 `server/src/services/device.ts` — 设备指纹匹配逻辑（5 字段 ≥3 匹配视为同设备）
- [x] 2.7 手动测试：用 curl/Postman 验证激活流程

## Task 3: 服务端管理员 API
- [x] 3.1 创建 `server/src/routes/admin/auth.ts` — POST /api/admin/login
- [x] 3.2 创建 `server/src/routes/admin/codes.ts` — 激活码 CRUD（列表/批量生成/禁用/启用/导出）
- [x] 3.3 创建 `server/src/routes/admin/keys.ts` — 密钥管理（列表/一键生成/查看公钥）
- [x] 3.4 创建 `server/src/routes/admin/channels.ts` — 渠道 CRUD
- [x] 3.5 创建 `server/src/routes/admin/packages.ts` — 套餐 CRUD
- [x] 3.6 创建 `server/src/routes/admin/dashboard.ts` — GET /api/admin/dashboard/stats
- [x] 3.7 创建 `server/src/services/key.ts` — RSA 密钥对生成 + AES-256-GCM 加密存储私钥

## Task 4: 客户端 Rust 授权模块
- [x] 4.1 创建 `src-tauri/src/license/mod.rs` — 模块入口
- [x] 4.2 创建 `src-tauri/src/license/crypto.rs` — HMAC-SHA256 签名 + AES-256-GCM 加解密 + 设备指纹生成
- [x] 4.3 创建 `src-tauri/src/license/storage.rs` — 本地加密存储（AppData/.license.dat）
- [x] 4.4 创建 `src-tauri/src/license/validator.rs` — 验证编排器（本地验证 → 联网激活 → 吊销检查）
- [x] 4.5 创建 `src-tauri/src/license/http_client.rs` — reqwest 封装，调服务端 API
- [x] 4.6 创建 `src-tauri/src/license/commands.rs` — Tauri Command（activate_license / check_license_status / deactivate_license）
- [x] 4.7 修改 `src-tauri/Cargo.toml` — 新增依赖（hmac, sha2, aes-gcm, base32, rand, machine-uid, hex）
- [x] 4.8 修改 `src-tauri/src/state.rs` — AppState 新增 license_status 字段
- [x] 4.9 修改 `src-tauri/src/lib.rs` — 注册 mod license + license::commands::*

## Task 5: 客户端 Vue 激活 UI
- [x] 5.1 创建 `src/types/license.ts` — LicenseStatus / ActivateResult 类型定义
- [x] 5.2 创建 `src/stores/licenseStore.ts` — Pinia 状态管理
- [x] 5.3 创建 `src/components/ActivationDialog.vue` — 激活码输入弹窗（分段显示、格式校验、激活/获取激活码按钮）
- [x] 5.4 创建 `src/components/LicenseStatus.vue` — 授权状态指示器
- [x] 5.5 修改 `src/utils/downloadManager.ts` — 下载前检查激活状态
- [x] 5.6 修改 `src/App.vue` 或相关组件 — 未激活时弹出 ActivationDialog

## Task 6: 管理后台搭建
- [x] 6.1 创建 `admin-panel/` 目录，初始化 Vue 3 + Naive UI + Vite + TypeScript 项目
- [x] 6.2 创建 `admin-panel/src/api/` — axios 封装 + API 调用模块
- [x] 6.3 创建 `admin-panel/src/views/Login.vue` — 管理员登录页
- [x] 6.4 创建 `admin-panel/src/views/Dashboard.vue` — 基础仪表盘（4 个核心指标卡片）
- [x] 6.5 创建 `admin-panel/src/views/Codes.vue` — 激活码管理（列表、批量生成、禁用/启用、导出 CSV）
- [x] 6.6 创建 `admin-panel/src/views/Keys.vue` — 密钥管理（一键生成、查看公钥）
- [x] 6.7 创建 `admin-panel/src/views/Channels.vue` — 渠道管理
- [x] 6.8 创建 `admin-panel/src/views/Packages.vue` — 套餐管理
- [x] 6.9 创建路由 + 路由守卫（JWT 鉴权）
- [x] 6.10 创建 Pinia store（admin auth）

## Task 7: 集成测试与验证
- [x] 7.1 启动服务端，确认 SQLite 建表成功 + 默认数据初始化
- [ ] 7.2 管理后台登录 → 批量生成激活码 → 导出 CSV
- [ ] 7.3 客户端输入激活码 → 激活成功 → 下载功能解锁
- [x] 7.4 同一激活码第 4 台设备激活 → 返回 DEVICE_LIMIT_EXCEEDED
- [ ] 7.5 客户端重启 → 本地验证通过（无需联网）
- [x] 7.6 管理后台禁用激活码 → 客户端吊销检查 → 功能锁定
- [x] 7.7 验证打包隔离：确认 server/ 和 admin-panel/ 代码未混入客户端 exe

# Task Dependencies

```
Task 1 ──→ Task 2 ──→ Task 3 ──→ Task 7
                                    ↑
Task 4 ────────────────────────────→│
                                    │
Task 5 ──→ (depends on Task 4) ────→│
                                    │
Task 6 ──→ (depends on Task 3) ────→│
```

- Task 1 → Task 2 → Task 3：服务端顺序开发
- Task 4：可与 Task 1-3 并行开发（客户端 Rust 模块独立）
- Task 5：依赖 Task 4（需要 Rust commands 就绪）
- Task 6：依赖 Task 3（需要管理员 API 就绪）
- Task 7：依赖所有前置任务
