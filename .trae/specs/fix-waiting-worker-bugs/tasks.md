# Tasks

- [x] Task 1: 看门狗豁免 WaitingForLogin 状态
  - [x] 在 lib.rs 60秒看门狗超时检查中，将豁免判定从仅 CaptchaBlocked 扩展为 `CaptchaBlocked || WaitingForLogin`
  - [x] 更新日志输出，显示当前 Worker 的实际状态

- [x] Task 2: 废弃 data:text/html，改用 WebviewUrl::App 加载等待页
  - [x] 修改 lib.rs 中 do_dispatch 的 webview_url 逻辑：WaitingForLogin 时使用 WebviewUrl::App 而非 data:text/html
  - [x] 删除 Rust 代码中的硬编码 HTML 模板（约20行 HTML 字符串）

- [x] Task 3: 前端 App.vue 新增等待页面条件渲染
  - [x] 在 App.vue 中检测 URL 参数 page=waiting，条件渲染全屏等待组件而非主程序界面
  - [x] 从 URL 参数读取 platform 和 workerId，显示在等待页面中
  - [x] 实现 handleForceStart 函数调用 invoke('force_start_worker')
  - [x] 添加深色渐变毛玻璃风格 CSS 样式

- [x] Task 4: verified_platforms 过期自动清理
  - [x] 在 worker_pool.rs 新增 unverify_platform() 方法
  - [x] 在 on_navigation 和 on_page_load 中检测到 LoginRequired/Captcha 时调用 unverify_platform()

- [x] Task 5: 编译验证与功能测试

# Task Dependencies
- [Task 1] 无依赖，可立即执行
- [Task 2] 无依赖，可立即执行（与 Task 1 并行）
- [Task 3] 依赖 [Task 2]，需要后端先改为 App URL 方式
- [Task 4] 无依赖，可立即执行（与 Task 1 并行）
- [Task 5] 依赖所有前置任务
