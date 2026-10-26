# 当图客户端 Phase 1 核心业务跑通 Spec

## Why
当前项目仅有参考源（WXT 浏览器插件代码），需要从零构建一个基于 Tauri + Vue 3 的桌面客户端，让用户输入 50 个电商链接后，程序能在低内存占用下全自动、按顺序提取出所有高清图片 URL，并优雅处理登录和验证码。

## What Changes
- 创建 Tauri v2 + Vue 3 + Vite 项目骨架（含 Pinia、Naive UI）
- 从 GetPic/ 参考源中提纯淘宝平台 6 个 DOM 解析模块为无 WXT 依赖的纯函数
- 创建 scraper-scripts/shared/ 通信适配层（tauri-bridge.ts、create-scraper.ts、utils.ts）
- 配置 vite.scraper.config.ts 多入口打包，生成 dist-scripts/taobao.bundle.js (IIFE)
- 实现 Rust 后端核心模块：worker_pool.rs、platform_resolver.rs、injector.rs、ipc.rs、cookie.rs
- 实现 Vue 3 前端主控台 UI：侧边栏（链接输入、平台识别、任务队列、操作控制）+ 主工作区（Worker Tab、Webview 嵌入、抓取结果预览）
- 实现 src/utils/platforms.ts 平台域名匹配与分组逻辑
- 实现三层平台隔离架构（前端识别 → Rust 路由 → 脚本内域名守卫）
- 实现验证码检测与用户交互流程
- 实现 Cookie/Session 共享与登录态管理
- 定义 IPC 通信协议（Webview→Rust、Rust→Vue）

## Impact
- Affected specs: 全新项目，无已有 spec
- Affected code: 从零创建，参考源位于 GetPic/（只读，严禁修改）

## ADDED Requirements

### Requirement: Tauri + Vue 3 项目骨架
系统 SHALL 创建基于 Tauri v2 + Vue 3 + Vite 的桌面应用项目，包含以下依赖：
- Vue 3 + TypeScript
- Pinia（状态管理）
- Naive UI（组件库）
- Tauri v2（Rust 后端）

#### Scenario: 项目创建成功
- **WHEN** 执行项目初始化
- **THEN** 项目目录结构符合手册规定的最终目录结构，`cargo build` 和 `npm run dev` 均可正常运行

### Requirement: 淘宝脚本提纯（WXT 依赖解耦）
系统 SHALL 将 GetPic/entrypoints/modules/taobao/ 下的 6 个模块（tbGetMain、tbGetSku、tbGetDetail、tbGetVideo、tbGetHylinkTitle、tbPinglun）改写为无 WXT 依赖的纯函数，放置于 scraper-scripts/taobao/ 目录下。

#### Scenario: 模块解耦成功
- **WHEN** 改写完成
- **THEN** 每个子模块不再依赖 `defineContentScript`、`browser.runtime.sendMessage`、WXT context，改为使用 `createScraper()` 工厂函数和 `tauriBridge.send()` 通信

#### Scenario: 数据 Key 映射正确
- **WHEN** 各模块执行抓取
- **THEN** tbGetMain 输出 `MainPic`、tbGetSku 输出 `SkuPic`、tbGetDetail 输出 `DetailPic`、tbGetVideo 输出 `VideoUrls`、tbGetHylinkTitle 输出 `productTitle/productLink/productId`

### Requirement: Tauri IPC 通信适配层
系统 SHALL 提供 scraper-scripts/shared/tauri-bridge.ts，封装 `window.__TAURI__.event.emit('SCRAPE_DATA', { key, value })` 替代 `browser.runtime.sendMessage`。

#### Scenario: 数据回传成功
- **WHEN** 注入脚本调用 `tauriBridge.send('MainPic', ['url1', 'url2'])`
- **THEN** Rust 后端通过 Tauri event 监听收到 `SCRAPE_DATA` 事件，数据包含 key='MainPic' 和 value 数组

### Requirement: Vite 多入口打包
系统 SHALL 配置 vite.scraper.config.ts，将 scraper-scripts/taobao/index.ts 打包为 dist-scripts/taobao.bundle.js（IIFE 格式）。

#### Scenario: 打包成功
- **WHEN** 执行 `vite build --config vite.scraper.config.ts`
- **THEN** 生成 dist-scripts/taobao.bundle.js，可直接通过 eval 或 `<script>` 标签在浏览器中执行

### Requirement: 平台匹配与脚本隔离
系统 SHALL 实现三层平台隔离：
1. 前端 platforms.ts：域名正则匹配 → 按平台分组
2. Rust platform_resolver.rs：URL → Platform 枚举 → bundle 选择
3. 脚本内域名守卫：`if (window !== window.top) return;`

#### Scenario: 混合链接自动分组
- **WHEN** 用户粘贴 50 个混合平台链接
- **THEN** 前端正确按域名分组为 taobao/jd/pdd/unknown 等批次，显示分组结果

#### Scenario: 平台隔离验证
- **WHEN** taobao bundle 注入到京东页面
- **THEN** 不出数据（反之亦然），验证平台隔离有效

### Requirement: Rust Worker Pool 管理
系统 SHALL 实现 worker_pool.rs，管理 1~4 个 Worker Webview，每个 Worker 以 Tab 形式嵌入主窗口工作区。

#### Scenario: Worker 生命周期
- **WHEN** Worker 从队列取一个 Task
- **THEN** 依次执行：platform_resolver 确定平台 → 选择 bundle → Webview 导航到目标页面 → 页面加载完成后注入 bundle → 脚本自动执行 → IPC 回传结果 → 标记完成

#### Scenario: 页面跳转后重新注入
- **WHEN** Worker Webview 跳转到新页面
- **THEN** Rust 端监听页面加载事件，新页面加载完成后重新 evaluate_script 注入对应平台的 bundle

### Requirement: 脚本注入器
系统 SHALL 实现 injector.rs，按平台缓存 bundle 内容，支持 `load_bundle(platform)` 和 `inject(webview, script)` 操作。

#### Scenario: Bundle 缓存与加载
- **WHEN** 首次请求 taobao bundle
- **THEN** 从 dist-scripts/taobao.bundle.js 读取并缓存；后续请求直接返回缓存

### Requirement: IPC 处理器
系统 SHALL 实现 ipc.rs，接收 Worker 回传的 SCRAPE_DATA 事件，按 task_id 关联到对应任务，透传到 Vue 前端更新 UI。

#### Scenario: 数据流转
- **WHEN** 注入脚本通过 tauriBridge.send() 发送数据
- **THEN** Rust ipc.rs 接收后通过 Tauri Event 转发到 Vue 前端，前端更新对应任务的抓取结果

### Requirement: Cookie/Session 管理
系统 SHALL 实现 cookie.rs，所有 Worker Webview 共享同一个 user_data_dir，实现登录态自动共享。

#### Scenario: 登录态共享
- **WHEN** 用户在一个 Worker 中登录淘宝
- **THEN** 其他 Worker 自动拥有登录态，无需重复登录

#### Scenario: 登录态失效检测
- **WHEN** 脚本检测到页面跳转到登录页
- **THEN** 自动上报主控台"登录态已失效"，暂停任务队列

### Requirement: 验证码检测与处理
系统 SHALL 在注入脚本中内置验证码监听器，检测淘宝滑块验证码。

#### Scenario: 验证码检测
- **WHEN** 页面出现 `#nocaptcha`、`.nc-container`、`#nc_1_n1z` 等验证码元素
- **THEN** 通过 `window.__TAURI__.event.emit('CAPTCHA_DETECTED')` 上报 Rust，Rust 通知 Vue 高亮闪烁对应 Worker Tab

#### Scenario: 验证码通过后恢复
- **WHEN** 用户手动滑过验证码
- **THEN** 脚本检测到页面恢复，上报 CAPTCHA_RESOLVED，Rust 自动恢复任务调度

#### Scenario: 验证码频繁出现
- **WHEN** 单 Worker 5 分钟内出现 >3 次验证码
- **THEN** 系统自动降低并发数（2→1），增加请求间隔

### Requirement: Vue 3 主控台 UI
系统 SHALL 实现经典侧边栏 + 主工作区布局（建议 1400×900），包含：
- 侧边栏（340px）：链接输入区、平台识别区、任务队列区、操作控制栏
- 主工作区：Worker Tab 栏、嵌入式 Worker Webview（~1200×720）、抓取结果预览区
- 底部状态栏：全局进度、总图片数、Worker 状态摘要

#### Scenario: 链接输入与平台识别
- **WHEN** 用户粘贴 50 个链接到 textarea
- **THEN** 自动去重去空行，按域名分组显示平台识别结果，未识别链接以警告色显示

#### Scenario: 用户可手动覆盖平台
- **WHEN** 用户点击某组的"切换平台"下拉框
- **THEN** 可手动将该组链接归入其他平台

#### Scenario: Worker Tab 切换
- **WHEN** 用户点击 Worker Tab
- **THEN** 主工作区切换显示对应 Worker 的 Webview 内容

#### Scenario: 抓取结果预览
- **WHEN** 抓取数据回传
- **THEN** 底部预览区按 主图/SKU/详情/视频 分 Tab 展示缩略图网格

### Requirement: Pinia 状态管理
系统 SHALL 实现以下 Pinia Store：
- 任务队列 store：管理任务列表、任务状态机（等待中→执行中→已完成/失败/需人工介入）
- 抓取结果 store：按任务 ID 存储抓取结果（MainPic、SkuPic、DetailPic、VideoUrls、productTitle 等）

#### Scenario: 任务状态流转
- **WHEN** 任务从队列中取出执行
- **THEN** 状态从"等待中"变为"执行中"；抓取完成后变为"已完成"或"失败"

### Requirement: IPC 通信协议
系统 SHALL 定义 TypeScript 类型（src/types/ipc.ts）和 Rust 结构体，规范 Webview→Rust 和 Rust→Vue 的通信格式。

#### Scenario: ScrapeEvent 格式
- **WHEN** 注入脚本发送数据
- **THEN** 事件格式为 `{ type: 'SCRAPE_DATA', workerId, taskUrl, data: { key, value } }`

#### Scenario: UiEvent 格式
- **WHEN** Rust 向 Vue 前端推送事件
- **THEN** 事件格式为 `{ event_type: 'TASK_PROGRESS'|'TASK_COMPLETE'|'CAPTCHA_ALERT'|'LOGIN_REQUIRED', task_id, data }`

### Requirement: 仿人机行为设计
注入脚本在目标页面中执行时 SHALL 模拟人类行为：
- 模拟缓慢滚动（300px 步进，500~1000ms 随机间隔）
- 所有定时器加入随机抖动（±30%）
- Worker Webview 模拟桌面浏览器视口（~1200×720）

### Requirement: 差错恢复与重试
每类抓取模块 SHALL 有独立的重试策略：
- 主图：每 500ms 重试找 DOM 容器，最多 100 次（50 秒超时）
- SKU 图：初始轮询 3 秒×10 次 + MutationObserver 兜底（30 秒超时）
- 详情图：每 1 秒检查 descV8 容器，最多 5 次（5 秒超时）
- 视频：每 1 秒检测 10 次 + Performance API 持续监听（30 秒超时）
- 标题：等待特定 class 元素出现，最多 5 次重试（5 秒超时）

#### Scenario: 超时不阻塞
- **WHEN** 某模块超时放弃
- **THEN** 仅标记该模块数据缺失，不阻塞其他模块和后续任务

## MODIFIED Requirements
无（全新项目）

## REMOVED Requirements
无（全新项目）
