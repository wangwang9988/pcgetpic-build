# 桌面客户端首页样式精修

> 基于用户反馈，对已完成的桌面客户端首页进行 5 项精修：文案修正、色彩统一、去 emoji 化、Apple 风格对齐、教程区重设计。

## Why

桌面客户端首页的 6 个组件已全部创建，但存在以下问题：① 试用政策文案不准确（未激活也可使用软件，仅核心下载功能受限）；② 蓝色使用过多，与插件页的黑白灰+少量蓝风格不一致；③ 对比表大量使用 ❌🚀 emoji 显得不专业；④ 教程区蓝色圆圈+连接线设计不够美观；⑤ 整体缺少 Apple 风格克制感。

## What Changes

### 1. FAQ 文案修正
- **desktopFAQ.items.3.a**：从"试用期结束后需购买激活码继续使用"改为"未激活可正常使用客户端，但核心下载功能受限。激活后解锁全部功能"
- 同步更新 en-US 翻译

### 2. 色彩统一（减少蓝色，对齐插件页黑白灰风格）
- **DesktopHero**：标题从蓝色渐变改为纯黑色（`--text-primary`），移除 hero-bg 蓝色 Orb 装饰（`display: none`），与插件页 HeroSection 完全一致
- **DesktopCompare**：客户端高亮列从蓝色渐变背景改为浅色边框高亮，降低蓝色占比
- **DesktopTutorial**：步骤圆圈从蓝色填充改为灰色描边，连接线从蓝色改为浅灰
- **DesktopDownload**：保持现有样式（已与插件页一致）
- **DesktopFeatures**：保持现有样式（已与插件页 FeatureSection 一致）
- **DesktopFAQ**：保持现有样式（已是最克制的黑白灰）

### 3. 去 emoji 化
- **DesktopCompare**：移除所有 ❌ 和 🚀 emoji，替换为：
  - 插件列：灰色文字 `—` 表示不足
  - 客户端列：蓝色对勾图标（Element Plus `Check`）或 `✓` 文字
- **DesktopHero**：badge 中的 🖥️ 移除，改为纯文字

### 4. 教程区重设计（DesktopTutorial）
- 从竖排蓝色圆圈+连接线 → 改为横向卡片布局（桌面端），每张卡片：
  - 顶部：Element Plus 图标（非蓝色，使用 `--text-secondary` 灰色）
  - 步骤标签：`STEP 1` 灰色小字
  - 标题：黑色粗体
  - 描述：灰色正文
- 移动端：纵向堆叠卡片
- 移除蓝色连接线和蓝色填充圆圈

### 5. 对比表图标替换
- 插件列：`—` 或灰色 `×` 文字
- 客户端列：蓝色 `✓` 文字（或 Element Plus `Check` 图标）

## Impact

- Affected specs: `redesign-website-for-desktop-client`
- Affected code:
  - **修改** `website/app/components/DesktopHero.vue` — 标题去渐变 + 隐藏 Orb
  - **修改** `website/app/components/DesktopCompare.vue` — 替换 ❌🚀 emoji
  - **修改** `website/app/components/DesktopTutorial.vue` — 完整重设计
  - **修改** `website/i18n/locales/zh-CN.json` — FAQ 文案修正
  - **修改** `website/i18n/locales/en-US.json` — FAQ 文案修正
  - **不修改** — DesktopFeatures.vue, DesktopDownload.vue, DesktopFAQ.vue（样式已符合要求）

## ADDED Requirements

### Requirement: 试用政策文案准确性
系统 SHALL 准确描述桌面客户端的试用政策：未激活可正常使用客户端，但核心下载功能受限。

#### Scenario: 用户查看 FAQ 第 4 条
- **WHEN** 用户展开"有免费试用期吗？"
- **THEN** 看到"未激活可正常使用客户端，但核心下载功能受限。激活后解锁全部功能"
- **AND** 不再表述为"需购买激活码继续使用"

## MODIFIED Requirements

### Requirement: DesktopHero — 色彩对齐插件页
DesktopHero 的标题和背景装饰 SHALL 与插件页 HeroSection 保持一致。

**变更前**：标题使用蓝色渐变 `gradient-text`，背景有 3 个蓝色 Orb 浮动装饰
**变更后**：标题使用纯黑色 `--text-primary`，Orb 装饰隐藏（`display: none`）

#### Scenario: 首屏标题
- **WHEN** 页面加载
- **THEN** 标题为纯黑色文字，非蓝色渐变
- **AND** 无蓝色背景 Orb 装饰

### Requirement: DesktopCompare — 图标去 emoji 化
对比表的图标 SHALL 使用简洁的文字符号，而非 Emoji。

**变更前**：插件列使用 ❌，客户端列使用 🚀
**变更后**：插件列使用灰色 `—`，客户端列使用蓝色 `✓`（Element Plus `Check` 图标）

#### Scenario: 对比表图标
- **WHEN** 用户查看对比表
- **THEN** 插件列每项显示灰色 `—` 符号
- **AND** 客户端列每项显示蓝色 `✓` 符号
- **AND** 无任何 Emoji

### Requirement: DesktopTutorial — 横向卡片布局重设计
教程区 SHALL 使用横向卡片布局替代竖排编号圆圈+连接线。

**变更前**：5 个蓝色编号圆圈 + 蓝色竖线连接 + 文字描述
**变更后**：横向 5 列卡片（桌面端），每列包含：
- 灰色 Element Plus 图标
- `STEP 1` 灰色标签
- 黑色标题
- 灰色描述

#### Scenario: 桌面端教程
- **WHEN** 用户在桌面端查看教程区
- **THEN** 看到 5 张横向排列的卡片
- **AND** 每张卡片有灰色图标、灰色 STEP 标签、黑色标题、灰色描述
- **AND** 无蓝色圆圈、无连接线

#### Scenario: 移动端教程
- **WHEN** 用户在移动端查看教程区
- **THEN** 卡片纵向堆叠，保持可读性

### Requirement: DesktopHero — Badge 去 emoji
Hero Badge 的版本号徽章 SHALL 不使用 Emoji 图标。

**变更前**：`🖥️ v{version} 桌面客户端`
**变更后**：`v{version} 桌面客户端`（移除 🖥️）

#### Scenario: 版本徽章
- **WHEN** 页面加载
- **THEN** 版本徽章显示 `v{version} 桌面客户端`，无前缀 Emoji

## 非功能性要求

1. **色彩一致性**：所有新增样式严格使用 `main.css` 中定义的 CSS 变量（`--text-primary`, `--text-secondary`, `--bg-primary`, `--bg-secondary`, `--accent-blue`, `--accent-blue-light` 等）
2. **响应式**：教程区横向布局在 `≤768px` 时切换为纵向堆叠
3. **i18n**：新增/修改的 i18n key 需同步更新 zh-CN.json 和 en-US.json