# Tasks

- [x] Task 1: 修改 `style.css` — 提升背景层级对比度并修复 body 背景
  - [x] SubTask 1.1: 浅色模式 `:root` — `--bg-base` 改为 `#ffffff`，`--bg-card` 保持 `#f5f5f7`，`--bg-elevated` 改为 `#fafafa`，`--bg-sider` 改为 `#f5f5f7`；`--text-secondary` 从 `#6e6e73` 加深为 `#515154`
  - [x] SubTask 1.2: 深色模式 `:root[data-theme="dark"]` — `--bg-base` 改为 `#000000`，`--bg-card` 改为 `#1c1c1e`，`--bg-elevated` 改为 `#2c2c2e`，`--bg-sider` 改为 `#0d0d0d`
  - [x] SubTask 1.3: 在 `body` 选择器中添加 `background-color: var(--bg-base)`

- [x] Task 2: 修改 `App.vue` — 显式设置布局背景色并补充 Naive UI 主题覆盖
  - [x] SubTask 2.1: 给 `.sider-panel` 添加 `background-color: var(--bg-sider)`
  - [x] SubTask 2.2: 给 `.app-content` 添加 `background-color: var(--bg-base)`
  - [x] SubTask 2.3: 在 `themeOverrides.common` 中补充 `bodyColor`、`cardColor`、`inputColor`、`modalColor`、`popoverColor` 等背景色覆盖（深色/浅色各一套）

- [x] Task 3: 验证构建通过
  - [x] SubTask 3.1: 运行 `vue-tsc --noEmit` 类型检查
  - [x] SubTask 3.2: 运行 `vite build` 确保构建成功

# Task Dependencies
- Task 1 必须最先完成（定义新的 CSS 变量值）
- Task 2 依赖 Task 1（需要新变量值做参考）
- Task 3 依赖 Task 1~2 全部完成