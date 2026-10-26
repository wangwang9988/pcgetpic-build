# Tasks

- [x] Task 1: 建立全局 CSS 变量配色体系
  - [x] SubTask 1.1: 在 `src/style.css` 中定义 `:root`（浅色模式）和 `:root[data-theme="dark"]`（深色模式）的完整 CSS 变量体系，包含背景色、文字色、边框色、状态色、品牌色等
  - [x] SubTask 1.2: 在 `src/App.vue` 的 `NConfigProvider` 中配置 `theme-overrides`，将 Naive UI 的 primaryColor 等品牌色对齐为苹果蓝 `#0071e3`

- [x] Task 2: 重构 App.vue 和布局组件配色
  - [x] SubTask 2.1: App.vue - 将 `.sider-panel` 和 `.sider-bottom` 的边框 fallback 替换为 CSS 变量
  - [x] SubTask 2.2: StatusBar.vue - 将硬编码的 `#e0e0e0` 和 `#fff` 替换为 CSS 变量
  - [x] SubTask 2.3: ResultPreview.vue - 将 `#e0e0e0` fallback 替换为 CSS 变量

- [x] Task 3: 重构侧栏组件配色
  - [x] SubTask 3.1: ControlBar.vue - 将 `#666` 替换为 `var(--text-secondary)`
  - [x] SubTask 3.2: PlatformDetect.vue - 将 `#999` 替换为 `var(--text-tertiary)`，`#f0a020` 替换为 `var(--color-warning)`
  - [x] SubTask 3.3: TaskQueue.vue - 将所有硬编码状态色和背景色替换为 CSS 变量
  - [x] SubTask 3.4: WorkerTabs.vue - 将 `#888`/`#333`/`#666`/`#555` 替换为对应层级灰色变量

- [x] Task 4: 重构 ImageDisplay.vue 配色
  - [x] SubTask 4.1: 将所有硬编码背景色（`#f8fafc`/`#f7f8fa`/`#ffffff`/`white`）替换为 CSS 变量
  - [x] SubTask 4.2: 将所有硬编码文字色（`#1a202c`/`#666`/`#4a5568`）替换为 CSS 变量
  - [x] SubTask 4.3: 将所有硬编码边框色（`#d1d5db`/`#edf2f7`）替换为 CSS 变量
  - [x] SubTask 4.4: 将品牌色 `#54bc4a`/`#4aad40` 替换为 `var(--color-primary)`/`var(--color-primary-hover)`
  - [x] SubTask 4.5: 将提示/警告色（`#e65100`/`#fff3e0`/`#ffe0b2`/`#fbbf24`/`#86efac`）替换为 CSS 变量
  - [x] SubTask 4.6: 将按钮样式（背景/边框/hover/disabled）全部替换为 CSS 变量

- [x] Task 5: 重构 VideoDisplay.vue 配色
  - [x] SubTask 5.1: 将所有硬编码背景色替换为 CSS 变量
  - [x] SubTask 5.2: 将所有硬编码文字色替换为 CSS 变量
  - [x] SubTask 5.3: 将所有硬编码边框色替换为 CSS 变量
  - [x] SubTask 5.4: 将品牌色替换为 `var(--color-primary)`/`var(--color-primary-hover)`
  - [x] SubTask 5.5: 将按钮样式全部替换为 CSS 变量

- [x] Task 6: 重构 Toast 和 DownloadStatus 配色
  - [x] SubTask 6.1: Toast.vue - 将 Material Design 配色替换为苹果风格状态色变量
  - [x] SubTask 6.2: DownloadStatus.vue - 将所有硬编码颜色替换为 CSS 变量

- [x] Task 7: 验证构建和视觉效果
  - [x] SubTask 7.1: 运行 `vue-tsc --noEmit` 确保类型检查通过
  - [x] SubTask 7.2: 运行 `vite build` 确保构建通过

# Task Dependencies
- Task 1 必须最先完成（定义 CSS 变量体系）
- Task 2~6 依赖 Task 1，但彼此之间可以并行
- Task 7 依赖 Task 2~6 全部完成
