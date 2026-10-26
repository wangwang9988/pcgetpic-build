# ControlBar 控制项适配当前架构 Spec

## Why
ControlBar.vue 中的"切换策略"和"停留时间"控件是旧架构遗留，与当前的数据驱动完成判定架构不匹配：
- 现在的完成判定由 Rust 后端7秒值变化检测驱动，前端 `waitForCompletion` 只是辅助
- `fixed` 模式（强制停留N秒）与 Rust 后端的7秒静默检测冲突——Rust 端可能提前关闭窗口
- "DOM稳定 + 3秒"等选项描述已过时，当前逻辑不再依赖 DOM 稳定性
- 用户无法理解"切换策略"的含义，也无法控制真正有用的参数（静默超时时间）

## What Changes
- **移除** `waitMode`（切换策略）选择器——统一使用数据驱动自动判定
- **替换** `stayDuration`（停留时间）为 `idleTimeout`（静默超时）——让用户控制"多少秒无新数据判定完成"
- **修改** `taskQueue` store：移除 `waitMode`/`stayDuration`，新增 `idleTimeout`
- **修改** Rust 端 `set_scraping_config` 命令：接收 `idle_timeout` 替代 `wait_mode`/`stay_duration`
- **修改** Rust 端静默检测线程：使用可配置的 `idle_timeout` 替代硬编码的7秒
- **修改** 脚本端 `index.ts`：移除 `fixed` 模式分支，统一使用 `waitForCompletion`

## Impact
- Affected specs: `optimize-completion-detection`, `fix-scraping-timeout-robustness`
- Affected code:
  - `src/components/ControlBar.vue` — UI 控件
  - `src/stores/taskQueue.ts` — 状态管理
  - `src-tauri/src/lib.rs` — `set_scraping_config` 命令 + 静默检测线程
  - `scraper-scripts/taobao/index.ts` — 移除 fixed 模式

## MODIFIED Requirements

### Requirement: ControlBar 控件适配数据驱动架构
ControlBar SHALL 提供"静默超时"选择器替代"切换策略"+"停留时间"。选项为：5秒、7秒（默认）、10秒、15秒。该值通过 `set_scraping_config` 传递到 Rust 后端，控制静默检测线程的超时阈值。

#### Scenario: 用户选择7秒静默超时
- **WHEN** 用户选择"7秒"静默超时并开始抓取
- **THEN** Rust 后端静默检测线程在 Worker 数据值连续7秒无变化时自动完成任务

#### Scenario: 用户选择15秒静默超时（大商品场景）
- **WHEN** 用户选择"15秒"静默超时
- **THEN** Rust 后端静默检测线程在 Worker 数据值连续15秒无变化时才判定完成

### Requirement: Rust 后端静默超时可配置
`AppState` SHALL 存储 `idle_timeout: u64`（单位秒，默认7），静默检测线程使用此值替代硬编码的 `from_secs(7)`。`set_scraping_config` 命令 SHALL 接受 `idle_timeout` 参数。

### Requirement: 脚本端移除 fixed 模式
`taobao/index.ts` 的 `waitTaskCompletion` SHALL 移除 `waitMode === 'fixed'` 分支，统一使用 `waitForCompletion`。`__WAIT_MODE__` 和 `__STAY_DURATION__` 全局变量不再注入。

## REMOVED Requirements

### Requirement: 切换策略选择器
**Reason**: `fixed` 模式与 Rust 后端7秒静默检测冲突，且"自动判定"已是唯一合理的策略
**Migration**: 替换为"静默超时"选择器

### Requirement: 停留时间选择器
**Reason**: "停留时间"概念基于旧的 DOM 稳定性判定，与当前数据驱动架构不匹配
**Migration**: 替换为"静默超时"选择器
