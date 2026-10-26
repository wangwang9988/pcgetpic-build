---
name: tuget-version-updater
description: "升级 TuGet-Client（图个吉利客户端）的版本号并保持 Cargo、Tauri 和 npm 元数据一致。当用户说‘将图个吉利客户端版本号更新为 x.y.z’、‘图个吉利版本号改为 x.y.z’、‘TuGet 版本升级到 x.y.z’、‘更新图个吉利客户端版本’等时触发。注意与当图客户端（client/，用 version-updater skill）区分。仅接受比当前版本更高的三段数字版本，并更新、校验 package.json、package-lock.json（两处）、Cargo.toml、Cargo.lock 和 tauri.conf.json。"
---

# 图个吉利客户端（TuGet-Client）版本号升级

## 不变量

- 将 `TuGet-Client/package.json` 的顶层 `version` 作为唯一版本源（`scripts/fix-msix.mjs` 读取它，自动转 X.Y.Z.0 写入 MSIX 的 AppxManifest，脚本本身零改动）。
- 仅接受完全匹配 `^\d+\.\d+\.\d+$` 的版本号；不接受前缀 `v`、缺少段、预发布标签或构建元数据。
- 将 major、minor、patch 分别按十进制整数比较；新版本必须严格大于当前版本。
- 只修改下表列出的应用自身版本字段，不得误改依赖项版本。
- **根目录 `D:\Trae\PcGetPic\package.json`（pcgetpic-workspace）是工作区快捷启动配置，与客户端版本无关，不要修改。**
- TuGet-Client **没有** `sync-version` 脚本（与 client/ 不同），五个文件、六处字段必须全部手动更新并通过复查，才能报告成功。

## 版本位置

| 文件 | 版本字段 |
|---|---|
| `TuGet-Client/package.json` | 顶层 `version` |
| `TuGet-Client/package-lock.json` | 顶层 `version` 与 `packages[""].version` |
| `TuGet-Client/src-tauri/Cargo.toml` | `[package]` 段（name = "tuget-client"）的 `version` |
| `TuGet-Client/src-tauri/Cargo.lock` | `[[package]]` 中 `name = "tuget-client"` 条目的 `version` |
| `TuGet-Client/src-tauri/tauri.conf.json` | 顶层 `version` |

## 执行步骤

### 1. 预检

1. 从仓库根目录（`D:\Trae\PcGetPic`）执行，确认上表五个文件都存在。
2. 读取 `TuGet-Client/package.json` 顶层 `version` 作为当前版本。
3. 分别读取六处现有值并保留，供结果汇总和失败恢复使用。`Cargo.lock` 体积大，用 `grep -n -A2 '^name = "tuget-client"'` 定位条目行号后定点读取，不要全文件读。
4. 若非源文件的版本与 `package.json` 不一致，记录为既有漂移；本次升级成功后将其一并修复，不要把不同旧值假装成同一个值。

### 2. 校验目标版本

先校验三段数字格式，再逐段按整数比较：

- 新版本大于当前版本：继续。
- 新版本等于或小于当前版本：停止，不修改任何文件，并报告当前版本与目标版本。

使用以下提示语义即可，不要求逐字一致：

> 版本号不允许降级或重复。当前版本为 x.y.z，目标版本为 a.b.c，请使用更高的三段数字版本号。

### 3. 更新版本

1. 定点更新 `TuGet-Client/package.json` 顶层 `version`。
2. 定点更新 `TuGet-Client/package-lock.json` 的顶层 `version` 与 `packages[""].version`（两处在文件头部前 10 行内，其余依赖条目的 version 一律不动）。
3. 定点更新 `TuGet-Client/src-tauri/Cargo.toml` 中 `[package]` 段的 `version`（文件第 3 行附近，name = "tuget-client"）。
4. 定点更新 `TuGet-Client/src-tauri/Cargo.lock` 中 `name = "tuget-client"` 条目的 `version`（匹配 `[[package]]\nname = "tuget-client"\nversion = "..."` 三行整体替换，避免误伤 tuget-protocol 等其他依赖）。
5. 定点更新 `TuGet-Client/src-tauri/tauri.conf.json` 顶层 `version`。
6. 保留文件原有缩进、换行和其他内容；不得为了改版本而重排整个文件。

若任一步写入失败，停止后续操作，并用预检时保存的值还原本次已经修改的字段。不得使用 `git checkout`、`git reset` 等可能覆盖用户其他改动的命令。

### 4. 验证

1. 重新读取六处版本字段，确认它们都严格等于目标版本。
2. 确认 `Cargo.toml` 和 `Cargo.lock` 命中的都是 `tuget-client` 应用自身，而非依赖项。
3. 对五个文件运行 `git diff --check -- <文件列表>`，确认没有空白错误。
4. 任何验证失败都不得报告升级成功；说明失败位置以及是否已恢复本次修改。

### 5. 汇总

成功后输出每个文件的旧值和新值。`package-lock.json` 的两处字段可合并为一行，但必须说明两处均已验证。若预检发现既有漂移，在汇总中如实展示各自旧值。

| 文件 | 旧版本 | 新版本 |
|---|---|---|
| `TuGet-Client/package.json` | 1.0.0 | 1.1.0 |
| `TuGet-Client/package-lock.json`（两处） | 1.0.0 | 1.1.0 |
| `TuGet-Client/src-tauri/Cargo.toml` | 1.0.0 | 1.1.0 |
| `TuGet-Client/src-tauri/Cargo.lock` | 1.0.0 | 1.1.0 |
| `TuGet-Client/src-tauri/tauri.conf.json` | 1.0.0 | 1.1.0 |

并提示用户：下次 MSIX 打包后运行 `npm run fix:tuget-msix`，AppxManifest 的 Identity Version 会自动变为 `X.Y.Z.0`，fix-msix.mjs 无需任何改动。
