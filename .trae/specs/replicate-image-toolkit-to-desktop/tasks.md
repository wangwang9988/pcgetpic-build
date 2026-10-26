# Tasks

- [ ] Task 1: 准备依赖与 Rust 保存能力
  - [ ] SubTask 1.1: 安装 npm 依赖：`pica`、`browser-image-compression`、`jszip`、`@vicons/ionicons5`
  - [ ] SubTask 1.2: 在 `src-tauri/src/commands/file_ops.rs` 新增 `save_blob_to_file` 命令，接收 `path: String` 与 `data: Vec<u8>`，自动创建父目录并写入文件
  - [ ] SubTask 1.3: 在 `src-tauri/src/lib.rs` 的 `invoke_handler` 中注册 `save_blob_to_file`
  - [ ] SubTask 1.4: 更新 `src-tauri/capabilities/default.json`，为新命令补充必要权限
  - [ ] SubTask 1.5: 运行 `cargo check` / `npm run typecheck` 验证后端可编译

- [ ] Task 2: 迁移图片处理核心逻辑到客户端
  - [ ] SubTask 2.1: 创建 `src/utils/image-toolkit/` 目录，迁移 `types.ts`、`constants.ts`、`format.ts`、`fileItems.ts`、`rules.ts`、`warnings.ts`
  - [ ] SubTask 2.2: 迁移 `canvasProcessing.ts`，保留 `pica` 缩放、`browser-image-compression` 压缩、电商比例补白/裁切逻辑
  - [ ] SubTask 2.3: 迁移 `itemProcessor.ts`、`batchProcessor.ts`、`fileQueue.ts`、`outputNames.ts`、`exportNaming.ts`
  - [ ] SubTask 2.4: 重写 `download.ts` / `exporter.ts`，将浏览器下载 API 替换为 Tauri `save_blob_to_file` + 目录选择对话框
  - [ ] SubTask 2.5: 创建 `src/composables/useImageToolkit.ts`，封装 Vue 状态与交互方法

- [ ] Task 3: 使用 Naive UI 实现 `ImageToolkitPanel.vue`
  - [ ] SubTask 3.1: 创建 `src/components/ImageToolkitPanel.vue`，实现上传/拖拽区、展开/收起面板、文件列表、预览区
  - [ ] SubTask 3.2: 实现五类处理设置 UI：格式转换、修改尺寸、控制体积、批量重命名、电商比例
  - [ ] SubTask 3.3: 实现底部操作栏：预览当前、下载当前、批量处理、批量导出 ZIP、批量导出、清空
  - [ ] SubTask 3.4: 使用项目 CSS 变量与 Naive UI 主题，确保暗黑模式一致
  - [ ] SubTask 3.5: 用 `@vicons/ionicons5` 替换原 Element Plus 图标

- [ ] Task 4: 集成到客户端主界面
  - [ ] SubTask 4.1: 在 `src/components/SiderPanel.vue` 新增「图片工具箱」模式 Tab（mode = `'toolkit'`）
  - [ ] SubTask 4.2: 在 `src/App.vue` 扩展 `activeMode` 类型为 `'speed' | 'single' | 'batch' | 'toolkit'`
  - [ ] SubTask 4.3: 在 `App.vue` 内容区根据 `activeMode === 'toolkit'` 渲染 `ImageToolkitPanel.vue`
  - [ ] SubTask 4.4: 保持模式切换时「抓取运行中禁止切换」的现有逻辑

- [ ] Task 5: 验证与调优
  - [ ] SubTask 5.1: 运行 `npm run typecheck` 与 `npm run build:check`，修复类型错误
  - [ ] SubTask 5.2: 运行 `cargo check`，确保 Rust 无编译错误
  - [ ] SubTask 5.3: 在 `npm run dev` 中手动验证上传、处理、导出 ZIP、导出文件夹功能
  - [ ] SubTask 5.4: 验证 JPG/PNG/WEBP 转换、等比缩放、体积压缩、电商比例、批量重命名五种功能

# Task Dependencies

- Task 2 依赖 Task 1（核心处理逻辑依赖 Rust 保存能力）。
- Task 3 依赖 Task 2（UI 依赖 composable 与工具函数）。
- Task 4 依赖 Task 3（主界面集成依赖组件可用）。
- Task 5 依赖 Task 4（验证需要完整集成）。
