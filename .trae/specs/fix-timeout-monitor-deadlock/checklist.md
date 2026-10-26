# 修复 timeout_monitor 互斥锁死锁 - 检查清单

- [x] timeout_monitor.rs 中 check_timeouts 不再嵌套锁定 Mutex<AppState>
- [x] 登录检测逻辑在锁释放后执行
- [x] 登录检测结果与重构前行为一致（LoginDetected / NoDataTimeout）
- [x] `cargo check` 编译通过
