# 静默超时合理性评估与修复 Spec

## Why
当前静默超时默认 7 秒，用户担心该值是否会被淘宝等电商平台识别为爬虫行为。同时需要验证 UI 提供的 5/7/10/15 秒选项是否在后端真正生效，以及是否存在实现缺陷。

## 调查结论

### 1. 端到端实现完整性：✅ 基本完整

数据流验证：
```
用户选择 5/7/10/15 → taskQueueStore.idleTimeout
    ↓ invoke('set_scraping_config', { idleTimeout })
AppState.idle_timeout = idle_timeout (u64)
    ↓
    ├─→ timeout_monitor.rs: Duration::from_secs(s.idle_timeout)  ← 直接读取
    └─→ dispatch.rs: idle_timeout_ms = s.idle_timeout * 1000
         └─→ window.__IDLE_TIMEOUT_MS__ = {idle_timeout_ms}
              └─→ scraper 脚本读取并使用
```

四个可选值（5/7/10/15）在 Rust 后端被完全尊重，没有硬编码覆盖。

### 2. 发现的 Bug：🔴 CaptchaBlockedRecovery 重新注入时丢失 `__IDLE_TIMEOUT_MS__`

**位置**: [timeout_monitor.rs:369-372](file:///d:/Trae/PcGetPic/src-tauri/src/timeout_monitor.rs#L369-L372)

当验证码恢复后重新注入脚本时，注入代码为：
```rust
let inject_script = format!(
    "window.__WORKER_TASK_ID__ = '{}'; window.__WORKER_ID__ = {}; \
     window.__SCRAPER_INJECTED__ = false; {} {}; window.__SCRAPER_INJECTED__ = true;",
    task_id, worker_id, login_probe_script, bundle
);
```

**缺少 `window.__IDLE_TIMEOUT_MS__ = {};`**，导致恢复后 scraper 脚本回退到 `?? 7000` 硬编码默认值，用户配置的超时值失效。

### 3. 发现的缺陷：🟡 Rust 端缺少值域校验

**位置**: [commands.rs:186-193](file:///d:/Trae/PcGetPic/src-tauri/src/commands.rs#L186-L193)

`set_scraping_config` 直接赋值 `state.idle_timeout = idle_timeout`，没有最小值/最大值限制。虽然 UI 层限制了 5-15，但 IPC 可直接传入 0 或极大值。

### 4. 静默超时合理性评估

#### 7 秒默认值：✅ 合理且安全

| 分析维度 | 评估 |
|---------|------|
| **反爬检测风险** | 低。静默超时是"等待多久无新数据后判定完成"的内部逻辑，不产生额外的网络请求，平台无法直接感知此参数 |
| **窗口生命周期频率** | 7 秒静默 + 页面加载 ≈ 10-15 秒/任务，窗口创建频率约 4-6 次/分钟/Worker，在正常浏览行为范围内 |
| **数据完整性** | 7 秒足够等待异步渲染（SKU 图懒加载、视频 URL 延迟出现），同时不会过度等待 |
| **与 `waitForCompletion` 的配合** | 前端 `imageDataIdleMs=7000` + `maxWaitMs=max(14000, 15000)=15000`，Rust 端 `idle_timeout=7` + `no_data_limit=19`，形成合理的双层保护 |

#### 5 秒选项：⚠️ 有风险

- 无数据超时仅 15 秒（`5*2+5`），对慢速网络或需要多次重定向的页面可能不够
- 高并发（3-4 Worker）时窗口创建频率可达 8-12 次/分钟/Worker，可能触发平台行为基线检测
- **建议**：保留选项但增加警告提示

#### 10/15 秒选项：✅ 安全但降低效率

- 更长的等待时间意味着更低的窗口创建频率，反爬风险更低
- 代价是整体抓取速度下降，对批量任务影响明显

#### 核心结论：反爬检测的真正风险不在超时值

电商平台检测爬虫的主要手段是：
1. **请求频率/IP 维度**：同一 IP 短时间大量请求 → 本项目每 Worker 一次只访问一个页面，风险可控
2. **浏览器指纹**：WebView 的 UA/Canvas/WebGL 指纹 → 与超时无关
3. **Cookie/登录态异常**：无 Cookie 访问需登录的页面 → 已有登录策略处理
4. **行为模式**：无鼠标移动/滚动/点击 → **这才是真正风险点**，但与超时值无关

**静默超时值本身不会被平台检测到**，因为它纯粹是客户端内部的计时逻辑，不产生任何网络行为。

## What Changes

- **修复 Bug**: CaptchaBlockedRecovery 重新注入时补充 `__IDLE_TIMEOUT_MS__` 变量
- **增强健壮性**: Rust 端 `set_scraping_config` 增加 `idle_timeout` 值域校验（clamp 3-60）
- **优化 UX**: 5 秒选项增加风险提示说明
- **调整默认推荐**: 将 UI 推荐标签从 "7秒 (推荐)" 改为 "7秒 (推荐·安全)"，5 秒标注 "5秒 (快速·有风险)"

## Impact

- Affected code:
  - `src-tauri/src/timeout_monitor.rs` — 修复 CaptchaBlockedRecovery 注入
  - `src-tauri/src/commands.rs` — 增加值域校验
  - `src/components/ControlBar.vue` — 优化选项标签文案

## ADDED Requirements

### Requirement: CaptchaBlockedRecovery 保留超时配置

系统 SHALL 在验证码恢复后重新注入脚本时，将当前 `idle_timeout` 值通过 `window.__IDLE_TIMEOUT_MS__` 传递给 WebView，确保恢复后的 scraper 脚本使用用户配置的超时值而非硬编码默认值。

#### Scenario: 验证码恢复后超时值一致
- **WHEN** Worker 从 CaptchaBlocked 状态恢复并重新注入脚本
- **THEN** `window.__IDLE_TIMEOUT_MS__` 应等于 `AppState.idle_timeout * 1000`
- **AND** scraper 脚本的 `idleTimeoutMs` 应与用户配置一致

### Requirement: idle_timeout 值域校验

系统 SHALL 在 `set_scraping_config` 命令中对 `idle_timeout` 参数进行值域校验，限制范围为 3-60 秒，超出范围时自动 clamp 到边界值。

#### Scenario: 传入极端值
- **WHEN** 通过 IPC 传入 `idle_timeout = 0`
- **THEN** 实际存储值应为 3
- **WHEN** 通过 IPC 传入 `idle_timeout = 100`
- **THEN** 实际存储值应为 60

### Requirement: 超时选项风险提示

系统 SHALL 在 UI 的超时选项中为 5 秒选项标注风险提示，帮助用户理解短超时的潜在问题。

#### Scenario: 用户查看超时选项
- **WHEN** 用户展开静默超时下拉框
- **THEN** 5 秒选项应显示 "5秒 (快速·有风险)" 提示
- **AND** 7 秒选项应显示 "7秒 (推荐·安全)" 提示

## MODIFIED Requirements

### Requirement: CaptchaBlockedRecovery 脚本注入

原实现仅注入 `__WORKER_TASK_ID__`、`__WORKER_ID__`、`__SCRAPER_INJECTED__`，现需同时注入 `__IDLE_TIMEOUT_MS__`。
