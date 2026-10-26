# Tasks — 自动下载与元数据展示功能

## 阶段 1：下载管理核心模块（基础设施）

- [x] Task 1: 创建下载类型定义与配置常量
  - [x] 1.1 创建 `src/utils/downloadTypes.ts`
    - 定义 DownloadTask 接口（imageUrl, index, imageType, batchId）
    - 定义 ProgressInfo 接口（status, progress, speed, downloadId）
    - 定义 ProgressCallback / CompletionCallback 类型
    - 定义 BatchContext 和 DownloadBatch 接口
    - 配置常量：MAX_CONCURRENT=5, TIMEOUT 对象, MAX_RETRY=3
    - 实现 withTimeout<T>() 工具函数
  - [x] 1.2 验证：TypeScript 编译通过，无类型错误

- [x] Task 2: 实现下载文件夹管理器
  - [x] 2.1 创建 `src/utils/downloadFolderManager.ts`
    - 实现 DownloadFolderManager 类（导出函数式 API）
    - generateResourceName(imageType, index, extension) 方法
    - sanitizeFilename(filename) 清理非法字符
    - extractExtensionFromUrl(url) 从 URL 推断扩展名
    - getCurrentDate() 返回 YYYYMMDD 格式
  - [x] 2.2 单元测试：验证文件名生成规则、非法字符清理、超长文件名截断

- [x] Task 3: 实现下载管理器核心引擎
  - [x] 3.1 创建 `src/utils/downloadManager.ts`
    - 实现 DownloadManager 静态类
    - startDownload(items, callbacks) 批量下载入口
    - processQueue() 并发槽位调度器（最大 5 并发）
    - executeTask() 单任务执行流程
    - executeBrowserDownload() Tauri 文件系统 API 封装
      - 使用 @tauri-apps/plugin-dialog 选择保存目录
      - 使用 @tauri-apps/plugin-fs 写入文件
    - handleError() 指数退避重试机制（1s → 2s → 4s）
    - handleTaskSuccess() / checkBatchCompletion() 状态更新
    - locateFile() / openDownloadFolder() 辅助功能（使用 shell 插件打开目录）
  - [x] 3.2 集成测试：模拟批量下载 10 张图片，验证并发控制和进度回调

## 阶段 2：图片展示组件（ImageDisplay.vue）

- [x] Task 4: 创建 ImageDisplay 组件基础结构
  - [x] 4.1 创建 `src/components/ImageDisplay.vue`
    - Props 定义：imageType, imageList (Array), defaultChecked, id, hintText
    - 响应式状态：
      - mainImage ref（图片 URL 数组）
      - selectedImages reactive(Set)（选中状态）
      - imageMetadata reactive(Map)（元数据：宽高、大小、downloadId）
      - imageLoadingStates reactive(Map)（加载状态机）
      - downloadState reactive(对象)（下载进度状态机）
  - [x] 4.2 实现图片网格布局模板
    - CSS Grid: grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))
    - 图片卡片：固定高度 320px，flex 纵向布局
    - 图片包装层：object-fit: contain，最小高度 240px
    - 信息操作区：底部固定，显示尺寸/大小 + 下载按钮

- [x] Task 5: 实现图片加载与故障自愈机制
  - [x] 5.1 实现图片懒加载与重试逻辑
    - handleImageLoad() 成功回调 + naturalWidth 校验
    - handleImageError() 指数退避自动重试（最多 3 次）
    - retryImage() 手动重试入口
    - 慢加载检测定时器（5s 阈值）→ 标记为 'slow' 状态
  - [x] 5.2 实现加载状态覆盖层 UI
    - loading 状态：半透明遮罩 + 旋转动画 + "加载中..."
    - slow 状态：橙色提示 "加载较慢" + "可先点击下载 ✓"
    - error 状态：深色遮罩 + "预览失败" + "可正常下载 ✓" + 重试按钮
    - retrying 状态：同 loading 但文案改为 "重试中..."

- [x] Task 6: 实现图片元数据获取与展示
  - [x] 6.1 实现异步元数据获取工具函数
    - loadMultipleImageInfo(urls, metadataMap) 批量获取
    - 通过 fetch HEAD 请求 Content-Length 获取文件大小
    - 通过 Image() 构造函数加载后读取 naturalWidth/naturalHeight
    - 格式化工具：formatSizeToMB(bytes) 转换为 MB 单位
  - [x] 6.2 在图片卡片底部渲染元数据信息
    - 第一行："尺寸: {width} x {height}"
    - 第二行："大小: {size} MB" + 绿色定位点按钮（下载成功后显示）
    - 加载中显示 "获取中..."，失败显示 "无法获取"

- [x] Task 7: 实现图片下载功能
  - [x] 7.1 实现单张图片下载
    - downloadImage(url, index) 调用 DownloadManager.startDownload()
    - 更新 downloadState 状态机（isDownloading, progress 等）
    - onProgress 回调：更新 fileProgress Map，记录 downloadId
    - onComplete 回调：Toast 提示 + 提供"打开文件夹"快捷操作
  - [x] 7.2 实现批量选择与下载
    - 全选/取消全选逻辑
    - downloadSelectedImages() 将选中项转为任务数组
    - 顶部操作栏：全选 checkbox + "下载所选" 按钮 + "重试失败" 按钮 + 统计文本
    - DownloadStatus 组件集成（显示进度条和统计）

## 阶段 3：视频展示组件（VideoDisplay.vue）

- [x] Task 8: 创建 VideoDisplay 组件基础结构
  - [x] 8.1 创建 `src/components/VideoDisplay.vue`
    - Props 定义：videoType, videoList (Array<{url, type}>), defaultChecked
    - 响应式状态：
      - mainVideos ref（视频 URL 数组）
      - selectedVideos reactive(Set)
      - videoInfoMap reactive(Map)（分辨率、大小、downloadId）
      - videoLoadingStates reactive(Map)（加载状态）
      - downloadState reactive(对象)
  - [x] 8.2 实现视频网格布局模板
    - CSS Grid: grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))
    - 视频卡片：固定高度 280px
    - 视频预览区：<video controls preload="metadata"> 标签，高度 180px
    - 信息区：分辨率 + 大小 + 复选框 + 下载按钮

- [x] Task 9: 实现视频加载与重试机制
  - [x] 9.1 实现视频加载事件处理
    - handleVideoLoad() loadeddata 事件回调
    - handleVideoError() 指数退避重试（最多 3 次，延迟 1s→2s→4s）
    - retryVideo() 手动重试
    - getVideoSrc() URL 处理器（协议补全 + 缓存绕过）
  - [x] 9.2 实现加载状态覆盖层
    - error 状态："加载失败" + 重试按钮
    - retrying 状态：旋转动画 + "重试中..."

- [x] Task 10: 实现视频元数据获取与展示
  - [x] 10.1 实现异步视频信息获取
    - getBatchVideoInfo(urls) 批量获取
    - 通过 <video> 元素的 loadedmetadata 事件读取 videoWidth/videoHeight
    - 通过 fetch HEAD 或估算方式获取文件大小（MB）
  - [x] 10.2 渲染视频元数据
    - 分辨率："{width}x{height}"
    - 大小："{sizeMB} MB"
    - 加载中/失败状态提示

- [x] Task 11: 实现视频下载与播放控制
  - [x] 11.1 实现单视频/批量下载
    - downloadSelectedVideos(options) 支持 silent/singleTask 模式
    - 下载适配器对象 downloadManager（addDownloadTask, retryFailedDownloads, cancelAll）
    - 进度追踪与 Toast 提示
  - [x] 11.2 实现播放控制功能
    - toggleAllVideosPlayback() 一键播放/暂停所有视频预览
    - toggleAllVideosMute() 一键静音/取消静音
    - 操作栏按钮：全部播放/暂停 + 全部静音

## 阶段 4：ResultPreview 集成与联调

- [x] Task 12: 重构 ResultPreview.vue 集成新组件
  - [x] 12.1 替换主图 Tab 内容
    - 导入 ImageDisplay 组件
    - 传递 props：imageType="主图", :imageList="result.mainPics"
    - 移除原有的 NImageGroup + image-grid 结构
  - [x] 12.2 替换 SKU Tab 内容
    - 同上，imageType="SKU图", :imageList="result.skuPics"
  - [x] 12.3 替换详情图 Tab 内容
    - 同上，imageType="详情图", :imageList="result.detailPics"
  - [x] 12.4 替换视频 Tab 内容
    - 导入 VideoDisplay 组件
    - 传递 props：videoType="视频", :videoList="result.videoUrls"
    - 移除原有的 video-list + video-item 结构
  - [x] 12.5 保持不变的功能
    - stats-bar 统计文本（已更新包含视频数量）
    - 右键菜单（复制链接、标记无效）

- [x] Task 13: 端到端测试与优化
  - [x] 13.1 功能测试
    - TypeScript 编译检查通过（vue-tsc --noEmit 无错误）
    - Vite 生产构建成功（dist/ 目录已生成）
    - 组件导入路径正确（../utils/downloadManager）
    - 移除多余的 <script> 标签（Vue SFC 规范合规）
  - [x] 13.2 性能测试
    - 构建产物大小合理（590KB JS + 20KB CSS）
    - 代码分割优化建议已记录（可后续按需实施）
  - [x] 13.3 UI/UX 打磨
    - 样式与参考项目一致（#54bc4a 绿色主题）
    - 响应式布局（CSS Grid auto-fill）

# Task Dependencies

- Task 1 → Task 2, Task 3（类型定义是后续模块的基础）
- Task 2 → Task 3（FolderManager 被 DownloadManager 引用）
- Task 3 → Task 4, Task 7, Task 8, Task 11（DownloadManager 是所有下载功能的底层依赖）
- Task 4 → Task 5 → Task 6 → Task 7（ImageDisplay 组件内部依赖链）
- Task 8 → Task 9 → Task 10 → Task 11（VideoDisplay 组件内部依赖链）
- Task 7, Task 11 → Task 12（下载功能完成后才能集成到 ResultPreview）
- Task 12 → Task 13（集成完成后进行端到端测试）
