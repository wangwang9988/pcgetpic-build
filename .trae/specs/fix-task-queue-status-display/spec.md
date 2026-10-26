# 修复任务状态误判与展示误导 Spec (v3)

## Why
**根因确认**：Rust 端的 35 秒看门狗超时监控（`src-tauri/src/lib.rs` L386-431）与 Scraper 脚本的 DOM 稳定性等待（`maxWaitMs=30000`）之间存在竞态窗口。当页面加载慢（2~8s）+ 模块执行（2~5s）+ DOM 最大等待（30s）> 35s 时，看门狗会抢在 scraper 调用 `complete_task` 之前发射 `task-failed`，导致前端将所有成功抓取的任务显示为"抓取失败"。

**附带问题**：TaskQueue 组件的折叠面板标题"已完成/失败"措辞歧义 + Naive UI Collapse 样式可能覆盖子元素颜色。

## What Changes
- **Rust 后端修复**: 看门狗超时从 35s 提升至 60s，给 scraper 充分的 DOM 等待余量
- **Scraper 防御加固**: `maxWaitMs` 从 30s 降至 25s，缩减 DOM 等待占用时间
- **Vue 前端防御**: `task-failed` 事件处理中加入数据已接收检查，有数据则视作成功
- **TaskQueue UI 优化**: CSS `:deep()` 穿透 + `!important` 加固 + 背景色区分 + emoji 标题（在同事已完成的面板拆分基础上）

## Impact
- Affected specs: 无
- Affected code: `src-tauri/src/lib.rs`, `scraper-scripts/taobao/index.ts`, `src/composables/useIpcListener.ts`, `src/components/TaskQueue.vue`

---

## ADDED Requirements

### Requirement: 看门狗超时阈值提升至 60 秒
系统 SHALL 将抓取任务的超时看门狗从 35 秒提升至 60 秒，确保在页面加载慢 + DOM 动画频繁的极端场景下，scraper 有充分时间完成图片提取与 `complete_task` 上报。

#### Scenario: 慢速页面不会误杀
- **GIVEN** 商品页面加载耗时 8 秒，scraper 模块执行 5 秒，DOM 达到最大等待 30 秒
- **WHEN** 看门狗在 60 秒时才触发检查
- **THEN** scraper 在 ~43 秒时已成功调用 `complete_task`，看门狗检查时 `current_task` 已清空
- **AND** 前端收到 `task-complete` 而非 `task-failed`

### Requirement: Scraper DOM 等待最大时长缩减至 25 秒
Scraper 脚本 SHALL 将 `watchDomStability` 的最大等待时长 `maxWaitMs` 从 30000 降至 25000，为页面加载和模块执行留出至少 35 秒缓冲。

#### Scenario: 配合看门狗 60s 阈值
- **WHEN** 看门狗阈值为 60 秒，scraper 最长 DOM 等待为 25 秒
- **THEN** 页面加载（≤10s）+ 模块（≤5s）+ DOM（≤25s）= ≤40s，远低于 60s

### Requirement: 前端接收 task-failed 时检查是否已有抓取数据
`useIpcListener.ts` 中 `case 'task-failed'` 处理逻辑 SHALL 在标记任务失败前检查 `useScrapeResultStore` 中是否已接收到该任务的有效数据。若已有图片 URL 数据，则将任务标记为 `completed` 而非 `failed`，并在控制台 warn 记录看门狗竞态事件。

#### Scenario: 看门狗误杀被前端拦截
- **GIVEN** scraper 已成功发送图片 URL 到前端，但看门狗抢先发射了 `task-failed`
- **WHEN** 前端处理 `task-failed` 事件
- **THEN** 检测到已有有效抓取数据，将任务状态设为 `completed`（绿色）
- **AND** 控制台输出 warn: "[task-failed] 但任务已有抓取数据，已转为 completed"

### Requirement: CSS 穿透防御 Naive UI 样式覆盖
系统 SHALL 使用 `:deep()` 选择器穿透 Naive UI Collapse 的内部 DOM，确保标题和任务条目的颜色不受组件默认样式覆盖。

#### Scenario: 标题颜色不受覆盖
- **WHEN** Naive UI Collapse 渲染 `#header` 插槽内容
- **THEN** 成功面板标题"✅ 已成功完成 (N)"始终为绿色
- **AND** 失败面板标题"❌ 抓取失败 (N)"始终为红色

### Requirement: 任务条目背景色强化 + emoji 标题
系统 SHALL 为已完成/失败任务条目增加淡色背景（`--color-success-bg` / `--color-error-bg`），并在折叠面板标题添加 ✅ / ❌ emoji。

#### Scenario: 视觉双层区分
- **WHEN** 任务状态为 `completed`
- **THEN** 条目背景为淡绿色且文字为绿色
- **WHEN** 任务状态为 `failed`
- **THEN** 条目背景为淡红色且文字为红色

### Requirement: `finishedTasks` 重命名为 `settledTasks`
`finishedTasks` 混合了 `completed` 和 `failed`，命名歧义，SHALL 重命名为 `settledTasks`。

---

## MODIFIED Requirements
无

## REMOVED Requirements
无