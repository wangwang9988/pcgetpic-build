# Tasks

- [x] Task 1: 次屏图片添加 `loading="lazy"`（6 个组件）
  - [x] SubTask 1.1: DesktopPlatformProof.vue — 24 个平台图标 `<img>` 添加 `loading="lazy"`
  - [x] SubTask 1.2: PlatformSection.vue — 35 个平台图标 `<img>` 添加 `loading="lazy"`
  - [x] SubTask 1.3: DownloadSection.vue — 8 个浏览器图标 `<img>` 添加 `loading="lazy"`
  - [x] SubTask 1.4: FooterSection.vue — Logo `<img>` 添加 `loading="lazy"`
  - [x] SubTask 1.5: StoreTutorial.vue + OfflineTutorial.vue — 浏览器图标添加 `loading="lazy"`
  - [x] SubTask 1.6: error.vue — 平台图标 `<img>` 添加 `loading="lazy"`
- [x] Task 2: PNG Logo 升级为 NuxtImg（2 个组件）
  - [x] SubTask 2.1: NavBar.vue — logo.png `<img>` → `<NuxtImg src="/logo.png" />`
  - [x] SubTask 2.2: FooterSection.vue — logo.png `<img>` → `<NuxtImg src="/logo.png" />`
- [x] Task 3: 补充缺失的 `width`/`height` 属性防 CLS
  - [x] SubTask 3.1: 检查所有被修改的 `<img>` / `<NuxtImg>` 是否已有 `width`/`height`，缺失则补充
- [x] Task 4: 验证
  - [x] SubTask 4.1: 运行 `npm run build` 确认无编译错误
  - [ ] SubTask 4.2: 本地 dev 环境检查所有页面图片正常渲染

# Task Dependencies
- Task 1, 2, 3 可并行执行
- Task 4 依赖 Task 1-3 完成
