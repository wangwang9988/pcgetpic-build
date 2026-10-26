# Tasks

- [x] Task 1: DesktopHero 文案升级 + 数据亮点行 + 平台标识条 + CTA 重分级
  - [x] 1.1: 重写 zh-CN.json 中 desktopHero 的徽章、标题、副标题、按钮文案（结果驱动式，无空洞形容词）
  - [x] 1.2: 重写 en-US.json 中 desktopHero 的徽章、标题、副标题、按钮文案
  - [x] 1.3: 在 desktopHero i18n 中新增数据亮点 key（3 个：40+ 平台 / 4x 并发 / 1000+ 链接）
  - [x] 1.4: 在 desktopHero i18n 中新增平台标识条 key（平台名列表 + "+N 更多平台"文字 + 辅助说明）
  - [x] 1.5: 修改 DesktopHero.vue 模板，在副标题下方插入数据亮点行（3 个大号数字+标签）
  - [x] 1.6: 修改 DesktopHero.vue 模板，CTA 重分级（主按钮"免费下载"，次按钮"查看支持平台"），增加辅助说明
  - [x] 1.7: 修改 DesktopHero.vue 模板，在辅助说明下方插入平台标识条（8~10 个 Logo + "+30 更多"链接）
  - [x] 1.8: 在 DesktopHero.vue 中导入平台 SVG 图标（复用 PlatformSection 的图标资源）
  - [x] 1.9: 添加数据亮点行和平台标识条的 CSS 样式（保持苹果风格居中布局，含移动端适配）

- [x] Task 2: 新建 DesktopPlatformProof — 平台覆盖展示区
  - [x] 2.1: 在 zh-CN.json 中新增 desktopPlatformProof 数据（标题、副标题、数据条 4 项、平台列表）
  - [x] 2.2: 在 en-US.json 中新增 desktopPlatformProof 数据
  - [x] 2.3: 创建 DesktopPlatformProof.vue 组件（数据条 + 平台网格 + 查看全部按钮）
  - [x] 2.4: 复用 PlatformSection 的平台图标导入方式和 i18n 平台名称
  - [x] 2.5: 视觉对齐 PlatformSection（glass-card、auto-fit 网格、48px 图标、悬停上浮、可点击跳转）
  - [x] 2.6: 添加移动端响应式样式

- [x] Task 3: 合并 DesktopCompare + DesktopFeatures → DesktopAdvantages
  - [x] 3.1: 在 zh-CN.json 中新增 desktopAdvantages 数据（5 项精选优势，icon/title/desc 结构，结果驱动+具体数字，不提及插件）
  - [x] 3.2: 在 en-US.json 中新增 desktopAdvantages 数据
  - [x] 3.3: 创建 DesktopAdvantages.vue 组件（差异化布局：前 2 项大卡片 + 后 3 项小卡片横排）
  - [x] 3.4: 添加 DesktopAdvantages 的 CSS 样式（含移动端纵向堆叠适配）

- [x] Task 4: DesktopTutorial 精简 + DesktopDownload / DesktopFAQ 文案升级
  - [x] 4.1: 重写 zh-CN.json 中 desktopTutorial（从 5 步精简为 3 步：下载安装→粘贴链接→自动下载）
  - [x] 4.2: 重写 en-US.json 中 desktopTutorial
  - [x] 4.3: 重写 zh-CN.json 中 desktopDownload 的标题和副标题（突出"为什么下载"，不限定"每天"和"团队"）
  - [x] 4.4: 重写 en-US.json 中 desktopDownload 的标题和副标题
  - [x] 4.5: 在 zh-CN.json 中 desktopFAQ 新增 2 个高转化问题（"能先试试吗？" / "下载的是高清原图吗？"）
  - [x] 4.6: 在 en-US.json 中 desktopFAQ 新增 2 个高转化问题

- [x] Task 5: 更新首页组件引用 + 清理旧组件
  - [x] 5.1: 修改 index.vue，移除 DesktopCompare 和 DesktopFeatures 引用，新增 DesktopPlatformProof 和 DesktopAdvantages
  - [x] 5.2: 删除 DesktopCompare.vue 文件
  - [x] 5.3: 删除 DesktopFeatures.vue 文件
  - [x] 5.4: 清理所有 locale 文件中废弃的 desktopCompare 和 desktopFeatures i18n key
  - [x] 5.5: 修改 DesktopTutorial.vue 适配 3 步数据结构（从 steps.0~4 改为 steps.0~2）

- [x] Task 6: 验证与测试
  - [x] 6.1: 验证首页所有区块正确渲染，顺序无误
  - [x] 6.2: 验证 DesktopHero 数据亮点行正确展示
  - [x] 6.3: 验证 DesktopHero 平台标识条在桌面端和移动端正确展示
  - [x] 6.4: 验证 DesktopPlatformProof 平台网格和数据条正确展示
  - [x] 6.5: 验证 DesktopAdvantages 差异化布局正确
  - [x] 6.6: 验证 DesktopTutorial 3 步展示正确
  - [x] 6.7: 验证所有文案已升级，无残留旧文案，无插件拉踩内容
  - [x] 6.8: 验证移动端响应式布局正确

# Task Dependencies
- [Task 2] 可与 [Task 1] 并行执行
- [Task 3] 可与 [Task 1] 和 [Task 2] 并行执行
- [Task 4] 可与 [Task 1] [Task 2] [Task 3] 并行执行
- [Task 5] depends on [Task 1] [Task 2] [Task 3] [Task 4]（需要所有新组件和文案就绪）
- [Task 6] depends on [Task 5]（需要所有代码变更完成后才能验证）
