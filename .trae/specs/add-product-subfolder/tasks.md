# Tasks

## Phase 1（已完成）

- [x] Task 1: downloadFolderManager.ts — 新增 generateFolderName
- [x] Task 2: downloadTypes.ts — Context 增加 subfolderName
- [x] Task 3: downloadManager.ts — 入参扩展 + 路径拼接
- [x] Task 4: ImageDisplay.vue — 传入 product metadata（两处：单张 + 批量）
- [x] Task 5: VideoDisplay.vue — 传入 product metadata
- [x] Task 6: 验证构建（vue-tsc + vite build）

## Phase 2（本次修复——解决运行时竞态条件）

- [x] Task 7: downloadManager.ts — 新增 `waitForProductData` + 调试日志
  - [x] 顶部新增 `import { useScrapeResultStore } from '../stores/scrapeResult'`
  - [x] 实现 `waitForProductData` async 函数（参考 implementation_plan.md 第 73-100 行）：
    - 参数：`meta?: { productId?: string; productTitle?: string }`
    - 返回值：`Promise<{ productId: string; productTitle: string }>`
    - 逻辑：先取参数值 → 若为空取 store → 若仍为空 5 秒轮询（每 100ms）
    - 日志：`[DownloadManager] 正在等待商品元数据就绪...` / `[DownloadManager] 元数据就绪: ...`
  - [x] `startDownload` 中：
    - 将 `const subfolderName = generateFolderName(...)` 改为：
      ```
      const { productId, productTitle } = await waitForProductData(productMeta);
      const subfolderName = generateFolderName(productId, productTitle);
      console.log(`[DownloadManager] subfolderName = ${subfolderName}`);
      ```
  - [x] `executeTask` 中 `fullPath` 行后加：
    ```
    console.log(`[DownloadManager] executeTask fullPath = ${fullPath}`);
    ```

- [x] Task 8: Rust `download_file` — 添加 `println!` 调试日志
  - [x] 函数入口加：`println!("[Rust::download_file] 开始下载: url={}, path={}", url, file_path);`
  - [x] `create_dir_all` 前加：`println!("[Rust::download_file] 确保父目录存在: {:?}", parent);`
  - [x] 写入成功后加：`println!("[Rust::download_file] 写入成功: {}", file_path);`

- [x] Task 9: 重新构建并验证
  - [x] `vue-tsc --noEmit` 无类型错误
  - [x] `vite build` 成功
  - [x] `cargo build` 成功

# Task Dependencies
- Task 2 依赖 Task 1（类型变化同步）
- Task 3 依赖 Task 1、Task 2
- Task 4、Task 5 依赖 Task 3
- Task 6 依赖所有 Phase 1 任务
- Task 7 依赖 Task 3（在已有代码基础上改造）
- Task 8 可与 Task 7 并行
- Task 9 依赖 Task 7、Task 8