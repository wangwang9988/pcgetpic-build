# PcGetPic 项目规则

本文件是给 AI/开发者使用的项目事实与维护约束。所有内容必须以当前代码为准；如果无法从代码直接确认，宁可不写，不允许写成确定事实。

---

## 最高优先级

1. 根目录 `PcGetPic/` 是多项目工作区，不是 Node/Vite/Tauri 项目根目录。当前有两个桌面客户端：当图客户端位于 `client/`，TuGet（图个吉利）客户端位于 `TuGet-Client/`。
2. `client/`、`TuGet-Client/`、`GetPic/`、`Pro-GetPic/`、`website/`、`server/`、`browser/`、`cps-server/`、`ec-nuxt/`、`tools/` 是 Git submodule；`admin-panel/`、`store/`、`tuget-protocol/` 和 `tuget-native-host/` 当前由工作区仓库直接维护。
3. 修改子模块内代码时，应在对应子模块目录内理解、测试和提交；容器仓库只记录子模块指针和容器级文件。
4. 不要把旧路径 `src/`、`src-tauri/` 当作根目录路径使用。当图客户端路径是 `client/src/`、`client/src-tauri/`；TuGet 客户端路径是 `TuGet-Client/src/`、`TuGet-Client/src-tauri/`。
5. 公共入口文件只做装配，不写业务逻辑。当前代码已明确约束 `client/src-tauri/src/lib.rs` 和 `client/src/App.vue` 仅用于模块声明、初始化、Provider/布局组装、事件监听等胶水逻辑。
6. 涉及平台抓取、URL 清洗、登录、下载、授权、支付等逻辑时，必须先读当前对应源码，不得仅凭历史文档或旧规则判断。

---

## 工作区结构

```text
PcGetPic/
├── client/              # 当图桌面客户端：Tauri v2 + Vue 3 + TypeScript + Rust
├── TuGet-Client/        # TuGet 桌面客户端：Tauri v2 + Vue 3 + TypeScript + Rust
├── tuget-protocol/      # TuGet 共享协议、Schema 与契约测试
├── tuget-native-host/   # Native Messaging ↔ Windows Named Pipe 桥
├── GetPic/              # 浏览器插件参考源：WXT + Vue，Git submodule
├── Pro-GetPic/          # 专业版浏览器插件，Git submodule
├── browser/             # GetPic Browser：Rust Chromium 启动器，Git submodule
├── server/              # 授权/支付/统计服务端：Node.js + Express + TypeScript + SQLite，Git submodule
├── cps-server/          # CPS/图片搜索服务：Node.js + Express(CommonJS)，Git submodule
├── website/             # 官网：Nuxt，Git submodule
├── admin-panel/         # 授权系统管理后台：Vue 3 + Vite + Naive UI
├── store/               # 售卡收银台：Vue 3 + Vite + Naive UI
├── deploy/nginx/        # api/admin/store.downpictures.com 的 Nginx 配置
├── docs/                # 项目文档
└── scripts/clients/
    ├── dangtu/          # 当图客户端开发、构建入口
    └── tuget/           # TuGet 跨项目联调入口
```

工作区根目录没有 `package.json`，不要在根目录执行客户端 npm 命令。两个客户端的工作区级入口集中放在 `scripts/clients/`，名称必须明确指向当图或 TuGet。

---

## 常用命令

当图客户端：

```powershell
cd client
npm run dev:app
npm run build:app
npm run build:scraper
npm run typecheck
npm run build:check
```

TuGet 完整开发环境：

```powershell
.\scripts\clients\tuget\启动完整开发环境.ps1
```

TuGet 客户端单独开发与构建：

```powershell
cd TuGet-Client
npm run tauri dev
npm run tauri build
```

授权服务端：

```powershell
cd server
npm run dev
npm run build
npm run start
```

管理后台：

```powershell
cd admin-panel
npm run dev
npm run build
```

收银台：

```powershell
cd store
npm run dev
npm run build
```

官网：

```powershell
cd website
npm run dev
npm run generate
```

浏览器插件：

```powershell
cd GetPic
npm run dev
npm run build
npm run package:all:official
```

套壳浏览器：

```powershell
cd browser
npm run dev
npm run build
npm run update-plugin
npm run download-chromium
npm run verify
npm run package:portable
```

CPS 服务：

```powershell
cd cps-server
npm run dev
npm run start
```

---

## 当图桌面客户端事实

`client/package.json` 当前项目名为 `downpictures-client`，版本为 `3.10.126`，技术栈为 Tauri v2、Vue 3、TypeScript、Rust、Pinia、Naive UI。

`client/src-tauri/tauri.conf.json` 当前配置：

- `productName`: `当图客户端-电商图片视频批量下载器`
- `mainBinaryName`: `dangtu`
- `identifier`: `com.downpictures.client`
- 开发前端地址：`http://localhost:1420`
- `beforeDevCommand`: `npm run dev:web`
- `beforeBuildCommand`: `npm run build`
- 打包目标：`nsis`
- `../dist-scripts/*` 会作为 `bundles/` 资源打入安装包

`client/vite.config.ts` 当前开发端口为 `1420`，且 `strictPort: true`。

### 前端目录

```text
client/src/
├── App.vue                       # 根组件组装层
├── main.ts                       # Vue/Pinia 挂载入口
├── components/                   # 主界面、下载、授权、图片工具箱等组件
├── composables/                  # IPC、验证码、平台选择、侧栏持久化、主题、激活码逻辑
├── stores/                       # taskQueue / scrapeResult / downloadState / licenseStore
├── types/                        # ipc.ts / license.ts
└── utils/
    ├── platforms/                # 平台识别、URL 清洗、商品 ID 提取
    ├── image-toolkit/            # 图片工具箱逻辑
    ├── downloadManager.ts
    ├── downloadFolderManager.ts
    ├── downloadTypes.ts
    └── antiHotlink.ts
```

前端入口约束：

- `client/src/main.ts` 只创建 Vue app、安装 Pinia、挂载 `App.vue`。
- `client/src/App.vue` 是组装层：Provider、布局、等待页、状态栏、授权弹窗、首次启动协议、IPC composable 等。新增业务逻辑应进入 `components/`、`composables/` 或 `stores/`。

### Rust 目录

```text
client/src-tauri/src/
├── lib.rs                # Tauri 入口，仅模块声明、setup、invoke_handler 注册
├── state.rs              # AppState 初始化与全局状态
├── dispatch.rs           # Worker 调度、窗口创建、安全关闭
├── worker_pool.rs        # WorkerPool、Task、WorkerState
├── worker_handlers.rs    # 导航、页面加载、登录/验证码判断、脚本注入决策
├── scrape_handler.rs     # scrape-data 监听、去重、防拥堵联动
├── timeout_monitor.rs    # 1 秒轮询超时监控
├── congestion.rs         # 探路者/等待者防拥堵逻辑
├── session_keeper.rs     # Session Cookie 保持
├── injector.rs           # dist-scripts bundle 加载与缓存
├── platform_resolver.rs  # Rust 侧 URL -> Platform
├── cdp.rs                # 外部浏览器 CDP Cookie 获取
├── cookie.rs             # WebView2 Cookie 数据目录管理
├── cookie_import/        # Chrome/Edge Cookie 解密与 WebView2 注入
├── login/                # 各平台登录检测策略
├── license/              # 授权验证、本地加密存储、HTTP 客户端、后台吊销检查
└── commands/             # Tauri commands，按职责拆分
```

`commands/` 当前子模块包括：`analytics`、`config`、`download`、`file_ops`、`login`、`scraping`、`speed_worker`、`update`、`worker`。新增 Tauri Command 必须放入合适子模块，并在 `lib.rs` 的 `invoke_handler` 注册。

---

## 抓取脚本与平台同步

抓取脚本位于 `client/scraper-scripts/`，共享桥接代码位于 `client/scraper-scripts/shared/`。`client/scripts/build-scraper.mjs` 使用 Vite IIFE 构建平台 bundle，输出到 `client/dist-scripts/{platform}.bundle.js`。

当前核验到的平台现状：

- `client/src/utils/platforms/` 有 41 个平台 handler 文件。
- `client/src/utils/platforms/index.ts` 的 `PLATFORM_PATTERNS` 有 41 个平台。
- `client/src/utils/platforms/registry.ts` 的 `PLATFORM_HANDLERS` 有 41 个平台。
- `client/src-tauri/src/platform_resolver.rs` 有 41 个平台枚举变体 + `Unknown`，共 42 个枚举值。
- `client/scraper-scripts/` 有 40 个平台目录，不含 `dangdang`。
- `client/scripts/build-scraper.mjs` 当前注册 40 个构建入口，不含 `dangdang`。
- `GetPic/entrypoints/modules/` 有 41 个平台目录，包含 `dangdang`。

因此：`dangdang` 当前只具备前端识别、URL handler、Rust 平台枚举、插件参考源目录；客户端抓取脚本和构建入口尚未存在。不要把它写成客户端已完整抓取支持。

添加或修复平台时，至少同步检查这些位置：

1. `GetPic/entrypoints/modules/{platform}/`：插件参考实现和 URL 清洗逻辑。
2. `client/src/utils/platforms/{platform}.ts`：前端 URL 清洗、商品 ID 提取、标题提示。
3. `client/src/utils/platforms/index.ts`：`PLATFORM_PATTERNS`、`PLATFORM_LABELS`、`PLATFORM_ICONS`。
4. `client/src/utils/platforms/registry.ts`：注册 handler。
5. `client/src-tauri/src/platform_resolver.rs`：`Platform` 枚举、`from_url()`、`bundle_name()`。
6. `client/src-tauri/src/utils.rs`：如果涉及平台展示名、Referer 或窗口标题映射，必须同步检查。
7. `client/scraper-scripts/{platform}/`：DOM 抓取脚本。
8. `client/scripts/build-scraper.mjs`：平台 bundle 构建入口。
9. `client/src-tauri/src/login/`：如需登录/验证码/商品页纠偏，添加或更新登录策略。

DOM 解析和页面数据收集应在 `client/scraper-scripts/` 中实现。Rust 侧负责窗口、调度、注入、Cookie、下载和授权，不应直接写平台 DOM 解析。

---

## Worker、登录与防拥堵

`AppState::new()` 当前初始化 `WorkerPool::new(2)`，默认并发为 2。`worker_pool.rs` 中 `MAX_WORKER_COUNT` 为 8，`set_worker_count` 会 clamp 到 1..8。

Worker 状态枚举：

```text
Idle
Working
CaptchaBlocked
WaitingForLogin
Error
```

调度事实：

- 任务队列使用 `VecDeque<Task>`。
- `dispatch_to_idle_workers()` 会优先给 Worker 继续分配同平台任务，否则取队首任务。
- 同平台未验证且已有活跃 Worker 时，新 Worker 会进入 `WaitingForLogin`，作为防拥堵等待者。
- 探路者 Worker 产出实质数据后，平台被标记为 verified，并释放同平台等待者。
- 实质数据 key 包括 `MainPic`、`DetailPic`、`SkuPic`、`VideoInfo`、`VideoUrls`。
- `release_all_orphaned_waiters()` 会释放没有 Working 探路者的平台等待者，把任务放回队列。

窗口事实：

- Worker 窗口 label 形如 `worker-{id}-{taskId}`。
- 等待登录窗口使用应用内 waiting 页面：`index.html?page=waiting&platform=...&workerId=...`。
- Worker WebView 使用共享 `data_directory`，并注入 `stealth.js` 和任务元数据。
- `dispatch.rs` 用全局 `BUILD_LOCK` 串行化 `WebviewWindowBuilder::build()`，用于规避 Windows 10 WebView2 并发创建问题。
- 不要直接随意关闭最后一个 WebView2 窗口。`safe_close_webview_window()` 和 `delayed_safe_close_webview_window()` 是为了保护 Session Cookie。

登录事实：

- `login/mod.rs` 当前注册 25 个登录策略。
- 独立策略文件包括：`amazon`、`ebay`、`jd`、`lazada`、`taobao`、`temu`、`douyin`、`tiktok`、`alibaba`。
- 其余部分平台使用 `DefaultLoginStrategy`。
- `Platform::use_external_browser_login()` 当前对 `taobao`、`jd`、`vip`、`alibaba`、`Unknown` 返回 false；其余已知平台返回 true。
- 外部浏览器登录通过 Chrome/Edge + CDP 获取 Cookie，再经 WebView2 CookieManager 注入共享 data directory。
- Cookie 导入必须保留 HttpOnly 支持；不要退回到 `document.cookie`。

超时事实：

- `AppState::new()` 默认 `idle_timeout = 60` 秒。
- `set_scraping_config` 会把 `idle_timeout` clamp 到 3..120 秒。
- `timeout_monitor.rs` 每 1 秒检查一次。
- Worker 已产出数据后，静默超过 `idle_timeout` 会自动 complete。
- Worker 未产出数据时，超过 `idle_timeout * 2 + 5` 后会判断当前 URL 是否登录/验证码；是则转 `CaptchaBlocked`，否则自动 complete。
- `CaptchaBlocked` 持续 300 秒会 fail。
- `CaptchaBlocked` 进入 3 秒后会轮询判断是否已回到可恢复页面，符合条件则恢复 Working 并重新注入 bundle。

SessionKeeper：

- 当前 `needs_session_keeper(platform)` 只对 `alibaba` 返回 true。
- 作用是保持 WebView2 浏览器进程不退出，避免阿里巴巴 Session Cookie 丢失。
- Keeper 窗口不应被普通 Worker 清理、静默超时、看门狗逻辑误关。

---

## 下载与文件命名

下载调度在前端 `client/src/utils/downloadManager.ts`，实际文件下载在 Rust `client/src-tauri/src/commands/download.rs`。

当前下载事实：

- `MAX_CONCURRENT = 5`。
- `MAX_RETRY = 3`，表示失败后最多重试 3 次；加上首次执行，最多 4 次尝试。
- 重试退避为 1s、2s、4s。
- 普通资源获取超时 `TIMEOUT.RESOURCE_FETCH = 30_000`。
- 大媒体资源获取超时 `TIMEOUT.LARGE_RESOURCE_FETCH = 300_000`。
- 文件写入超时 `TIMEOUT.FILE_WRITE = 60_000`。
- `DownloadManager.startDownload()` 前端会先调用 `check_license_status`，未激活则阻止下载并弹出激活弹窗。
- Rust `download_file` 会再次调用 `verify_before_operation()`；未授权、过期、时间回拨或吊销检查过期会拒绝下载。
- `fetch_resource_as_data_url` 用于防盗链预览代理，当前注释明确说明预览代理不做授权校验，授权延后到下载时。

命名规则唯一来源：

- 资源文件名：`client/src/utils/downloadFolderManager.ts` 的 `generateResourceName()`。
- 下载子文件夹：`client/src/utils/downloadFolderManager.ts` 的 `generateFolderName()`。
- 当前文件夹模板为 `{productId}_{productTitle}_{date}`。
- 标题会清理非法字符，截断到 30 字符；最终文件夹名限制 100 字符。
- 资源文件名示例：`主图1.jpg`、`SKU图2.jpg`、`详情图1.jpg`、`视频1.mp4`。

防盗链预览当前识别域名：

```text
360buyimg.com
jdimg.com
sinaimg.cn
weibocdn.com
photo.yupoo.com
```

---

## 授权服务端

`server/` 是授权、支付、插件统计、客户端统计服务端，技术栈为 Express + TypeScript + better-sqlite3。

入口与配置：

- 入口：`server/src/app.ts`
- 配置：`server/src/config.ts`
- 数据库初始化：`server/src/db.ts`
- 默认端口：`PORT` 环境变量或 `3001`
- SQLite 路径：`DB_PATH` 环境变量或 `server/data/license.db`
- `MASTER_KEY` 必须是 64 个十六进制字符，否则进程会退出
- JWT 有效期当前为 24 小时
- HMAC 时间戳容差当前为 15 分钟

路由事实：

- `/health` 无鉴权。
- `/api/v1/payment` 在 HMAC 中间件之前注册，不走 HMAC。
- `/api/v1/plugin-analytics`、`/api/v1/plugin-newtab`、`/api/v1/plugin-uninstall`、`/api/v1/client-analytics/ping` 在 HMAC 中间件之前注册。
- `/api/v1` 后续客户端接口使用 `hmacVerify`。
- `/api/v1/client-analytics` 在 HMAC 后注册。
- `/api/v1/activate`、`/api/v1/check-revoke`、`/api/v1/deactivate` 使用 HMAC，并有速率限制。
- `/api/admin/login` 不走管理员 JWT；`/api/admin/*` 其余路由经 `authGuard`。

HMAC 签名规则：

```text
HMAC-SHA256(code + device_id + timestamp + client_version, HMAC_SECRET)
```

`check_revoke` 和 `deactivate` 当前不传 `client_version`，客户端和服务端都以空字符串占位。修改签名字段时必须同步 Rust `client/src-tauri/src/license/http_client.rs` 与服务端 `server/src/middleware/hmac.ts`。

数据库事实：

- 使用 better-sqlite3。
- 启用 WAL：`journal_mode = WAL`。
- 启用外键：`foreign_keys = ON`。
- 表包含激活码、设备绑定、套餐、渠道、管理员、签名密钥、订单、插件统计、插件新标签页统计、插件卸载统计、客户端统计等。
- `DEFAULT_PACKAGES` 只在 packages 表为空时初始化；后续套餐价格等以数据库为准，不应在启动时覆盖管理后台修改。

---

## 管理后台与收银台

`admin-panel/`：

- Vue 3 + Vite + TypeScript + Naive UI + Pinia + Vue Router + Axios。
- `src/api/index.ts` 的 axios baseURL 为 `/api/admin`。
- 请求拦截器从 `localStorage.admin_token` 添加 `Authorization: Bearer ...`。
- 响应拦截器会解包 `{ success, data, message }`，401 会清 token 并跳转 `/login`。
- 路由守卫使用 `localStorage.admin_token` 判断登录。
- 当前默认进入 `/plugin-analytics`。

`store/`：

- Vue 3 + Vite + TypeScript + Naive UI + Axios + qrcode。
- 主流程在 `store/src/views/home/Home.vue`：套餐展示 -> 订单表单 -> 扫码支付 -> 支付成功。
- 使用 `/api/v1/payment` 相关接口；这些接口在服务端 HMAC 中间件之前注册。
- 支持抵扣券状态查询、邮箱输入、支付二维码、支付成功展示激活码。

部署配置：

- `deploy/nginx/api.downpictures.com.conf` 将 `api.downpictures.com` 反代到 `127.0.0.1:3001`。
- `deploy/nginx/admin.downpictures.com.conf` 的 `/api` 反代到 `127.0.0.1:3001`，其他路径使用 SPA fallback。
- `deploy/nginx/store.downpictures.com.conf` 的 `/api` 反代到 `127.0.0.1:3001`，其他路径使用 SPA fallback。

---

## GetPic 插件与套壳浏览器

`GetPic/`：

- WXT + Vue 浏览器插件项目。
- `package.json` 要求 Node `>= 22.0.0`。
- 平台参考抓取逻辑位于 `GetPic/entrypoints/modules/`。
- `wxt.config.ts` 当前只重导出 `./config/wxt`，不要把 WXT 配置逻辑直接写回该入口。
- `build:official` 构建 official 模式并执行 `sync:browser`。
- `package:all:official` 会构建 Chrome/Edge/Firefox official 产物，并发布网站下载资源。

`browser/`：

- Rust Chromium 启动器，不维护插件源码。
- 默认加载 `browser/extensions/getpic/` 下从 GetPic 构建产物复制来的扩展。
- Chromium 本体位于 `browser/chromium/chrome.exe`，本地生成，不进 Git。
- `browser/scripts/update-plugin.ps1` 默认从 `../GetPic/.output/chrome-mv3` 复制插件产物。
- `browser/chromium-version.json` 固定 Chrome for Testing 版本和下载信息。

---

## 官网与 CPS 服务

`website/`：

- Nuxt 项目，`package.json` 中 `build` 等同于 `npm run generate`。
- 运行脚本包括 `dev`、`generate`、`preview`。
- `nuxt.config.ts` 当前配置了 sitemap、robots、image、i18n。
- 开发服务器端口当前为 `3010`。
- 页面位于 `website/app/pages/`，平台数据位于 `website/app/data/platforms.ts`。

`cps-server/`：

- CommonJS Express 服务，默认端口为 `PORT` 环境变量或 `3100`。
- 入口为 `cps-server/server.js`。
- 平台注册入口位于 `cps-server/platforms/`，当前注册 `dataoke`、`jd`、`haodanku`、`ali1688`、`taobao`。
- 路由位于 `cps-server/routes/`，第三方 API 调用位于 `cps-server/services/`。
- 该服务与 `server/` 授权服务是两个独立 Node 项目，不要混用配置和端口。

---

## 代码维护约束

1. 修改前先确认实际项目根目录。当图客户端进入 `client/`，TuGet 客户端进入 `TuGet-Client/`，授权服务进入 `server/`，后台进入 `admin-panel/`，收银台进入 `store/`。
2. 严禁把大段业务逻辑写入 `client/src-tauri/src/lib.rs`、`client/src/App.vue`、`client/src/main.ts`、`GetPic/wxt.config.ts` 等公共入口。
3. 平台识别、URL 清洗、Rust 平台枚举、抓取脚本、构建入口必须同步维护；缺一项都可能导致“识别成功但注入失败”或“前端显示支持但实际不可抓”。
4. 下载文件名和文件夹名只能通过 `downloadFolderManager.ts` 统一规则生成，不要在组件里复制一套命名逻辑。
5. 授权相关逻辑同时涉及客户端 Rust、前端 store、服务端 HMAC/数据库。修改时必须双端核对，不要只改一侧。
6. 外部浏览器 Cookie 导入链路依赖 CDP、DPAPI/AES-GCM 解密、WebView2 CookieManager 注入。不要用 `document.cookie` 替代该链路。
7. Session Cookie 保护依赖 `safe_close_webview_window`、`delayed_safe_close_webview_window`、`SessionKeeper`。关闭窗口逻辑必须非常谨慎。
8. 服务端套餐价格和设备数等运营数据以数据库为准。`DEFAULT_PACKAGES` 只用于首次初始化，不应用作每次启动覆盖。
9. 生产域名、端口、Nginx 反代关系以 `deploy/nginx/` 和当前服务配置为准。修改接口路径时要同步前端 baseURL、服务端路由和部署配置。
10. 本文件不是需求文档。它只记录当前代码已能确认的事实和维护边界；代码变化后必须同步更新本文件，不能让它继续保留过期事实。
