---
name: version-updater
description: "升级 client 桌面应用的版本号并保持 Cargo、Tauri 和 npm 元数据一致。当用户说‘将版本更新为 x.y.z’、‘版本号改为 x.y.z’、‘版本升级到 x.y.z’、‘更新 client 版本’、‘更新当图客户端的版本号为 x.y.z’等时触发，只要用户话语中包含‘当图客户端版本号’这几个字就触发本 skill。仅接受比 Cargo.toml 当前版本更高的三段数字版本，并更新、校验 Cargo.toml、Cargo.lock、tauri.conf.json、package.json 和 package-lock.json。"
---

# Client 版本号升级

## 不变量

- 将 `client/src-tauri/Cargo.toml` 的 `[package]` 版本作为唯一版本源。
- 仅接受完全匹配 `^\d+\.\d+\.\d+$` 的版本号；不接受前缀 `v`、缺少段、预发布标签或构建元数据。
- 将 major、minor、patch 分别按十进制整数比较；新版本必须严格大于当前版本。
- 只修改下表列出的应用自身版本字段，不得误改依赖项版本。
- 五个文件、六处字段必须全部更新并通过复查，才能报告成功。

## 版本位置

| 文件 | 版本字段 |
|---|---|
| `client/src-tauri/Cargo.toml` | `[package]` 段的 `version` |
| `client/src-tauri/Cargo.lock` | `[[package]]` 中 `name = "downpictures-client"` 条目的 `version` |
| `client/src-tauri/tauri.conf.json` | 顶层 `version` |
| `client/package.json` | 顶层 `version` |
| `client/package-lock.json` | 顶层 `version` 与 `packages[""].version` |

## 执行步骤

### 1. 预检

1. 从仓库根目录执行，确认上表五个文件都存在。
2. 读取 `Cargo.toml`，只在 `[package]` 到下一个 TOML 段标题之间取得当前版本；不要使用可能命中其他段的全文件首个 `version` 正则。
3. 分别读取六处现有值并保留，供结果汇总和失败恢复使用。
4. 若非源文件的版本与 `Cargo.toml` 不一致，记录为既有漂移；本次升级成功后将其一并修复，不要把不同旧值假装成同一个值。

### 2. 校验目标版本

先校验三段数字格式，再逐段按整数比较：

- 新版本大于当前版本：继续。
- 新版本等于或小于当前版本：停止，不修改任何文件，并报告当前版本与目标版本。

使用以下提示语义即可，不要求逐字一致：

> 版本号不允许降级或重复。当前版本为 x.y.z，目标版本为 a.b.c，请使用更高的三段数字版本号。

### 3. 更新版本

1. 在 `client/src-tauri/Cargo.toml` 的 `[package]` 段内定点更新 `version`。
2. 在 `client` 目录运行 `npm run sync-version`，让项目现有脚本从 `Cargo.toml` 同步 `package.json` 和 `src-tauri/tauri.conf.json`。
3. 定点更新 `client/package-lock.json` 的顶层 `version` 与 `packages[""].version`。
4. 定点更新 `client/src-tauri/Cargo.lock` 中应用自身 `[[package]]` 条目的 `version`。
5. 保留文件原有缩进、换行和其他内容；不得为了改版本而重排整个文件。

若任一步写入或命令失败，停止后续操作，并用预检时保存的值还原本次已经修改的字段。不得使用 `git checkout`、`git reset` 等可能覆盖用户其他改动的命令。

### 4. 验证

1. 重新读取六处版本字段，确认它们都严格等于目标版本。
2. 确认 `Cargo.toml` 和 `Cargo.lock` 命中的都是 `downpictures-client` 应用自身，而非依赖项。
3. 对五个文件运行 `git diff --check -- <文件列表>`，确认没有空白错误。
4. 任何验证失败都不得报告升级成功；说明失败位置以及是否已恢复本次修改。

### 5. 汇总

成功后输出每个文件的旧值和新值。`package-lock.json` 的两处字段可合并为一行，但必须说明两处均已验证。若预检发现既有漂移，在汇总中如实展示各自旧值。

| 文件 | 旧版本 | 新版本 |
|---|---|---|
| `client/src-tauri/Cargo.toml` | 3.8.122 | 3.9.123 |
| `client/src-tauri/Cargo.lock` | 3.8.122 | 3.9.123 |
| `client/src-tauri/tauri.conf.json` | 3.8.122 | 3.9.123 |
| `client/package.json` | 3.8.122 | 3.9.123 |
| `client/package-lock.json`（两处） | 3.8.122 | 3.9.123 |
