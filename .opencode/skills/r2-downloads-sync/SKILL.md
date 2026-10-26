---
name: r2-downloads-sync
description: 将各客户端安装包（图个吉利客户端 TuGet-Setup.exe、当图客户端 dangtu.exe）、浏览器插件离线压缩包（当图插件、图个吉利插件、一得 OneGet、阅历 Best History、当图二维码、图个吉利全貌的 Chrome/Edge/火狐/360 压缩包）以及 tools/public/downloads 与 website/public/downloads 目录通过 MD5 双重校验同步到 Cloudflare R2 存储桶（downpictures-files，对应自定义下载域名 dl.webtongbu.com）。当用户表达"同步downloads到R2"、"上传文件到R2"、"同步R2文件"、"更新R2下载"、"把downloads上传到R2"、"检查并更新R2文件"、"同步安装包到R2"、"同步R2"、"更新下载包"、"当图插件的压缩包需要更新"、"上传当图插件到R2"、"图个吉利插件压缩包需要更新"、"上传当图客户端到R2"、"上传 dangtu.exe 到R2"、"上传图个吉利客户端到R2"、"TuGet-Setup.exe需要上传到R2"或指定某个 .exe/.zip 构建产物需要上传/更新到 R2 时触发本技能。支持按产品定向同步、单文件同步、构建产物自动归档与线上 CDN HEAD 验证。
---

# R2 资源存储同步（r2-downloads-sync）

将本地各项目的最新构建产物（客户端 `.exe` 安装包、浏览器插件四端 `.zip` 离线包）以及 `tools/public/downloads/`、`website/public/downloads/` 目录下的下载资源，通过双重校验（文件大小 + 元数据 MD5）增量同步到 Cloudflare R2 对象存储，使 `https://dl.webtongbu.com` 下载资源实时保持最新。

## 核心原则：自动比对跳过 + 优先定向同步

- **自动与 R2 云端比对，一致则秒级跳过（零重复上传）**：无论执行按产品同步（`--product`）、单文件同步（`--file`）还是全量同步，脚本默认都会先执行兩级比对：
  1. **本地构建目录 vs `downloads` 归档目录**：仅当构建产物存在且比 `downloads` 目录更新、MD5 不同时才复制归档；若一致则不修改本地文件。
  2. **本地文件 vs R2 云端对象**：自动比对文件字节大小（`ContentLength`）与 R2 自定义元数据 MD5（`x-amz-meta-md5`）。**如果 R2 上已经是最新内容（完全一致），脚本会直接输出 `[跳过/一致]` 并在 1~2 秒内结束，绝不会重复上传 150MB 大文件。**
- **单产品/单文件优先定向同步，避免误传其他产品**：当用户明确只要求更新**某一个文件**或**某一款软件/插件**（例如“更新图个吉利客户端”、“当图插件的压缩包需要更新”、“上传当图客户端到 R2”）时，**必须使用 `--product` 或 `--file` 参数定向同步**，只核验并上传目标产品关联的文件，严禁无过滤全量上传导致其他本地临时构建产物被误传到线上。
- 仅当用户明确要求“同步整个 downloads 到 R2”或“检查并更新全部 R2 下载包”时，才执行不带过滤参数的全量增量同步。

## 产品与文件映射速查表

| 用户口述称呼 / 产品名称 | `--product` 参数值 | 包含文件范围说明 | 构建产物源路径（`--sync-build` 自动拉取源） | 本地归档路径 (`tools` / `website`) | R2 目标 Key (`https://dl.webtongbu.com/<Key>`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **当图插件** / 当图扩展 / GetPic | `dangtu` | **4 个浏览器压缩包**（Chrome、Edge、火狐 Firefox、360） | `GetPic/.output/downpictures-{chrome,edge,firefox,360}-mv3.zip` | `tools/public/downloads/GetPic/downpictures-{chrome,edge,firefox,360}-mv3.zip`<br>`website/public/downloads/downpictures-{chrome,edge,firefox}-mv3.zip` | `GetPic/downpictures-chrome-mv3.zip`<br>`GetPic/downpictures-edge-mv3.zip`<br>`GetPic/downpictures-firefox-mv3.zip`<br>`GetPic/downpictures-360-mv3.zip` |
| **当图客户端** / `dangtu.exe` | `dangtu-client` | **当图桌面软件安装包**（注意与图个吉利客户端区分，同步主路径与根目录兼容直链共 2 个 Key） | `client/src-tauri/target/release/bundle/nsis/dangtu.exe` | `tools/public/downloads/clientGetPic/dangtu.exe`<br>`website/public/downloads/dangtu.exe` | `clientGetPic/dangtu.exe`<br>`dangtu.exe`（根目录兼容直链） |
| **图个吉利客户端** / `TuGet-Setup.exe` | `tuget-client` | **图个吉利桌面软件安装包**（~149MB，注意与当图客户端区分） | `TuGet-Client/src-tauri/target/release/bundle/nsis/TuGet-Setup.exe` | `tools/public/downloads/TuGet-Client/TuGet-Setup.exe` | `TuGet-Client/TuGet-Setup.exe` |
| **图个吉利插件** / 图个吉利扩展 / Pro-GetPic | `tuget` | **4 个浏览器压缩包**（Chrome、Edge、火狐 Firefox、360） | `Pro-GetPic/.output/tuget-{chrome,edge,firefox,360}-mv3.zip` | `tools/public/downloads/TuGet/tuget-{chrome,edge,firefox,360}-mv3.zip` | `TuGet/tuget-chrome-mv3.zip`<br>`TuGet/tuget-edge-mv3.zip`<br>`TuGet/tuget-firefox-mv3.zip`<br>`TuGet/tuget-360-mv3.zip` |
| **一得插件** / OneGet / 归一标签页 | `oneget` | **4 个浏览器压缩包**（Chrome、Edge、火狐 Firefox、360） | `D:\Trae\onetab\.output/oneget-tabs-{chrome,edge,firefox,360}-mv3.zip` | `tools/public/downloads/oneget-tabs/*`<br>`tools/public/downloads/OneGet/*` | `oneget-tabs/oneget-tabs-{chrome,edge,firefox,360}-mv3.zip`<br>`OneGet/oneget-{chrome,edge,firefox,360}-mv3.zip` |
| **阅历插件** / Best History | `history` | **4 个浏览器压缩包**（Chrome、Edge、火狐 Firefox、360） | `D:\Trae\History\.output/` | `tools/public/downloads/History/best-history-{chrome,edge,firefox,360}-mv3.zip` | `History/best-history-{chrome,edge,firefox,360}-mv3.zip` |
| **当图二维码插件** / qr-code | `qr-code` | **3 个浏览器压缩包**（Chrome、Edge、火狐 Firefox） | `D:\Trae\qr-code\.output/` | `tools/public/downloads/qr-code/qr-code-{chrome,edge,firefox}-mv3.zip` | `qr-code/qr-code-{chrome,edge,firefox}-mv3.zip` |
| **图个吉利·全貌插件** / tuget-fullpage | `tuget-fullpage` | **3 个浏览器压缩包**（Chrome、Edge、火狐 Firefox） | `D:\Trae\screenshot-GoFullPage\.output/` | `tools/public/downloads/tuget-fullpage/tuget-fullpage-{chrome,edge,firefox}-mv3.zip` | `tuget-fullpage/tuget-fullpage-{chrome,edge,firefox}-mv3.zip` |

## 前置检查

1. 确认 Python 运行环境及 `boto3` 可用：
   ```powershell
   python -c "import boto3; print(boto3.__version__)"
   ```
2. 确认凭据配置文件存在（优先读取 `deploy/.r2-config.json`，缺失时自动使用脚本内嵌配置）。
3. **如果是插件压缩包更新**：若用户尚未打包或 `.output` 下的四个压缩包不是最新，需先确认或提醒在对应扩展目录执行官方版四端打包（如 `GetPic` 或 `Pro-GetPic` 下运行 `npm run package:all:official`），确保 Chrome、Edge、火狐、360 四个压缩包均已生成。

## 执行同步流程

### 场景 1：按产品定向更新（最常用）

当用户说**“当图插件的压缩包需要更新”**（自动檢查并上传 Chrome、Edge、火狐、360 四个压缩包）：

```powershell
python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --product dangtu --sync-build
```

当用户说**“上传当图客户端到 R2”**（自动将 `client\src-tauri\target\release\bundle\nsis\dangtu.exe` 同步到 `tools` 与 `website` 的 `downloads` 目录，并上传 `clientGetPic/dangtu.exe` 及根目录兼容 `dangtu.exe`）：

```powershell
python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --product dangtu-client --sync-build
```

当用户说**“上传图个吉利客户端到 R2”**或**“`TuGet-Setup.exe` 更新了需要上传到 R2”**：

```powershell
python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --product tuget-client --sync-build
```

当用户说**“图个吉利插件的压缩包需要更新”**（自动检查并上传图个吉利 Chrome、Edge、火狐、360 四个压缩包）：

```powershell
python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --product tuget --sync-build
```

### 场景 2：指定单个文件路径或单个浏览器包上传

当用户直接给出某个构建产物路径或只想上传某一个文件时：

```powershell
# 直接传入构建产物路径（脚本会自动归档到 downloads 目录并上传对应 R2 Key）
python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --file "D:\Trae\PcGetPic\TuGet-Client\src-tauri\target\release\bundle\nsis\TuGet-Setup.exe"
python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --file "D:\Trae\PcGetPic\client\src-tauri\target\release\bundle\nsis\dangtu.exe"

# 或传入指定 R2 Key / 文件名
python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --file "GetPic/downpictures-chrome-mv3.zip"
```

### 场景 3：全量试运行与全量增量同步

1. **试运行比对差异**（不产生实际上传，查看本地与云端全部 36 个对象的状态差异）：
   ```powershell
   python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --dry-run
   ```
2. **全量标准增量同步**（仅在确认所有变更文件均需上线时执行）：
   ```powershell
   python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py
   ```
3. **强制覆盖上传**（可配合 `--product` 或 `--file` 使用，忽略 MD5 比对强制重传并刷新元数据）：
   ```powershell
   python D:\Trae\PcGetPic\.agents\skills\r2-downloads-sync\scripts\sync_r2_downloads.py --product dangtu --force
   ```

## 比对与校验逻辑说明

1. **构建产物自动归档（`--sync-build`）**：指定 `--product` 或 `--file` 时默认启用，自动校验子项目构建输出目录（如 `src-tauri/target/release/bundle/nsis/` 或 `.output/`）与 `tools/public/downloads/` 的文件 MD5，若构建产物有更新则先同步复制到 `downloads` 归档目录。
2. **流式 MD5 计算**：本地使用 64KB 分块计算 MD5，对 150MB 级大文件（如 `TuGet-Setup.exe`）内存友好。
3. **第一级校验（大小）**：对比远程对象的字节大小，若与本地不一致，直接标记需要上传。
4. **第二级校验（元数据 MD5）**：读取远程对象的 `x-amz-meta-md5`，若与本地 MD5 一致，直接跳过（零多余上传与流量）；若元数据缺失或不匹配，则上传并回写最新 MD5。
5. **线上 CDN 验证**：上传完成后自动对 `https://dl.webtongbu.com/<key>` 发送 HEAD 探测，确保线上 200 可达且 `Content-Length` 匹配。

## 参考资料

- `references/r2-architecture.md`：记录存储桶架构、凭据与多项目目录规范。
- `scripts/r2-config.example.json`：配置模板。
