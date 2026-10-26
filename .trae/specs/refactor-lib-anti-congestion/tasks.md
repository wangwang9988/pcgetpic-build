# Tasks

- [x] Task 1: 创建 congestion.rs 防拥堵核心逻辑模块
  - [x] 从 lib.rs 的 scrape-data 处理器中提取 `is_substantial_data` 判定逻辑
  - [x] 从 lib.rs 的 scrape-data 处理器中提取探路者释放逻辑（mark_platform_verified + force_start_worker + 收集 released_workers）
  - [x] 从 lib.rs 的 scrape-data 处理器中提取 LoginRequired 处理逻辑
  - [x] 从 lib.rs 的 force_start_worker command 中提取跟随者导航逻辑
  - [x] 定义公共 API：`CongestionManager` struct 及其方法

- [x] Task 2: 创建 worker_handlers.rs 回调逻辑模块
  - [x] 从 lib.rs 的 on_navigation 闭包中提取导航处理逻辑（WaitingForLogin 放行、CaptchaBlocked 处理、登录检测）
  - [x] 从 lib.rs 的 on_page_load 闭包中提取页面加载处理逻辑（WaitingForLogin 早退、CaptchaBlocked 恢复、URL 纠偏、bundle 注入）
  - [x] 定义 NavigationAction 和 PageLoadAction 枚举
  - [x] 定义 handle_navigation 和 handle_page_load 公共函数

- [x] Task 3: 创建 scrape_handler.rs 事件处理模块
  - [x] 从 lib.rs 的 scrape-data 事件监听器中提取值变化检测逻辑
  - [x] 从 lib.rs 的 scrape-data 事件监听器中提取 LoginRequired 分支
  - [x] 从 lib.rs 的 scrape-data 事件监听器中提取实质性数据 + 探路者释放分支
  - [x] 定义 ScrapeDataAction 枚举和 handle_scrape_data 公共函数

- [x] Task 4: 创建 timeout_monitor.rs 超时监控模块
  - [x] 从 lib.rs 的后台线程中提取正常超时检测逻辑（has_produced_data=true + 数据超时）
  - [x] 从 lib.rs 的后台线程中提取数据保护逻辑（has_produced_data=false + 登录检测）
  - [x] 从 lib.rs 的后台线程中提取登录等待超时逻辑（CaptchaBlocked 5分钟超时）
  - [x] 定义 TimeoutAction 枚举和 start_timeout_monitor 公共函数

- [x] Task 5: 重构 lib.rs 为薄编排层
  - [x] 移除已迁移至各模块的代码
  - [x] 添加 `mod congestion; mod worker_handlers; mod scrape_handler; mod timeout_monitor;`
  - [x] do_dispatch() 中调用 worker_handlers 模块
  - [x] run() 中调用 scrape_handler 和 timeout_monitor 模块
  - [x] 保留 AppState、DispatchItem、Tauri command 函数
  - [x] 确保 force_start_worker command 调用 congestion 模块

- [x] Task 6: 编译验证
  - [x] 执行 `cargo build` 确保 Rust 代码无编译错误
  - [x] 修复 `unused variable` warning（`platform` → `_platform`）
  - [x] `cargo clippy` 因 Windows 文件锁冲突无法运行（非代码问题）

# Task Dependencies
- [Task 5] 依赖 [Task 1, 2, 3, 4]
- [Task 6] 依赖 [Task 5]
- [Task 1, 2, 3, 4] 可并行执行
