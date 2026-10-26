# Checklist

## 多链接并发 Bug 修复
- [x] Rust `submit_tasks` 接收 `Vec<Task>` 并使用前端传入的 task.id
- [x] `rand_suffix()` 函数已删除
- [x] `do_dispatch` 在注入 bundle 前设置了 `window.__WORKER_TASK_ID__`
- [x] `ipc.rs` 中 `ScrapeEventData` 包含 `task_id: Option<String>` 字段（带 `#[serde(alias = "taskId")]`）
- [x] `lib.rs` 中 `scrape-data` 事件处理器使用真实 `task_id` 而非 `data.key`
- [x] `tauri-bridge.ts` 的 `send()` 携带 `taskId` 字段
- [x] `ControlBar.vue` 传递完整 `{ id, url, platform }` 而非 `urls`
- [x] `useIpcListener.ts` 使用真实 `taskId` 调用 `updateResult`，不依赖全局 `currentTaskId`

## 前端 UI 重构
- [x] App.vue 右侧从分屏改为统一可滚动布局
- [x] WorkerTabs 保持可见且高度紧凑（max-height: 140px）
- [x] ResultPreview 使用 NCollapse 手风琴模式（accordion）
- [x] 所有 `allResults` 正确渲染为折叠面板
- [x] 面板标题格式："链接N: [商品标题]" + 资源统计 Tag
- [x] 面板内 主图 → SKU图 → 详情图 → 视频 垂直排列
- [x] 空资源区块不显示
- [x] 无结果时显示空状态
- [x] ImageDisplay 和 VideoDisplay 下载功能正常（复用现有组件，下载逻辑不受影响）

## 构建与运行
- [x] `npm run build:scraper` 通过
- [x] `npm run build`（vue-tsc + vite build）通过
- [x] `cargo build` 通过
- [ ] 5 个天猫链接同时输入后可正常并发抓取（需启动 Tauri 桌面应用手动验证）
- [ ] 各链接抓取数据互不混淆（需启动应用手动验证）
- [ ] 深色模式 UI 正常（需启动应用手动验证）