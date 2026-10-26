# PcGetPic 项目说明与开发速查

本文档主要用于查找和复制以 TuGet-Client 为主的开发命令：**改了哪个文件夹，该用哪个命令启动。** 项目定位与关系放在文末供参考。

CN=E8115DF3-4877-4AA3-B8BE-34D093AB0630

---

## ⚡ 命令速查

### 一、根目录 `D:\Trae\PcGetPic`

先 `cd D:\Trae\PcGetPic`，再运行以下命令。

#### npm 快捷命令

npm run clean:tuget-data  # 高频日常清理。清除当前用户的 EXE、商店/本地测试 MSIX 安装与运行数据，不删除仓库内的旧安装器。
npm run dev  # 快速裸启动客户端，不检查任何配合项目。确定只改了 TuGet-Client/ 时用，最快。
npm run dev:all  # 日常开发推荐。自动检测 browser/、tuget-native-host/、tuget-protocol/ 和 Pro-GetPic 插件输入，无变化跳过构建，但每轮仍校验现有插件。
npm run dev:plugin  # 强制刷新 Pro-GetPic 插件链（忽略指纹），Rust 项目仍按需检测。排查缓存、同步标记或产物异常时用。
npm run dev:rebuild  # 全量重建所有配合项目产物。产物状态混乱或多个项目都改了时用，最保险但最慢。
npm run dev:check  # 仅检查 Node.js、Rust、npm、项目路径和必要脚本，不构建、不注册、不启动。
npm run build:tuget  # 生成包含全部配套运行时的 NSIS 安装程序，并自动同步到 tools/public/downloads/TuGet-Client/TuGet-Setup.exe。
npm run package:extensions  # 一键打包 3 款浏览器插件（当图 GetPic、图个吉利 Pro-GetPic、一得 next-GetPic）的官方 4 浏览器离线压缩包，自动先切回官方主变体并同步到 tools/public/downloads 与 website/public/downloads。
npm run clean:tuget-release  # 仅用于发布构建前清环境；会同时删除仓库内的旧 TuGet-Setup.exe，不是跨电脑日常清理命令。
npm run check:lines  # 全工作区代码规模红线巡检（18 个子项目，默认排除测试代码，不阻断构建）。
npm run check:lines:client  # 只检查当图客户端（client/）的代码文件行数。
npm run check:lines:tuget  # 只检查图个吉利客户端（TuGet-Client/）的代码文件行数。
npm run check:lines:oneget  # 只检查一得浏览器插件（next-GetPic/）的代码文件行数。
npm run check:lines:getpic  # 只检查当图浏览器插件（GetPic/）的代码文件行数。
npm run check:lines:pro-getpic  # 只检查图个吉利浏览器插件（Pro-GetPic/）的代码文件行数。
npm run check:lines:server  # 只检查业务授权后端（server/）的代码文件行数。
npm run check:lines:strict  # 严格卡口模式：仅对相对 HEAD 新增/修改的文件做 >=1200 行红线阻断校验。
npm run check:lines:scopes  # 列出所有支持按需巡检的子项目名称、中文别名与组合别名。

两类清理命令不要混用：

| 根目录命令 | `TuGet-Client` 等价命令 | 用途 |
| --- | --- | --- |
| `npm run clean:tuget-data` | `npm run clean:installed-data` | 日常重置已安装客户端；支持 NSIS EXE、Microsoft Store MSIX 和 `MSIX-OK\test` 本地测试 MSIX。独立脚本可复制到其他电脑运行，不删除仓库安装器。 |
| `npm run clean:tuget-release` | `npm run clean:release` | 发布流水线专用清理；需要完整 PcGetPic 工作区，并会删除上一轮 NSIS EXE 产物。不负责卸载商店/测试 MSIX。 |

#### 交互式启动器（可选客户端）

pwsh .\scripts\dev.ps1                        # 交互式选择启动当图（1420）或 TuGet（1430）客户端
pwsh .\scripts\dev.ps1 -Client dangtu          # 直接启动当图客户端（端口 1420）
pwsh .\scripts\dev.ps1 -Client tuget           # 直接启动 TuGet 客户端（端口 1430），等价于 npm run dev:all

`dev.ps1 -Client tuget` 与上面的 `npm run dev:all` 调用同一个底层脚本（`scripts/clients/tuget/启动完整开发环境.ps1`），不传 `-Rebuild`、`-UpdatePlugin` 等开关，因此行为完全等价于 `npm run dev:all`，而非 `npm run dev:rebuild`。后者需要额外加 `-Rebuild` 参数（见下表）。

| `dev.ps1` 参数 | 等价 npm 命令 | 说明 |
| --- | --- | --- |
| `-Client tuget` | `npm run dev:all` | 按需检测、智能跳过 |
| `-Client tuget -UpdatePlugin` | `npm run dev:plugin` | 强制刷新插件链 |
| `-Client tuget -Rebuild` | `npm run dev:rebuild` | 全量重建所有产物 |
| `-Client tuget -Check` | `npm run dev:check` | 仅检查环境 |
| `-Client dangtu` | — | 启动当图客户端，无对应 npm 脚本 |

### 二、`TuGet-Client` 目录 `D:\Trae\PcGetPic\TuGet-Client`

先 `cd D:\Trae\PcGetPic\TuGet-Client`，再运行以下命令。

npm run clean:installed-data  # 等价于根目录的 npm run clean:tuget-data——高频日常清理 EXE/MSIX 安装和数据。
npm run dev  # 仅启动 Vite 前端热更新，不启动 Tauri 窗口，不检查配合项目。纯前端调试时用。
npm run dev:client  # 等价于根目录的 npm run dev——裸启动 Tauri 桌面窗口 + Vite，不构建配合项目。
npm run dev:all  # 等价于根目录的 npm run dev:all——自动检测配合项目和插件输入，按需重建。
npm run dev:plugin  # 等价于根目录的 npm run dev:plugin——强制刷新插件链。
npm run dev:rebuild  # 等价于根目录的 npm run dev:rebuild——全量重建所有产物。
npm run dev:check  # 等价于根目录的 npm run dev:check——仅检查环境。
npm run build:release  # 等价于根目录的 npm run build:tuget——生成完整 NSIS 安装程序并同步到 tools 下载目录。
npm run clean:release  # 等价于根目录的 npm run clean:tuget-release——单独清理历史安装状态。
npm run check  # TypeScript 类型检查 + Rust cargo check。
npm run test:frontend  # 前端单元测试（Vitest）。
npm test  # Rust 后端测试（cargo test）。
npm run build  # 前端生产构建（vue-tsc --noEmit && vite build），不含 Tauri 打包。

等价命令对照：

| 根目录命令 | TuGet-Client 等价命令 | 旧 dev.ps1 等价命令 |
| --- | --- | --- |
| npm run dev | npm run dev:client | 无直接等价 |
| npm run dev:all | npm run dev:all | .\scripts\dev.ps1 -Client tuget |
| npm run dev:plugin | npm run dev:plugin | .\scripts\dev.ps1 -Client tuget -UpdatePlugin |
| npm run dev:rebuild | npm run dev:rebuild | .\scripts\dev.ps1 -Client tuget -Rebuild |
| npm run dev:check | npm run dev:check | .\scripts\dev.ps1 -Client tuget -Check |
| npm run build:tuget | npm run build:release | — |
| npm run clean:tuget-data | npm run clean:installed-data | — |
| npm run clean:tuget-release | npm run clean:release | — |

---

## 日常启动命令

开发版使用 `com.tuget.desktop.dev` Native Host 和 `%LOCALAPPDATA%\TuGetBrowser-Dev\User Data`；当前 EXE/MSIX 分别使用 `com.tuget.desktop.exe` / `com.tuget.desktop.msix`，旧 `com.tuget.desktop` 仅保留兼容入口。`dev:all` / `dev:plugin` 会检查 Chrome 与 Chromium 的开发注册项，不再覆盖生产注册。首次切换到开发专用 Profile 需要重新登录测试网站，旧 Profile 保留。

开发客户端始终从工作区查找 Browser Engine，并使用独立的 `com.tuget.client/DevelopmentWebView/EBWebView` 内嵌界面数据目录。修复后的生产源码只允许加载安装目录内的 Browser Engine，资源缺失时明确报错；该生产行为需重新构建并升级安装包后生效。

旧 MSIX（例如 1.2.2.0）的定向修复工具是 `scripts/clients/tuget/repair-installed-native-host.ps1`，仅用于核对后的旧共享 Host/路径问题，不升级二进制，也不是当前独立渠道的常规修复入口。当前机制及旧包适用范围统一见[浏览器启动与通信维护说明](TuGet-Client/docs/浏览器启动与通信维护说明.md#historical-isolation)。

需要完整联调时，优先使用这个命令：

npm run dev:all

它会自动检测 `browser/`、`tuget-native-host/` 的源码变化，用内容指纹检查 `tuget-protocol/` 和 Pro-GetPic desktop 的有效构建输入。只有相关内容变化时才重建；指纹一致时复用 browser 中的插件，但仍会每轮执行完整性校验。日常开发绝大部分时候用这个命令就够了。

启动脚本还会把开发版客户端绑定到本地授权服务：默认根据
`server/.env` 的 `PORT` 使用 `http://127.0.0.1:<PORT>`，并将同一文件中的
`HMAC_SECRET_TUGET` 注入客户端，保证本地管理后台生成的激活码可正常验证。
如需联调其他服务，可在启动前显式设置
`TUGET_LICENSE_SERVER_URL` 和 `TUGET_LICENSE_HMAC_SECRET`。生产构建仍由发行脚本独立注入线上配置。

为什么推荐 `dev:all` 而不是 `dev`：

- `dev:all` 会自动检测 `browser`、`tuget-native-host`、`tuget-protocol` 和 Pro-GetPic desktop 构建输入，不需要手动判断改了哪个。
- Pro-GetPic 使用内容指纹而不是文件时间戳；`pro-runtime/`、协议实际构建输出、desktop 环境变量及所有有效入口都在检测范围内，新增、删除、重命名和未提交修改都会被识别。
- `tuget-protocol` 也以源码内容指纹和 `dist/source-fingerprint.json` 构建标记比对，单独构建协议后仍会触发插件刷新。
- `dev:all` 不会做无意义的重复构建；无变化时只保留快速插件校验、Native Host 归属检查和客户端启动。
- 三个 npm 项目会用 `package.json` + `package-lock.json` 的依赖标记判断是否需要重新安装，不再只看 `node_modules` 目录是否存在。
- `dev:plugin` 无条件刷新插件链，`dev:rebuild` 无条件重建全部产物；只有排查缓存或产物异常时才需要使用。

其他场景的命令：

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| **日常开发（大部分时候）** | `npm run dev:all` | 自动检测配合项目和插件输入，无变化全部跳过 |
| 确定只改了 TuGet-Client、想最快启动 | `npm run dev` | 跳过所有检查，纯启动客户端 |
| 强制刷新 Pro-GetPic 插件 | `npm run dev:plugin` | 忽略指纹，每次都构建、同步并校验插件 |
| 产物状态混乱 / 多个项目都改了 | `npm run dev:rebuild` | 全量重建，最保险但最慢 |
| 仅检查环境 | `npm run dev:check` | 不构建、不注册、不启动 |

## 构建流水线对比矩阵

上面是从"改了什么"选命令的角度。下面换个视角——每个命令到底执行了哪些构建步骤，哪些跳过、哪些按需、哪些强制。TuGet 客户端的完整启动流水线有 6 步，4 个命令的差异全在这里：

| 构建步骤 | `dev` | `dev:all` | `dev:plugin` | `dev:rebuild` |
| --- | :---: | :---: | :---: | :---: |
| 清理残留进程 / 端口 1430 | ✅ | ✅ | ✅ | ✅ |
| 1. tuget-protocol 构建 | — 跳过 | 🔍 按需 | 🔍 按需 | ✅ 强制 |
| 2. Pro-GetPic desktop 插件构建 | — 跳过 | 🔍 按需（SHA-256 指纹） | ✅ 强制 | ✅ 强制 |
| 3a. 插件同步到 browser | — 跳过 | 🔍 跟随步骤 2 | ✅ 强制 | ✅ 强制 |
| 3b. browser 现有插件校验 | — 跳过 | ✅ 每轮 | ✅ 每轮 | ✅ 每轮 |
| 3c. browser 引擎编译（cargo build --release） | — 跳过 | 🔍 按需（时间戳） | 🔍 按需 | ✅ 强制 |
| 4. tuget-native-host 编译（cargo build --bins） | — 跳过 | 🔍 按需（时间戳） | 🔍 按需 | ✅ 强制 |
| 5. Native Host 当前工作区注册检查/自愈 | — 跳过 | ✅ | ✅ | ✅ |
| 6. 启动 TuGet 客户端（npx tauri dev） | ✅ | ✅ | ✅ | ✅ |
| **相对速度** | ⚡ 最快 | 🚀 快（无变化≈dev） | 🐢 慢 | 🐢🐢 最慢 |

**图例**：✅ 执行 · 🔍 按需检测（有变化才执行） · — 不执行

**关键区别速记**：

- `dev` = 裸启动，什么都不检查。
- `dev:all` = 全部按需，智能跳过，无变化时和 `dev` 几乎一样快。
- `dev:plugin` = 插件链强制（步骤 2→3a），Rust 项目（步骤 3c、4）仍然按需。排查缓存、同步标记或插件产物异常时用。
- `dev:rebuild` = 一切强制，包括 Rust。产物混乱或多项目都改了时用。

> 💡 **"按需"的两种检测机制不同**：Rust 项目（browser、native-host）目前仍用**文件时间戳**比较源码与产物；`tuget-protocol` 和 Pro-GetPic 插件使用 **SHA-256 内容指纹**。指纹比时间戳更精确——新增、删除、重命名和内容改回原样都能正确识别。

## 配合 TuGet-Client 的文件夹

TuGet-Client 不是独立运行的，它需要以下 4 个文件夹配合：

| 文件夹 | 角色 | 说明 |
| --- | --- | --- |
| `TuGet-Client/` | 客户端本体 | Tauri v2 + Vue 3 桌面应用，你日常主要改的就是这里 |
| `Pro-GetPic/` | 浏览器采集插件 | 编译为 desktop 扩展注入 browser，负责网页资源采集 |
| `browser/` | 套壳浏览器引擎 | Rust 项目，编译为 `tuget-browser.exe`，加载 Pro-GetPic 插件 |
| `tuget-native-host/` | Native Messaging 桥 | Rust 项目，编译为 `tuget-native-host.exe`，负责扩展与客户端之间的进程通信 |
| `tuget-protocol/` | 共享通信协议 | TypeScript 包，定义客户端、扩展、Native Host 之间的消息格式和 JSON Schema |

它们的关系：

```text
TuGet-Client (客户端)
       ↕ Named Pipe
tuget-native-host (Native Messaging 桥)
       ↕ Chrome Native Messaging
Pro-GetPic (desktop 插件，注入 browser)
       ↕ 运行在
browser (Chromium 引擎)

tuget-protocol 被 TuGet-Client、Pro-GetPic、tuget-native-host 三方共同依赖
```

## 改了哪个文件夹，该用哪个命令

### 1. 只改了 `TuGet-Client/`

npm run dev

启动 Tauri 桌面窗口 + Vite，不构建任何配合项目，自动清理残留进程和端口占用。确定只改了客户端代码时用这个，最快。

### 2. 改了 `Pro-GetPic/`

npm run dev:all

脚本会比较当前 desktop 有效构建输入与上次同步产物记录的 SHA-256 指纹。有变化时自动构建最新插件、同步到 browser 并校验；无变化时直接跳过。不需要重新编译 browser 引擎。

`npm run dev` 仍然只启动客户端，不检查插件。如果需要无条件刷新插件，可使用 `npm run dev:plugin`。旧的 Browser Engine 已经加载插件时，请先从客户端关闭它，确保下次启动加载新产物。

### 3. 改了 `browser/`

npm run dev:all

脚本会检测到 browser 的 Rust 源码（`src/`、`Cargo.toml`、`Cargo.lock`）比 release exe 新，自动执行 `cargo build --release` 重新编译 browser 引擎，然后启动客户端。

如果自动检测没生效（例如只改了配置文件但没改源码），用全量重建：

npm run dev:rebuild

### 4. 改了 `Pro-GetPic/` 和 `browser/` 两个文件夹

npm run dev:all

`dev:all` 会分别检测 Pro-GetPic 内容指纹和 browser 源码时间戳：按需重建插件，同时在 browser 源码变化时重新编译引擎。

如果 browser 的改动没有被自动检测到，改用：

npm run dev:rebuild

### 5. 改了 `tuget-native-host/`

npm run dev:all

脚本会检测到 native-host 的 Rust 源码（`src/`、`build.rs`、`Cargo.toml`、`Cargo.lock` 以及共享 Schema）比 debug exe 新，自动执行 `cargo build --bins` 重新编译，然后启动客户端。

### 6. 改了 `tuget-protocol/`

npm run dev:all

脚本会比较 protocol 源码内容指纹与 `dist/source-fingerprint.json` 构建标记，自动重建 protocol 包。协议的实际 `dist/src` 和 Schema 同时属于 Pro desktop 指纹输入，因此即使先在 protocol 目录单独执行过构建，随后运行 `dev:all` 仍能识别并刷新 protocol → Pro-GetPic 插件 → browser 同步校验链路。

### 7. 改了多个文件夹 / 不确定改了什么

npm run dev:rebuild

强制重建所有 4 个配合项目的全部产物，最保险但耗时最长。

## 快速对照表

| 改了哪个文件夹 | 启动命令 | 原因 |
| --- | --- | --- |
| `TuGet-Client/` | `npm run dev` | 只需重启客户端，不涉及配合项目 |
| `Pro-GetPic/` | `npm run dev:all` | 自动比较 desktop 输入指纹，按需重建并同步插件 |
| `browser/` | `npm run dev:all` | 脚本自动检测源码变更并重新编译 |
| `tuget-native-host/` | `npm run dev:all` | 脚本自动检测源码变更并重新编译 |
| `tuget-protocol/` | `npm run dev:all` | 脚本自动检测并重建 protocol + 插件链 |
| `Pro-GetPic/` + `browser/` | `npm run dev:all` | 分别检测插件输入与 browser 源码，按需构建 |
| 多个文件夹 / 不确定 | `npm run dev:rebuild` | 全量重建，不遗漏 |

## 环境要求

- Node.js >= 22
- PowerShell 7（`pwsh`）
- Rust stable
- Windows Tauri 编译环境

首次拉取工作区后初始化子模块：

git submodule update --init --recursive

首次开发前，在 TuGet-Client 安装依赖：

cd D:\Trae\PcGetPic\TuGet-Client
npm install

完整启动脚本会比较 `package.json`、`package-lock.json` 与 `node_modules/.tuget-dependency-fingerprint`，依赖缺失或锁定状态变化时按需自动安装。

## 端口说明

**3001 专供 `server` 后端使用。** 其他项目访问 `http://localhost:3001` 或 `http://127.0.0.1:3001` 的 API、代理配置继续保留；访问后端不会占用它的监听端口。

| 项目 | 本地开发端口规则 |
| --- | --- |
| server | **3001（保持现状）** |
| GetPic、Pro-GetPic、next-GetPic | 自动选择空闲端口，跳过 3001 |
| website、ec-nuxt | 原有 3010 仅作为首选；占用时自动换端口，跳过 3001 |
| oneget-website | 原有 3030 仅作为首选；占用时自动换端口，跳过 3001 |
| tools | 自动选择空闲端口，跳过 3001 |
| tuget-website | 原有 3020 仅作为首选；占用时自动换端口，跳过 3001 |
| cps-server | 3100 |
| client（当图客户端） | 1420 |
| TuGet-Client（图个吉利客户端） | 1430 |
| admin-panel | 5174 |
| store | 5175 |

三个插件和四个 Nuxt 项目保留框架的自动选端口能力，**唯一新增约束是跳过 3001**。其他项目占用了首选端口时，会自动寻找可用端口；实际访问地址以启动时终端输出为准。保持原来的 `npm run dev` 命令即可，修改配置前已启动的进程需要退出后重新启动。

各项目配置加载本项目的 `scripts/reserve-api-port.mjs`，仅在开发进程中把监听 3001 的请求作为端口不可用处理，让框架继续寻找其他端口；不会真正占住 3001，也不修改电脑的系统设置或 `NODE_OPTIONS`。Nuxt 开发子进程重新加载项目配置时同样生效，直接运行 `npx wxt` / `npx nuxt dev` 也会加载。各项目独立保留此脚本，生产构建和 server 后端保持现状。

不手工指定 `--port` 即可保留框架的自动分配行为；若强制指定 3001，仍会禁止监听，具体报错或回退方式由框架决定。

查看 3001 当前由谁监听（没有输出表示当前没有监听进程）：

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 3001 | Select-Object LocalAddress,LocalPort,OwningProcess
```

## 常见问题

### 端口 1430 被占用

说明旧的 TuGet 或 Vite 进程仍在运行。`npm run dev` 会自动清理残留进程和端口占用。如果仍然失败：

Get-NetTCPConnection -State Listen -LocalPort 1430 | Select-Object LocalAddress,LocalPort,OwningProcess

手动关闭对应进程后重试。

### 改了 Pro-GetPic 后客户端仍使用旧插件

先关闭正在运行的 Browser Engine，再执行 `npm run dev:all`。脚本会自动检测插件输入变化并刷新。若指纹记录或本地产物疑似异常，可强制执行：

npm run dev:plugin

### 改了 browser 或 tuget-native-host 后没生效

`npm run dev:all` 会自动检测源码时间戳。如果改动没被检测到（例如只改了配置文件），执行全量重建：

npm run dev:rebuild

### PowerShell 找不到 pwsh

所有启动命令都依赖 PowerShell 7 的 `pwsh`。安装 PowerShell 7 并重新打开终端。

## 生产构建

需要生成可直接分发给测试人员的完整 NSIS 安装程序时，在 PcGetPic 根目录执行：

```powershell
cd D:\Trae\PcGetPic
npm run build:tuget
```

也可以在 TuGet-Client 目录执行客户端入口：

```powershell
cd D:\Trae\PcGetPic\TuGet-Client
npm run build:release
```

构建脚本会自动注入图个吉利 HMAC 密钥（`TUGET_LICENSE_HMAC_SECRET`），该值与
服务端 `server/.env` 中 `HMAC_SECRET_TUGET` 保持一致。如果需要临时覆盖，
可在执行前手动设置 `$env:TUGET_LICENSE_HMAC_SECRET = '<新密钥>'`。

两个入口调用同一个 `scripts/clients/tuget/build-release.ps1` 发行脚本，会重新安装锁定依赖并强制清理、重建
`tuget-protocol`、Pro-GetPic desktop 插件、browser、`tuget-native-host` 和
TuGet-Client，然后把 Chromium、插件、Browser Engine 和 Native Host 一起写入
单个 NSIS `setup.exe`。安装和卸载时会自动维护当前用户的 Native Messaging
注册项。

流水线开始时会先清理本机 TuGet 的历史安装状态和旧 EXE，包括 TuGet 进程、
安装文件、客户端运行数据、`TuGetBrowser` 独立浏览器配置、快捷方式、卸载项、
Native Messaging 注册项及上一轮 NSIS 安装包。这是为 MSIX Packaging Tool 的
“监控安装”提供一致的纯净起点；浏览器登录状态和客户端任务记录也会被清除。
`%LOCALAPPDATA%\TuGet\build-secrets` 中的桌面插件签名私钥会被明确保留。

如果只需要单独执行这项“发布构建前”清理，可在根目录运行 `npm run clean:tuget-release`，
或在 `TuGet-Client` 目录运行 `npm run clean:release`。清理失败时完整构建会立即
终止，不会继续产生环境状态不可信的安装包。单独清理命令只能在构建前使用，
因为它也会按设计删除未被占用的现有 `TuGet-Setup.exe`；正常发布直接运行完整构建命令即可。
如果只是想在当前或其他电脑上重置已安装的客户端，应使用
`npm run clean:tuget-data`（或 `TuGet-Client` 目录的 `npm run clean:installed-data`）。

成功后安装程序位于：

```text
D:\Trae\PcGetPic\TuGet-Client\src-tauri\target\release\bundle\nsis\TuGet-Setup.exe
```

Tauri 在本次构建生成的版本化安装程序（例如 `TuGet_0.1.0_x64-setup.exe`）是
权威产物。构建脚本还会把它复制为名称固定的 `TuGet-Setup.exe`，方便日常分发。
如果旧的 `TuGet-Setup.exe` 正被安装器、资源管理器或 Windows 安全扫描占用，脚本会
重试后保留旧副本并明确提示使用版本化安装程序，不会因此判定整次构建失败。

打包成功后，两个入口都会将本次版本化安装程序自动复制到 tools 项目，覆盖同名文件：

```text
D:\Trae\PcGetPic\tools\public\downloads\TuGet-Client\TuGet-Setup.exe
```

这与 `client` 项目同步安装包到 tools 下载目录的做法一致。复制直接使用本次构建的
版本化安装程序，不依赖 NSIS 目录中的固定名副本，避免该副本被占用时同步旧包。
复制完成后会校验 SHA256；复制失败或校验不一致时，命令会报错。缺少 tools 项目时
会提示并跳过同步，下载子目录不存在时会自动创建。`tools/public/downloads/` 已被
tools 的 `.gitignore` 忽略，安装包作为本地分发产物保存。

不要使用裸 `cargo build --release` 或单独的 `npm run tauri build` 代替完整发行
命令；它们不会刷新整条配套项目构建链。

### 三款浏览器插件离线压缩包一键打包

需要一次性生成当图（GetPic）、图个吉利（Pro-GetPic）、一得（next-GetPic）三款浏览器插件各自的 Chrome / Edge / Firefox / 360 官方离线压缩包时，在根目录执行：

```powershell
cd D:\Trae\PcGetPic
npm run package:extensions
```

该命令会自动按顺序执行：
1. **GetPic（当图）**：`npm run switch:official` ➔ `npm run package:all:official`
2. **Pro-GetPic（图个吉利）**：`npm run switch:1` ➔ `npm run package:all:official`
3. **next-GetPic（一得）**：`npm run switch:official` ➔ `npm run package:all:official`

打包完成后，12 个 `.zip` 离线安装包会自动同步到 `tools/public/downloads/` 与 `website/public/downloads/` 对应目录。

## 检查与测试

### 1. 代码规模红线巡检（根目录 `D:\Trae\PcGetPic`）

工作区内置 `scripts/check-file-lines.mjs`，用于长期维护中监控单文件代码膨胀（默认排除测试目录与 `*.test.*` / `*.spec.*` 文件）：

- **分级标准**：`<= 500 行` 目标线（🟢）｜`501 ~ 799 行` 关注提示（🔵）｜`800 ~ 1199 行` 警戒黄线（🟡）｜`1200 ~ 1499 行` 强制重构红线（🔴）｜`>= 1500 行` 严重事故（🚨）。

常用命令（均在 `D:\Trae\PcGetPic` 根目录直接整行复制执行）：

npm run check:lines  # 全量巡检（扫描全部 18 个子项目）
npm run check:lines:client  # 只检查：当图客户端 (client/)
npm run check:lines:tuget  # 只检查：图个吉利客户端 (TuGet-Client/)
npm run check:lines:oneget  # 只检查：一得浏览器插件 (next-GetPic/)
npm run check:lines:getpic  # 只检查：当图浏览器插件 (GetPic/)
npm run check:lines:pro-getpic  # 只检查：图个吉利浏览器插件 (Pro-GetPic/)
npm run check:lines:server  # 只检查：业务授权后端 (server/)
npm run check:lines -- 当图客户端  # 按中文名/别名检查指定子项目（支持任意子项目）
npm run check:lines -- website  # 按目录名检查任意子项目（如 website、tools、admin-panel）
npm run check:lines -- client,TuGet-Client  # 同时检查多个指定子项目
npm run check:lines -- plugins  # 组合别名：一次检查全部 3 个浏览器插件
npm run check:lines -- clients  # 组合别名：一次检查全部 2 个桌面客户端
npm run check:lines -- tuget-suite  # 组合别名：检查 TuGet 客户端全链路 5 个关联项目
npm run check:lines:scopes  # 查看所有支持的子项目名与别名列表
npm run check:lines:strict  # 只对 git 相对 HEAD 变更的文件做严格卡口（>=1200 行返回非 0）
npm run check:lines:tests  # 连同测试代码一起扫描

### 2. TuGet-Client 类型与单元/回归测试

在 TuGet-Client 目录可以执行：

npm run check
npm run test:frontend
npm test

进程恢复和 soak 回归：

.\scripts\test-resilience-soak.ps1

## 底层脚本

排查启动器本身时，可以直接调用底层脚本：

.\scripts\clients\tuget\启动完整开发环境.ps1

可选参数：`-UpdatePlugin` 刷新插件链；`-Rebuild` 强制重建所有产物；`-SkipBrowser` 跳过 browser 编译；`-SkipRegister` 跳过 Native Host 注册检查；`-Check` 仅检查环境。

## 更多信息

- TuGet-Client 完整文档：[`TuGet-Client/README.md`](TuGet-Client/README.md)
- Pro-GetPic 开发者手册：[`Pro-GetPic/README.developer.md`](Pro-GetPic/README.developer.md)
- 通信方案设计文档：[`docs/图个吉利客户端与浏览器采集引擎通信方案_QmRta.md`](docs/图个吉利客户端与浏览器采集引擎通信方案_QmRta.md)

---

## 项目定位与关系

### 三个浏览器插件

- **GetPic**：基础版当图插件，独立运营和维护，也是另外两个插件的基础能力来源。
- **Pro-GetPic**：独立的图个吉利插件，A 线的采集内核与图片/视频 URL 获取、结果显示功能完整同步 GetPic，B/C 线独立维护；其 desktop 构建同时是 TuGet-Client 的采集组件。
- **next-GetPic**：独立发展的下一代插件，继承并改良 GetPic 专项能力，持续适配上游采集修复，未来发展自己的 B/C 线；不要求改良后的内核与 GetPic 源码一致。

### 其他项目目录

| 目录 | 职责 |
| --- | --- |
| `client/` | 当图桌面客户端。 |
| `TuGet-Client/` | TuGet（图个吉利）桌面客户端。 |
| `browser/` | TuGet-Client 的浏览器运行组件，加载 Pro-GetPic desktop 采集插件。 |
| `tuget-native-host/`、`tuget-protocol/` | 分别提供 TuGet 客户端与插件之间的通信桥、共享通信协议。 |
| `website/` | GetPic／当图主产品站，同时承担当图客户端和 TuGet-Client 的介绍、推荐与选型；后续吸收 TuGet 的公开宣传内容。 |
| `tuget-website/` | TuGet 交易与旧链接兼容项目；迁移后主要保留 `/buy/`、`/api/`、必要法律页面及服务器端重定向，不再重复维护营销内容。 |
| `oneget-website/` | OneGet（一得）免费浏览器插件独立官网，只介绍 OneGet 插件；独立 Git 子模块仓库（Gitee 远程 `zhaoge168/oneget-website`）。 |
| `tools/` | 官方工具目录与教程站，已有百度流量；本轮网站收敛不修改该项目。 |
| `ec-nuxt/` | 从 GetPic 插件 `search.html` 搜索页衍生的独立导购网站；后续计划改为普通 HTML 项目，尚不代表已完成迁移。 |
| `cps-server/` | 广告服务，插件内嵌的广告内容向此服务请求。 |
| `server/` | 业务后端，主要负责插件数据统计、客户端激活及支付宝等支付对接。 |
| `store/` | 独立的购买前端。 |
| `admin-panel/` | 管理后台。 |

官网分工详见 [宣传网站统一定位与收敛方案](docs/宣传网站相关/宣传网站统一定位与收敛方案_TmQvN.md)。上游能力同步分别遵循 [Pro-GetPic 同步规则](Pro-GetPic/同步规则.md) 和 [next-GetPic 同步规则](next-GetPic/同步规则.md)。
