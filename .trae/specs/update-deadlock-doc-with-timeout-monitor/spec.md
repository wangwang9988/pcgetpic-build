# 更新死锁排查文档 - 补充 timeout_monitor 互斥锁死锁案例

## Why
timeout_monitor.rs 中的 `check_timeouts()` 函数存在 `std::sync::Mutex` 嵌套锁定死锁 Bug，导致 Worker 无响应、看门狗失效、客户端卡死。此问题与已有文档中记录的 `stop_scraping` 死锁属于同一类问题（Mutex 非可重入），应补充到现有文档中积累经验，避免后续开发重蹈覆辙。

## What Changes
- 在 `docs/多商品并发抓取卡死与窗口死锁问题排查及修复说明.md` 中新增"第五个致命问题"章节，记录 timeout_monitor 嵌套锁定死锁的完整排查过程
- 更新 `docs/防拥堵登录验证机制设计与平台接入指南.md` 中"关键组件"表的空闲检测线程文件位置引用
- 更新 `docs/平台登录策略踩坑记录与实现方案.md` 中"关键组件"表的空闲检测线程文件位置引用

## Impact
- Affected docs: 3 个文档文件
- Affected code: 无代码变更，仅文档更新

## ADDED Requirements

### Requirement: 补充 timeout_monitor 死锁案例到排查文档
文档 SHALL 在"多商品并发抓取卡死与窗口死锁问题排查及修复说明.md"中新增完整的死锁案例，包含：
- 问题现象描述（Worker 无响应、看门狗不触发、客户端卡死）
- 根因分析（Mutex 非可重入、嵌套锁定时序）
- 为什么前两个任务正常（has_produced_data 分支不需要嵌套锁）
- 为什么看门狗不生效（看门狗线程本身死锁）
- 为什么整个客户端卡死（其他线程等待同一把锁）
- 修复方案（两阶段拆分：持锁收集数据、释放锁后执行登录检测）
- 与已有死锁案例的关联（同一类 Mutex 非可重入问题）

#### Scenario: 开发者阅读文档后能识别类似死锁风险
- **WHEN** 开发者需要编写涉及 Mutex<AppState> 的新代码
- **THEN** 通过阅读文档中的两个死锁案例，能识别出嵌套锁定风险并避免

### Requirement: 更新空闲检测线程的文件位置引用
两个登录相关文档 SHALL 将"空闲检测线程"的文件位置从 `src-tauri/src/lib.rs` 更正为 `src-tauri/src/timeout_monitor.rs`

#### Scenario: 开发者根据文档快速定位代码
- **WHEN** 开发者需要查看空闲检测线程的实现
- **THEN** 文档指向正确的文件 `timeout_monitor.rs` 而非过时的 `lib.rs`
