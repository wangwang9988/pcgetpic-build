# 桌面客户端优势展示区重构

> 将 DesktopCompare 从"插件 vs 客户端"对比表重构为纯客户端优势展示，不提及插件版，不拉踩免费产品。

## Why

当前 DesktopCompare 组件采用"免费插件版 vs 桌面客户端"三列对比表布局，插件列展示不足（灰色 —），客户端列展示优势（✓）。这种拉踩式对比有两个问题：① 插件版是免费产品，用来吸引流量，不应被贬低；② 对比表暗示插件版"不行"，与产品策略矛盾。应改为只展示桌面客户端自身优势，正面宣传付费版价值。

## What Changes

- **重构 DesktopCompare.vue**：从三列对比表（功能维度 / 免费插件版 / 桌面客户端）改为两列优势卡片（图标 + 标题 + 描述），仅展示桌面客户端的 6 大优势
- **重构 i18n 数据**：移除 `colFeature`、`colPlugin`、`colClient` 列标题和 `plugin` 字段，改为 `icon`、`title`、`desc` 结构
- **移除对比相关样式**：删除 `.compare-col-plugin`、`.compare-icon.fail`、`.card-row-plugin` 等对比表专用样式
- **新增优势卡片样式**：类似 DesktopFeatures 的卡片布局，但更侧重"为什么选择"的营销表达

## Impact

- Affected specs: `refine-desktop-homepage-style`（前次精修的对比表图标部分将被完全替换）
- Affected code:
  - **修改** `website/app/components/DesktopCompare.vue` — 模板 + 脚本 + 样式全面重构
  - **修改** `website/i18n/locales/zh-CN.json` — `desktopCompare` 数据结构变更
  - **修改** `website/i18n/locales/en-US.json` — `desktopCompare` 数据结构变更

## ADDED Requirements

### Requirement: 桌面客户端优势展示（无对比）
DesktopCompare 组件 SHALL 仅展示桌面客户端的优势，不提及插件版，不使用对比布局。

#### Scenario: 用户查看优势展示区
- **WHEN** 用户滚动到桌面客户端首页的"为什么选择"区域
- **THEN** 看到 6 个优势卡片，每个卡片包含图标、标题、描述
- **AND** 无任何"插件版"或"免费版"的提及
- **AND** 无对比表格布局

#### Scenario: 桌面端布局
- **WHEN** 视口宽度 > 768px
- **THEN** 6 个优势卡片以 3×2 网格排列

#### Scenario: 移动端布局
- **WHEN** 视口宽度 ≤ 768px
- **THEN** 卡片纵向堆叠，每行 1 个

### Requirement: 优势内容正面表达
优势描述 SHALL 正面陈述桌面客户端的能力，不通过贬低其他产品来衬托。

#### Scenario: 优势文案风格
- **WHEN** 用户阅读任一优势卡片
- **THEN** 描述为正面陈述（如"支持最高 4 个 Worker 并发"），而非对比式表达（如"比插件版更快"）

### Requirement: i18n 数据结构变更
`desktopCompare` 的 i18n 数据 SHALL 从对比结构改为优势展示结构。

**变更前**：
```json
{
  "title": "为什么选择桌面客户端？",
  "subtitle": "对比免费插件版，桌面客户端在性能、效率和专业功能上全面超越",
  "colFeature": "功能维度",
  "colPlugin": "免费插件版",
  "colClient": "桌面客户端（专业版）",
  "items": {
    "0": { "feature": "...", "plugin": "...", "client": "..." }
  }
}
```

**变更后**：
```json
{
  "title": "为什么选择桌面客户端？",
  "subtitle": "六大核心优势，让电商图片采集更高效、更专业",
  "items": {
    "0": { "icon": "Monitor", "title": "...", "desc": "..." }
  }
}
```

#### Scenario: i18n 数据无插件相关字段
- **WHEN** 读取 `desktopCompare` 的 i18n 数据
- **THEN** 无 `colFeature`、`colPlugin`、`colClient`、`feature`、`plugin` 字段
- **AND** 每个 item 包含 `icon`、`title`、`desc` 字段

## MODIFIED Requirements

### Requirement: DesktopCompare 组件布局
DesktopCompare 组件 SHALL 使用优势卡片网格布局替代对比表格。

**变更前**：三列对比表（桌面端）+ 纵向对比卡片（移动端），含插件列和客户端列
**变更后**：3×2 优势卡片网格（桌面端）+ 纵向堆叠卡片（移动端），仅展示客户端优势

## REMOVED Requirements

### Requirement: DesktopCompare — 图标去 emoji 化
**Reason**：对比表整体被移除，该需求不再适用
**Migration**：新卡片布局使用 Element Plus 图标，天然无 emoji

### Requirement: DesktopCompare — 客户端列高亮
**Reason**：对比表整体被移除，列高亮不再适用
**Migration**：新卡片布局通过卡片自身样式（glass-card + 图标）实现视觉层次
