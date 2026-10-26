# Tasks

- [ ] Task 1: 新增 Rust 升级命令模块 `commands/upgrade.rs`
  - [ ] SubTask 1.1: 实现 `check_for_update` 命令 — 请求线上 version.json，比较版本号，返回更新信息
  - [ ] SubTask 1.2: 实现 `download_update` 命令 — 下载 EXE 文件，不校验授权，上报进度/完成/失败事件
  - [ ] SubTask 1.3: 在 `lib.rs` 中注册新命令到 `invoke_handler`

- [ ] Task 2: 新增前端升级类型定义 `src/types/upgrade.ts`
  - [ ] SubTask 2.1: 定义 `UpdateCheckResult` 接口（has_update / latest_version / download_filename）
  - [ ] SubTask 2.2: 定义 `UpdateDownloadState` 类型（idle / downloading / completed / failed）

- [ ] Task 3: 新增前端升级状态管理 `src/stores/upgradeStore.ts`
  - [ ] SubTask 3.1: 实现 `checkForUpdate()` — 调用 Rust `check_for_update`，更新状态
  - [ ] SubTask 3.2: 实现启动后 30~60 分钟随机延迟定时器 + 24 小时周期检查
  - [ ] SubTask 3.3: 实现 `downloadUpdate()` — 获取下载路径，调用 Rust `download_update`
  - [ ] SubTask 3.4: 监听 IPC 事件（update-download-progress / complete / failed），更新下载状态

- [ ] Task 4: 新增升级通知组件 `src/components/UpgradeNotice.vue`
  - [ ] SubTask 4.1: 实现有更新时的图标 + 呼吸动画
  - [ ] SubTask 4.2: 实现下载进度指示
  - [ ] SubTask 4.3: 实现下载完成/失败状态
  - [ ] SubTask 4.4: 实现点击弹出确认对话框（当前版本 vs 最新版本 + 立即下载/稍后提醒）

- [ ] Task 5: 集成到 StatusBar
  - [ ] SubTask 5.1: 在 StatusBar.vue 中引入 UpgradeNotice 组件，放置在 UpgradeCountdown 和 LicenseStatus 之间

# Task Dependencies
- [Task 2] depends on nothing (可并行)
- [Task 1] depends on nothing (可并行)
- [Task 3] depends on [Task 1, Task 2]
- [Task 4] depends on [Task 2, Task 3]
- [Task 5] depends on [Task 4]
