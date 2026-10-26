# 修复背景色与文字对比度 Spec

## Why
当前配色方案虽然使用了苹果黑白灰色值，但存在三个核心问题导致"背景色与文字太接近"：
1. **body/html 无背景色**，依赖 Naive UI 默认主题，与 CSS 变量 `--bg-base` 不一致
2. **侧栏和内容区未显式设置背景**，`--bg-sider` 定义了但从未使用
3. **深色模式三层背景对比度极弱**（`#1d1d1f` → `#2d2d2f` → `#3a3a3c` 全在 30 个色阶内），表面层次不清

## What Changes
- `style.css`：提升背景层级对比度，浅色模式底座改为纯白 `#ffffff`，深色模式底座改为纯黑 `#000000`；body 添加背景色
- `App.vue`：侧栏和内容区显式设置背景色；NConfigProvider 补充 bodyColor/cardColor/inputColor/modalColor 等主题覆盖
- 所有使用 `--bg-sider` 或 `--bg-base` 的组件检查一致性

## Impact
- Affected specs: `redesign-apple-color-scheme`
- Affected code: `src/style.css`, `src/App.vue`

## MODIFIED Requirements

### Requirement: 全局 CSS 背景层级体系
系统 SHALL 在 `:root` 和 `:root[data-theme="dark"]` 中定义 **3 级差异化背景**，确保各层级之间有足够对比度。

#### Scenario: 浅色模式背景层级
- **WHEN** 应用以浅色模式运行
- **THEN** `--bg-base` 为 `#ffffff`（纯白），`--bg-card` 为 `#f5f5f7`（苹果浅灰），`--bg-elevated` 为 `#fafafa`（微灰），`--bg-sider` 为 `#f5f5f7`
- **AND** `--bg-base` 与 `--text-primary` 对比度 ≥ 16:1

#### Scenario: 深色模式背景层级
- **WHEN** 应用以深色模式运行
- **THEN** `--bg-base` 为 `#000000`（纯黑），`--bg-card` 为 `#1c1c1e`，`--bg-elevated` 为 `#2c2c2e`，`--bg-sider` 为 `#0d0d0d`
- **AND** `--bg-base` 与 `--text-primary` 对比度 ≥ 20:1
- **AND** `--bg-sider`（深色侧栏）与 `--bg-base`（主区）有明显视觉区分（≥ 10 个色阶差）

#### Scenario: body 背景色显式设置
- **WHEN** 页面渲染
- **THEN** `body` 元素 SHALL 设置 `background-color: var(--bg-base)`，确保全局基底色与 CSS 变量一致

### Requirement: App.vue 布局背景显式应用
系统 SHALL 在 App.vue 的 `.sider-panel` 和 `.app-content` 中显式设置背景色。

#### Scenario: 侧栏背景
- **WHEN** 侧栏面板渲染
- **THEN** `.sider-panel` 的 `background-color` 为 `var(--bg-sider)`，使侧栏与主内容区有视觉分隔

#### Scenario: 主内容区背景
- **WHEN** 主内容区渲染
- **THEN** `.app-content` 的 `background-color` 为 `var(--bg-base)`

### Requirement: Naive UI 背景色主题覆盖
系统 SHALL 在 `NConfigProvider` 的 `theme-overrides.common` 中补充以下背景色覆盖，确保 Naive UI 组件背景与项目 CSS 变量一致（**BREAKING**：将影响所有 Naive UI 组件的外观）。

#### Scenario: Naive UI 组件背景色统一
- **WHEN** Naive UI 组件渲染（如 NInput, NCollapse, NModal, NPopover）
- **THEN** 其背景色与项目 CSS 变量对齐：
  - `bodyColor` = `var(--bg-base)` 对应值
  - `cardColor` = `var(--bg-card)` 对应值
  - `inputColor` = `var(--bg-elevated)` 对应值
  - `modalColor` = `var(--bg-elevated)` 对应值
  - `popoverColor` = `var(--bg-elevated)` 对应值

### Requirement: 浅色模式文字色增强
浅色模式下，次要文字色对比度不足（`#6e6e73` 在 `#f5f5f7` 上仅 ~4.5:1），需要加深以提升可读性。

#### Scenario: 浅色模式文字色
- **WHEN** 应用以浅色模式运行
- **THEN** `--text-secondary` 为 `#515154`（比原 `#6e6e73` 深 10 个色阶），确保在 `#f5f5f7` 背景上对比度 ≥ 6:1