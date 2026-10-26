# 修复 timeout_monitor 互斥锁死锁 - 任务列表

- [x] Task 1: 重构 check_timeouts 函数消除嵌套锁定
  - [x] 在持有锁期间收集登录检测所需数据（worker_id, platform, current_url）到临时结构体
  - [x] 释放锁后遍历临时数据执行 login_registry.check_login()
  - [x] 根据登录检测结果生成对应的 TimeoutAction

- [x] Task 2: 验证修复效果
  - [x] `cargo check` Rust 编译通过
  - [x] 确认 check_timeouts 中不再存在嵌套锁定同一互斥锁的代码

# Task Dependencies
- Task 2 依赖 Task 1
