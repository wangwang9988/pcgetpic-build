# 紧急回滚：修复 RedirectToUrl 导致 Worker 无响应的严重 BUG

## Why

上一轮修改将 `is_still_on_platform_non_product` 分支从 Skip 改为 RedirectToUrl（主动导航），导致更严重的 BUG：

**现象**：
- 6 个链接（4 淘宝 + 2 京东），并发 2
- Worker 0 和 Worker 1 弹出，Worker 1 显示"防止拥堵"（WaitingForLogin）
- 在 Worker 0 输入账号密码登录成功后，Worker 1 开始显示内容
- **Worker 0 直接无响应（卡死）**
- **Worker 1 显示页面但无任何滚动**
- **登录好久看门狗也没有出现**

## 根因分析：无限导航循环

### 导航循环链路

```
T0: CaptchaBlocked 状态下到达非商品页（如 www.taobao.com）
    → check_login = Normal, is_still_on_platform_non_product = true
    → RedirectToUrl { url: item.taobao.com/xxx.html }
T1: 浏览器导航到 item.taobao.com
    → Cookie 尚未完全同步，商品页重定向到 login.taobao.com 或 www.taobao.com
T2: on_page_load 触发（URL 为 www.taobao.com）
    → check_login = Normal, is_still_on_platform_non_product = true
    → RedirectToUrl { url: item.taobao.com/xxx.html }  ← 又来了！
T3: 回到 T1 → T2 → T3 ... 无限循环！
```

### 为什么 Worker 0 卡死而 Worker 1 也受影响

Worker 0 的 WebView 陷入 `location.href` 无限循环：
- 每次 `location.href` 都会触发页面加载
- 页面加载触发 `on_page_load`
- `on_page_load` 再次执行 `location.href`
- **WebView 永远无法完成一次完整的加载周期**

Worker 1 受影响的原因：
- Worker 0 的无限循环占用大量 CPU 和网络资源
- 系统资源被耗尽，Worker 1 无法正常工作

### 为什么看门狗没有出现

看门狗的超时检测逻辑在 [lib.rs:277-280](file:///d:/Trae/PcGetPic/src-tauri/src/lib.rs#L277-L280) 中对 `CaptchaBlocked` 和 `WaitingForLogin` 状态跳过检测。Worker 0 处于 CaptchaBlocked 状态时，看门狗不会强制清理它。

### 为什么之前的主动导航方案（Gemini implementation_plan.md）没有这个问题？

Gemini 方案的前提假设是：**登录完成后到达的非商品页是最终着陆页（如 www.jd.com），导航到商品页后会稳定停留在商品页**。

但实际上，当 Cookie 未同步时，商品页可能**重定向回非商品页**，形成循环。Gemini 方案没有考虑这种边界情况。

## What Changes

**紧急回滚**：将 `is_still_on_platform_non_product` 分支从 `RedirectToUrl` 改回 `Skip`（被动等待）。

这是唯一安全的做法。虽然会有几秒延迟，但系统不会崩溃。

## Impact

- Affected code:
  - `src-tauri/src/worker_handlers.rs` — `handle_page_load` 函数第 199-207 行（恢复为 Skip）

## MODIFIED Requirements

### Requirement: on_page_load 的 is_still_on_platform_non_product 分支

**回滚为原始行为**：被动等待自然跳转（`return PageLoadAction::Skip`）。

#### Scenario: 任何平台登录后经过中间页

- **WHEN** Worker 从 CaptchaBlocked 恢复，`check_login` 返回 Normal，`is_still_on_platform_non_product` 返回 true
- **THEN** `on_page_load` 执行 Skip（被动等待）
- **AND** 不注入任何导航脚本
- **AND** 等待平台自然跳转到商品页
- **AND** 可能存在几秒延迟（可接受）

#### Scenario: 防止无限循环

- **WHEN** 目标商品页因 Cookie 未同步而重定向回非商品页
- **THEN** 不会形成无限导航循环（因为没有注入任何导航脚本）
- **AND** Worker 正常等待自然跳转

## ADDED Requirements

无新增需求。

## REMOVED Requirements

无。
