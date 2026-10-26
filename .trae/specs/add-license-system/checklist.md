# Checklist — 软件授权系统 Phase 1

## 服务端
- [x] SQLite 数据库 5 张表创建成功（activation_codes, activated_devices, packages, channels, admin_users）
- [x] 默认管理员账号可登录（admin/admin123）
- [x] 默认套餐数据已初始化（3天/1月/1年/永久）
- [x] v1 RSA-2048 密钥对首次启动自动生成
- [x] POST /api/v1/activate 可正常激活（签名验证 + 设备绑定 + 有效期返回）
- [x] GET /api/v1/check-revoke 可检查吊销状态
- [x] HMAC-SHA256 签名验证中间件正常工作
- [x] JWT 鉴权中间件正常工作
- [x] 激活码批量生成 API 正常工作
- [x] 激活码禁用/启用 API 正常工作
- [x] 激活码导出 CSV API 正常工作
- [x] 密钥一键生成 API 正常工作
- [x] 渠道/套餐 CRUD API 正常工作
- [x] 仪表盘统计 API 返回正确数据
- [x] .env 配置文件未被提交 git

## 客户端 Rust 模块
- [x] license/mod.rs 模块声明正确
- [x] 设备指纹采集正常（machine-uid 优先，降级方案可用）
- [x] HMAC-SHA256 签名生成正确（与服务端验证匹配）
- [x] AES-256-GCM 本地加密存储正常（写入 AppData/.license.dat）
- [x] AES-256-GCM 本地解密读取正常
- [x] 防时间回拨检测正常
- [x] activate_license Tauri Command 正常调用服务端 API
- [x] check_license_status Tauri Command 正常返回本地缓存状态
- [x] deactivate_license Tauri Command 正常清除本地存储
- [x] AppState 新增 license_status 字段
- [x] lib.rs 注册了 license::commands::*
- [x] Cargo.toml 新增依赖编译通过

## 客户端 Vue UI
- [x] ActivationDialog.vue 弹窗正常显示
- [x] 激活码输入框自动按 `-` 分段显示
- [x] 激活码格式校验正常（PCGP-XXXXX-XXXXX-XXXXX-XXXXX）
- [x] "立即激活"按钮调用 invoke('activate_license') 成功
- [x] 激活成功显示到期时间
- [x] 激活失败显示具体原因（INVALID_FORMAT / EXPIRED / DEVICE_LIMIT_EXCEEDED / NETWORK_ERROR）
- [x] LicenseStatus.vue 正确显示授权状态
- [x] 未激活时批量下载功能被锁定
- [x] 已激活时批量下载功能正常使用

## 管理后台
- [x] 管理员登录页正常工作（JWT 认证）
- [x] 激活码列表页正常显示（分页、筛选）
- [x] 批量生成激活码正常工作（选择套餐/渠道/数量 → 生成 → 展示）
- [x] 激活码禁用/启用正常工作
- [x] 激活码导出 CSV 正常工作
- [x] 密钥管理页正常显示当前密钥
- [x] 一键生成新密钥正常工作
- [x] 查看公钥正常工作
- [x] 渠道管理 CRUD 正常工作
- [x] 套餐管理 CRUD 正常工作
- [x] 基础仪表盘 4 个指标卡片正常显示
- [x] 路由守卫正常工作（未登录跳转登录页）

## 打包隔离
- [x] server/ 目录代码未出现在客户端 exe 中
- [x] admin-panel/ 目录代码未出现在客户端 exe 中
- [x] tauri.conf.json resources 不包含 server/ 和 admin-panel/
- [x] .gitignore 包含 server/.env、server/node_modules、admin-panel/dist

## 集成测试
- [x] 完整激活流程：管理后台生成激活码 → 客户端输入 → 激活成功 → 功能解锁
- [x] 一码三机限制：第 4 台设备激活返回 DEVICE_LIMIT_EXCEEDED
- [ ] 离线使用：已激活客户端重启后本地验证通过
- [x] 吊销检查：管理后台禁用激活码后，客户端下次检查时功能锁定
- [x] 同设备重复激活：已绑定设备再次激活不增加计数
