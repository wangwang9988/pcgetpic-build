# Checklist

## Phase 1（已完成）

- [x] `downloadFolderManager.ts` 包含 `generateFolderName(productId, productTitle)` 且正确处理空值
- [x] `downloadTypes.ts` context 包含 `subfolderName: string`
- [x] `downloadManager.ts` `startDownload` 接受 `productMeta`，生成并存储 `subfolderName`
- [x] `downloadManager.ts` `executeTask` 中 `fullPath` 格式为 `{folderPath}/{subfolderName}/{filename}`
- [x] `ImageDisplay.vue` 调用 `startDownload` 时传入 `productId`、`productTitle`（两处）
- [x] `VideoDisplay.vue` 调用 `startDownload` 时传入 `productId`、`productTitle`
- [x] `vue-tsc --noEmit` 无类型错误
- [x] `vite build` 成功

## Phase 2（本次修复）

- [x] `downloadManager.ts` 顶部导入 `import { useScrapeResultStore } from '../stores/scrapeResult'`
- [x] `downloadManager.ts` 包含 `waitForProductData` async 函数（参数 → store → 5s轮询 三阶段逻辑）
- [x] `startDownload` 中改用 `await waitForProductData(productMeta)` 获取元数据后再生成 `subfolderName`
- [x] `startDownload` 中输出 `console.log`：subfolderName 实际值
- [x] `executeTask` 中输出 `console.log`：fullPath 实际值
- [x] Rust `download_file` 入口处输出 `println!("[Rust::download_file] 开始下载: url={}, path={}", ...)`
- [x] Rust `create_dir_all` 前输出 `println!("[Rust::download_file] 确保父目录存在: {:?}", parent)`
- [x] Rust 写入成功后输出 `println!("[Rust::download_file] 写入成功: {}", file_path)`
- [x] `vue-tsc --noEmit` 无类型错误
- [x] `vite build` 成功
- [x] `cargo build` 成功
- [x] 运行时：控制台可见 `[DownloadManager] subfolderName = ...` 日志
- [x] 运行时：终端可见 `[Rust::download_file]` 日志
- [x] 磁盘上确认创建了 `{productId}_{productTitle}_{date}/` 子文件夹