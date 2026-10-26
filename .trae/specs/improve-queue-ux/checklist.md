# 队列输入与结果预览交互优化 验收检查清单

- [x] **CP-1**: `LinkInput.vue` 的 `addToQueue()` 函数中不再包含 `rawText.value = ''` 语句
- [x] **CP-2**: 点击"添加到队列"后，输入框中的链接文本保留不丢失
- [x] **CP-3**: 点击"添加到队列"后，可继续修改输入内容并再次添加（追加模式，去重）
- [x] **CP-4**: `ControlBar.vue` 中 `startCurrentPlatform()` 在调用 IPC 前预初始化所有待抓取任务的结果条目
- [x] **CP-5**: `ControlBar.vue` 中 `startAllPlatforms()` 在调用 IPC 前预初始化所有待抓取任务的结果条目
- [x] **CP-6**: 点击"开始抓取"后，`ResultPreview` 即时显示所有待抓取链接的折叠面板条目（而非逐步出现）
- [x] **CP-7**: 未完成抓取的条目正确显示"等待获取中..."标题
- [x] **CP-8**: 空结果条目（无图片/视频数据）不会显示 ImageDisplay/VideoDisplay 区块，不抛出 JavaScript 错误
- [x] **CP-9**: 停止抓取后再次启动时，预初始化逻辑能正确覆盖之前的旧结果数据
- [x] **CP-10**: TypeScript 编译无新增类型错误