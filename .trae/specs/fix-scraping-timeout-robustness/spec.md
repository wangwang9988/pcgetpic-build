# 抓取超时与完成判定健壮性修复 Spec

## Why
`scraper-scripts/shared/utils.ts` 和 `src-tauri/src/injector.rs` 的最近修改已正确引入 baseline 机制和缓存修复，**核心 BUG 已解决**（4/5 同事认同）。经多位同事 review 后共识需要追加两处生产级加固：

1. **`injector.rs` 无条件清除缓存**（4/4 同事共识）：开发调试便利但生产环境下每次 WebView 加载都产生不必要的磁盘 I/O，应区分环境。
2. **`utils.ts` 的 `maxWaitMs` 硬掐断**（同事1 & 同事4 提出）：当任务运行到 15 秒时，即使爬虫仍在活跃下载新图片，也被无条件判定完成——SKU 多、详情长的大型商品可能漏图。

## What Changes
- **`src-tauri/src/injector.rs`**：仅在开发模式（`dev_bundles_dir.is_some()`）下清除 bundle 缓存；生产模式保留 HashMap 缓存
- **`scraper-scripts/shared/utils.ts`**：`maxWaitMs` 超时时增加二次校验——若最近 3 秒内仍有新图片 URL 产生，跳过本次判定继续等待

## NOT Doing（经评估后拒绝）
- ❌ **DOM 稳定判定取消 `hasImageData` 依赖**（同事2）：若页面无任何图片数据，可能是反爬拦截，应等待 15s `maxWaitMs` 兜底而非提前完成，避免掩盖异常。
- ❌ **tbGetSku 返回 cleanup 函数**（同事5）：MutationObserver 在 `waitForCompletion` 监控期间继续运行是预期行为——它负责捕获懒加载的 SKU 图片。`tauriBridge.send()` 中的 `uploadedImageKeys` 去重机制确保只有真正新的 URL 才会重置静默计时器。此修改在上一个 spec (`optimize-completion-detection`) 中已被明确回退。

## Impact
- Affected specs: `optimize-completion-detection`
- Affected code:
  - `src-tauri/src/injector.rs` — `load_bundle` 方法
  - `scraper-scripts/shared/utils.ts` — `waitForCompletion` 函数 `maxWaitMs` 分支

## MODIFIED Requirements

### Requirement: Bundle 缓存区分开发/生产环境
`ScriptInjector::load_bundle` SHALL 仅在 `dev_bundles_dir.is_some()` 时清除内存缓存（开发热更新）；生产模式下 SHALL 检查 HashMap 缓存，命中直接返回，未命中读磁盘并写入缓存。

#### Scenario: 开发阶段反复 build:scraper
- **WHEN** `dev_bundles_dir` 存在且有最新 bundle
- **THEN** 每次都从磁盘重新读取

#### Scenario: 生产环境多 Worker 并发
- **WHEN** `dev_bundles_dir` 为 `None`
- **THEN** 首次读磁盘并缓存，后续直接返回缓存

### Requirement: maxWaitMs 软超时保护
`waitForCompletion` SHALL 在 `totalElapsed >= maxWaitMs` 时计算 `timeSinceLastImage = now - rawLastImageChangeAt`。若 `hasImageData && timeSinceLastImage < 3000`，跳过本次判定；否则按原逻辑强制完成。

#### Scenario: 大型商品持续产出新图
- **WHEN** 任务运行至 15 秒，最近 2 秒内仍有新图上报
- **THEN** 不触发 `maxWaitMs`，继续等待下次轮询

#### Scenario: 页面已长时间无新数据
- **WHEN** 任务运行至 15 秒，且最近 3 秒以上无新图
- **THEN** `resolve()` 强制完成