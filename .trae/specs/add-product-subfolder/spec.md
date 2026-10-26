# 下载时自动创建商品子文件夹 Spec

## Why
当前下载逻辑将图片/视频直接写入用户选择的根目录（如 `D:\Downloads/主图1.jpg`），不符合项目规范的目录结构。根据 `project_rules.md` 第 85-92 行，必须创建嵌套子文件夹 `{商品ID}_{商品标题}_{日期}/`，将资源按商品归类存放。

**根因**：竞态条件 — Scraper 脚本异步发送 `productId`/`productTitle` 至 Pinia store，而用户可能在元数据尚未抵达时就点击下载，导致 `startDownload` 收到的 `productMeta` 参数为空，触发降级文件夹名。

## What Changes

### Phase 1（已完成）
- `downloadFolderManager.ts`：新增 `generateFolderName(productId, productTitle)` — 模板 `{productId}_{productTitle}_{date}`
- `downloadTypes.ts`：`BatchContext` 新增 `subfolderName: string`
- `downloadManager.ts`：`startDownload` 接受 `productMeta`，`executeTask` 拼 `fullPath = {folderPath}/{subfolderName}/{filename}`
- `ImageDisplay.vue` / `VideoDisplay.vue`：从 `scrapeResultStore` 获取元数据并传入 `startDownload`

### Phase 2（本次修复）
- `downloadManager.ts`：
  1. 导入 `useScrapeResultStore`
  2. 新增 `waitForProductData()` async 函数：先查参数 → 再查 store → 若仍为空则 5 秒轮询（每 100ms）
  3. `startDownload` 中改为 `await waitForProductData(productMeta)` 后再调 `generateFolderName`
  4. 关键路径加入 `console.log`
- `src-tauri/src/lib.rs`：
  1. `download_file` 加入 `println!` 输出 `url`、`parent` 目录、写入成功/失败信息

## Impact
- Affected specs: rust-backend-download（依赖 `create_dir_all`）
- Affected code:
  - `src/utils/downloadManager.ts` — 新增 `waitForProductData`、日志
  - `src-tauri/src/lib.rs` — `download_file` 加 `println!`
  - `src/components/ImageDisplay.vue` / `VideoDisplay.vue`（Phase 1 已完成，无需再改）

---

## ADDED Requirements

### Requirement: 商品子文件夹自动创建
系统 SHALL 在下载时按模板 `{productId}_{productTitle}_{date}` 在用户选择的下载根目录下自动创建商品子文件夹。

#### Scenario: 下载淘宝商品图片
- **WHEN** 用户选择目录 `D:\Downloads` 并下载商品图片（商品ID: `2208135412399`，标题: `韩版潮流T恤`）
- **THEN** 文件写入 `D:\Downloads\2208135412399_韩版潮流T恤_20260521\主图1.jpg`

#### Scenario: 商品标题含非法字符
- **WHEN** 商品标题包含 Windows 非法字符
- **THEN** `sanitizeFilename` 自动替换，标题限 30 字符，路径限 100 字符

### Requirement: 数据就绪轮询保障（Phase 2）
系统 SHALL 在 `startDownload` 中调用 `waitForProductData(productMeta)` 确保元数据就绪后再生成子文件夹名。

**`waitForProductData` 行为**：
1. 若 `productMeta.productId` 和 `productMeta.productTitle` 均非空 → 直接返回
2. 若任一为空 → 从 `useScrapeResultStore().currentResult` 重新读取
3. 若仍为空 → 进入 5 秒轮询（每 100ms 检查一次 store），超时后降级

#### Scenario: 竞态条件——用户快速点击下载
- **WHEN** 用户在产品标题/ID 尚未从 scraper 脚本发送到 store 时点击下载
- **THEN** 系统轮询等待（最长 5 秒），轮询期间输出 `[DownloadManager] 正在等待商品元数据就绪...`
- **AND** 元数据就绪后输出 `[DownloadManager] 元数据就绪: {productId} - {productTitle}`
- **AND** 输出 `[DownloadManager] subfolderName = {subfolderName}`
- **AND** 若 5 秒超时，降级为 `download_{timestamp}`

#### Scenario: 数据已就绪
- **WHEN** `productId` 和 `productTitle` 已存在于 store
- **THEN** 立即使用，无需等待

### Requirement: 全链路调试日志（Phase 2）
系统 SHALL 在下载路径的关键节点输出日志，便于排查文件夹创建问题。

#### Scenario: 运行时日志输出
- **WHEN** 执行 `download_file` Rust 命令
- **THEN** 终端输出：
  ```
  [Rust::download_file] 开始下载: url=..., path=...
  [Rust::download_file] 确保父目录存在: "..."
  [Rust::download_file] 写入成功: ...
  ```
- **WHEN** 前端 `executeTask` 构造下载路径
- **THEN** 控制台输出 `[DownloadManager] executeTask fullPath = ...`