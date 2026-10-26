# Tasks — 授权系统安全漏洞与功能缺陷修复

## Task 1: 核心 Tauri 命令添加授权校验（P0）
- [x] 1.1 修改 `src-tauri/src/commands/scraping.rs` — `start_scraping` 命令入口添加 `verify_before_operation()` 调用，未授权时返回错误
- [x] 1.2 修改 `src-tauri/src/commands/download.rs` — `download_file` 命令入口添加 `verify_before_operation()` 调用
- [x] 1.3 修改 `src-tauri/src/commands/download.rs` — `fetch_resource_as_data_url` 命令入口添加 `verify_before_operation()` 调用
- [x] 1.4 修改前端 — 在调用 `invoke("start_scraping")` 等核心命令时统一 try-catch，捕获授权错误自动弹出激活弹窗
- [x] 1.5 验证：未授权时调用 `start_scraping` 返回错误并弹出激活弹窗，已授权时正常执行

## Task 2: 吊销检查闭环（P0）
- [x] 2.1 修改 `src-tauri/src/license/http_client.rs` — 修复 `RevokeResponse` 结构体，新增 `CheckRevokeResponse { success, data: Option<RevokeResponseData> }` 和 `RevokeResponseData { revoked, expires_at }`，替换原 `RevokeResponse { revoked, message }`
- [x] 2.2 修改 `src-tauri/src/license/validator.rs` — 更新 `do_revoke_check_http` 返回类型和 `handle_revoke_result` 以适配新的响应格式
- [x] 2.3 修改 `src-tauri/src/license/commands.rs` — 添加 `check_revoke_status` Tauri 命令，封装 `prepare_revoke_check` → `do_revoke_check_http` → `handle_revoke_result` 流程
- [x] 2.4 修改 `src-tauri/src/license/commands.rs` — 添加 `verify_license_and_check_revoke` 异步 Tauri 命令，合并本地校验 + 联网吊销检查，前端在收到"需要联网验证"错误时调用
- [x] 2.5 修改 `src-tauri/src/state.rs` — 新增 `revoke_checking: AtomicBool` 字段，防止并发吊销检查
- [x] 2.6 修改 `src-tauri/src/lib.rs` — 注册 `check_revoke_status` 和 `verify_license_and_check_revoke` 命令
- [x] 2.7 修改 `src-tauri/src/lib.rs` — 在 `setup` 中启动后台定时任务（`tauri::async_runtime::spawn` + `tokio::time::interval`），每隔 1 小时轮询是否需要执行吊销检查，遵循"极短时间持锁"原则
- [x] 2.8 修改 `src-tauri/src/license/validator.rs` — `verify_before_operation` 增加离线超期检查：非永久授权超过 7 天未联网检查时返回错误 "需要联网验证授权"
- [x] 2.9 验证：吊销检查可正常调用并正确解析服务端响应；后台定时任务运行正常

## Task 3: 激活接口事务保护 + DISABLED 状态拦截（P0）
- [x] 3.1 修改 `server/src/services/license.ts` — `activateCode` 函数用 `db.transaction()` 包裹设备数检查 + 设备绑定操作，事务内仅包含 DB 读写
- [x] 3.2 修改 `server/src/services/license.ts` — 在事务内再次检查激活码状态，确保绑定设备前状态仍为 ACTIVATED（修复 BUG-1：DISABLED 状态拦截）
- [x] 3.3 验证：并发激活同一激活码时仅允许 max_devices 台设备成功；已禁用激活码无法激活

## Task 4: HMAC 密钥编译时混淆（P0）
- [x] 4.1 修改 `src-tauri/Cargo.toml` — 添加 `obfstr` 依赖
- [x] 4.2 修改 `src-tauri/src/state.rs` — 将 `let license_hmac_secret = "pcgetpic-prod-hmac-2024-secure".to_string();` 改为 `let license_hmac_secret = obfstr::obfstr!("pcgetpic-prod-hmac-2024-secure").to_string();`
- [x] 4.3 验证：编译后 .exe 中 `strings` 命令无法找到明文密钥

## Task 5: 永久授权跳过离线宽限期 + 前端显示修复（P0 + P1）
- [x] 5.1 修改 `src-tauri/src/license/validator.rs` — `verify_before_operation` 中，永久授权（`expires_at` 为极大值）跳过 30 天离线宽限期检查（BUG-9）
- [x] 5.2 修改 `src-tauri/src/license/commands.rs` — `activate_license` 命令返回给前端的 `expires_at`：永久授权时返回 `None`（而非 `i64::MAX`）
- [x] 5.3 修改 `src-tauri/src/license/validator.rs` — `verify_on_startup` 返回的 `LicenseStatus.expires_at`：永久授权时返回 `None`
- [x] 5.4 修改 `src/stores/licenseStore.ts` — `expiresAtText` 计算属性：`expires_at` 为 `null` 时返回空字符串（已确认现有代码正确处理）
- [x] 5.5 修改 `src/stores/licenseStore.ts` — `remainingDays` 计算属性：`expires_at` 为 `null` 时返回 0（已确认现有代码正确处理）
- [x] 5.6 验证：永久授权激活后前端显示"永久有效"，不显示 NaN；永久授权离线超过 30 天仍可正常使用

## Task 6: 时间戳单位统一（P1）
- [x] 6.1 修改 `src-tauri/src/license/http_client.rs` — 将 `current_timestamp()` 重命名为 `current_timestamp_ms()`，注释明确说明用于 HMAC 签名（毫秒级，对齐服务端 Date.now()）
- [x] 6.2 验证：`validator.rs` 的 `current_timestamp()` 返回秒，`http_client.rs` 的 `current_timestamp_ms()` 返回毫秒

## Task 7: 激活弹窗不可点击遮罩关闭（P1）
- [x] 7.1 修改 `src/components/ActivationDialog.vue` — `:mask-closable="true"` 改为 `:mask-closable="false"`
- [x] 7.2 修改 `src/components/ActivationDialog.vue` — `:close-on-esc="true"` 改为 `:close-on-esc="false"`

## Task 8: 服务端安全加固（P1）
- [x] 8.1 修改 `server/src/app.ts` — CORS 配置改为白名单模式（允许 `https://store.downpictures.com`、`https://admin.downpictures.com`、`http://localhost:*`）
- [x] 8.2 修改 `server/src/db.ts` — 默认管理员密码从环境变量 `ADMIN_PASSWORD` 读取，未配置时生成随机 16 位密码并打印到控制台
- [x] 8.3 修改 `server/package.json` — 添加 `express-rate-limit` 依赖
- [x] 8.4 修改 `server/src/app.ts` — 在 `/api/v1/activate` 路由上添加速率限制（同一 IP 每 15 分钟最多 10 次）
- [x] 8.5 验证：CORS 非 白名单域名被拒绝；默认密码不再是 admin123；激活接口超频返回 429

## Task 9: 注销时释放服务端设备绑定（P1）
- [x] 9.1 新增 `server/src/services/device.ts` — 添加 `unbindDevice` 函数，删除指定激活码和设备指纹的绑定记录
- [x] 9.2 修改 `server/src/routes/activate.ts` — 新增 `POST /api/v1/deactivate` 路由，接收 `{ code, device_id, timestamp, signature }`，HMAC 验证后调用 `unbindDevice`
- [x] 9.3 修改 `src-tauri/src/license/http_client.rs` — 新增 `deactivate` 方法，调用 `POST /api/v1/deactivate`
- [x] 9.4 修改 `src-tauri/src/license/commands.rs` — `deactivate_license` 命令在清除本地数据前，先调用服务端解绑接口（失败不阻塞本地注销）
- [x] 9.5 验证：注销后服务端设备绑定记录被删除，设备名额释放

# Task Dependencies

```
Task 1 (授权校验) ──→ 无前置依赖，可独立开始
Task 2 (吊销检查) ──→ 无前置依赖，可独立开始
Task 3 (事务保护) ──→ 无前置依赖，可独立开始
Task 4 (密钥混淆) ──→ 无前置依赖，可独立开始
Task 5 (永久授权) ──→ 无前置依赖，可独立开始
Task 6 (时间戳)   ──→ 无前置依赖，可独立开始
Task 7 (弹窗遮罩) ──→ 无前置依赖，可独立开始
Task 8 (服务端)   ──→ 无前置依赖，可独立开始
Task 9 (注销解绑) ──→ 无前置依赖，可独立开始
```

所有任务相互独立，可并行执行。Task 2 内部 2.1-2.2 需在 2.3-2.4 之前完成。Task 9 的 9.1-9.2（服务端）需在 9.3-9.4（客户端）之前完成。
