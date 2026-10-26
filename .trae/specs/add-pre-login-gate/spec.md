# 抓取前预登录门控 Spec（简化版 v2）

## Why

大部分电商平台的详情页需要登录才能正常获取图片 URL，但当前系统仅在 Worker 抓取过程中被动检测登录状态（CaptchaBlocked 机制），用户往往在多个 Worker 同时触发登录拦截后才意识到未登录。需要在抓取开始前提供一个**极简**的预登录机制——点击按钮后为每个未登录平台同时弹出一个独立的登录窗口，用户在这些窗口中登录产生 Cookie，后续抓取 Worker 自动共享这些 Cookie。

## What Changes

- 新增 Rust 端 Tauri 命令 `open_login_window`：为指定平台创建一个**独立**的 WebView 登录窗口，显示该平台的第一条任务 URL
- 新增 Rust 端辅助函数 `calculate_cascade_position` 和 `get_platform_label`
- 修改 `PlatformDetect.vue`：顶部增加预登录提示横幅 + 一键预登录入口
- 修改 `ControlBar.vue`：点击"开始抓取"时检查预登录状态，弹出确认对话框
- 修改 `taskQueue` store：新增预登录状态管理（简化版）
- 修改 `useIpcListener.ts`：监听登录窗口关闭事件

## Impact

- Affected code:
  - `src-tauri/src/lib.rs` — 新增 1 个 Tauri 命令 + 2 个辅助函数
  - `src/components/PlatformDetect.vue` — UI 增强（横幅 + 按钮）
  - `src/components/ControlBar.vue` — 启动前门控逻辑
  - `src/stores/taskQueue.ts` — 新增预登录状态管理
  - `src/composables/useIpcListener.ts` — 新增事件监听

> **注意**：本方案不新增任何文件，仅修改上述 5 个文件。

> **注意**：本方案**不需要** `close_login_window` / `close_all_login_windows` 命令。登录窗口一旦弹出就不再管理，由用户自行关闭。这避免了复杂的生命周期管理和潜在的死锁问题。

## 关键设计决策

### 决策 1：同时弹出所有平台的登录窗口（非串联式）

当用户点击"一键预登录"时，系统**同时**为每个未登录平台打开一个登录窗口。理由：
1. 简单直接——有几个平台就开几个窗口，无需串联调度
2. 用户可以并行操作——在淘宝登录的同时去京东登录，效率更高
3. 避免串联流程的复杂性（事件递归、状态机、异常恢复等）

### 决策 2：登录窗口完全独立，不受并发数限制

| 属性 | 登录窗口 | 抓取 Worker |
|------|---------|------------|
| 数量限制 | 无（有 N 个平台就开 N 个） | 受用户设置的并发数限制 |
| 与抓取的关系 | 完全无关 | 核心工作线程 |
| 窗口标签 | `login-{platform}` | `worker-{id}-{taskId}` |
| 目的 | 让用户登录产生 Cookie | 抓取商品数据 |
| 生命周期 | 弹出后不管，用户自行关闭 | 受系统调度控制 |

### 决策 3：不需要关闭命令

登录窗口一旦弹出就不再管理。理由：
1. 避免复杂的状态追踪和生命周期管理
2. 避免 `window.close()` 可能导致的死锁风险（踩坑记录铁律）
3. 用户可以自己关掉窗口
4. 即使窗口一直开着也不影响抓取——它只是一个普通的 WebView 窗口

### 决策 4：登录窗口使用与 Worker 相同的 cookie 目录

通过 `data_directory(cookie_dir)` 共享 Cookie 目录，确保用户在登录窗口中产生的 Cookie 能被后续的抓取 Worker 自动继承。这是整个方案的核心技术基础。

### 决策 5：登录窗口零脚本注入

登录窗口**不注入任何脚本、不拦截导航、不检测登录状态**。理由：
1. 安全性——这是用户手动操作的空间，系统不应干预
2. 避坑——参考踩坑记录，CaptchaBlocked 状态下注入任何导航脚本都可能导致死循环
3. 通用性——不依赖平台特定逻辑，所有平台无需额外适配

### 决策 6：关闭窗口 = 确认已登录（简单标记）

当用户关闭登录窗口时，前端将该平台标记为"已确认登录"。这不是精确检测，而是一种信任机制：
1. 用户主动关闭窗口意味着他们认为已经完成登录
2. 即使误标记，后续 Worker 的 CaptchaBlocked 机制仍会兜底
3. 不注入任何脚本符合登录窗口的设计原则

## 窗口类型对比

| 属性 | 登录窗口 | 抓取 Worker |
|------|---------|------------|
| 窗口标签 | `login-{platform}` | `worker-{id}-{taskId}` |
| 初始 URL | 该平台第 1 条任务 URL | 任务 URL / 等待页面 |
| Cookie 目录 | 共享 `data_directory` ✅ | 共享 `data_directory` ✅ |
| 注入脚本 | ❌ 无 | ✅ scraper bundle |
| 导航回调 | ❌ 无 | ✅ 登录检测 |
| 页面加载回调 | ❌ 无 | ✅ bundle 注入 |
| 关闭行为 | 发送 `login-window-closed` | 发送 task-failed/complete |
| 用户操作 | 自由登录、浏览 | 系统控制 |
| 窗口标题 | `登录 - {平台中文名}` | `Worker {id} - {platform}` |
| 创建方式 | `std::thread::spawn` + 延迟 | `std::thread::spawn` + 延迟 |

## ADDED Requirements

### Requirement: 登录 WebView 窗口创建

系统 SHALL 提供 `open_login_window` Tauri 命令，为指定平台创建一个**独立的** WebView 窗口用于用户登录。

#### 窗口属性

| 属性 | 值 |
|------|-----|
| 窗口标签 | `login-{platform}` |
| 窗口标题 | `登录 - {平台中文名}`（通过 `get_platform_label` 获取） |
| 初始 URL | 该平台任务列表中的第一条 URL |
| Cookie 目录 | 与 Worker 窗口共享同一 `data_directory` |
| 窗口尺寸 | 1024 x 768 |
| 级联偏移 | 基于 `calculate_cascade_position` 计算，不同平台窗口错开显示 |
| 注入脚本 | 无（不注入任何 scraper 脚本） |
| 导航回调 | 无（不拦截导航，用户自由操作） |
| 页面加载回调 | 无（不注入脚本，不检测登录状态） |
| 关闭事件 | 向前端发送 `login-window-closed` 事件 |

#### 创建方式（关键！必须遵守）

```
open_login_window(platform, url):
  1. 检查窗口是否已存在 → 聚焦并返回
  2. 获取 cookie_dir（锁内）→ 释放锁
  3. std::thread::spawn:
     a. sleep 500ms（给主线程喘息时间，避免 WebView2 初始化卡住）
     b. 构建 WebviewWindowBuilder
        - .on_window_event() 在 builder 上注册（.build() 之前）
        - .build() 创建窗口
     c. println 日志
  4. 命令处理器立即返回 Ok(())
```

> ⚠️ **铁律**：WebView2 窗口创建必须在 `std::thread::spawn` 中执行，且需要延迟。参考踩坑记录 `多商品并发抓取卡死与窗口死锁问题排查及修复说明.md`，在 Tauri 命令处理器中直接 `.build()` 会导致空白窗口和卡死。

#### Scenario: 为淘宝平台打开登录窗口

- **WHEN** 前端调用 `invoke('open_login_window', { platform: 'taobao', url: 'https://item.taobao.com/xxx.htm' })`
- **THEN** 系统在独立线程中创建标签为 `login-taobao` 的 WebView 窗口，标题为"登录 - 淘宝/天猫"，导航到指定 URL，使用与 Worker 相同的 cookie 目录

#### Scenario: 同一平台重复打开登录窗口

- **WHEN** 前端调用 `open_login_window` 但 `login-{platform}` 窗口已存在
- **THEN** 系统将已有窗口聚焦到前台（`set_focus`），不创建新窗口

#### Scenario: 登录窗口被用户关闭

- **WHEN** 用户关闭登录窗口
- **THEN** Rust 端通过 `on_window_event` 检测到关闭事件，向前端发送 `login-window-closed` 事件，payload 包含 `{ platform: string }`

### Requirement: 辅助函数 calculate_cascade_position

系统 SHALL 提供 `calculate_cascade_position` 辅助函数，基于平台名称的字节哈希值计算窗口级联偏移位置，避免不同平台的登录窗口重叠。

- 基础位置为屏幕中央
- 基于 platform 名称的字节累加哈希计算偏移量
- 偏移步长 40px，确保不同平台窗口错开显示
- 结果限制在屏幕可见范围内

### Requirement: 辅助函数 get_platform_label

系统 SHALL 提供 `get_platform_label` 辅助函数，将平台标识符映射为中文显示名称（如 `taobao` → `淘宝/天猫`，`jd` → `京东`，`ali1688` → `1688` 等），未匹配时返回原平台标识符。

### Requirement: PlatformDetect 预登录提示横幅

系统 SHALL 在 `PlatformDetect.vue` 顶部显示一个预登录提示横幅，当存在 ≥1 个未登录平台时显示。

#### 横幅内容

- 提示文案："💡 建议在抓取商品前预登录账号"
- 补充说明："预先登录可以有效避免抓取中途的登录拦截和数据不完整。"
- 操作按钮："🔑 一键预登录 (N个平台)"

#### 横幅样式

- 采用 Glassmorphism 磨砂质感（`backdrop-filter: blur(12px)`）
- 警告色调（`rgba(255, 161, 22, 0.08)` 背景 + `rgba(255, 161, 22, 0.2)` 边框）
- 入场动画（`slideDown` 0.4s cubic-bezier）

#### Scenario: 所有平台已登录时隐藏横幅

- **WHEN** 所有平台均已标记为"已登录"
- **THEN** 预登录提示横幅不显示

#### Scenario: 运行中隐藏横幅

- **WHEN** 系统正在抓取中（`isRunning = true`）
- **THEN** 预登录提示横幅不显示

### Requirement: 一键预登录（同时弹出所有平台）

系统 SHALL 在预登录提示横幅中提供"🔑 一键预登录"按钮，**同时**为所有未登录平台打开登录窗口。

#### 同时弹出流程逻辑

1. 获取所有未登录平台列表
2. 对每个未登录平台，调用 `invoke('open_login_window', { platform, url: group.urls[0] })`
3. 所有窗口几乎同时弹出（每个都在独立线程中异步创建）

#### Scenario: 一键预登录多个平台

- **WHEN** 用户输入了 6 条链接，分属淘宝(3条)、京东(3条) 两个平台，且均未登录
- **THEN** PlatformDetect 顶部显示"🔑 一键预登录 (2个平台)"按钮
- **WHEN** 用户点击该按钮
- **THEN** 系统**同时**打开淘宝和京东两个登录窗口，分别显示各自平台的第一条链接
- **WHEN** 用户在淘宝登录窗口完成登录并关闭
- **THEN** 前端收到 `login-window-closed` 事件，淘宝标记为 🟢 已登录
- **WHEN** 用户在京东登录窗口完成登录并关闭
- **THEN** 前端收到 `login-window-closed` 事件，京东标记为 🟢 已登录，所有平台已登录，横幅消失

### Requirement: PlatformDetect 平台卡片登录状态与操作

系统 SHALL 在 `PlatformDetect.vue` 的每个平台卡片上增加登录状态指示器和登录操作按钮。

#### 登录状态指示器

| 状态 | 显示 | 条件 |
|------|------|------|
| 未登录 | 🔴 小圆点 | 平台不在 `loggedInPlatforms` 中且无登录窗口打开 |
| 登录中 | 🟡 小圆点 | 该平台的登录窗口已打开 |
| 已登录 | 🟢 小圆点 | 平台在 `loggedInPlatforms` 中 |

- 未登录红色圆点带脉冲动画（2s 循环，opacity 0.5~1）
- 已登录卡片左侧绿色边框指示（3px solid #30d158）

#### 登录操作按钮

- 每个平台卡片右侧增加"🔐 登录"按钮（已登录状态时变为"✅ 已登录"不可点击）
- 点击"🔐 登录"调用 `invoke('open_login_window', { platform, url: group.urls[0] })`
- `unknown` 平台不显示登录按钮和登录状态指示器

#### Scenario: 用户点击平台卡片的登录按钮

- **WHEN** 用户点击淘宝平台卡片的"🔐 登录"按钮
- **THEN** 系统调用 `open_login_window` 打开登录窗口，卡片状态更新为"登录中..."

#### Scenario: 用户关闭登录窗口后状态更新

- **WHEN** 用户在登录窗口完成登录并关闭窗口
- **THEN** 前端收到 `login-window-closed` 事件，自动将该平台标记为"已登录"，卡片状态更新为 🟢

### Requirement: 抓取启动前预登录门控

系统 SHALL 在用户点击"开始抓取当前平台"或"全部平台依次抓取"时，检查目标平台的预登录状态，如有未登录平台则弹出确认对话框。

#### 确认对话框（2 按钮设计）

使用 NaiveUI 的 `dialog.warning`：

```
⚠️ 以下平台尚未确认登录：
  • 淘宝/天猫 (3条链接)
  • 1688 (3条链接)

未登录可能导致抓取失败或数据不完整。

[已登录，直接开始]  [去登录]
```

- **已登录，直接开始**（positiveText）：将未登录平台标记为已登录，继续执行抓取
- **去登录**（negativeText）：关闭对话框，为未登录平台同时打开登录窗口，不执行抓取
- **取消**：点击遮罩层或按 ESC 关闭对话框，不执行抓取

#### Scenario: 所有平台已预登录，直接开始

- **WHEN** 用户点击"开始抓取当前平台"且该平台已标记为"已登录"
- **THEN** 直接执行抓取流程，不弹出确认对话框

#### Scenario: 部分平台未预登录

- **WHEN** 用户点击"全部平台依次抓取"，其中淘宝和 1688 未预登录
- **THEN** 弹出确认对话框列出未登录平台
- **WHEN** 用户点击"去登录"
- **THEN** 关闭对话框，**同时**为淘宝和 1688 打开登录窗口，不执行抓取
- **WHEN** 用户点击"已登录，直接开始"
- **THEN** 将淘宝和 1688 标记为已登录，执行抓取流程

### Requirement: 预登录状态管理

系统 SHALL 在 `taskQueue` store 中管理预登录状态（简化版）。

#### 新增状态

| 字段 | 类型 | 说明 |
|------|------|------|
| `loggedInPlatforms` | `Ref<Set<string>>` | 已确认登录的平台集合 |
| `loginOpenPlatforms` | `Ref<Set<string>>` | 登录窗口已打开的平台集合 |

#### 新增方法

| 方法 | 说明 |
|------|------|
| `openLogin(platform: string, url: string)` | 调用 `open_login_window` IPC，将平台加入 `loginOpenPlatforms` |
| `markPlatformLoggedIn(platform: string)` | 将平台从 `loginOpenPlatforms` 移至 `loggedInPlatforms` |
| `isPlatformLoggedIn(platform: string): boolean` | 检查平台是否已登录 |
| `isPlatformLoggingIn(platform: string): boolean` | 检查平台是否正在登录中 |
| `getUnloggedInPlatforms(): string[]` | 获取所有有任务但未登录的平台列表 |
| `openAllLoginWindows()` | 为所有未登录平台同时打开登录窗口 |
| `resetPreLoginState()` | 重置所有预登录状态（停止抓取时调用） |

#### Scenario: 停止抓取时重置预登录状态

- **WHEN** 用户点击"停止"按钮
- **THEN** `stopAndReset()` 方法中调用 `resetPreLoginState()`，清空 `loggedInPlatforms` 和 `loginOpenPlatforms`

> **注意**：停止抓取时**不关闭**登录窗口——登录窗口是独立的，由用户自行管理。

### Requirement: 登录窗口关闭事件监听

系统 SHALL 在 `useIpcListener.ts` 中监听 `login-window-closed` 事件，自动更新预登录状态。

#### Scenario: 登录窗口关闭事件处理

- **WHEN** Rust 端发送 `login-window-closed` 事件，payload 为 `{ platform: 'taobao' }`
- **THEN** 前端调用 `taskQueueStore.markPlatformLoggedIn('taobao')`，PlatformDetect 中淘宝卡片状态更新为 🟢 已登录

## MODIFIED Requirements

### Requirement: PlatformDetect 平台卡片布局

原有布局：平台图标 + 平台名称 + 链接数量标签 + 进度条 + 手动指定平台下拉框。
现修改为：
- 顶部新增：预登录提示横幅（条件显示）
- 卡片布局修改为：平台图标 + 平台名称 + 链接数量标签 + 登录状态指示器 + 登录按钮 + 进度条 + 手动指定平台下拉框

### Requirement: ControlBar 启动抓取流程

原有流程：点击"开始抓取"→ 直接调用 IPC 命令启动。
现修改为：点击"开始抓取"→ 检查预登录状态 → 如有未登录平台则弹出 2 按钮确认对话框 → 用户确认后调用 IPC 命令启动。

### Requirement: taskQueue store 的 stopAndReset 方法

原有逻辑：重置运行状态 + 重置任务状态 + 重置 Worker 状态。
现修改为：增加 `resetPreLoginState()` 调用（仅重置状态，不关闭登录窗口）。

## REMOVED Requirements

无
