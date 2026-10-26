# PcGetPic 工作区

这个仓库作为多项目工作区使用，当前包含两个桌面客户端。根目录负责组织子项目、共享组件、工作区脚本和文档，不是 Node/Vite/Tauri 项目根目录。

## 子项目

| 路径 | 说明 |
| --- | --- |
| `client/` | 当图桌面客户端（原客户端），Tauri v2 + Vue 3，Git submodule |
| `TuGet-Client/` | TuGet（图个吉利）桌面客户端，Tauri v2 + Vue 3，Git submodule |
| `tuget-protocol/` | TuGet 跨项目通信协议、JSON Schema 和契约测试 |
| `tuget-native-host/` | TuGet Native Messaging 与 Windows Named Pipe 桥接进程 |
| `GetPic/` | 原浏览器插件参考源，Git submodule |
| `Pro-GetPic/` | 专业版浏览器插件，融合 GetPic 电商图片提取与 cat-catch 媒体嗅探能力，Git submodule |
| `next-GetPic/` | 下一代浏览器插件（重构路由分发模式），Git submodule |
| `browser/` | 套壳浏览器，Git submodule |
| `server/` | 授权系统服务端，Git submodule |
| `cps-server/` | CPS 转链服务器（大淘客/1688/好单库等），Git submodule，线上域名 `search.cpscpc.com` |
| `website/` | 官网，Git submodule |
| `ec-nuxt/` | 多平台电商搜索站（淘宝/天猫/拼多多/京东/1688/唯品会/快手），Nuxt 4 SSR，Git submodule |
| `admin-panel/` | 授权系统管理后台 |
| `store/` | 售卡收银台 |
| `deploy/` | 部署配置（nginx，含 `admin/api/store.downpictures.com` 站点配置） |
| `tools/` | 工具站，Git submodule，线上域名 `tools.yueding168.com` |
| `scripts/` | 工作区级开发、构建和维护脚本 |
| `docs/` | 工作区级文档 |

## 常用入口

在根目录执行 `.\scripts\dev.ps1`，交互式选择要启动的客户端：

```powershell
.\scripts\dev.ps1              # 交互选择
.\scripts\dev.ps1 -Client dangtu   # 直接启动当图
.\scripts\dev.ps1 -Client tuget    # 直接启动 TuGet
```

TuGet 日常开发也可以在根目录直接使用 npm 快捷命令：

```powershell
npm run dev           # 仅启动 TuGet 客户端（日常最快）
npm run dev:all       # 完整快速启动，复用现有插件
npm run dev:plugin    # 更新 Pro-GetPic 插件后启动
npm run dev:rebuild   # 全量重建后启动
```

详见 [README.developer.md](README.developer.md)。

也可以分别执行各自脚本：

- 当图客户端开发：`.\scripts\clients\dangtu\启动开发环境.bat`
- 当图客户端构建：`.\scripts\clients\dangtu\构建生产版本.bat`
- 当图客户端开发者手册：[`client/DEVELOPER.md`](client/DEVELOPER.md)
- **TuGet 开发速查**：[`README.developer.md`](README.developer.md) — 日常开发最常用的启动命令和排障方法
- TuGet 完整开发环境：`.\scripts\clients\tuget\启动完整开发环境.ps1`
- TuGet 完整发行构建：根目录执行 `npm run build:tuget`，或进入 `TuGet-Client/` 执行 `npm run build:release`；两者都会先清理 TuGet 历史安装状态和旧 EXE，为 MSIX Packaging Tool 监控安装准备纯净环境
- TuGet 客户端说明：[`TuGet-Client/README.md`](TuGet-Client/README.md)
- 专业版插件交互界面开发：进入 `Pro-GetPic/` 后执行 `npm run dev`（store 商店模式，不含新标签页）；调试新标签页使用 `npm run dev:office`（official 模式）
- TuGet 内置插件构建：进入 `Pro-GetPic/` 后执行 `npm run build:desktop`（纯采集、零 UI；构建后仍须在 `browser/` 执行 `npm run update-plugin`）

> **注意**：当图客户端使用端口 1420，TuGet 客户端使用端口 1430，两者可以同时运行。

## Git 说明

`client/` 与 `TuGet-Client/` 是两个独立客户端仓库，均以 Git submodule 引入。`Pro-GetPic/` 同样是独立 Git submodule 仓库，拥有自己的平台切换、打包与发布流程（详见 `Pro-GetPic/README.developer.md`）。首次拉取或换机后，在工作区根目录执行：

```bash
git submodule update --init --recursive
```

各子模块远程地址：

| 子模块 | 远程仓库 |
| --- | --- |
| `client/` | `git@gitee.com:zhaoge168/client-side-diagram.git` |
| `TuGet-Client/` | `git@gitee.com:zhaoge168/tu-get-client.git` |
| `GetPic/` | `git@gitee.com:zhaoge168/alibaba-image-download.git` |
| `next-GetPic/` | `git@gitee.com:zhaoge168/next-GetPic.git` |
| `Pro-GetPic/` | `git@gitee.com:zhaoge168/pro-getpic.git` |
| `browser/` | `git@gitee.com:zhaoge168/browser.git` |
| `server/` | `git@gitee.com:zhaoge168/server-dangtu.git` |
| `cps-server/` | `git@gitee.com:zhaoge168/dataoke-pic-search.git` |
| `website/` | `git@gitee.com:zhaoge168/dangtu-plugin-official-website.git` |
| `ec-nuxt/` | `git@gitee.com:zhaoge168/e-commerce-website-nuxt.git` |
| `tools/` | `git@gitee.com:zhaoge168/tools.yueding168.com.git` |

两个客户端的代码提交分别在 `client/` 和 `TuGet-Client/` 内执行；工作区文件、根目录直接维护的项目以及子模块指针变更在本仓库根目录提交。

## 迁移后结构

```text
PcGetPic/
├── client/              # 当图桌面客户端（Git submodule）
├── TuGet-Client/        # TuGet 桌面客户端（Git submodule）
├── tuget-protocol/      # TuGet 共享协议
├── tuget-native-host/   # TuGet Native Messaging 桥
├── GetPic/              # 浏览器插件参考源
├── next-GetPic/         # 下一代浏览器插件（重构路由分发模式，Git submodule）
├── Pro-GetPic/          # 专业版浏览器插件（GetPic + cat-catch 融合）
├── browser/             # 套壳浏览器
├── server/              # 授权系统服务端
├── cps-server/          # CPS 转链服务器（search.cpscpc.com）
├── website/             # 官网
├── ec-nuxt/             # 多平台电商搜索站（Nuxt 4 SSR）
├── admin-panel/         # 管理后台
├── store/               # 售卡收银台
├── deploy/              # 部署配置（nginx：admin/api/store.downpictures.com）
├── tools/               # 工具站（tools.yueding168.com）
├── scripts/
│   ├── dev.ps1          # 交互式客户端启动器
│   └── clients/
│       ├── dangtu/      # 当图客户端工作区脚本
│       └── tuget/       # TuGet 跨项目联调脚本
└── docs/                # 工作区文档与受控商务资料
```
