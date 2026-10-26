# Tasks

- [x] Task 1: 修改 DownloadManager，支持 localStorage 持久化下载路径并封装公开接口
  - [x] SubTask 1.1: 添加 `DOWNLOAD_FOLDER_KEY = 'dangtu_download_folder'` 常量
  - [x] SubTask 1.2: 新增 `getDownloadFolderPath()` 静态方法：优先返回内存缓存，其次从 localStorage 读取并回填，仍为空返回 null
  - [x] SubTask 1.3: 新增 `selectDownloadFolder()` 静态方法：调用 Tauri openDialog 选择目录，更新内存缓存和 localStorage，返回路径或 null
  - [x] SubTask 1.4: 修改 `resetDownloadFolder()` 方法：清除内存缓存的同时删除 localStorage 中的记录
  - [x] SubTask 1.5: 修改 `startDownload()` 中的路径获取逻辑：调用 `getDownloadFolderPath()` 替代直接读取 `downloadFolderPath`

- [x] Task 2: 创建 DownloadSettings.vue 下载设置组件
  - [x] SubTask 2.1: 创建 `src/components/DownloadSettings.vue`，使用 NInput（只读）显示当前路径，placeholder 为"未设置（每次下载将询问）"
  - [x] SubTask 2.2: 实现"选择目录"按钮，调用 `DownloadManager.selectDownloadFolder()` 并更新显示
  - [x] SubTask 2.3: 实现"更改路径"按钮（已设置路径时显示），调用 `DownloadManager.selectDownloadFolder()`
  - [x] SubTask 2.4: 实现"清除设置"按钮（已设置路径时显示），调用 `DownloadManager.resetDownloadFolder()`
  - [x] SubTask 2.5: 实现"打开文件夹"按钮（已设置路径时显示），调用 `invoke('open_folder')` 打开下载根目录
  - [x] SubTask 2.6: 遵循项目深色主题和 Apple 风格设计规范，使用 Naive UI 组件

- [x] Task 3: 在 App.vue 中集成 DownloadSettings 组件
  - [x] SubTask 3.1: 在 `NCollapse` 中新增"⚙️ 下载设置"折叠项，与"📋 任务队列"并列
  - [x] SubTask 3.2: 设置折叠项默认收起，`default-expanded-names` 保持为 `['queue']`

# Task Dependencies
- [Task 2] depends on [Task 1] (设置组件需要调用 DownloadManager 的公开方法)
- [Task 3] depends on [Task 2] (集成需要组件已创建)
