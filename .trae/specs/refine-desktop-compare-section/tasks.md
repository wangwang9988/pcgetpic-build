# Tasks

- [x] Task 1: 重构 i18n 数据结构
  - [x] 修改 `website/i18n/locales/zh-CN.json` 中 `desktopCompare`：移除 `colFeature`/`colPlugin`/`colClient`/`subtitle` 旧值，移除每个 item 的 `feature`/`plugin` 字段，改为 `icon`/`title`/`desc` 结构，subtitle 改为正面表达
  - [x] 修改 `website/i18n/locales/en-US.json` 同步更新
  - [x] 6 个优势项的文案从对比式改为正面陈述式

- [x] Task 2: 重构 DesktopCompare.vue 组件
  - [x] 模板：移除三列对比表和移动端对比卡片，改为 3×2 优势卡片网格（桌面端）+ 纵向堆叠（移动端）
  - [x] 脚本：移除 `compareItems` 中的 `plugin`/`feature` 引用，改为 `icon`/`title`/`desc`
  - [x] 样式：移除对比表专用样式（`.compare-header`/`.compare-row`/`.compare-col-plugin`/`.compare-icon.fail`/`.card-row-plugin` 等），新增优势卡片网格样式
  - [x] 每个卡片：Element Plus 图标 + 标题 + 描述，使用 glass-card 风格

# Task Dependencies

- [Task 2] 依赖 [Task 1]（需要新的 i18n 数据结构）
