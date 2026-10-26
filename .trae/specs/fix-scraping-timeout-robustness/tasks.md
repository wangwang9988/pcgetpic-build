# Tasks

- [x] Task 1: Rust 端 Bundle 缓存按环境区分
  - 修改 `src-tauri/src/injector.rs` 中 `ScriptInjector::load_bundle` 方法
  - 当 `self.dev_bundles_dir.is_some()` 时清除缓存（开发模式热更新）
  - 当 `self.dev_bundles_dir.is_none()` 时先检查 `HashMap` 缓存，命中直接返回，未命中才读磁盘
  - 验证：`cargo check` 在 `src-tauri` 目录下编译通过

- [x] Task 2: 前端 `maxWaitMs` 软超时二次校验
  - 修改 `scraper-scripts/shared/utils.ts` 中 `waitForCompletion` 函数的 `maxWaitMs` 分支
  - 在 `totalElapsed >= maxWaitMs` 时计算 `timeSinceLastImage = now - rawLastImageChangeAt`
  - 若 `hasImageData && timeSinceLastImage < 3000`（最近3秒有数据），跳过本次判定，继续等待
  - 否则（已静默或无数据），按原逻辑调用 `resolve()`
  - 验证：`npx tsc --noEmit` 项目根目录编译通过

# Task Dependencies
- Task 1 和 Task 2 **无依赖关系，可并行执行**