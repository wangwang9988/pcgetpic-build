# Tasks

## Phase 1：核心组件重写（Vue）

- [ ] Task 1: 重写 `InstallCard.vue` — 客户端下载卡片
  - [ ] 移除浏览器 UA 检测、浏览器图标、ZIP 下载、`CrxTipModal` 引用
  - [ ] 新增客户端下载按钮，链接从 `client-version.json` 读取 `downloadUrl`
  - [ ] 新增系统要求提示（Windows 10/11 64位）
  - [ ] 保持现有 Glassmorphism 视觉风格
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中新增 InstallCard 所需翻译 key（如 `platformPage.downloadClient`, `platformPage.systemRequirements`）

- [ ] Task 2: 重写 `CTA.vue` — 客户端下载 CTA
  - [ ] 移除 `downloadCrx`、ZIP 文件映射、浏览器检测
  - [ ] 主按钮"下载 Windows 客户端"，链接从 `client-version.json` 读取
  - [ ] 次按钮"获取激活码"，链接到 `storeUrl`
  - [ ] 移除 `CrxTipModal` 和 `Toast` 引用（如不再需要）
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中添加 CTA 翻译 key

- [ ] Task 3: 调整 `Tutorial.vue` — 3 步客户端流程
  - [ ] 步骤数组从 4 项改为 3 项
  - [ ] 更新 `zh-CN.json` 和 `en-US.json` 中的 `tutorialStep1~3` 文案为客户端流程
  - [ ] 移除 `tutorialStep4Title` / `tutorialStep4Desc`（或保留空字符串兼容）

- [ ] Task 4: 修改 `pages/platforms/index.vue` — 列表页 CTA
  - [ ] CTA 区域下载链接从 Chrome Web Store 改为客户端下载链接
  - [ ] 按钮文案改为"下载 Windows 客户端"
  - [ ] 更新 `platformsIndex.ctaTitle` / `platformsIndex.ctaSubtitle` 翻译 key

- [ ] Task 5: 修改 `pages/platforms/[slug].vue` — 详情页骨架 + SEO
  - [ ] `ClientOnly` fallback 中的 Chrome Web Store 链接改为客户端下载链接
  - [ ] Schema: `applicationCategory: 'BrowserExtension'` → `'DesktopApplication'`
  - [ ] Schema: `operatingSystem` 改为 `'Windows 10, Windows 11'`
  - [ ] Schema: `downloadUrl` 改为客户端下载链接（单一链接）
  - [ ] Schema: `offers` 价格调整为反映客户端策略（或移除免费标价）

## Phase 2：i18n 文案全面改写

- [ ] Task 6: 改写 `zh-CN.json` — platformPage 命名空间
  - [ ] 修改 `description` / `metaDescription`：去"浏览器扩展"
  - [ ] 修改 `tutorialStep1~3` Title/Desc：客户端流程
  - [ ] 修改 `faqA2` / `faqA3` / `faqA4`：客户端语境
  - [ ] 修改 `ctaSubtitle`：客户端描述
  - [ ] 修改 `platformsIndex.ctaTitle` / `platformsIndex.ctaSubtitle`：列表页 CTA
  - [ ] 修改 `footer.desc`：通用/客户端描述

- [ ] Task 7: 改写 `en-US.json` — 同步所有 Task 6 的修改

- [ ] Task 8: 批量替换 40+ 平台描述中的"插件"→"客户端"
  - [ ] `zh-CN.json` 中 `platform.descriptions.*` 所有条目
  - [ ] `en-US.json` 中 `platform.descriptions.*` 所有条目
  - [ ] 确保语序通顺自然

- [ ] Task 9: 其他 52 种语言 i18n 同步
  - [ ] 向每种语言的 locale JSON 添加/覆盖修改后的 key（值为空字符串）
  - [ ] 确保 fallback 机制正常工作

## Phase 3：验证与收尾

- [ ] Task 10: 验证所有修改
  - [ ] 检查 `/platforms` 页面 CTA 链接和文案正确
  - [ ] 检查 `/platforms/{slug}` 页面 InstallCard、CTA、Tutorial、FAQ 正确
  - [ ] 检查 SEO Schema 输出为 DesktopApplication
  - [ ] 检查 extension 页面 `/extension` 完全不受影响
  - [ ] 检查所有下载链接从 `client-version.json` 读取，无硬编码 Chrome Web Store 链接残留
  - [ ] 运行 `npm run lint` 或项目对应检查命令

# Task Dependencies

- [Task 1]、[Task 2]、[Task 3] 可并行执行（组件独立）
- [Task 4] 依赖 [Task 1]（需要 InstallCard 的 i18n key 就绪）
- [Task 5] 可独立执行
- [Task 6] 依赖 [Task 1]、[Task 2]、[Task 3]（需要知道新增哪些 i18n key）
- [Task 7] 依赖 [Task 6]
- [Task 8] 依赖 [Task 6]
- [Task 9] 依赖 [Task 7] 和 [Task 8]
- [Task 10] 依赖所有前置任务完成
