# 自动下载与元数据展示功能 Spec

## Why
当前 ResultPreview.vue 组件仅展示图片/视频的缩略图预览，缺少文件大小、分辨率等关键信息，且无法自动或手动下载资源。用户需要在抓取完成后，能够一键自动下载所有主图、SKU、详情图和视频到统一文件夹，同时每个资源卡片应显示详细元数据并提供独立下载按钮，提升工作效率。

## What Changes
- **新增** 下载管理核心模块（参考 alibaba-image-download 项目架构）
  - `src/utils/downloadManager.ts`：批量下载调度引擎（队列管理、并发控制、进度追踪）
  - `src/utils/downloadFolderManager.ts`：下载路径与命名规则管理
  - `src/utils/downloadTypes.ts`：类型定义与配置常量
- **新增** 图片组件 `src/components/ImageDisplay.vue`
  - 网格布局展示图片列表（支持主图/SKU/详情图）
  - 每张图片显示：尺寸（宽×高）、文件大小、加载状态覆盖层
  - 每张图片提供独立下载按钮
  - 支持全选、批量下载、重试失败等功能
  - 顶部操作栏显示下载状态统计
- **新增** 视频组件 `src/components/VideoDisplay.vue`
  - 网格布局展示视频列表
  - 每个视频显示：分辨率、文件大小、播放控制
  - 每个视频提供独立下载按钮
  - 支持全选、批量下载、播放/暂停控制等功能
- **修改** `src/components/ResultPreview.vue`
  - 集成 ImageDisplay 和 VideoDisplay 组件替代原有简单展示
  - 保持现有 Tab 切换结构（主图/SKU/详情图/视频）
  - 传递抓取结果数据给子组件
- **新增** Tauri 后端下载 API 封装
  - 使用 @tauri-apps/plugin-dialog 选择下载目录
  - 使用 @tauri-apps/plugin-fs 执行文件保存（如需）

## Impact
- Affected specs: 无（新功能）
- Affected code:
  - `src/components/ResultPreview.vue`（重构为容器组件）
  - 新增 `src/utils/download*.ts`（3 个文件）
  - 新增 `src/components/ImageDisplay.vue`
  - 新增 `src/components/VideoDisplay.vue`

## ADDED Requirements

### Requirement: 自动下载所有资源到统一文件夹
系统 SHALL 在用户触发"一键下载"时，将当前任务的所有主图、SKU 图、详情图、视频自动下载到用户选择的同一文件夹中。

#### Scenario: 用户点击"全部下载"按钮
- **WHEN** 用户在任意 Tab（主图/SKU/详情图/视频）的操作栏点击"下载所选"按钮
- **THEN** 系统应：
  1. 弹出文件夹选择对话框（首次下载时）
  2. 将该分类下所有已勾选的资源加入下载队列
  3. 显示实时下载进度（已完成数/总数/失败数）
  4. 按照命名规则生成文件名（如：主图1.jpg、SKU图1.png、视频1.mp4）
  5. 下载完成后提供"打开文件夹"快捷入口

#### Scenario: 用户选择特定资源下载
- **WHEN** 用户点击单个资源的"下载"按钮
- **THEN** 系统应立即开始下载该资源，并在下载成功后在按钮旁显示绿色定位点（可点击打开文件位置）

### Requirement: 展示图片/视频元数据信息
系统 SHALL 为每个加载的资源显示其关键元数据信息。

#### Scenario: 图片元数据展示
- **WHEN** 图片成功加载后
- **THEN** 在图片卡片底部显示：
  - 尺寸信息：格式为 `{宽度} x {高度}`（如：1200 x 800）
  - 文件大小：格式化为可读单位（如：1.2 MB），若获取中则显示"获取中..."，失败则显示"无法获取"
  - 若文件大小为估算值，标注"(估计值)"

#### Scenario: 视频元数据展示
- **WHEN** 视频元数据获取完成
- **THEN** 在视频卡片底部显示：
  - 分辨率：格式为 `{宽度}x{高度}`（如：1920x1080）
  - 文件大小：以 MB 为单位显示（如：15.6 MB）

### Requirement: 单独下载按钮功能
系统 SHALL 为每个资源卡片提供独立的下载操作入口。

#### Scenario: 图片卡片下载按钮
- **WHEN** 用户查看图片网格中的任意一张图片
- **THEN** 该图片卡片右下角应显示"下载"按钮，点击后：
  1. 按钮变为禁用状态并显示"下载中..."
  2. 下载完成后按钮恢复可用，旁边出现绿色定位点
  3. 定位点悬停提示："在文件夹中打开"

#### Scenario: 视频卡片下载按钮
- **WHEN** 用户查看视频网格中的任意一个视频
- **THEN** 该视频卡片操作区应显示"下载"按钮，行为同图片卡片一致

### Requirement: 下载状态管理与反馈
系统 SHALL 提供完整的下载状态追踪和用户反馈机制。

#### Scenario: 批量下载进行中
- **WHEN** 有多个资源正在下载
- **THEN** 顶部操作栏应显示：
  - 进度统计文本（如："正在下载：成功 8 / 失败 1 / 总计 10"）
  - 可视化进度条（百分比）
  - "重试失败"按钮（当有失败任务时出现）

#### Scenario: 单个资源下载完成
- **WHEN** 某个资源下载成功
- **THEN** 系统：
  1. 更新该资源的元数据记录（添加 downloadId 字段）
  2. 在资源信息区显示绿色定位点图标
  3. 弹出 Toast 提示（如："主图 下载成功"，3秒后消失，点击可打开文件夹）

### Requirement: 下载文件夹命名规则
系统 SHALL 提供智能化的文件夹命名机制。

#### Scenario: 默认命名规则
- **WHEN** 用户未自定义模板时
- **THEN** 文件夹名称格式应为：`{商品ID}_{商品标题}_{日期}`
  - 示例：`123456789_夏季连衣裙_20260521`
  - 商品标题截断至 30 字符防止路径过长
  - 自动清理文件名非法字符（Windows 兼容）

## MODIFIED Requirements

### Requirement: ResultPreview 组件重构
原有 ResultPreview.vue 的图片/视频展示逻辑 SHALL 被拆分为独立的 ImageDisplay 和 VideoDisplay 组件。

- **保持不变**：Tab 切换结构、统计数据栏、右键菜单功能
- **变更内容**：各 NTabPane 内部从简单的 NImage/video 标签替换为 ImageDisplay/VideoDisplay 组件
- **数据传递**：通过 props 传递 imageList/videoList、imageType/videoType、defaultChecked 等

## REMOVED Requirements
无（纯增量功能，不删除现有能力）

## Technical Constraints

### 架构约束
1. **Tauri v2 环境**：不能使用浏览器插件 API（browser.downloads），需改用 Tauri 的 shell/dialog/fs 插件
2. **参考实现适配**：alibaba-image-download 基于 WXT 浏览器插件框架，需将 browser.downloads.download() 替换为 Tauri 的文件系统 API
3. **并发控制**：最大并发下载数设为 5（与参考项目一致）
4. **错误处理**：失败任务自动重试 3 次（指数退避：1s → 2s → 4s）

### UI/UX 约束
1. **视觉一致性**：ImageDisplay 和 VideoDisplay 的样式风格应与参考项目的 Image.vue/Video.vue 保持一致（配色方案：#54bc4a 绿色主题）
2. **响应式布局**：使用 CSS Grid 实现自适应网格（auto-fill, minmax）
3. **交互细节**：
   - 图片悬停效果：上移 4px + 阴影加深 + 边框变绿
   - 加载状态：旋转动画 + 半透明遮罩层
   - 错误状态：深色遮罩 + 重试按钮 + "可正常下载 ✓"提示

### 性能约束
1. **懒加载**：图片使用 loading="lazy" 属性
2. **元数据异步获取**：图片/视频信息通过 fetch HEAD 请求或 video 元素的 metadata 事件异步获取，不阻塞渲染
3. **内存管理**：组件卸载时清理所有定时器和状态 Map，防止内存泄漏
