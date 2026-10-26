# 授权系统安全漏洞与功能缺陷修复 Spec

## Why

19 份评估报告一致指出当前授权系统存在多个严重安全漏洞和功能缺陷：核心 Tauri 命令无授权校验（用户关闭激活弹窗即可白嫖）、吊销检查是死代码（管理员吊销后客户端无感知）、吊销检查响应格式不匹配（反序列化必失败）、激活接口无事务保护（并发可突破设备数限制）、HMAC 密钥硬编码在二进制中（可被逆向提取）、DISABLED 状态激活码未拦截、永久授权受 30 天离线宽限期误拦。这些问题导致整个授权系统形同虚设，必须修复才能上线生产。

## What Changes

### 🔴 P0 — 必须修复（授权系统失效 / 安全漏洞）

- **修改** `src-tauri/src/commands/scraping.rs` — `start_scraping` 命令入口添加 `verify_before_operation()` 调用
- **修改** `src-tauri/src/commands/download.rs` — `download_file` / `fetch_resource_as_data_url` 命令入口添加 `verify_before_operation()` 调用
- **修改** `src-tauri/src/license/commands.rs` — 新增 `verify_license_and_check_revoke` 异步 Tauri 命令，合并本地校验 + 联网吊销检查
- **修改** `src-tauri/src/license/commands.rs` — 新增 `check_revoke_status` Tauri 命令，前端可主动调用
- **修改** `src-tauri/src/lib.rs` — 注册新命令 + 在 `setup` 中启动定时吊销检查
- **修改** `src-tauri/src/license/http_client.rs` — 修复 `RevokeResponse` 结构体，对齐服务端返回格式（改客户端适配服务端）
- **修改** `server/src/services/license.ts` — `activateCode` 函数用 `db.transaction()` 包裹检查+绑定操作
- **修改** `server/src/services/license.ts` — `activateCode` 函数增加对 DISABLED 状态的明确拦截（BUG-1）
- **修改** `src-tauri/src/state.rs` — HMAC 密钥使用 `obfstr` crate 编译时字符串混淆，降低逆向提取难度
- **修改** `src-tauri/src/license/validator.rs` — `verify_before_operation` 增加离线超期检查逻辑
- **修改** `src-tauri/src/license/validator.rs` — 永久授权跳过离线宽限期检查（BUG-9）
- **修改** `src-tauri/src/state.rs` — 新增 `revoke_checking: AtomicBool` 防止并发吊销检查

### 🟡 P1 — 建议修复（功能缺陷 / 安全加固）

- **修改** `src-tauri/src/license/validator.rs` — 统一时间戳单位，`current_timestamp()` 使用秒，`http_client.rs` 的 HMAC 时间戳单独命名为 `current_timestamp_ms()`
- **修改** `src-tauri/src/license/commands.rs` — 永久授权 `expires_at` 不再传 `i64::MAX` 给前端，改为传 `null`
- **修改** `src/components/ActivationDialog.vue` — `mask-closable` 改为 `false`，`close-on-esc` 改为 `false`
- **修改** `server/src/app.ts` — CORS 配置白名单，禁止 `*`
- **修改** `server/src/db.ts` — 默认管理员密码从环境变量读取，未配置时生成随机密码
- **修改** `server/src/app.ts` — 添加 `express-rate-limit` 中间件限制激活接口请求频率（每 15 分钟 10 次）
- **修改** `src-tauri/src/license/commands.rs` — `deactivate_license` 命令增加服务端设备解绑通知
- **新增** `server/src/routes/activate.ts` — 新增 `POST /api/v1/deactivate` 接口，接收设备解绑请求
- **修改** 前端全局异常处理 — 捕获 Tauri 命令的授权错误，自动弹出激活弹窗

### 不在本次范围

- RSA/Ed25519 非对称签名升级（长期优化，Phase 3）
- LicenseData 版本号（长期优化）
- any 类型清理（长期优化）
- 输入验证库引入（长期优化）
- 微信支付回调路由（Phase 3）
- 过期订单清理定时任务（Phase 3）
- 单元测试补充（后续迭代）
- tauri-plugin-stronghold / OS Credential Manager 存储（Phase 3）
- 激活码格式正则化验证（P2，当前字符串拆分方式功能正确）

## Impact

- Affected code: `src-tauri/src/license/`（validator.rs, http_client.rs, commands.rs, state.rs）、`src-tauri/src/commands/`（scraping.rs, download.rs）、`src-tauri/src/lib.rs`、`server/src/`（license.ts, app.ts, db.ts, routes/activate.ts）、`src/components/ActivationDialog.vue`、`src/stores/licenseStore.ts`
- Affected dependencies: 新增 `obfstr` crate（Cargo.toml）、新增 `express-rate-limit`（server/package.json）
- **BREAKING**: 吊销检查响应格式变更（改客户端适配服务端，旧版客户端吊销检查本就是死代码，无实际影响）
- **BREAKING**: 新增 `POST /api/v1/deactivate` 服务端接口

## ADDED Requirements

### Requirement: 核心 Tauri 命令授权校验

系统 SHALL 在以下核心 Tauri 命令入口调用 `verify_before_operation()` 进行授权校验，未授权时拒绝执行并返回错误：

- `start_scraping`
- `download_file`
- `fetch_resource_as_data_url`

前端 SHALL 统一捕获 Tauri 命令的授权错误（错误消息以"未激活授权"/"授权已过期"开头），自动弹出激活弹窗。

#### Scenario: 未授权用户尝试抓取
- **WHEN** 用户未激活授权且调用 `start_scraping`
- **THEN** 命令返回错误 "未激活授权"，前端自动弹出激活弹窗

#### Scenario: 已授权用户正常抓取
- **WHEN** 用户已激活授权且调用 `start_scraping`
- **THEN** 授权校验通过，正常执行抓取流程

#### Scenario: 授权已过期用户尝试下载
- **WHEN** 用户授权已过期且调用 `download_file`
- **THEN** 命令返回错误 "授权已过期"，前端自动弹出激活弹窗

### Requirement: 吊销检查闭环

系统 SHALL 将吊销检查从死代码变为实际运行的功能：

1. 新增 Tauri 命令 `check_revoke_status`，前端可主动调用
2. 新增 Tauri 命令 `verify_license_and_check_revoke`，合并本地校验 + 联网吊销检查（异步），前端在收到"需要联网验证"错误时调用此命令
3. 在 `lib.rs` 的 `setup` 中启动后台定时任务（`tauri::async_runtime::spawn` + `tokio::time::interval`），每隔 1 小时轮询一次是否需要执行吊销检查（距上次检查超过 7 天才真正发起 HTTP 请求）
4. 吊销检查逻辑：距上次检查超过 7 天 → 调用服务端 API → 若被吊销则清除本地授权数据 → 更新缓存状态
5. 使用 `AppState.revoke_checking: AtomicBool` 防止并发吊销检查（定时任务和前端主动调用互斥）
6. 后台定时任务遵循"极短时间持锁"原则：仅在 `prepare_revoke_check`（同步，短暂持锁）和 `handle_revoke_result`（同步，短暂持锁）时持锁，中间的 `do_revoke_check_http`（异步 HTTP）在锁释放后执行

#### Scenario: 管理员吊销后客户端感知
- **WHEN** 管理员在后台禁用激活码，且客户端距上次检查超过 7 天
- **THEN** 后台定时任务或前端主动调用发现需要检查 → 联网检查 → 发现被吊销 → 清除本地授权 → 状态变为 Inactive → 前端弹出激活弹窗

#### Scenario: 7 天内不重复检查
- **WHEN** 客户端距上次吊销检查不足 7 天
- **THEN** 跳过联网检查，使用本地缓存状态

#### Scenario: 并发吊销检查互斥
- **WHEN** 后台定时任务和前端同时触发吊销检查
- **THEN** 通过 `AtomicBool` 互斥，仅一个执行 HTTP 请求，另一个跳过

### Requirement: 吊销检查响应格式对齐

系统 SHALL 修复客户端 `RevokeResponse` 结构体与服务端实际返回格式的不匹配。**修改方向：改客户端适配服务端**。

- 服务端返回：`{ success: true, data: { revoked: boolean, expires_at: number | null } }`
- 客户端新增外层结构体 `CheckRevokeResponse { success: bool, data: Option<RevokeResponseData> }`，`RevokeResponseData { revoked: bool, expires_at: Option<i64> }`
- 替换原 `RevokeResponse { revoked, message }`

#### Scenario: 吊销检查成功解析
- **WHEN** 客户端调用 `/api/v1/check-revoke`
- **THEN** 正确解析服务端返回的 JSON，提取 `data.revoked` 字段

### Requirement: 激活接口事务保护

系统 SHALL 使用 `db.transaction()` 包裹 `activateCode` 函数中的设备数检查和设备绑定操作，防止并发激活突破设备数限制。事务内仅包含 DB 读写操作（SELECT 检查剩余设备数 + INSERT/UPDATE 绑定设备），不包含任何网络请求或耗时运算。

#### Scenario: 并发激活同一激活码
- **WHEN** 两台设备同时使用同一激活码激活（剩余 1 个设备名额）
- **THEN** 仅一台成功，另一台返回 DEVICE_LIMIT_EXCEEDED

### Requirement: DISABLED 状态激活码拦截（BUG-1）

系统 SHALL 在 `activateCode` 函数中增加对 DISABLED 状态激活码的明确拦截。当前代码在步骤 2 校验状态时仅检查了 `CODE_STATUS.DISABLED`，但首次激活流程（步骤 2 的 `UNUSED` 分支）会先将状态改为 `ACTIVATED` 再继续执行，如果激活码在并发场景下被其他请求先改为 DISABLED，当前请求仍可能继续执行。

修改方案：在事务内再次检查状态，确保绑定设备前激活码状态仍为 ACTIVATED。

#### Scenario: 已禁用激活码尝试激活
- **WHEN** 管理员已禁用激活码，用户尝试激活
- **THEN** 返回 CODE_DISABLED 错误

### Requirement: HMAC 密钥编译时混淆

系统 SHALL 使用 `obfstr` crate 对 HMAC 密钥进行编译时字符串混淆，降低通过 `strings` 命令或反编译提取密钥的难度。

- 将 `state.rs` 中的 `let license_hmac_secret = "pcgetpic-prod-hmac-2024-secure".to_string();` 改为 `let license_hmac_secret = obfstr::obfstr!("pcgetpic-prod-hmac-2024-secure").to_string();`
- 密钥在编译时加密，运行时解密，不会以明文形式出现在二进制文件中
- 此方案承认桌面客户端 HMAC 密钥必然存在于二进制中，混淆仅提高逆向门槛，根本解决方案（Ed25519 非对称签名）留待 Phase 3

#### Scenario: 二进制文件中不含明文密钥
- **WHEN** 对编译后的 .exe 执行 `strings` 命令
- **THEN** 无法找到 `pcgetpic-prod-hmac-2024-secure` 明文字符串

### Requirement: 永久授权跳过离线宽限期检查（BUG-9）

系统 SHALL 在 `verify_before_operation` 中，对永久授权（`expires_at` 为极大值或 `i64::MAX`）跳过 30 天离线宽限期检查。永久授权没有过期时间，不应因"离线时间过长"而被拒绝使用。

#### Scenario: 永久授权长期离线使用
- **WHEN** 用户激活了永久授权，且离线超过 30 天
- **THEN** 本地校验通过，正常使用（仅受 7 天吊销检查间隔约束）

### Requirement: CORS 白名单

系统 SHALL 将 CORS 配置从 `cors()` 全开放改为白名单模式：

- 允许的域名：`https://store.downpictures.com`、`https://admin.downpictures.com`、`http://localhost:*`（开发环境）
- 其他域名请求被拒绝

### Requirement: 默认管理员密码安全化

系统 SHALL 将默认管理员密码从硬编码 `admin123` 改为：

1. 优先从环境变量 `ADMIN_PASSWORD` 读取
2. 若未配置环境变量，首次启动时生成随机 16 位密码并打印到控制台（仅一次）
3. 不再在日志中明文打印密码

### Requirement: 激活接口速率限制

系统 SHALL 在 `/api/v1/activate` 路由上添加速率限制：

- 同一 IP 每 15 分钟最多 10 次激活请求
- 超出限制返回 429 Too Many Requests

### Requirement: 永久授权前端显示修复

系统 SHALL 修复永久授权导致前端 `NaN-NaN-NaN` 的问题：

1. Rust 端永久授权的 `expires_at` 返回 `None`（而非 `i64::MAX`）
2. 前端判断 `expires_at` 为 `null` 时显示"永久有效"

#### Scenario: 永久授权显示
- **WHEN** 用户激活了永久授权
- **THEN** 到期时间显示"永久有效"，剩余天数不显示

### Requirement: 激活弹窗不可点击遮罩关闭

系统 SHALL 将 `ActivationDialog.vue` 的 `mask-closable` 改为 `false`，`close-on-esc` 改为 `false`，防止用户通过点击遮罩或按 ESC 关闭弹窗绕过激活流程。

### Requirement: 注销时释放服务端设备绑定

系统 SHALL 在 `deactivate_license` 命令中增加服务端设备解绑通知：

1. 新增服务端接口 `POST /api/v1/deactivate`，接收 `{ code, device_id, timestamp, signature }`，删除对应的设备绑定记录
2. 客户端 `deactivate_license` 在清除本地数据前，先调用服务端解绑接口
3. 解绑失败不阻塞本地注销（网络不可达时仍允许本地注销）

#### Scenario: 正常注销释放设备名额
- **WHEN** 用户点击"更换激活码"执行注销
- **THEN** 客户端通知服务端删除设备绑定 → 清除本地授权数据 → 设备名额释放

#### Scenario: 离线注销
- **WHEN** 用户离线时点击"更换激活码"
- **THEN** 服务端解绑请求失败 → 本地仍正常注销 → 设备名额暂不释放（下次联网时吊销检查会更新状态）

## MODIFIED Requirements

### Requirement: 时间戳单位统一

`http_client.rs` 中用于 HMAC 签名的时间戳 SHALL 使用毫秒（对齐服务端 `Date.now()`），`validator.rs` 中用于业务逻辑的时间戳 SHALL 使用秒。两个函数 SHALL 使用不同的命名以避免混淆：

- `http_client.rs`: `current_timestamp_ms()` — 返回毫秒级时间戳，用于 HMAC 签名
- `validator.rs`: `current_timestamp()` — 返回秒级时间戳，用于业务逻辑

### Requirement: verify_before_operation 离线超期检查策略

`verify_before_operation` SHALL 在本地校验通过后，检查距上次吊销检查是否超过 7 天：

- **非永久授权**超过 7 天未联网检查：返回错误 "需要联网验证授权"，前端收到此错误后应自动调用 `verify_license_and_check_revoke` 异步命令（本地校验 + 联网吊销检查），根据结果决定是否放行
- **永久授权**：跳过离线宽限期检查，仅受吊销检查间隔约束
- 未超过 7 天：直接放行

**设计原则**：`verify_before_operation` 是同步函数，不执行 HTTP 请求。它仅作为"快速拦截层"拒绝明确无效的授权（未激活/已过期/时间回拨/离线超期）。联网吊销检查由异步命令或后台定时任务完成，不阻塞合法用户的正常操作。

## REMOVED Requirements

无移除的需求。
