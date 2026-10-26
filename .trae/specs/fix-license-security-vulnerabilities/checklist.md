# Checklist — 授权系统安全漏洞与功能缺陷修复

## P0 — 必须修复

### 核心 Tauri 命令授权校验
- [x] `start_scraping` 命令入口调用了 `verify_before_operation()`，未授权时返回错误
- [x] `download_file` 命令入口调用了 `verify_before_operation()`，未授权时返回错误
- [x] `fetch_resource_as_data_url` 命令入口调用了 `verify_before_operation()`，未授权时返回错误
- [x] 前端统一捕获 Tauri 命令的授权错误，自动弹出激活弹窗

### 吊销检查闭环
- [x] `RevokeResponse` 结构体对齐服务端返回格式 `{ success, data: { revoked, expires_at } }`（改客户端适配服务端）
- [x] `check_revoke_status` Tauri 命令已注册并在 lib.rs 的 invoke_handler 中
- [x] `verify_license_and_check_revoke` 异步 Tauri 命令已注册，合并本地校验 + 联网吊销检查
- [x] 后台定时任务每隔 1 小时轮询是否需要执行吊销检查（距上次检查超过 7 天才发起 HTTP 请求）
- [x] 后台定时任务遵循"极短时间持锁"原则（prepare/handle 持锁，HTTP 请求释放锁）
- [x] `AppState.revoke_checking: AtomicBool` 防止并发吊销检查
- [x] `verify_before_operation` 检查离线超期（非永久授权超过 7 天未联网检查时返回错误）
- [x] 管理员禁用激活码后，客户端下次检查时能正确感知并清除本地授权

### 激活接口事务保护
- [x] `activateCode` 函数使用 `db.transaction()` 包裹设备数检查 + 设备绑定操作
- [x] 事务内仅包含 DB 读写操作，无网络请求或耗时运算
- [x] 并发激活同一激活码不会突破设备数限制

### DISABLED 状态拦截（BUG-1）
- [x] 事务内再次检查激活码状态，确保绑定设备前状态仍为 ACTIVATED
- [x] 已禁用激活码无法激活

### HMAC 密钥编译时混淆
- [x] `obfstr` crate 已添加到 Cargo.toml
- [x] `state.rs` 中 HMAC 密钥使用 `obfstr::obfstr!()` 宏
- [x] 编译后 .exe 中 `strings` 命令无法找到明文密钥

### 永久授权跳过离线宽限期（BUG-9）
- [x] `verify_before_operation` 中永久授权跳过 30 天离线宽限期检查
- [x] 永久授权离线超过 30 天仍可正常使用

## P1 — 建议修复

### 时间戳单位统一
- [x] `http_client.rs` 的 HMAC 时间戳函数命名为 `current_timestamp_ms()`，返回毫秒
- [x] `validator.rs` 的业务时间戳函数命名为 `current_timestamp()`，返回秒
- [x] 两个函数命名不同，注释明确说明各自用途

### 永久授权前端显示修复
- [x] Rust 端永久授权 `expires_at` 返回 `None`（不再传 `i64::MAX`）
- [x] `verify_on_startup` 返回的 `LicenseStatus.expires_at` 永久授权时为 `None`
- [x] 前端 `expiresAtText` 对 `null` 值返回空字符串
- [x] ActivationDialog 对永久授权显示"永久有效"
- [x] 前端不再出现 NaN-NaN-NaN

### 激活弹窗不可点击遮罩关闭
- [x] `ActivationDialog.vue` 的 `mask-closable` 为 `false`
- [x] `close-on-esc` 为 `false`

### CORS 白名单
- [x] CORS 配置为白名单模式，不再使用 `cors()` 全开放
- [x] 允许 `https://store.downpictures.com`、`https://admin.downpictures.com`、`http://localhost:*`
- [x] 其他域名请求被拒绝

### 默认管理员密码安全化
- [x] 默认密码从环境变量 `ADMIN_PASSWORD` 读取
- [x] 未配置时生成随机 16 位密码
- [x] 不再在日志中明文打印密码

### 激活接口速率限制
- [x] `/api/v1/activate` 路由添加了速率限制
- [x] 同一 IP 每 15 分钟最多 10 次激活请求
- [x] 超出限制返回 429 Too Many Requests

### 注销时释放服务端设备绑定
- [x] 服务端新增 `POST /api/v1/deactivate` 接口
- [x] 客户端 `deactivate_license` 在清除本地数据前调用服务端解绑接口
- [x] 解绑失败不阻塞本地注销
- [x] 注销后服务端设备绑定记录被删除，设备名额释放
