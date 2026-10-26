# Checklist — 自动下载与元数据展示功能

## 阶段 1：下载管理核心模块

- [ ] 1.1 downloadTypes.ts 类型定义完整且无 TypeScript 编译错误
- [ ] 1.2 DownloadFolderManager.generateResourceName() 生成正确的文件名格式（如：主图1.jpg）
- [ ] 1.3 DownloadFolderManager.sanitizeFilename() 正确清理 Windows 非法字符（\ / : * ? " < > |）
- [ ] 1.4 DownloadFolderManager.extractExtensionFromUrl() 能从常见 URL 格式正确推断扩展名
- [ ] 1.5 DownloadManager.startDownload() 接受任务数组并启动批量下载流程
- [ ] 1.6 DownloadManager.processQueue() 实现并发槽位控制（最大 5 个并行）
- [ ] 1.7 DownloadManager.executeTask() 完成资源预处理 + Tauri 文件保存的完整流程
- [ ] 1.8 DownloadManager.handleError() 实现 3 次指数退避重试（1s → 2s → 4s）
- [ ] 1.9 withTimeout() 工具函数能正确为 Promise 添加超时保护

## 阶段 2：ImageDisplay 组件

- [ ] 2.1 ImageDisplay 组件正确接收 props 并渲染图片网格布局
- [ ] 2.2 图片使用 CSS Grid 自适应排列，卡片高度统一为 320px
- [ ] 2.3 图片加载成功后显示尺寸信息（宽 x 高）
- [ ] 2.4 图片加载成功后显示文件大小（MB 单位），支持"获取中..."和"无法获取"状态
- [ ] 2.5 图片加载失败时显示错误覆盖层，提供重试按钮和"可正常下载 ✓"提示
- [ ] 2.6 图片加载超过 5 秒时标记为"慢加载"状态并显示橙色提示
- [ ] 2.7 每张图片右下角显示独立的"下载"按钮
- [ ] 2.8 点击单张图片下载按钮触发下载，按钮在下载中变为禁用状态
- [ ] 2.9 下载成功后在文件大小旁显示绿色定位点图标
- [ ] 2.10 绿色定位点悬停提示"在文件夹中打开"，点击可打开系统文件管理器
- [ ] 2.11 全选 checkbox 可正确切换所有图片的选中状态
- [ ] 2.12 "下载所选"按钮仅在有选中项且未在下载时可用
- [ ] 2.13 批量下载时顶部操作栏显示实时进度统计（成功数/失败数/总数）和进度条
- [ ] 2.14 有失败任务时显示"重试失败"按钮，点击后重新下载失败的资源
- [ ] 2.15 下载完成时弹出 Toast 提示（如："主图 下载完成：成功 8，失败 0"）
- [ ] 2.16 Toast 提示支持点击操作（打开下载文件夹）

## 阶段 3：VideoDisplay 组件

- [ ] 3.1 VideoDisplay 组件正确接收 props 并渲染视频网格布局
- [ ] 3.2 视频卡片使用 CSS Grid 排列，固定高度 280px
- [ ] 3.3 视频预览区显示 <video> 播放器控件，高度 180px
- [ ] 3.4 视频元数据获取完成后显示分辨率（width x height）
- [ ] 3.5 视频元数据获取完成后显示文件大小（MB 单位）
- [ ] 3.6 视频加载失败时显示错误覆盖层和重试按钮
- [ ] 3.7 每个视频卡片显示复选框和独立"下载"按钮
- [ ] 3.8 点击单个视频下载按钮触发下载流程
- [ ] 3.9 "全部播放/暂停"按钮可控制页面所有视频的播放状态
- [ ] 3.10 "全部静音"按钮可切换所有视频的静音状态
- [ ] 3.11 批量下载逻辑与 ImageDisplay 一致（进度追踪、Toast 提示、重试机制）

## 阶段 4：ResultPreview 集成

- [ ] 4.1 ResultPreview 的主图 Tab 正确渲染 ImageDisplay 组件并传递 mainPics 数据
- [ ] 4.2 ResultPreview 的 SKU Tab 正确渲染 ImageDisplay 组件并传递 skuPics 数据
- [ ] 4.3 ResultPreview 的详情图 Tab 正确渲染 ImageDisplay 组件并传递 detailPics 数据
- [ ] 4.4 ResultPreview 的视频 Tab 正确渲染 VideoDisplay 组件并传递 videoUrls 数据
- [ ] 4.5 切换不同任务时，子组件正确更新数据并清理旧状态
- [ ] 4.6 stats-bar 统计文本仍正常显示（已提取 X 张主图 / Y 张 SKU / Z 张详情图）
- [ ] 4.7 右键菜单功能保持可用（复制链接、标记无效）

## 端到端场景验证

- [ ] 场景 1：抓取淘宝商品 → 自动展示主图/SKU/详情图/视频 → 所有资源显示完整元数据
- [ ] 场景 2：点击某张主图的下载按钮 → 选择保存目录 → 文件正确下载 → 显示定位点
- [ ] 场景 3：全选所有主图 → 点击"下载所选" → 批量下载到同一文件夹 → 进度条更新 → 完成提示
- [ ] 场景 4：模拟网络错误 → 任务自动重试 3 次 → 最终失败并在 UI 标记 → 手动重试成功
- [ ] 场景 5：快速切换多个任务 → 旧组件卸载时清理定时器和内存 → 无控制台报错
- [ ] 场景 6：下载 50+ 张图片 → 内存占用稳定 → 无明显卡顿

## 代码质量检查

- [ ] 所有新增文件遵循项目现有代码风格（Vue 3 Composition API + TypeScript）
- [ ] 组件样式配色方案与参考项目一致（#54bc4a 绿色主题）
- [ ] 无硬编码字符串，文本内容通过 i18n 机制管理（或预留接口）
- [ ] 所有异步操作都有错误处理（try-catch 或 .catch()）
- [ ] 组件卸载时清理所有定时器、事件监听器、响应式 Map
- [ ] 无 console.error 或 console.warn 遗留（调试日志可保留为 console.debug）
