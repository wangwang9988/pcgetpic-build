# Tasks

## Phase 1：基础设施与客户端首页

- [ ] Task 1: 创建 `client-version.json` 客户端版本配置文件
  - [ ] 在 `website/public/client-version.json` 创建文件，包含 `version`, `releaseDate`, `downloadUrl`, `minOS` 字段
  - [ ] 下载 URL 和 store URL 先使用占位链接

- [ ] Task 2: 迁移现有插件首页到 `/extension` 路由
  - [ ] 复制 `website/app/pages/index.vue` → `website/app/pages/extension.vue`
  - [ ] 文件内容不做任何修改（插件页面一行代码不动）
  - [ ] 验证 `/extension` 路由与改版前 `/` 行为完全一致

- [ ] Task 3: 新建 DesktopHero.vue — 桌面客户端首屏
  - [ ] 创建组件，包含大标题、副标题、产品截图占位区
  - [ ] 主按钮「下载 Windows 客户端 (.exe)」、副按钮「获取激活码」
  - [ ] 版本号从 `client-version.json` 异步读取
  - [ ] 响应式适配，Glassmorphism 风格
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中添加 hero 翻译 key

- [ ] Task 4: 新建 DesktopCompare.vue — 版本对比表
  - [ ] 创建组件，6 项对比（多线程并发、批量链接量、后台运行、防封机制、文件管理、技术支持）
  - [ ] 每项标注插件 ❌ vs 客户端 🚀
  - [ ] 桌面端横向表格，移动端纵向卡片
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中添加对比翻译 key

- [ ] Task 5: 新建 DesktopFeatures.vue — 客户端功能卡片
  - [ ] 创建组件，6 个 Glassmorphism 卡片
  - [ ] 内容：多 Worker 并发、Cookie 共享、验证码感知、仿人机行为、智能分类存储、低内存框架
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中添加功能翻译 key

- [ ] Task 6: 新建 DesktopTutorial.vue — 客户端教程
  - [ ] 创建组件，5 步教程：下载安装 → 激活授权 → 粘贴链接 → 开始抓取 → 导出结果
  - [ ] 每步包含图标和说明文字
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中添加教程翻译 key

- [ ] Task 7: 新建 DesktopDownload.vue — 客户端下载区
  - [ ] 创建组件，EXE 下载按钮 + 版本号 + 系统要求（Win10/11 64位）
  - [ ] 下载链接从 `client-version.json` 读取
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中添加下载区翻译 key

- [ ] Task 8: 新建 DesktopFAQ.vue — 常见问题
  - [ ] 创建组件，7 个 FAQ，使用折叠面板（accordion）交互
  - [ ] 内容：系统要求、Mac 支持、授权购买、试用政策、支持平台、封号风险、与插件区别
  - [ ] 在 `zh-CN.json` 和 `en-US.json` 中添加 FAQ 翻译 key

- [ ] Task 9: 组装桌面客户端首页 `index.vue`
  - [ ] 创建全新的 `website/app/pages/index.vue`
  - [ ] 按顺序组装：DesktopHero → DesktopCompare → DesktopFeatures → DesktopTutorial → DesktopDownload → DesktopFAQ
  - [ ] 设置桌面客户端的 SEO meta 和 JSON-LD Schema（`DesktopApplication`）

## Phase 2：导航与全局调整

- [ ] Task 10: 重构 NavBar.vue 导航栏
  - [ ] 「当图客户端」→ `/`（主推，首页高亮）
  - [ ] 「浏览器插件」→ `/extension`（文字链接）
  - [ ] 「支持平台」→ `/platforms`（保持不变）
  - [ ] 右侧「购买授权」按钮 → `store.downpictures.com`
  - [ ] 锚点跳转逻辑适配新路由结构

- [ ] Task 11: 更新 FooterSection.vue
  - [ ] 新增客户端链接组（下载客户端、客户端教程、购买授权）
  - [ ] 保留现有链接
  - [ ] 描述文案更新为双产品通用描述

- [ ] Task 12: 更新 nuxt.config.ts
  - [ ] sitemap 新增 `/extension` 路由
  - [ ] 首页 `/` 的 SEO 默认值更新为桌面端定位

## Phase 3：i18n 补全

- [ ] Task 13: 扩展 i18n — 52 种语言空 key 填充
  - [ ] 向 52 种非核心语言的 locale JSON 文件添加所有新增 key（值为空字符串）
  - [ ] 验证 `i18n-fallback.ts` 回退机制正常工作

# Task Dependencies

- [Task 2] 可独立执行（与 [Task 3-9] 并行）
- [Task 3]、[Task 4]、[Task 5]、[Task 6]、[Task 7]、[Task 8] 可全部并行
- [Task 9] 依赖 [Task 3-8] 全部完成
- [Task 10] 依赖 [Task 2]（需要 `/extension` 路由存在）和 [Task 9]（需要首页就绪）
- [Task 11] 可独立执行
- [Task 12] 依赖 [Task 2] 和 [Task 9]
- [Task 13] 依赖所有 i18n key 在 zh-CN.json 和 en-US.json 中定义完毕