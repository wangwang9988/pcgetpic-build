# Tasks

- [x] Task 1: 创建 `src-tauri/src/login/` 模块框架
  - [x] SubTask 1.1: 创建 `src-tauri/src/login/mod.rs`，定义 `LoginStrategy` trait、`LoginCheckResult` 枚举、`LoginStrategyRegistry` 结构体
  - [x] SubTask 1.2: 在 `src-tauri/src/lib.rs` 顶部添加 `mod login;`
  - [x] SubTask 1.3: 在 `AppState` 中新增 `login_registry: login::LoginStrategyRegistry` 字段，在 `AppState::new()` 中初始化

- [x] Task 2: 实现 `DefaultLoginStrategy`（通用默认策略）
  - [x] SubTask 2.1: 创建 `src-tauri/src/login/default.rs`，实现 `DefaultLoginStrategy` 结构体，支持构造时传入平台名、登录 URL 模式列表、验证码 URL 模式列表
  - [x] SubTask 2.2: `check_login` 方法：URL contains 匹配登录模式返回 `LoginRequired`，匹配验证码模式返回 `Captcha`，否则返回 `Normal`
  - [x] SubTask 2.3: `extract_product_id` 默认返回 `None`，`login_cookie_names` 默认返回空 Vec，`captcha_selectors` 默认返回空切片

- [x] Task 3: 实现 `JdLoginStrategy`（京东登录策略）
  - [x] SubTask 3.1: 创建 `src-tauri/src/login/jd.rs`，实现 `JdLoginStrategy`
  - [x] SubTask 3.2: `check_login` 精确分类：`passport.jd.com/new/login.aspx`（无 ReturnUrl）→ `LoginRequired`；`login.jd.com/*` → `LoginRequired`；`passport.jd.com` 下其他 URL → `LoginIntermediate`；`sec.jd.com`/`verify.jd.com` → `Captcha`；其他 → `Normal`
  - [x] SubTask 3.3: `extract_product_id` 从路径中正则匹配 `/(\d+)\.html` 提取商品 ID
  - [x] SubTask 3.4: `login_cookie_names` 返回 `["pt_key", "pt_pin", "pin"]`
  - [x] SubTask 3.5: `captcha_selectors` 返回 `[".verify-form", "#J-VCode"]`

- [x] Task 4: 实现 `TaobaoLoginStrategy`（淘宝登录策略）
  - [x] SubTask 4.1: 创建 `src-tauri/src/login/taobao.rs`，实现 `TaobaoLoginStrategy`
  - [x] SubTask 4.2: `check_login` 分类：`login.taobao.com/*` → `LoginRequired`；`sec.taobao.com`/含 `nocaptcha` → `Captcha`；其他 → `Normal`
  - [x] SubTask 4.3: `extract_product_id` 从查询参数提取 `id=xxx`（复用现有 `extract_taobao_id` 逻辑）
  - [x] SubTask 4.4: `login_cookie_names` 返回 `["_tb_token_", "cookie2", "unb", "sgcookie"]`
  - [x] SubTask 4.5: `captcha_selectors` 返回 `["#nocaptcha", ".nc-container", "#nc_1_n1z"]`

- [x] Task 5: 创建 `template.rs`（新平台开发模板）
  - [x] SubTask 5.1: 创建 `src-tauri/src/login/template.rs`，包含完整的中文注释说明每个方法的填写指引

- [x] Task 6: 在 `LoginStrategyRegistry::new()` 中注册所有平台策略
  - [x] SubTask 6.1: 注册 `JdLoginStrategy`、`TaobaoLoginStrategy`
  - [x] SubTask 6.2: 使用 `DefaultLoginStrategy` 注册拼多多、唯品会、1688 等简单平台
  - [x] SubTask 6.3: 实现 `detect_login_redirect(url)` 兼容方法（遍历所有策略，命中 `LoginRequired` 则返回平台名）

- [x] Task 7: 改造 `lib.rs` — `on_navigation` 增加状态检查
  - [x] SubTask 7.1: 在 `on_navigation` 回调中，先检查 Worker 是否已处于 `CaptchaBlocked` 状态，如果是则跳过登录检测直接 `return true`
  - [x] SubTask 7.2: 将 `cookie::CookieManager::detect_login_redirect` 调用替换为 `login_registry.check_login(url, platform)`

- [x] Task 8: 改造 `lib.rs` — `on_page_load` 调整执行顺序
  - [x] SubTask 8.1: 将 `was_captcha_blocked` 检查移到登录页检测之前执行
  - [x] SubTask 8.2: 对 `CaptchaBlocked` 状态的 Worker：先调用 `registry.check_login`，根据 `LoginCheckResult` 分流（`LoginIntermediate` → 等待；`Normal` → 恢复/纠偏；`LoginRequired`/`Captcha` → 保持阻塞）
  - [x] SubTask 8.3: 对正常状态的 Worker：调用 `registry.check_login`，根据结果分流（`LoginRequired` → 设置 CaptchaBlocked；`Captcha` → 设置 CaptchaBlocked；`Normal` → 注入脚本）

- [x] Task 9: 改造 `lib.rs` — URL 纠偏使用 `extract_product_id`
  - [x] SubTask 9.1: 删除 `extract_taobao_id` 函数和 `if pl_platform == "taobao"` 硬编码判断
  - [x] SubTask 9.2: 使用 `login_registry.get_strategy(platform).extract_product_id()` 进行商品 ID 级别的 URL 比较
  - [x] SubTask 9.3: 如果策略不支持 `extract_product_id`（返回 None），回退到 URL 字符串比较

- [x] Task 10: 改造 `lib.rs` — 空闲检测器改用注册表
  - [x] SubTask 10.1: 将空闲检测器中的 `cookie::CookieManager::detect_login_redirect` + `is_captcha_page` 替换为 `login_registry.check_login`
  - [x] SubTask 10.2: 空闲检测器只对 `LoginRequired` 和 `Captcha` 结果触发状态变更，对 `LoginIntermediate` 不触发

- [x] Task 11: 精简 `cookie.rs`
  - [x] SubTask 11.1: 删除 `detect_login_redirect`、`is_captcha_page`、`detect_captcha_in_html`、`login_platforms_static` 函数
  - [x] SubTask 11.2: 保留 `CookieManager` 的 `data_dir` 管理功能

- [x] Task 12: 补充京东脚本验证码选择器
  - [x] SubTask 12.1: 在 `scraper-scripts/jd/index.ts` 中将 `CAPTCHA_SELECTORS: string[] = []` 改为 `['.verify-form', '#J-VCode']`

- [x] Task 13: 编译验证
  - [x] SubTask 13.1: 运行 `cargo build` 确认 Rust 编译通过
  - [x] SubTask 13.2: 运行 `npm run build:scraper` 确认前端构建通过

# Task Dependencies

- [Task 1] 是所有后续 Task 的基础（模块框架必须先存在）
- [Task 2] [Task 3] [Task 4] [Task 5] 可并行开发（互相无依赖）
- [Task 6] 依赖 [Task 2] [Task 3] [Task 4]（需要各策略实现完成后注册）
- [Task 7] [Task 8] [Task 9] [Task 10] [Task 11] 依赖 [Task 6]（需要注册表可用）
- [Task 12] 独立，可并行
- [Task 13] 依赖所有其他 Task
