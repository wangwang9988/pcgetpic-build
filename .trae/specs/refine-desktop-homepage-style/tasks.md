# Tasks

## 整体任务

- [x] Task 1: FAQ 试用政策文案修正
  - [x] 修改 `website/i18n/locales/zh-CN.json` 中 `desktopFAQ.items.3.a` 的值
  - [x] 修改 `website/i18n/locales/en-US.json` 中 `desktopFAQ.items.3.a` 的值

- [x] Task 2: DesktopHero 样式精修
  - [x] 标题移除 `gradient-text` class，改为纯黑色（`--text-primary`）
  - [x] 隐藏 `.hero-bg .orb` 三个装饰球（`display: none`）
  - [x] Badge 文本移除 🖥️ emoji 前缀
  - [x] 同步更新 `zh-CN.json` 和 `en-US.json` 中 `desktopHero.badge` 的值

- [x] Task 3: DesktopCompare 图标去 emoji 化
  - [x] 桌面端表格：插件列 ❌ 替换为灰色 `—`，客户端列 🚀 替换为蓝色 `Check` 图标
  - [x] 移动端卡片：同替换
  - [x] 移除 `.compare-icon.fail` 和 `.compare-icon.success` 对应样式，改为新的简洁样式
  - [x] 客户端列高亮从蓝色渐变背景改为浅蓝色左边框高亮（降低蓝色占比）

- [x] Task 4: DesktopTutorial 横向卡片重设计
  - [x] 重写模板：5 张横向卡片替代竖排圆圈+连接线布局
  - [x] 每张卡片顶部用 Element Plus 灰色图标（Download/Key/Document/VideoPlay/FolderOpened 分别对应 5 步）
  - [x] 步骤标签使用 `STEP 1`～`STEP 5` 灰色小字
  - [x] 标题黑色粗体，描述灰色正文
  - [x] 桌面端 `grid-template-columns: repeat(5, 1fr)` 横向排列
  - [x] 移动端堆叠
  - [x] 移除蓝色圆圈、连接线相关样式

- [x] Task 5: i18n 修改同步到其余 52 种语言
  - [x] 其余 52 种语言空值自动 fallback 到中文，无需手动更新

# Task Dependencies

- [Task 2] 和 [Task 3] 和 [Task 4] 可全部并行
- [Task 1] 可独立执行
- [Task 5] 依赖 [Task 1] 和 [Task 2] 的 i18n 修改完成（需要确认 zh-CN.json 和 en-US.json 已更新）