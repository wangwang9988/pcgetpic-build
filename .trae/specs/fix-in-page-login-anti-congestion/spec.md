# 修复页面内嵌登录平台防拥堵失效 Spec

## Why
淘宝等使用页面内嵌登录浮层（QR码扫码、账号密码表单）的平台，防拥堵机制完全失效。并发数=2时，两个淘宝 Worker 同时打开且都需要登录。根因是 URL 级别的 `check_login` 无法检测页面内嵌登录，导致 Worker 保持 Working 状态 → scraper 产出数据 → 平台被过早验证 → WaitingForLogin Worker 被错误释放。

京东防拥堵正常工作，是因为京东未登录时**一定会跳转到 `login.jd.com`**，`check_login` 能准确检测，Worker 进入 CaptchaBlocked，不产出数据，平台不被验证。

## 根因链路对比

### 京东场景（防拥堵生效 ✅）
```
Worker 0: item.jd.com → 跳转 login.jd.com → check_login=LoginRequired
→ CaptchaBlocked → 爬虫不注入 → 无数据 → 平台不验证 → Worker 1 持续等待
```

### 淘宝场景（防拥堵失效 ❌）
```
Worker 0: item.taobao.com → 不跳转，URL不变 → check_login=Normal ❌
→ Working → 爬虫注入 → 产出数据(productTitle等) → 平台验证 → Worker 1 被释放
→ Worker 1 也需要登录 ❌
```

### 三层根因叠加

| 层级 | 问题 | 代码位置 | 影响 |
|------|------|----------|------|
| **L1 登录检测** | 淘宝 `check_login` 仅检测 2 种 URL 模式，无法识别页面内嵌登录浮层 | [login/taobao.rs:12-22](file:///d:/Trae/PcGetPic/src-tauri/src/login/taobao.rs#L12-L22) | Worker 保持 Working，爬虫被注入 |
| **L2 验证逻辑** | 仅凭"有数据产出"就标记平台为已验证，未校验数据质量（空数组、元数据也能触发） | [lib.rs:1108-1140](file:///d:/Trae/PcGetPic/src-tauri/src/lib.rs#L1108-L1140) | productTitle 等元数据即可触发验证 |
| **L3 扩展性** | 无共享登录检测机制，新平台需从零实现 | `scraper-scripts/shared/` | 唯品会、当当等平台重复造轮子 |

## What Changes
- **数据质量门控**（核心修复，平台无关）：`scrape-data` 处理器中，仅当数据 key 为实质性类型（MainPic/DetailPic/SkuPic/VideoInfo/VideoUrls）且值为非空数组时，才触发平台验证。空数组和元数据（productTitle/productLink/productId/visitTime）不触发验证
- **Scraper 端登录探针**（增强修复，可扩展）：在 `scraper-scripts/shared/` 新增 `loginProbe.ts` 共享模块，提供通用登录检测模式。各平台 scraper 在启动时调用，检测到登录时发送 `LoginRequired` 事件并提前退出。后端处理 `LoginRequired` 事件将 Worker 设为 CaptchaBlocked
- **完善淘宝 `check_login`**（补充修复）：增加 `login.tmall.com`、`passport.taobao.com` 等 URL 模式检测

## Impact
- Affected specs: fix-waiting-worker-premature-release（上一轮修复的延续）
- Affected code:
  - `src-tauri/src/lib.rs` — `scrape-data` 处理器增加数据质量门控和 LoginRequired 事件处理
  - `scraper-scripts/shared/loginProbe.ts` — 新增共享登录探针模块
  - `scraper-scripts/taobao/index.ts` — 集成登录探针
  - `scraper-scripts/jd/index.ts` — 集成登录探针
  - `src-tauri/src/login/taobao.rs` — 完善 check_login

## ADDED Requirements

### Requirement: 数据质量门控——仅实质性数据触发平台验证
系统 SHALL 在 `scrape-data` 事件处理器中，仅当数据 key 属于实质性类型集合（MainPic、DetailPic、SkuPic、VideoInfo、VideoUrls）且值为非空数组时，才执行平台验证和释放逻辑。空数组、元数据（productTitle、productLink、productId、visitTime）和其他非实质性数据仅更新数据变化时间，不触发 `mark_platform_verified` 和 `get_waiting_workers_for_platform`。

#### Scenario: 实质性数据触发平台验证
- **WHEN** `scrape-data` 事件的 key 为 `MainPic` 且 value 为非空数组 `["https://img.alicdn.com/..."]`
- **THEN** 处理器执行平台验证和释放逻辑

#### Scenario: 空数组不触发平台验证
- **WHEN** `scrape-data` 事件的 key 为 `MainPic` 且 value 为空数组 `[]`
- **THEN** 处理器仅更新数据变化时间，不执行平台验证和释放逻辑

#### Scenario: 元数据不触发平台验证
- **WHEN** `scrape-data` 事件的 key 为 `productTitle` 且 value 为 `"商品标题"`
- **THEN** 处理器仅更新数据变化时间，不执行平台验证和释放逻辑

#### Scenario: WaitingForLogin 状态守卫仍然生效
- **WHEN** Worker 处于 WaitingForLogin 状态且收到实质性数据
- **THEN** 处理器跳过平台验证和释放机制（现有守卫不受影响）

### Requirement: Scraper 端登录探针——共享模块
系统 SHALL 在 `scraper-scripts/shared/loginProbe.ts` 中提供共享登录探针模块，包含通用登录检测模式。各平台 scraper 在启动时调用 `detectLogin()` 函数，如果检测到登录需求，发送 `tauriBridge.send('LoginRequired', { reason: '...' })` 并提前退出。

#### Scenario: 检测到登录浮层
- **WHEN** 页面存在登录浮层元素（如 QR 码、登录表单）
- **THEN** `detectLogin()` 返回 `{ needsLogin: true, reason: '...' }`，scraper 发送 LoginRequired 事件并停止

#### Scenario: 未检测到登录
- **WHEN** 页面不存在登录浮层元素
- **THEN** `detectLogin()` 返回 `{ needsLogin: false }`，scraper 继续正常抓取

### Requirement: LoginRequired 事件后端处理
系统 SHALL 在 `scrape-data` 事件处理器中，当收到 key 为 `LoginRequired` 的事件时，将对应 Worker 状态设为 CaptchaBlocked，取消该平台的验证状态，并发送 `login-required` UI 事件。

#### Scenario: Scraper 报告需要登录
- **WHEN** `scrape-data` 事件的 key 为 `LoginRequired`
- **THEN** Worker 状态设为 CaptchaBlocked，平台取消验证，发送 login-required UI 事件

### Requirement: 淘宝 check_login 增强
系统 SHALL 在淘宝登录策略中增加对 `login.tmall.com` 和 `passport.taobao.com` 域名的检测，返回 LoginRequired 或 LoginIntermediate。

#### Scenario: 天猫登录页检测
- **WHEN** URL 包含 `login.tmall.com`
- **THEN** `check_login` 返回 `LoginRequired`

#### Scenario: 淘宝 passport 中间页检测
- **WHEN** URL 包含 `passport.taobao.com`
- **THEN** `check_login` 返回 `LoginIntermediate`

## MODIFIED Requirements

### Requirement: scrape-data 事件处理器的平台验证触发条件
原有逻辑：任何 `is_new_value` 事件都触发平台验证。现修改为：仅实质性数据（key 属于 MainPic/DetailPic/SkuPic/VideoInfo/VideoUrls 且 value 为非空数组）触发平台验证，LoginRequired 事件触发 CaptchaBlocked 状态转换。

### Requirement: 淘宝登录策略的 check_login 方法
原有逻辑仅检测 `sec.taobao.com`、`nocaptcha`、`login.taobao.com` 三种模式。现扩展为同时检测 `login.tmall.com`、`passport.taobao.com` 等模式。

## REMOVED Requirements
无

## 架构设计：为什么不需要每个平台单独管理防拥堵

```
┌─────────────────────────────────────────────────────────────┐
│                    防拥堵机制（平台无关）                      │
│  dispatch_to_idle_workers / verified_platforms / release     │
│  ─── 所有平台共用，无需任何平台特定代码 ───                    │
└────────────────────────┬────────────────────────────────────┘
                         │ 依赖
┌────────────────────────▼────────────────────────────────────┐
│              登录检测（平台特定，但架构统一）                   │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  URL 级检测       │  │  DOM 级检测       │                 │
│  │  LoginStrategy   │  │  loginProbe.ts   │                 │
│  │  trait (Rust)    │  │  (TypeScript)    │                 │
│  │                  │  │                  │                 │
│  │  taobao.rs       │  │  shared/         │ ← 通用模式      │
│  │  jd.rs           │  │  loginProbe.ts   │   所有平台复用   │
│  │  default.rs      │  │                  │                 │
│  │  (未来: vip.rs)  │  │  各平台 scraper  │ ← 平台特有模式   │
│  │                  │  │  可追加自定义检测 │   按需扩展       │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐                                        │
│  │  数据质量门控     │ ← 平台无关，自动生效                    │
│  │  (Rust 后端)     │   新平台无需任何配置                     │
│  └──────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘
```

**新平台接入流程（如唯品会）**：
1. 创建 `login/vip.rs` 实现 `LoginStrategy` trait（URL 级检测）
2. 创建 `scraper-scripts/vip/index.ts`，import `loginProbe` 并调用（DOM 级检测）
3. 数据质量门控自动生效，无需任何额外代码
4. 防拥堵机制自动生效，无需任何额外代码
