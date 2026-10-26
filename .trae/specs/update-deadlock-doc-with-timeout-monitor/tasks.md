# Tasks

- [x] Task 1: 在死锁排查文档中补充 timeout_monitor 嵌套锁定死锁案例
  - [x] 新增"致命问题 #5：timeout_monitor 嵌套锁定 Mutex 导致死锁"章节
  - [x] 包含完整的现象、根因、时序分析、修复方案
  - [x] 补充与已有死锁案例的关联总结和 Rust Mutex 使用铁律

- [x] Task 2: 更新防拥堵文档中空闲检测线程的文件位置引用
  - [x] 确认文档中无此引用，无需修改

- [x] Task 3: 更新登录策略文档中空闲检测线程的文件位置引用
  - [x] 确认已是正确值 `timeout_monitor.rs`，无需修改

# Task Dependencies
- Task 1, Task 2, Task 3 互相独立，可并行执行
