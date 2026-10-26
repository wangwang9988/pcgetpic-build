# 平台登录策略架构 Spec

## Why

京东平台在 Worker 窗口中完成登录后仍反复提示"需要登录"，陷入死循环，导致京东平台完全不可用。根因是登录页检测逻辑 `passport.jd.com` 匹配过于宽泛，无法区分"真正的登录入口页"和"登录流程中的中间跳转页"。同时，当前所有平台的登录检测逻辑集中在 `cookie.rs` 一个通用函数中，随着平台数量增长（40+），不具备可扩展性和可维护性。

## What Changes

- 新增 `src-tauri/src/login/` 模块目录，定义 `LoginStrategy` trait 和 `LoginStrategyRegistry` 注册表
- 新增 `src-tauri/src/login/jd.rs` — 京东登录策略（精确路径匹配 + 中间页容忍）
- 新增 `src-tauri/src/login/taobao.rs` — 淘宝登录策略（迁移现有逻辑）
- 新增 `src-tauri/src/login/default.rs` — 通用默认策略（简单平台复用）
- 新增 `src-tauri/src/login/template.rs` — 新平台开发模板
- 修改 `src-tauri/src/cookie.rs` — 删除 `detect_login_redirect`、`is_captcha_page`、`detect_captcha_in_html`、`login_platforms_static`，仅保留 Cookie 数据目录管理
- 修改 `src-tauri/src/lib.rs` — `on_navigation` 增加状态检查；`on_page_load` 调整执行顺序（恢复逻辑优先于登录检测）；URL 纠偏使用 `extract_product_id` 替代硬编码平台判断；空闲检测器改用注册表
- 修改 `src-tauri/src/lib.rs` — `AppState` 新增 `login_registry` 字段
- 修改 `scraper-scripts/jd/index.ts` — 补充京东验证码选择器

## Impact

- Affected specs: `add-jd-scraper`（京东抓取脚本依赖登录恢复逻辑正常工作）
- Affected code: `src-tauri/src/cookie.rs`（大幅缩减）、`src-tauri/src/lib.rs`（核心调度逻辑改造）、`scraper-scripts/jd/index.ts`（补充验证码选择器）
- Rust 后端新增模块 `src-tauri/src/login/`

## ADDED Requirements

### Requirement: 平台登录策略 Trait (LoginStrategy)

系统 SHALL 定义 `LoginStrategy` trait，每个电商平台实现该 trait，封装该平台的所有登录检测逻辑。

#### Trait 方法

| 方法 | 返回类型 | 说明 |
|------|---------|------|
| `platform(&self)` | `&str` | 平台标识（与 `Platform::bundle_name()` 一致） |
| `check_login(&self, url: &str)` | `LoginCheckResult` | 统一入口：判断 URL 属于哪种类型 |
| `extract_product_id(&self, url: &str)` | `Option<String>` | 从商品 URL 提取商品 ID（用于 URL 纠偏） |
| `login_cookie_names(&self)` | `Vec<&str>` | 登录态 Cookie 名称列表（辅助判断） |
| `captcha_selectors(&self)` | `&[&str]` | 验证码 DOM 选择器列表（供前端脚本使用） |

#### LoginCheckResult 枚举

```rust
pub enum LoginCheckResult {
    /// 需要登录——真正的登录入口页
    LoginRequired,
    /// 登录流程中间页——不触发 login-required，等待自动跳转
    LoginIntermediate,
    /// 验证码/安全验证页
    Captcha,
    /// 正常页面（商品页或其他非登录/验证码页）
    Normal,
}
```

#### Scenario: 京东登录页检测

- **WHEN** URL 为 `passport.jd.com/new/login.aspx`
- **THEN** `check_login` 返回 `LoginRequired`

#### Scenario: 京东登录中间页检测

- **WHEN** URL 为 `passport.jd.com/uc/login?ReturnUrl=...` 或其他 `passport.jd.com` 下非登录入口页
- **THEN** `check_login` 返回 `LoginIntermediate`

#### Scenario: 京东商品页检测

- **WHEN** URL 为 `item.jd.com/10012345.html`
- **THEN** `check_login` 返回 `Normal`

### Requirement: 平台登录策略注册表 (LoginStrategyRegistry)

系统 SHALL 提供 `LoginStrategyRegistry`，管理所有平台的登录策略实例。

#### 注册表功能

1. **注册策略**：`register(strategy: Arc<dyn LoginStrategy>)`
2. **按平台获取策略**：`get_strategy(platform: &str) -> Option<&Arc<dyn LoginStrategy>>`
3. **按 URL 检测登录状态**：`check_login(url: &str, platform: &str) -> LoginCheckResult`
4. **按 URL 检测是否需要登录（兼容旧接口）**：`detect_login_redirect(url: &str) -> Option<String>`

#### Scenario: 获取指定平台策略

- **WHEN** 调用 `get_strategy("jd")`
- **THEN** 返回京东登录策略实例

#### Scenario: 未知平台

- **WHEN** 调用 `get_strategy("unknown_platform")`
- **THEN** 返回 `None`，调用方应使用 `Normal` 作为默认行为

### Requirement: 京东登录策略 (JdLoginStrategy)

系统 SHALL 实现京东平台的 `LoginStrategy`，精确区分登录入口页和登录中间页。

#### URL 分类规则

| URL 模式 | 分类 |
|----------|------|
| `passport.jd.com/new/login.aspx`（无 ReturnUrl 参数） | `LoginRequired` |
| `login.jd.com/*` | `LoginRequired` |
| `passport.jd.com` 下其他所有 URL（含 ReturnUrl 参数的、/uc/ 路径等） | `LoginIntermediate` |
| `sec.jd.com`、`verify.jd.com` | `Captcha` |
| `item.jd.com/*`、`item.jd.hk/*` | `Normal` |

#### 商品 ID 提取

从路径中正则匹配 `/(\d+)\.html` 提取商品 ID。

#### 登录 Cookie

`pt_key`、`pt_pin`、`pin`

#### 验证码选择器

`.verify-form`、`#J-VCode`（后续根据实际测试补充）

#### Scenario: 京东登录中间页不触发 login-required

- **WHEN** 用户在京东登录后，页面跳转到 `passport.jd.com/uc/login?ReturnUrl=...`
- **THEN** `check_login` 返回 `LoginIntermediate`，系统不发送 `login-required` 事件，耐心等待自动跳转

### Requirement: 淘宝登录策略 (TaobaoLoginStrategy)

系统 SHALL 实现淘宝平台的 `LoginStrategy`，迁移现有逻辑。

#### URL 分类规则

| URL 模式 | 分类 |
|----------|------|
| `login.taobao.com/*` | `LoginRequired` |
| `sec.taobao.com`、含 `nocaptcha` | `Captcha` |
| `item.taobao.com/*`、`detail.tmall.com/*` | `Normal` |

#### 商品 ID 提取

从查询参数中提取 `id=xxx`（复用现有 `extract_taobao_id` 逻辑）。

#### 登录 Cookie

`_tb_token_`、`cookie2`、`unb`、`sgcookie`

#### 验证码选择器

`#nocaptcha`、`.nc-container`、`#nc_1_n1z`

### Requirement: 通用默认策略 (DefaultLoginStrategy)

系统 SHALL 提供通用默认策略，适用于登录流程简单、无中间页的平台（如拼多多、唯品会、1688）。

#### 设计

- 构造时传入平台名、登录 URL 模式列表、验证码 URL 模式列表
- `check_login` 仅做 URL contains 匹配
- `is_login_intermediate` 默认返回 `LoginIntermediate::false`（无中间页）
- `extract_product_id` 默认返回 `None`

#### Scenario: 简单平台使用默认策略

- **WHEN** 注册拼多多策略 `DefaultLoginStrategy::new("pdd", vec!["login.pinduoduo.com", "yangkeduo.com/login"], vec![])`
- **THEN** 该策略的 `check_login` 对 `login.pinduoduo.com` 返回 `LoginRequired`，对其他 URL 返回 `Normal`

### Requirement: on_navigation 增加状态检查

系统 SHALL 在 `on_navigation` 回调中，当 Worker 已处于 `CaptchaBlocked` 状态时，跳过登录检测，避免登录流程中的中间跳转被重复判定。

#### Scenario: 登录过程中间页不重复触发

- **WHEN** Worker 已处于 `CaptchaBlocked` 状态，页面导航到 `passport.jd.com/uc/login?ReturnUrl=...`
- **THEN** `on_navigation` 不发送 `login-required` 事件，允许导航继续

### Requirement: on_page_load 调整执行顺序

系统 SHALL 在 `on_page_load` 回调中，对已处于 `CaptchaBlocked` 状态的 Worker，**优先执行恢复逻辑**，再执行登录页检测。

#### 执行顺序（改造后）

1. 如果 Worker 已是 `CaptchaBlocked`：
   a. 调用 `registry.check_login(url, platform)` 获取分类
   b. 如果是 `LoginIntermediate` → 打印日志，return（等待自动跳转）
   c. 如果是 `Normal` → 检查商品 ID 是否匹配，匹配则恢复 Working + 重注入，不匹配则纠偏导航
   d. 如果是 `LoginRequired` 或 `Captcha` → 保持 CaptchaBlocked，return
2. 如果 Worker 是正常状态：
   a. 调用 `registry.check_login(url, platform)` 获取分类
   b. 如果是 `LoginRequired` → 设置 CaptchaBlocked + 发送 login-required
   c. 如果是 `Captcha` → 设置 CaptchaBlocked + 发送 captcha-detected
   d. 如果是 `Normal` → 正常注入脚本

#### Scenario: 京东登录完成后恢复

- **WHEN** Worker 处于 `CaptchaBlocked` 状态，京东登录完成跳转回 `item.jd.com/10012345.html`
- **THEN** `on_page_load` 检测到 `Normal` + 商品 ID 匹配，恢复 Worker 为 `Working` 并重注入抓取脚本

#### Scenario: 京东登录中间页等待

- **WHEN** Worker 处于 `CaptchaBlocked` 状态，京东登录后跳转到 `passport.jd.com/uc/login?ReturnUrl=...`
- **THEN** `on_page_load` 检测到 `LoginIntermediate`，不触发任何事件，耐心等待自动跳转

### Requirement: URL 纠偏使用 extract_product_id

系统 SHALL 使用 `LoginStrategy::extract_product_id()` 替代当前 `lib.rs` 中硬编码的 `if pl_platform == "taobao"` 判断，实现平台无关的 URL 纠偏。

#### Scenario: 京东 URL 纠偏

- **WHEN** Worker 处于 `CaptchaBlocked` 恢复流程，当前 URL 为 `item.jd.com/10012345.html?jd_pop=xxx`，预期 URL 为 `item.jd.com/10012345.html`
- **THEN** `extract_product_id` 提取到 `10012345` 与预期一致，判定为同一商品页，恢复 Working 状态（不强制导航）

### Requirement: 空闲检测器改用注册表

系统 SHALL 将空闲检测器中的 `cookie::CookieManager::detect_login_redirect` 和 `is_captcha_page` 调用替换为 `login_registry.check_login`。

#### Scenario: 空闲检测器正确识别中间页

- **WHEN** 空闲检测器检查 Worker 页面 URL 为 `passport.jd.com/uc/login?ReturnUrl=...`
- **THEN** `check_login` 返回 `LoginIntermediate`，空闲检测器不触发 `login-required`，继续等待

### Requirement: 京东脚本补充验证码选择器

系统 SHALL 在 `scraper-scripts/jd/index.ts` 中补充 `CAPTCHA_SELECTORS`，增强前端层面的验证码检测能力。

#### Scenario: 京东验证码前端检测

- **WHEN** 京东页面出现验证码元素（匹配 `.verify-form` 或 `#J-VCode`）
- **THEN** 前端脚本通过 `captcha-detected` 事件通知 Rust 后端

## MODIFIED Requirements

无

## REMOVED Requirements

无
