# Tasks

- [ ] Task 1: 新增版本检查工具函数 `GetPic/utils/updateChecker.ts`
  - [ ] SubTask 1.1: 定义 `UPDATE_REMINDER_ENABLED = false` 全局开关常量
  - [ ] SubTask 1.2: 实现 `parseVersion(versionStr)` — 将版本号解析为 `{ major, minor, build }` 三段数字
  - [ ] SubTask 1.3: 实现 `shouldCheckUpdate(localVersion)` — 简化判断：major ≥ 3 不提醒；major < 3 时比较 build，低于线上则提醒
  - [ ] SubTask 1.4: 实现 `fetchLatestVersion()` — 请求 `https://downpictures.com/version.json`，提取 `extensionVersion`，10 秒超时
  - [ ] SubTask 1.5: 实现 `checkForUpdate()` — 检查 `browser.storage.local` 缓存（24 小时有效期），缓存失效则请求远程，综合判断返回 `{ hasUpdate, latestVersion, localVersion }`

- [ ] Task 2: 新增更新提醒 composable `GetPic/composables/useUpdateReminder.ts`
  - [ ] SubTask 2.1: 实现响应式状态管理（`hasUpdate` / `latestVersion` / `localVersion` / `dismissed`）
  - [ ] SubTask 2.2: 实现 `checkUpdate()` — 调用 `checkForUpdate()`，更新响应式状态
  - [ ] SubTask 2.3: 实现 `dismissReminder()` — 通过 `browser.storage.session` 记录本次会话已关闭
  - [ ] SubTask 2.4: 实现 `openUpdatePage(source)` — 打开官网更新页面，带 source 参数

- [ ] Task 3: 新增 popup 更新提醒组件 `GetPic/components/popupvues/UpdateReminder.vue`
  - [ ] SubTask 3.1: 实现横幅 UI（醒目渐变背景，含提示文字 + 前往官网按钮 + 关闭按钮）
  - [ ] SubTask 3.2: 组件挂载时调用 `useUpdateReminder` 检查更新
  - [ ] SubTask 3.3: 条件渲染 — 仅在 `UPDATE_REMINDER_ENABLED && hasUpdate && !dismissed` 时显示

- [ ] Task 4: 新增 pages 更新提醒组件 `GetPic/components/pagesvues/UpdateReminder.vue`
  - [ ] SubTask 4.1: 实现横幅 UI（与 popup 风格一致，适配 pages 页面宽度）
  - [ ] SubTask 4.2: 组件挂载时调用 `useUpdateReminder` 检查更新
  - [ ] SubTask 4.3: 条件渲染 — 仅在 `UPDATE_REMINDER_ENABLED && hasUpdate && !dismissed` 时显示

- [ ] Task 5: 集成到 popup 和 pages 页面
  - [ ] SubTask 5.1: 修改 `entrypoints/popup/App.vue` — 在 Linkcopyright 上方引入 UpdateReminder 组件
  - [ ] SubTask 5.2: 修改 `entrypoints/pages/App.vue` — 在页面顶部引入 UpdateReminder 组件

# Task Dependencies
- [Task 1] depends on nothing
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2]
- [Task 5] depends on [Task 3, Task 4]
