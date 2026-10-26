# Tasks

- [x] Task 1: Rust 后端 — `idle_timeout` 替代 `wait_mode`/`stay_duration`
  - 修改 `AppState`：移除 `wait_mode`/`stay_duration`，新增 `idle_timeout: u64`（默认7）
  - 修改 `DispatchItem`：移除 `wait_mode`/`stay_duration`（idle_timeout 不再需要传入 DispatchItem）
  - 修改 `set_scraping_config` 命令：接收 `idle_timeout` 替代 `wait_mode`/`stay_duration`
  - 修改 `do_dispatch`：移除 wait_mode/stay_duration 传递
  - 修改初始化脚本注入：移除 `__WAIT_MODE__`/`__STAY_DURATION__`，不再注入
  - 修改静默检测线程：使用 `s.idle_timeout` 替代硬编码的 `from_secs(7)`
  - 验证：`cargo check` 编译通过 ✅

- [x] Task 2: 前端 Store — `idleTimeout` 替代 `waitMode`/`stayDuration`
  - 修改 `taskQueue.ts`：移除 `waitMode`/`stayDuration`，新增 `idleTimeout: Ref<number>`（默认7）
  - 验证：`npx tsc --noEmit` 编译通过 ✅

- [x] Task 3: ControlBar.vue — UI 控件替换
  - 移除"切换策略"选择器
  - 移除"停留时间"选择器
  - 新增"静默超时"选择器，选项：5秒、7秒（推荐）、10秒、15秒
  - 修改 `startCurrentPlatform`/`startAllPlatforms`：调用 `set_scraping_config` 时传 `idleTimeout` 替代 `waitMode`/`stayDuration`
  - 验证：`npx tsc --noEmit` 编译通过 ✅

- [x] Task 4: 脚本端 — 移除 fixed 模式
  - 修改 `taobao/index.ts`：`waitTaskCompletion` 移除 `waitMode === 'fixed'` 分支，移除 `__WAIT_MODE__`/`__STAY_DURATION__` 读取
  - 统一使用 `waitForCompletion`
  - 验证：`npx tsc --noEmit` 编译通过 ✅

# Task Dependencies
- Task 1 和 Task 2 可并行执行
- Task 3 依赖 Task 2（store 字段变更）
- Task 4 独立于 Task 1-3
