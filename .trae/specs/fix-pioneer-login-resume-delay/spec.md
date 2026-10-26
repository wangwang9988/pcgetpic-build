# 修复探路者 Worker 登录后延迟启动抓取（修正版）Spec

## Why
探路者 Worker 登录成功后需要等待好几秒才开始滚动抓取，而跟随者 Worker 几乎立即开始。`__LOGIN_PROBE_SKIP__` 修复方向错误——延迟发生在 bundle 注入之前，而非 bundle 执行之后。真正的根因是 `on_page_load` 在 CaptchaBlocked 恢复场景下对"平台非商品页"（如 `www.jd.com` 首页）被动等待自然跳转，但登录后平台通常跳转到首页而非商品页，导致长时间被动等待。

## 根因分析（修正版）

### 为什么 `__LOGIN_PROBE_SKIP__` 方向是错的

`__LOGIN_PROBE_SKIP__` 解决的是 bundle 执行后 `probeAndReportLogin` 的误判问题。但延迟发生在 bundle 注入**之前**——`on_page_load` 还没走到注入 bundle 的步骤就已经 return 了。所以无论 `__LOGIN_PROBE_SKIP__` 是否生效，都无法解决延迟。

### 真正的根因：`is_still_on_platform_non_product` 被动等待

京东登录后的跳转链路：
```
login.jd.com → passport.jd.com → www.jd.com（首页）→ ???
```

当 `on_page_load` 在 `www.jd.com` 触发时：
1. `check_login` 返回 `Normal`（`www.jd.com` 不是登录页）
2. `is_still_on_platform_non_product` 返回 `true`（`www.jd.com` 不是 `item.jd.com`）
3. 代码执行 `return`——**被动等待自然跳转到商品页**

但问题是：**京东登录后永远不会自动跳转到商品页**！它跳转到首页就停了。探路者 Worker 只能等待后续的某种机制（如看门狗超时、页面内 JS 跳转等）才能恢复。

### 与跟随者 Worker 的对比

跟随者 Worker 的路径：
```
force_start_worker → location.href = 'item.jd.com/xxx.html' → on_page_load Finished → 注入 bundle → 滚动
```

跟随者**直接导航到商品页**，没有中间页跳转，所以几乎立即开始抓取。

### 延迟分解

| 阶段 | 探路者 | 跟随者 |
|------|--------|--------|
| 中间页跳转（passport.jd.com） | 1-3 秒 | **无** |
| 首页被动等待（www.jd.com） | **3-10+ 秒** | **无** |
| 商品页加载到 Finished | 2-4 秒 | 2-4 秒 |
| Bundle 执行到滚动开始 | ~0 秒 | ~0 秒 |
| **总延迟** | **6-17+ 秒** | **2-4 秒** |

## What Changes
- **`is_still_on_platform_non_product` 分支：主动导航到目标商品 URL**：当 CaptchaBlocked 恢复场景检测到"平台非商品页"时，不再被动等待，而是主动 `location.href` 导航到 `pl_expected_url`（目标商品页 URL），与跟随者 Worker 的处理方式一致

## Impact
- Affected code:
  - `src-tauri/src/lib.rs` — `on_page_load` 的 `is_still_on_platform_non_product` 分支

## ADDED Requirements

### Requirement: CaptchaBlocked 恢复场景下主动导航到商品页
系统 SHALL 在 CaptchaBlocked 恢复场景中，当检测到当前页面是"平台非商品页"（`is_still_on_platform_non_product = true`）时，主动导航到目标商品 URL（`pl_expected_url`），而非被动等待自然跳转。

#### Scenario: 京东登录后跳转到首页时主动导航
- **WHEN** Worker 从 CaptchaBlocked 恢复，当前 URL 为 `www.jd.com`（非商品页）
- **THEN** `on_page_load` 执行 `location.href = 'item.jd.com/xxx.html'` 主动导航到商品页
- **AND** 后续 `on_page_load` 在商品页触发时正常注入 bundle

#### Scenario: 淘宝登录后跳转到首页时主动导航
- **WHEN** Worker 从 CaptchaBlocked 恢复，当前 URL 为 `www.taobao.com`（非商品页）
- **THEN** `on_page_load` 执行 `location.href = 'item.taobao.com/xxx.html'` 主动导航到商品页

#### Scenario: LoginIntermediate 中间页保持被动等待
- **WHEN** Worker 从 CaptchaBlocked 恢复，当前 URL 为 `passport.jd.com`（中间页）
- **THEN** `on_page_load` 保持现有逻辑被动等待（中间页需要完成 SSO Cookie 写入，强制打断可能破坏登录态）

## MODIFIED Requirements

### Requirement: on_page_load 的 is_still_on_platform_non_product 分支
原有逻辑：被动等待自然跳转（`return`）。现修改为：主动导航到目标商品 URL（`location.href = pl_expected_url`），然后 `return`。

## REMOVED Requirements
无
