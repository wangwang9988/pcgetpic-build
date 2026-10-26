# Tasks — 当图客户端 Phase 1 核心业务跑通

## M0: 平台匹配与脚本隔离验证

- [x] Task 1: 创建 Tauri v2 + Vue 3 + Vite 项目骨架
  - [x] 1.1 使用 `npm create tauri-app@latest` 初始化项目（Vue + TypeScript 模板）
  - [x] 1.2 安装前端依赖：Pinia、Naive UI、@tauri-apps/api、@tauri-apps/plugin-shell
  - [x] 1.3 按手册规定创建完整目录结构：src/components、src/stores、src/types、src/utils、scraper-scripts/taobao、scraper-scripts/shared、dist-scripts
  - [x] 1.4 配置 vite.config.ts（Vue 前端）和 vite.scraper.config.ts（爬虫脚本打包）
  - [x] 1.5 验证 `cargo build` 和 `npm run dev` 均可正常运行

- [x] Task 2: 实现 platforms.ts 平台域名匹配与分组逻辑
  - [x] 2.1 从 GetPic/entrypoints/*.content.js 的 matches 提取所有域名模式
  - [x] 2.2 实现 PLATFORM_PATTERNS 域名正则匹配表（taobao/jd/pdd/vip 等）
  - [x] 2.3 实现 `detectPlatform(url)` 函数
  - [x] 2.4 实现 `groupByPlatform(urls)` 批量分组函数
  - [x] 2.5 验证：粘贴 50 个混合链接 → 前端正确按平台分组

## M1: 脚本解耦验证

- [x] Task 3: 创建 scraper-scripts/shared/ 通信适配层
  - [x] 3.1 创建 tauri-bridge.ts：封装 `window.__TAURI__.event.emit('SCRAPE_DATA', { key, value })` 和 `window.__TAURI__.invoke('get_scrape_data', { key })`
  - [x] 3.2 创建 create-scraper.ts：`createScraper({ name, main })` 工厂函数，替代 `defineContentScript`
  - [x] 3.3 创建 utils.ts：通用工具函数（URL 清理、去重、ProductId 提取）

- [x] Task 4: 提纯淘宝 tbGetMain 模块
  - [x] 4.1 复制 tbGetMain.js 到 scraper-scripts/taobao/tbGetMain.ts
  - [x] 4.2 移除 `defineContentScript` 包裹，改为 `createScraper` 导出
  - [x] 4.3 将所有 `browser.runtime.sendMessage({ action: 'setStorage', key, value })` 替换为 `tauriBridge.send(key, value)`
  - [x] 4.4 将所有 `browser.runtime.sendMessage({ action: 'getStorage', key })` 替换为 `tauriBridge.get(key)`
  - [x] 4.5 移除 WXT context (ctx) 依赖
  - [x] 4.6 移除浏览器插件特有的页面可见性/焦点/SPA 导航检测逻辑（Tauri Worker 模式下不需要）
  - [x] 4.7 保留核心抓取逻辑：DOM 容器扫描、script 标签提取、URL 清理去重、重试机制
  - [x] 4.8 导出 `run()` 函数供 index.ts 调用

- [x] Task 5: 提纯淘宝 tbGetSku 模块
  - [x] 5.1 复制 tbGetSku.js 到 scraper-scripts/taobao/tbGetSku.ts
  - [x] 5.2 同 Task 4 的解耦步骤：移除 WXT 依赖、替换通信层、移除插件特有逻辑
  - [x] 5.3 保留核心抓取逻辑：DOM 容器扫描、SKU 选择器匹配、MutationObserver 兜底、去重
  - [x] 5.4 导出 `run()` 函数

- [x] Task 6: 提纯淘宝 tbGetDetail 模块
  - [x] 6.1 复制 tbGetDetail.js 到 scraper-scripts/taobao/tbGetDetail.ts
  - [x] 6.2 同 Task 4 的解耦步骤
  - [x] 6.3 保留核心抓取逻辑：descV8 容器扫描、重试机制、URL 清理标准化
  - [x] 6.4 导出 `run()` 函数

- [x] Task 7: 提纯淘宝 tbGetVideo 模块
  - [x] 7.1 复制 tbGetVideo.js 到 scraper-scripts/taobao/tbGetVideo.ts
  - [x] 7.2 同 Task 4 的解耦步骤
  - [x] 7.3 保留核心抓取逻辑：Performance API 监听、XHR/fetch 拦截、MutationObserver、视频分类
  - [x] 7.4 导出 `run()` 函数

- [x] Task 8: 提纯淘宝 tbGetHylinkTitle 模块
  - [x] 8.1 复制 tbGetHylinkTitle.js 到 scraper-scripts/taobao/tbGetHylinkTitle.ts
  - [x] 8.2 同 Task 4 的解耦步骤
  - [x] 8.3 保留核心抓取逻辑：DOM 元素读取、URL 解析、商品 ID 提取
  - [x] 8.4 导出 `run()` 函数

- [x] Task 9: 编写淘宝统一入口 scraper-scripts/taobao/index.ts
  - [x] 9.1 导入所有 5 个模块（tbGetMain、tbGetSku、tbGetDetail、tbGetVideo、tbGetHylinkTitle）
  - [x] 9.2 实现 iframe 防护：`if (window !== window.top) return;`
  - [x] 9.3 实现 runAt 时序编排：Video 模块 document_start 最早执行，其余模块 DOMContentLoaded 后执行
  - [x] 9.4 实现仿人机滚动：模拟缓慢滚动触发懒加载
  - [x] 9.5 实现验证码监听器：检测 `#nocaptcha`、`.nc-container`、`#nc_1_n1z`，通过 tauriBridge 上报

## M2: 打包链跑通

- [x] Task 10: 配置并验证 Vite 多入口打包
  - [x] 10.1 完善 vite.scraper.config.ts：entry 指向 scraper-scripts/taobao/index.ts，formats: ['iife']，outDir: 'dist-scripts'
  - [x] 10.2 执行 `vite build --config vite.scraper.config.ts` 成功生成 dist-scripts/taobao.bundle.js
  - [x] 10.3 验证 bundle.js 可通过浏览器 console eval 执行（在淘宝商品页上测试）
  - [x] 10.4 验证 bundle 大小合理（预期约 50KB）

## M3: Tauri 注入验证

- [x] Task 11: 实现 Rust 后端核心模块 — platform_resolver.rs
  - [x] 11.1 定义 Platform 枚举（Taobao、Jd、Pdd、Vip、Unknown）
  - [x] 11.2 实现 `Platform::from_url(url)` 域名匹配
  - [x] 11.3 实现 `Platform::bundle_name()` 返回 bundle 文件名
  - [x] 11.4 编写单元测试验证 URL → Platform 映射正确

- [x] Task 12: 实现 Rust 后端核心模块 — injector.rs
  - [x] 12.1 定义 ScriptInjector 结构体，含 bundle_cache: HashMap<String, String>
  - [x] 12.2 实现 `load_bundle(platform)` 从 dist-scripts/ 读取并缓存
  - [x] 12.3 实现 `inject(webview, script)` 通过 webview.evaluate_script 注入
  - [x] 12.4 编写单元测试验证缓存逻辑

- [x] Task 13: 实现 Rust 后端核心模块 — ipc.rs
  - [x] 13.1 定义 ScrapeEvent 结构体（type、workerId、taskUrl、data、error）
  - [x] 13.2 定义 UiEvent 结构体（event_type、task_id、data）
  - [x] 13.3 实现 SCRAPE_DATA 事件监听：接收注入脚本回传数据，按 task_id 关联
  - [x] 13.4 实现 CAPTCHA_DETECTED / CAPTCHA_RESOLVED 事件监听
  - [x] 13.5 实现 Rust → Vue 事件转发（Tauri Event emit）

- [x] Task 14: 实现 Rust 后端核心模块 — cookie.rs
  - [x] 14.1 配置共享 user_data_dir 路径（app.path().app_data_dir().join("webview-data")）
  - [x] 14.2 所有 Worker Webview 创建时使用同一 user_data_dir
  - [x] 14.3 实现登录态失效检测：监听页面 URL 变化，检测 login.taobao.com 跳转

- [x] Task 15: 实现 Rust 后端核心模块 — worker_pool.rs
  - [x] 15.1 定义 WorkerPool 结构体（workers、max_concurrent、task_queue、cookie_data_dir）
  - [x] 15.2 定义 Worker 结构体（id、webview、state、current_task、current_platform）
  - [x] 15.3 定义 Task 结构体（url、platform、id）
  - [x] 15.4 定义 WorkerState 枚举（Idle、Working、CaptchaBlocked、Error）
  - [x] 15.5 实现 Worker 分配任务逻辑：platform_resolver → injector.load_bundle → webview.load_url → evaluate_script
  - [x] 15.6 实现页面加载完成监听：新页面加载后重新注入对应平台 bundle
  - [x] 15.7 实现 Worker 状态管理：空闲→工作中→验证码阻塞→错误

- [x] Task 16: 实现 Rust main.rs 入口
  - [x] 16.1 创建主窗口（1400×900，可缩放）
  - [x] 16.2 注册 IPC 命令和事件监听
  - [x] 16.3 初始化 WorkerPool、ScriptInjector、PlatformResolver
  - [x] 16.4 配置 Tauri 插件（shell、dialog、fs 等）

- [x] Task 17: 定义 TypeScript IPC 类型
  - [x] 17.1 创建 src/types/ipc.ts，定义 ScrapeEvent、UiEvent、Task、WorkerState 等接口
  - [x] 17.2 定义数据 Key 类型：'MainPic' | 'SkuPic' | 'DetailPic' | 'VideoUrls' | 'productTitle' | 'productLink' | 'productId'

## M4: 单 Worker 串行跑通

- [x] Task 18: 实现 Pinia Store — 任务队列 store
  - [x] 18.1 定义 Task 接口（id、url、platform、status、result）
  - [x] 18.2 定义 TaskStatus 枚举（pending、running、completed、failed、needsIntervention）
  - [x] 18.3 实现 addTasks(urls)、groupByPlatform()、startTask()、completeTask()、failTask() 等 actions
  - [x] 18.4 实现 getters：pendingTasks、runningTasks、completedTasks、failedTasks

- [x] Task 19: 实现 Pinia Store — 抓取结果 store
  - [x] 19.1 定义 ScrapeResult 接口（taskId、mainPics、skuPics、detailPics、videoUrls、productTitle、productLink、productId）
  - [x] 19.2 实现 updateResult(taskId, key, value) action
  - [x] 19.3 实现 getters：allResults、currentResult、totalImageCount

- [x] Task 20: 实现侧边栏 — 链接输入区组件
  - [x] 20.1 创建 LinkInput.vue：多行 textarea，支持粘贴 50+ 链接
  - [x] 20.2 实现自动去重、去空行逻辑
  - [x] 20.3 实现拖拽 .txt 文件导入链接列表
  - [x] 20.4 实现从剪贴板自动检测并一键导入

- [x] Task 21: 实现侧边栏 — 平台识别区组件
  - [x] 21.1 创建 PlatformDetect.vue：卡片形式展示分组结果
  - [x] 21.2 每组显示：平台图标 + 名称 + 链接数量 + 进度条
  - [x] 21.3 实现用户手动切换平台下拉框
  - [x] 21.4 未识别链接以警告色显示，阻止直接抓取

- [x] Task 22: 实现侧边栏 — 任务队列区组件
  - [x] 22.1 创建 TaskQueue.vue：显示当前平台下所有待处理链接
  - [x] 22.2 每项显示：序号 · 链接（截断）· 状态图标（⏳/🔄/✅/❌）
  - [x] 22.3 已完成/失败项自动折叠，可展开查看
  - [x] 22.4 实现右键菜单：重试、跳过、复制链接

- [x] Task 23: 实现侧边栏 — 操作控制栏组件
  - [x] 23.1 创建 ControlBar.vue：[开始抓取当前平台] [全部平台依次抓取] [暂停] [停止] 按钮
  - [x] 23.2 实现 Worker 数量选择器（1~4，默认 2）
  - [x] 23.3 实现暂停/继续逻辑：暂停后 Worker 完成当前任务后停止
  - [x] 23.4 实现停止逻辑：清空队列中所有等待任务

- [x] Task 24: 实现主工作区 — Worker Tab 栏与 Webview 嵌入
  - [x] 24.1 创建 WorkerTabs.vue：每个活跃 Worker 对应一个 Tab，带状态指示灯（🔵🟢🔴⚪）
  - [x] 24.2 实现 Tab 切换：点击 Tab 切换显示对应 Worker 的 Webview
  - [x] 24.3 实现 Worker Webview 嵌入区：通过 Tauri 多 Webview API 在主窗口内创建子 Webview
  - [x] 24.4 Webview 顶部显示当前 URL（只读），右侧刷新按钮和"在外部浏览器打开"按钮
  - [x] 24.5 验证码/登录需要人工介入时，对应 Tab 自动切换到前台并闪烁

- [x] Task 25: 实现主工作区 — 抓取结果预览区组件
  - [x] 25.1 创建 ResultPreview.vue：分 Tab 展示 主图/SKU/详情图/视频
  - [x] 25.2 每个子 Tab 内为网格布局展示缩略图
  - [x] 25.3 悬停显示大图预览
  - [x] 25.4 右键菜单：复制 URL、标记为无效
  - [x] 25.5 顶部显示统计：已提取 X 张主图 / Y 张 SKU / Z 张详情图

- [x] Task 26: 实现底部状态栏组件
  - [x] 26.1 创建 StatusBar.vue：全局进度、总链接数、已完成、失败、队列中
  - [x] 26.2 显示总图片数（所有已完成任务累加）
  - [x] 26.3 显示当前 Worker 状态摘要

- [x] Task 27: 组装 App.vue 主布局
  - [x] 27.1 使用 Naive UI NLayout/NLayoutSider/NLayoutContent 实现经典侧边栏 + 主工作区布局
  - [x] 27.2 侧边栏固定 340px 宽度
  - [x] 27.3 主工作区自适应宽度
  - [x] 27.4 整合所有子组件到主布局

## M5: 多 Worker 并发跑通

- [x] Task 28: 实现多 Worker 并发调度逻辑
  - [x] 28.1 WorkerPool 支持创建多个 Worker Webview（1~4 个）
  - [x] 28.2 实现任务队列调度：空闲 Worker 自动从队列取任务
  - [x] 28.3 实现同平台任务优先分配给同一 Worker（减少 bundle 切换）
  - [x] 28.4 验证：2 个 Worker 并发跑完 10 个淘宝链接，无重复执行、无遗漏

## M6: 验证码处理

- [x] Task 29: 完善验证码检测与用户交互
  - [x] 29.1 注入脚本正确检测到滑块验证码元素
  - [x] 29.2 Worker 对应 Tab 正确高亮闪烁并通知用户
  - [x] 29.3 用户手动通过验证码后，系统自动恢复任务
  - [x] 29.4 验证码频繁出现时自动降速（5 分钟 >3 次 → 降低并发、增加延迟）

## M7: 登录态管理

- [x] Task 30: 实现登录态管理功能
  - [x] 30.1 主控台提供"登录淘宝"按钮，打开 Webview 窗口导航到 login.taobao.com
  - [x] 30.2 用户手动登录后 Cookie 自动持久化到 webview-data 目录
  - [x] 30.3 关闭登录窗口后，后续所有 Worker 自动共享登录态
  - [x] 30.4 登录态失效时正确检测并提醒用户重新登录

# Task Dependencies

- Task 1 → Task 2, Task 3 (项目骨架是所有后续任务的基础)
- Task 3 → Task 4, Task 5, Task 6, Task 7, Task 8 (通信适配层是模块提纯的前提)
- Task 4~8 → Task 9 (所有子模块提纯后才能编写统一入口)
- Task 9 → Task 10 (入口文件完成后才能打包)
- Task 10 → Task 12 (bundle 产出后才能实现注入器)
- Task 11 → Task 15 (platform_resolver 是 worker_pool 的依赖)
- Task 12 → Task 15 (injector 是 worker_pool 的依赖)
- Task 13 → Task 15 (ipc 是 worker_pool 的依赖)
- Task 14 → Task 15 (cookie 管理是 worker_pool 的依赖)
- Task 11~14 → Task 16 (所有 Rust 模块完成后组装 main.rs)
- Task 17 → Task 18, Task 19 (IPC 类型定义是 Store 的前提)
- Task 18, Task 19 → Task 20~27 (Store 是 UI 组件的数据源)
- Task 20~27 → Task 28 (UI 组件完成后才能测试多 Worker 并发)
- Task 28 → Task 29, Task 30 (并发跑通后才能完善验证码和登录态)
