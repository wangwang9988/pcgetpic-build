# 抓取完成判定优化 Spec

## Why
当前完成判定逻辑存在以下问题：等待时间常数偏保守（10s 静默 + 20s 兜底），完成判定函数内联在 `taobao/index.ts` 中无法复用。优化这些常数的同时，将判定逻辑提取为独立工具函数。

**设计原则**：不修改 `tbGetMain` / `tbGetSku` 等从参考项目继承的提取脚本——这些脚本的爬取逻辑已非常健壮，修改可能引入非预期行为。完成判定的核心思想是数据驱动：只要在 N 秒内没有新的图片 URL 通过 `tauriBridge.send()` 上报，即判定完成，与各提取脚本内部的重试/轮询参数完全解耦。

## What Changes
- 缩短图片静默超时从 10s → 7s，最大等待从 20s → 15s
- 提升页面滚动速度：间隔从 300-600ms → 200-400ms
- 提取 `waitForCompletion` 到 `shared/utils.ts` 作为可复用的判定工具，通过回调注入 `tauriBridge` 避免耦合
- `taobao/index.ts` 改为引用共享函数，并支持模块可选返回 cleanup 函数

## Impact
- Affected specs: 无
- Affected code:
  - `scraper-scripts/taobao/index.ts` — 完成判定常数 + 引用共享函数 + cleanup 支持
  - `scraper-scripts/shared/utils.ts` — 新增通用完成判定工具 + 滚动速度参数

## MODIFIED Requirements

### Requirement: 图片静默超时判定
系统 SHALL 在最后一次新图片 URL 上传后等待 **7 秒**（原 10 秒）无新数据即判定完成。

#### Scenario: 正常抓取完成后快速判定
- **WHEN** 所有模块已运行完毕，且 7 秒内无新图片 URL 通过 `tauriBridge.send()` 上报
- **THEN** 系统立即调用 `tauriBridge.completeTask()`，任务标记为 completed

### Requirement: 最大等待兜底
系统 SHALL 在 `waitTaskCompletion` 开始后最多等待 **15 秒**（原 20 秒）强制完成。

#### Scenario: 页面持续变动无法稳定
- **WHEN** DOM 持续变化但 15 秒内未满足图片静默条件
- **THEN** 系统强制调用 `tauriBridge.completeTask()` 完成任务

### Requirement: 滚动速度优化
页面模拟滚动 SHALL 将间隔缩短至 200-400ms（原 300-600ms），步进保持 500px。

#### Scenario: 触发懒加载内容
- **WHEN** 注入脚本开始执行
- **THEN** 页面以 500px 步进、200-400ms 随机间隔匀速向下滚动，触发所有懒加载图片

### Requirement: 完成判定工具复用
`waitForCompletion` 函数 SHALL 从 `taobao/index.ts` 提取到 `shared/utils.ts`，通过 `CompletionOptions` 接口参数化配置，通过 `getLastImageDataChangeAt` 回调注入数据源，供后续其他平台复用。

#### Scenario: 新平台接入
- **WHEN** 接入京东/拼多多等新平台
- **THEN** 可直接引用 `shared/utils.ts` 中的通用 `waitForCompletion` 函数，传入平台特定的超时参数和数据源回调