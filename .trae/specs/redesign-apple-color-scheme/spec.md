# 苹果黑白灰风格配色重构 Spec

## Why
项目当前存在 110+ 处硬编码颜色值，大量浅色模式专用色在深色模式下刺眼或不可见，灰色色阶混乱（#666/#888/#999/#4a5568/#718096/#555 语义重复），Toast 使用 Material Design 配色与项目主色不协调，边框 fallback 值不一致。需要按照苹果黑白灰风格统一重构整个项目的配色体系。

## What Changes
- 在 `style.css` 中建立全局 CSS 变量体系，定义深色/浅色两套配色方案（苹果黑白灰风格）
- 在 `App.vue` 的 `NConfigProvider` 中配置 `theme-overrides`，将 Naive UI 品牌色对齐为苹果风格
- 重构所有组件中的硬编码颜色，替换为 CSS 变量引用
- 统一灰色色阶为 4 级（primary/secondary/tertiary/disabled）
- 统一 `var(--n-border-color)` 的 fallback 值
- Toast 配色对齐苹果风格

## Impact
- Affected code: `src/style.css`, `src/App.vue`, 以及所有包含硬编码颜色的组件（StatusBar, ControlBar, PlatformDetect, TaskQueue, WorkerTabs, ResultPreview, ImageDisplay, VideoDisplay, Toast, DownloadStatus）

## ADDED Requirements

### Requirement: 全局 CSS 变量配色体系
系统 SHALL 在 `src/style.css` 中通过 `:root` 和 `:root[data-theme="dark"]` 定义完整的苹果黑白灰风格 CSS 变量体系。

#### Scenario: 深色模式配色
- **WHEN** 应用以深色模式运行
- **THEN** 背景色为 `#1d1d1f`（苹果深灰），卡片背景为 `#2d2d2f`，边框色为 `rgba(255,255,255,0.08)`，主文字色为 `#f5f5f7`，次要文字色为 `#86868b`

#### Scenario: 浅色模式配色
- **WHEN** 应用以浅色模式运行
- **THEN** 背景色为 `#f5f5f7`（苹果浅灰），卡片背景为 `#ffffff`，边框色为 `rgba(0,0,0,0.08)`，主文字色为 `#1d1d1f`，次要文字色为 `#86868b`

### Requirement: Naive UI 主题覆盖
系统 SHALL 通过 `NConfigProvider` 的 `theme-overrides` 属性统一配置 Naive UI 组件的品牌色和关键颜色，确保所有 Naive UI 组件自动继承苹果风格配色。

#### Scenario: 品牌色统一
- **WHEN** Naive UI 组件需要显示品牌色（如按钮、进度条、标签）
- **THEN** 使用苹果蓝 `#0071e3` 作为主色调

### Requirement: 灰色色阶统一
系统 SHALL 定义 4 级灰色色阶，替换当前散落的 6+ 种灰色值。

#### Scenario: 灰色层级使用
- **WHEN** 组件需要显示不同层级的灰色文字
- **THEN** 使用 `--text-primary`（主文字）、`--text-secondary`（次要文字）、`--text-tertiary`（辅助文字）、`--text-disabled`（禁用文字）

### Requirement: 组件硬编码颜色消除
系统 SHALL 将所有组件中的硬编码颜色值替换为 CSS 变量引用，确保深色/浅色模式自动适配。

#### Scenario: ImageDisplay/VideoDisplay 深色模式适配
- **WHEN** 应用以深色模式运行
- **THEN** ImageDisplay 和 VideoDisplay 的卡片背景、文字色、边框色、按钮样式均正确显示，无刺眼的白色块或不可见的深色文字

#### Scenario: TaskQueue 状态色深色模式适配
- **WHEN** 应用以深色模式运行
- **THEN** TaskQueue 中 running/completed/failed/needsIntervention 状态的文字色和背景色均清晰可辨且不刺眼

### Requirement: Toast 配色对齐
系统 SHALL 将 Toast 组件的配色从 Material Design 风格改为苹果风格。

#### Scenario: Toast 成功提示
- **WHEN** 显示成功 Toast
- **THEN** 使用苹果绿色系背景，而非 Material Design 的 `#4caf50`

### Requirement: 边框色统一
系统 SHALL 统一所有 `var(--n-border-color)` 的 fallback 值，消除不一致。

#### Scenario: 边框 fallback 一致性
- **WHEN** 任何组件使用 `var(--n-border-color)` 并提供 fallback
- **THEN** fallback 值与当前主题模式匹配（深色用 `rgba(255,255,255,0.08)`，浅色用 `rgba(0,0,0,0.08)`）

## MODIFIED Requirements

### Requirement: 项目主色
原项目主色为 `#54bc4a`（绿色），现改为苹果蓝 `#0071e3`，以符合苹果黑白灰风格。所有使用 `#54bc4a`/`#4aad40` 的地方统一替换。

### Requirement: 状态色体系
原状态色使用 Material Design 色板，现改为苹果风格状态色：
- 成功：`#30d158`（苹果绿）
- 警告：`#ff9f0a`（苹果橙）
- 错误：`#ff453a`（苹果红）
- 信息：`#0071e3`（苹果蓝）
- 运行中：`#0a84ff`（苹果亮蓝）
