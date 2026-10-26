# 评估 worker_handlers.rs 与 worker_pool.rs 是否需要重构

## Why
用户感觉这两个文件比较大，需要从最佳代码实践角度评估是否值得拆分重构，避免为了重构而重构。

## What Changes
- 评估 `worker_handlers.rs`（647 行）和 `worker_pool.rs`（408 行）的代码结构、职责划分、代码质量
- 给出是否需要拆分/重构的结论和建议

## 评估结论

### worker_pool.rs（408 行）— 不需要重构

**结构**：单一 `WorkerPool` struct + `impl` 块，约 30 个方法。

**优点**：
- 职责单一：纯数据结构 + 队列/状态管理操作
- 所有方法都是小函数（平均 ~10 行），命名清晰
- 无代码重复，无深层嵌套
- 所有方法操作同一数据结构，天然高内聚

**结论**：408 行对于 Rust 中一个 struct 的完整实现属于正常范围，拆分只会增加模块间跳转成本，没有实际收益。

### worker_handlers.rs（647 行）— 不需要拆分，但存在可优化点

**结构**：2 个 enum + 4 个函数。

**优点**：
- 职责聚焦：页面导航/加载事件处理 + 脚本注入决策
- 4 个函数之间职责边界清晰：
  - `handle_navigation()` — 导航事件的前置检查（登录/验证码检测）
  - `handle_page_load()` — 页面加载完成后的决策（注入/跳过/重定向）
  - `url_changed_to_product()` — URL 监听回调（CaptchaBlocked 恢复注入）
  - `execute_page_load_action()` — 执行决策结果（实际注入脚本/发射事件）
- 中文注释详尽，状态机逻辑可追溯

**存在的小问题**：

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| `handle_page_load()` 过长（248 行） | 低 | 复杂度是状态机固有的（CaptchaBlocked/Working/WaitingForLogin × 4 种 LoginCheckResult × Started/Finished × 是否商品页），拆分反而破坏决策树可读性 |
| CaptchaBlocked 恢复注入逻辑在 `execute_page_load_action()` 和 `url_changed_to_product()` 中重复 | 低 | 约 20 行重复，可提取为私有辅助函数，但不是紧急问题 |
| `url_changed_to_product()` 是 `#[tauri::command]`，按项目规范应放在 `commands.rs` | 低 | 但它与 worker handler 逻辑紧密耦合，移到 `commands.rs` 会割裂代码上下文 |

**结论**：647 行处于可接受范围。当前结构清晰，拆分不会带来明显收益，反而会破坏代码的上下文连贯性。建议仅在后续维护中如果文件继续膨胀超过 800-1000 行时再考虑拆分。

## Impact
- Affected code: 无需修改（评估结论为不重构）
- Affected specs: 无