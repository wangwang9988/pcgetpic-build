# 修复防拥堵机制失效——等待页脚本注入导致跟随者自我释放 Spec

## Why
防拥堵登录验证机制完全失效：并发数=2 时，同平台的两个 Worker 同时打开且都需要登录，WaitingForLogin 状态形同虚设。根因是 `on_page_load` 回调未检查 WaitingForLogin 状态，将 scraper 脚本注入到等待页面，导致两种灾难性后果：
1. **快速路径**：scraper 各模块启动时发送的空数组被 `scrape-data` 判定为"新数据"，触发探路者验证+释放机制——WaitingForLogin 的 Worker 自己释放了自己
2. **慢速路径**：scraper 的 `Gt()` 完成判定计时器 15 秒后调用 `complete_task`，任务被静默吞噬，Worker 重置为 Idle 后取出队列中下一个同平台任务，再次 WaitingForLogin → 再次注入 → 循环吞噬所有排队任务

## 根因链路详解（逐帧回放）

```
T=0ms   dispatch_to_idle_workers() 正确分配：
        Worker 0 → tb1 (Working)  ✅
        Worker 1 → tb2 (WaitingForLogin)  ✅

T=0ms   Worker 0 创建窗口 → 淘宝商品页 → 重定向到登录页 → CaptchaBlocked

T=1000ms Worker 1 创建窗口 → WebviewUrl::App("index.html?page=waiting&...")
        → on_page_load 触发
        → ❌ 未检查 WaitingForLogin 状态，直接走"正常 Worker"分支
        → 注入 scraper bundle 到等待页

T≈2s    淘宝 scraper bundle 在等待页全力运行：
        → tbGetMain: 轮询 DOM 搜索 #picGalleryEle... 找不到
        → tbGetSku: 搜索 #skuOptionsArea... 找不到
        → tbGetDetail: 搜索 #content... 找不到
        → Gt() 完成判定计时器启动 (maxWaitMs=15s)

        【快速路径】scraper 各模块启动时发送空数组:
        → tauriBridge.send('MainPic', [])
        → scrape-data 事件 → is_new_value = true
        → mark_platform_verified("taobao") → 释放 Worker 1 自身
        → Worker 1 跳转到淘宝登录页
        → 结果：两个 Worker 同时打开淘宝登录页

        【慢速路径】若快速路径未触发（空数组被去重跳过）:
T≈16s   → Gt() 判定"15秒未产出数据，任务完成"
        → complete_task(worker_id=1) → Worker 1 状态: Idle
        → window.close() → 等待页窗口关闭
        → do_dispatch() → Worker 1 取 tb3 → 再次 WaitingForLogin → 循环吞噬
```

## What Changes
- **`on_page_load` 增加 WaitingForLogin 早退守卫**（核心修复）：当 Worker 处于 WaitingForLogin 状态时，`on_page_load` 必须跳过所有处理（不检测登录、不做 URL 纠偏、不注入脚本），直接 return
- **`on_navigation` 增加 WaitingForLogin 放行守卫**（加固修复）：当 Worker 处于 WaitingForLogin 状态时，`on_navigation` 不改变 Worker 状态，仅放行导航
- **`scrape-data` 事件处理器增加防御性检查**（纵深防御）：即使脚本被意外注入，也不允许 WaitingForLogin 状态的 Worker 触发平台验证和释放机制
- **`active_platforms` 计算纳入 WaitingForLogin**（调度完整性）：`dispatch_to_idle_workers` 中 `active_platforms` 应同时统计 WaitingForLogin 状态的 Worker，防止后续调度绕过防拥堵

## Impact
- Affected specs: fix-waiting-worker-bugs（上一轮修复的延续）
- Affected code:
  - `src-tauri/src/lib.rs` — `on_page_load` 守卫、`on_navigation` 守卫、`scrape-data` 防御性检查
  - `src-tauri/src/worker_pool.rs` — `active_platforms` 计算逻辑

## ADDED Requirements

### Requirement: on_page_load WaitingForLogin 早退守卫
系统 SHALL 在 `on_page_load` 回调中，当检测到 Worker 处于 `WaitingForLogin` 状态时，跳过所有处理逻辑（登录检测、URL 纠偏、脚本注入），直接 return。等待页面不需要任何脚本注入，其跳转完全由 Rust 后端在探路者验证成功后通过 `location.href` 导航实现。

#### Scenario: 等待页加载时不注入脚本
- **WHEN** Worker 处于 `WaitingForLogin` 状态且页面加载完成
- **THEN** `on_page_load` 打印日志"WaitingForLogin 状态，跳过所有处理"并直接 return，不执行任何登录检测、URL 纠偏或脚本注入

#### Scenario: 等待页不会在 15 秒后自动关闭
- **WHEN** Worker 处于 `WaitingForLogin` 状态且等待页面已加载超过 15 秒
- **THEN** 等待页面窗口依然存活，不会因 bundle 的 Gt() 完成判定而被 complete_task 关闭

#### Scenario: 正常 Worker 不受影响
- **WHEN** Worker 处于 `Working` 或 `CaptchaBlocked` 状态
- **THEN** `on_page_load` 按现有逻辑正常执行

### Requirement: on_navigation WaitingForLogin 放行守卫
系统 SHALL 在 `on_navigation` 回调中，当检测到 Worker 处于 `WaitingForLogin` 状态时，不改变 Worker 状态（不设 CaptchaBlocked），仅放行导航（return true）。防止等待页面内的 URL 变更（如 Vue 路由切换、自动唤醒时的 location.href）被误判为登录/验证码。

#### Scenario: 等待页导航不触发状态变更
- **WHEN** Worker 处于 `WaitingForLogin` 状态且发生导航
- **THEN** `on_navigation` 不改变 Worker 状态，不发送 login-required/captcha-detected 事件，仅放行导航

### Requirement: scrape-data 事件处理器防御性检查
系统 SHALL 在 `scrape-data` 事件处理器中，当发现产出数据的 Worker 处于 `WaitingForLogin` 状态时，跳过平台验证和释放机制。这作为纵深防御，即使脚本被意外注入也不会导致自我释放或任务吞噬。

#### Scenario: WaitingForLogin Worker 产出数据不触发释放
- **WHEN** `scrape-data` 事件由 WaitingForLogin 状态的 Worker 触发
- **THEN** 处理器仅更新数据变化时间，不执行 `mark_platform_verified` 和 `get_waiting_workers_for_platform` 逻辑

#### Scenario: 正常 Worker 产出数据正常触发释放
- **WHEN** `scrape-data` 事件由 Working 状态的 Worker 触发
- **THEN** 处理器按现有逻辑执行平台验证和释放机制

### Requirement: active_platforms 纳入 WaitingForLogin 状态
系统 SHALL 在 `dispatch_to_idle_workers` 的 `active_platforms` 计算中，同时统计 `WaitingForLogin` 状态的 Worker 所属平台。这确保了：当探路者 Worker 完成任务后，新 Idle Worker 取到同平台任务时，如果跟随者仍处于 WaitingForLogin（尚未被释放），新 Worker 也会进入 WaitingForLogin 而非直接 Working。

#### Scenario: WaitingForLogin Worker 阻止同平台新 Worker
- **WHEN** 平台 A 已有一个 WaitingForLogin 状态的 Worker
- **THEN** 后续调度时平台 A 的 `has_active_worker = true`，新 Worker 也进入 WaitingForLogin

## MODIFIED Requirements

### Requirement: on_page_load 回调处理逻辑
原有逻辑仅区分 CaptchaBlocked 和正常状态，现增加 WaitingForLogin 作为第三种分支，优先级最高（最先检查，在 was_captcha_blocked 检查之前）。

### Requirement: on_navigation 回调处理逻辑
原有逻辑仅区分 CaptchaBlocked 和正常状态，现增加 WaitingForLogin 作为第三种分支，在 already_blocked 检查之前。

### Requirement: dispatch_to_idle_workers 的 active_platforms 计算
原有逻辑仅统计 Working 和 CaptchaBlocked 状态，现扩展为同时统计 WaitingForLogin 状态。

## REMOVED Requirements
无
