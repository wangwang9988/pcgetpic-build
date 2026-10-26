# 重构 lib.rs：按关注点拆分防拥堵与 Worker 生命周期逻辑 Spec

## Why
`lib.rs` 已膨胀至约 1500 行，其中防拥堵与 Worker 生命周期相关代码约 700+ 行散布在 6 个回调/事件处理器中。所有逻辑耦合在一个文件里，修改任何一处都有引入全局 BUG 的风险（如之前的 CaptchaBlocked 主动导航死循环）。需要按关注点拆分为独立模块，使 lib.rs 成为薄编排层。

## 核心设计原则

### ❌ 错误方向：按平台拆分
防拥堵调度、数据质量门控、探路者释放等逻辑是**平台无关的通用基础设施**。按平台拆分会导致大量重复代码，且新平台接入时需要复制粘贴。

### ✅ 正确方向：按关注点拆分
- **`congestion.rs`**：防拥堵核心逻辑（平台验证、跟随者释放、数据质量门控）
- **`worker_handlers.rs`**：on_navigation + on_page_load 回调逻辑（登录检测、CaptchaBlocked 恢复、URL 纠偏、bundle 注入）
- **`scrape_handler.rs`**：scrape-data 事件处理逻辑（LoginRequired 处理、实质性数据判定、探路者释放触发）
- **`timeout_monitor.rs`**：后台超时监控线程（正常超时、数据保护、登录等待超时）

平台特定逻辑**继续留在 `login/` 模块**（LoginStrategy trait + 各平台实现），无需任何改动。

## What Changes
- 新增 `src-tauri/src/congestion.rs`：防拥堵核心逻辑模块
- 新增 `src-tauri/src/worker_handlers.rs`：on_navigation + on_page_load 回调逻辑模块
- 新增 `src-tauri/src/scrape_handler.rs`：scrape-data 事件处理逻辑模块
- 新增 `src-tauri/src/timeout_monitor.rs`：后台超时监控线程模块
- 修改 `src-tauri/src/lib.rs`：从 1500 行缩减为薄编排层（约 300-400 行），仅保留 AppState 定义、do_dispatch 骨架、Tauri command 函数和 run() 入口

## Impact
- Affected code:
  - `src-tauri/src/lib.rs` — 大幅缩减，变为编排层
  - `src-tauri/src/worker_pool.rs` — 无改动
  - `src-tauri/src/login/` — 无改动
  - 新增 4 个文件

## ADDED Requirements

### Requirement: congestion.rs 防拥堵核心逻辑模块
系统 SHALL 将防拥堵核心逻辑封装为独立模块，提供以下公共 API：

```rust
pub struct CongestionManager;

impl CongestionManager {
    /// 判定数据是否为实质性数据（仅 MainPic/DetailPic/SkuPic/VideoInfo/VideoUrls 且非空数组）
    pub fn is_substantial_data(key: &str, value: &serde_json::Value) -> bool;

    /// 处理探路者产出实质性数据后的平台验证与跟随者释放
    /// 返回需要释放的 Worker 列表 (worker_id, url, task_id, platform)
    pub fn handle_pioneer_data(
        pool: &mut WorkerPool,
        worker_id: usize,
        data_key: &str,
        data_value: &serde_json::Value,
    ) -> Vec<(usize, String, String, String)>;

    /// 处理 LoginRequired 事件：设置 Worker 为 CaptchaBlocked + unverify 平台
    /// 返回 (worker_id, platform, task_id) 用于前端事件通知
    pub fn handle_login_required(
        pool: &mut WorkerPool,
        task_id: &str,
    ) -> Option<(usize, String, String)>;

    /// 处理跟随者释放后的导航
    pub fn navigate_released_workers(
        app: &AppHandle,
        released: &[(usize, String, String, String)],
    );
}
```

### Requirement: worker_handlers.rs 回调逻辑模块
系统 SHALL 将 on_navigation 和 on_page_load 回调逻辑封装为独立模块，提供以下公共 API：

```rust
/// on_navigation 回调的返回值
pub enum NavigationAction {
    Allow,      // 允许导航
    Deny,       // 拒绝导航
}

/// 处理 on_navigation 回调
pub fn handle_navigation(
    app: &AppHandle,
    worker_id: usize,
    nav_url: &str,
) -> NavigationAction;

/// on_page_load 回调的返回值
pub enum PageLoadAction {
    Skip,                                                    // 跳过（WaitingForLogin / 登录页 / 验证码页）
    CaptchaBlockedResume { bundle: String, task_id: String, platform: String },  // CaptchaBlocked 恢复注入
    InjectBundle { bundle: String, task_id: String, platform: String, expected_url: String },  // 正常注入
    RedirectToUrl { url: String },                           // URL 纠偏重定向
}

/// 处理 on_page_load 回调
pub fn handle_page_load(
    app: &AppHandle,
    worker_id: usize,
    url: &str,
    bundle: &str,
    task_id: &str,
    platform: &str,
    expected_url: &str,
) -> PageLoadAction;
```

### Requirement: scrape_handler.rs 事件处理模块
系统 SHALL 将 scrape-data 事件处理逻辑封装为独立模块，提供以下公共 API：

```rust
/// scrape-data 事件处理结果
pub enum ScrapeDataAction {
    NoAction,
    LoginRequired { worker_id: usize, platform: String, task_id: String },
    PioneerVerified { released: Vec<(usize, String, String, String)> },
}

/// 处理 scrape-data 事件
pub fn handle_scrape_data(
    app: &AppHandle,
    task_id: &str,
    key: &str,
    value: &serde_json::Value,
    is_new_value: bool,
) -> ScrapeDataAction;
```

### Requirement: timeout_monitor.rs 超时监控模块
系统 SHALL 将后台超时监控线程逻辑封装为独立模块，提供以下公共 API：

```rust
/// 启动后台超时监控线程
pub fn start_timeout_monitor(app: AppHandle);

/// 单次超时检测（用于测试）
pub fn check_timeouts(app: &AppHandle) -> Vec<TimeoutAction>;

/// 超时动作
pub enum TimeoutAction {
    NormalTimeout { worker_id: usize, task_id: String, window_label: String },
    LoginDetected { worker_id: usize, task_id: String },
    NoDataTimeout { worker_id: usize, task_id: String, window_label: String },
    LoginWaitTimeout { worker_id: usize, task_id: String, window_label: String },
}
```

### Requirement: lib.rs 薄编排层
lib.rs SHALL 仅包含：
1. `AppState` 结构体定义
2. `DispatchItem` 结构体定义
3. `do_dispatch()` 函数骨架（调用 worker_handlers 模块）
4. Tauri command 函数（submit_tasks, start_scraping, stop_scraping 等）
5. `run()` 入口函数（调用各模块的 setup 函数）

## MODIFIED Requirements

### Requirement: lib.rs 代码组织
原有 lib.rs 中所有防拥堵、登录检测、CaptchaBlocked 恢复、超时监控逻辑 SHALL 迁移至对应模块，lib.rs 仅通过 `use` 引入和调用。

## REMOVED Requirements
无
