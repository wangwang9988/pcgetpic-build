# 修复京东登录后 ~10 秒延迟启动抓取（v10） Spec

## Why
京东 Worker 登录成功后，商品详情页已正常显示，但自动滚动约 10 秒后才开始。v8 的 URL 监听脚本不工作。需要找到根因并彻底修复。

## 根因分析（v10 最终版）

### 核心对比：Worker 3 vs 探路者 Worker

| 维度 | Worker 3（新 Worker 直接打开商品页） | 探路者 Worker（登录后） |
|------|------|------|
| 初始状态 | `Working` | `CaptchaBlocked` |
| 导航方式 | 直接导航到 `item.jd.com` | 经历 `login.jd.com` → `passport.jd.com` → `www.jd.com` → `item.jd.com` 重定向链 |
| `on_page_load` 路径 | `InjectBundle`（正常路径） | `CaptchaBlockedResume`（恢复路径） |
| 结果 | 立即滚动 | ~10 秒延迟 |

### 三层根因

**根因 1（最可能）：`on_page_load(Finished)` 延迟触发**

`Finished` 事件对应浏览器的 `load` 事件，必须等待页面**所有子资源**（图片、脚本、iframe 等）加载完毕才触发。京东登录后的商品页可能包含额外的慢加载子资源（如推荐组件 iframe、第三方追踪脚本、个性化内容等），导致 `Finished` 事件延迟约 10 秒。

而 Worker 3 的商品页虽然也有登录态（共享 Cookie），但由于是**直接导航**（非重定向链），页面加载序列不同，子资源加载更快，`Finished` 事件在 1-2 秒内触发。

**验证方式**：在 `on_page_load` 回调中添加时间戳日志，对比 `Started` 和 `Finished` 事件的间隔。

**根因 2：URL 监听脚本缺少 `__TAURI_INTERNALS__` fallback**

当探路者 Worker 登录后先到达 `www.jd.com`（非商品页），`on_page_load(Finished)` 触发 → `InjectUrlWatcher`。URL 监听脚本注入到 `www.jd.com` 页面中，但只使用了 `window.__TAURI__.core.invoke`，没有像 tauri-bridge.ts 那样做 `window.__TAURI_INTERNALS__` 的 fallback。如果 `window.__TAURI__.core` 在外部 URL 的 WebView 中不可用，调用会静默失败。

tauri-bridge.ts 的正确模式：
```typescript
if (window.__TAURI__?.core?.invoke) {
    await window.__TAURI__.core.invoke('command', args);
} else if (window.__TAURI_INTERNALS__) {
    await window.__TAURI_INTERNALS__.invoke('command', args);
}
```

v8 的 URL 监听脚本（缺少 fallback）：
```javascript
window.__TAURI__.core.invoke('url_changed_to_product', { url, workerId })
    .catch(function(e) { console.error(...); });
```

**根因 3：缺少兜底恢复机制**

即使 `on_page_load(Finished)` 延迟触发、URL 监听脚本通信失败，系统也没有从 Rust 侧主动检测 WebView 当前 URL 的兜底机制。Worker 只能被动等待事件，无法主动发现"页面已经在商品页了"。

### 为什么有一次成功

那次京东登录后的重定向链可能直接跳转到 `item.jd.com`（跳过了 `www.jd.com` 中转站），且该次页面子资源加载较快，`Finished` 事件在 1-2 秒内触发，`CaptchaBlockedResume` 立即执行。清空缓存后，京东的重定向行为变化（先到 `www.jd.com`）或子资源加载变慢，导致延迟重现。

## 解决方案

### 修复 1：处理 `PageLoadEvent::Started` 事件（解决根因 1）

在 `on_page_load` 回调中，对 `Started` 事件也执行 CaptchaBlocked 恢复检测逻辑。`Started` 事件在导航开始时触发，不等待子资源加载，可以立即检测到商品页并恢复 Worker。

**关键约束**：`Started` 事件只处理 CaptchaBlocked 恢复路径，正常路径仍等待 `Finished`（因为页面内容尚未加载，提前注入 bundle 可能失败）。

**对用户质疑的回应**：用户指出 Worker 3 立即滚动说明 `Finished` 不慢。这是对的——对于 Worker 3 的场景 `Finished` 确实很快。但探路者 Worker 的场景不同：登录后的商品页有更多子资源，`Finished` 会延迟。处理 `Started` 事件正是为了解决这个差异——在 `Started` 阶段就恢复 Worker 状态，不必等 `Finished`。

### 修复 2：URL 监听脚本添加 `__TAURI_INTERNALS__` fallback（解决根因 2）

按照 tauri-bridge.ts 的模式，添加 `window.__TAURI_INTERNALS__` 的 fallback。

### 修复 3：超时监控器增加 CaptchaBlocked Worker URL 轮询（解决根因 3）

在现有的 `check_timeouts` 函数中，增加对 `CaptchaBlocked` 状态 Worker 的主动 URL 检测：如果 Worker 被 CaptchaBlocked 超过 3 秒，主动获取其 WebView 的当前 URL，如果 URL 匹配商品页模式，立即恢复 Worker。

这是最健壮的兜底机制：
- 不依赖 `on_page_load` 事件
- 不依赖 URL 监听脚本的 JavaScript 通信
- 不论京东使用何种导航方式都能检测到
- 最大延迟 ~4 秒（3 秒等待 + 1 秒轮询间隔）

## What Changes
- **`src-tauri/src/lib.rs`**：`on_page_load` 回调同时处理 `Started` 和 `Finished` 事件
- **`src-tauri/src/worker_handlers.rs`**：URL 监听脚本添加 `__TAURI_INTERNALS__` fallback；`handle_page_load` 函数支持 `Started` 事件处理
- **`src-tauri/src/timeout_monitor.rs`**：增加 CaptchaBlocked Worker URL 轮询检测

## Impact
- Affected code:
  - `src-tauri/src/worker_handlers.rs` — URL 监听脚本、`handle_page_load` 函数
  - `src-tauri/src/lib.rs` — `on_page_load` 回调
  - `src-tauri/src/timeout_monitor.rs` — `check_timeouts` 函数、`TimeoutAction` 枚举

## ADDED Requirements

### Requirement: on_page_load 同时处理 Started 和 Finished 事件
系统 SHALL 在 `on_page_load` 回调中，对 `PageLoadEvent::Started` 事件也执行 CaptchaBlocked 恢复检测逻辑。`Started` 事件只处理 CaptchaBlocked 路径（检测到商品页 URL 时立即恢复 Worker 状态），正常路径仍等待 `Finished`。

#### Scenario: Started 事件检测到商品页
- **WHEN** Worker 处于 CaptchaBlocked 状态
- **AND** `on_page_load(Started)` 事件触发
- **AND** 当前 URL 匹配商品页模式
- **THEN** 立即将 Worker 状态恢复为 Working 并注入 bundle

#### Scenario: Started 事件检测到非商品页
- **WHEN** Worker 处于 CaptchaBlocked 状态
- **AND** `on_page_load(Started)` 事件触发
- **AND** 当前 URL 不匹配商品页模式
- **THEN** 跳过处理，等待 Finished 事件

### Requirement: URL 监听脚本使用 tauri-bridge fallback 模式
系统 SHALL 在 URL 监听脚本中，使用与 tauri-bridge.ts 相同的 fallback 模式：先尝试 `window.__TAURI__.core.invoke`，失败后 fallback 到 `window.__TAURI_INTERNALS__.invoke`。

### Requirement: 超时监控器增加 CaptchaBlocked Worker URL 轮询
系统 SHALL 在超时监控器的 `check_timeouts` 函数中，对处于 CaptchaBlocked 状态超过 3 秒的 Worker，主动获取其 WebView 的当前 URL。如果 URL 匹配商品页模式（`is_still_on_platform_non_product` 返回 false 且 URL 包含平台域名），立即恢复 Worker 状态为 Working 并注入 bundle。

#### Scenario: URL 轮询检测到商品页
- **WHEN** Worker 处于 CaptchaBlocked 状态超过 3 秒
- **AND** WebView 当前 URL 匹配商品页模式
- **THEN** 恢复 Worker 状态为 Working，注入 bundle，发送 captcha-resolved 事件

#### Scenario: URL 轮询检测到非商品页
- **WHEN** Worker 处于 CaptchaBlocked 状态超过 3 秒
- **AND** WebView 当前 URL 不匹配商品页模式
- **THEN** 不做任何操作，继续等待

## MODIFIED Requirements

### Requirement: URL 监听脚本通信方式
v8 只使用 `window.__TAURI__.core.invoke`。现修改为：使用 tauri-bridge fallback 模式。

### Requirement: on_page_load 事件处理
原逻辑：只处理 `Finished` 事件。现修改为：同时处理 `Started` 和 `Finished` 事件。

### Requirement: 超时监控器检测范围
原逻辑：只检测 Working 状态 Worker 的空闲超时和 CaptchaBlocked 状态的 5 分钟超时。现修改为：增加 CaptchaBlocked 状态的 URL 轮询检测（3 秒后开始）。

## REMOVED Requirements
无。
