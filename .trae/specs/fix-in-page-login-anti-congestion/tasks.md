# Tasks

- [x] Task 1: 数据质量门控——scrape-data 处理器增加实质性数据判定（核心修复）
  - [x] 在 `scrape-data` 处理器中定义实质性数据 key 集合：`MainPic`、`DetailPic`、`SkuPic`、`VideoInfo`、`VideoUrls`
  - [x] 在 `is_new_value` 分支内，增加 `is_substantial_data` 判定：key 属于实质性集合 AND value 为非空数组
  - [x] 仅 `is_substantial_data = true` 时执行 `mark_platform_verified` 和 `get_waiting_workers_for_platform` 逻辑
  - [x] `is_substantial_data = false` 时仅更新数据变化时间
  - [x] WaitingForLogin 守卫在 is_substantial_data 判定之前执行（优先级不变）

- [x] Task 2: LoginRequired 事件后端处理
  - [x] 在 `scrape-data` 处理器中，当 `data.key == "LoginRequired"` 时，将 Worker 状态设为 CaptchaBlocked
  - [x] 取消该平台的验证状态（`unverify_platform`）
  - [x] 发送 `login-required` UI 事件
  - [x] 打印日志 `[scrape-data] Scraper 报告需要登录，Worker {id} 设为 CaptchaBlocked`

- [x] Task 3: 共享登录探针模块 loginProbe.ts
  - [x] 在 `scraper-scripts/shared/loginProbe.ts` 中创建 `detectLogin()` 函数
  - [x] 通用检测模式：检查页面中是否存在登录浮层/QR码/登录表单等常见元素
  - [x] 返回 `{ needsLogin: boolean, reason?: string }`
  - [x] 导出 `detectLogin` 和 `probeAndReportLogin` 供各平台 scraper 调用

- [x] Task 4: 淘宝 scraper 集成登录探针
  - [x] 在 `scraper-scripts/taobao/index.ts` 的 `runModulesOnIdle()` 开头调用 `probeAndReportLogin()`
  - [x] 如果检测到登录，发送 `tauriBridge.send('LoginRequired', { reason: '...' })` 并 return
  - [x] 添加淘宝特有的登录检测选择器（`.login-panel`、`.J_QRCodeImg`、`.qrcode-login` 等）

- [x] Task 5: 京东 scraper 集成登录探针
  - [x] 在 `scraper-scripts/jd/index.ts` 的 `runModulesOnIdle()` 开头调用 `probeAndReportLogin()`
  - [x] 如果检测到登录，发送 `tauriBridge.send('LoginRequired', { reason: '...' })` 并 return
  - [x] 添加京东特有的登录检测选择器

- [x] Task 6: 完善淘宝 check_login URL 检测
  - [x] 在 `login/taobao.rs` 的 `check_login` 方法中增加 `login.tmall.com` → LoginRequired
  - [x] 增加 `passport.taobao.com` → LoginIntermediate
  - [x] 增加 `passport.tmall.com` → LoginIntermediate

- [x] Task 7: 编译验证 + 构建验证
  - [x] 执行 `cargo build` 确保 Rust 代码无编译错误
  - [x] 执行 scraper 脚本构建确保 TypeScript 无编译错误

# Task Dependencies
- [Task 1] 无依赖，核心修复，优先执行
- [Task 2] 无依赖，可与 Task 1 并行
- [Task 3] 无依赖，可与 Task 1 并行
- [Task 4] 依赖 [Task 3]（需要 loginProbe.ts 模块）
- [Task 5] 依赖 [Task 3]（需要 loginProbe.ts 模块）
- [Task 6] 无依赖，可与 Task 1 并行
- [Task 7] 依赖 [Task 1-6] 全部完成
