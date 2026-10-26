# Fix Worker Window Creation on Installed Exe Spec

## Why
安装版 exe 无法打开数据抓取 Worker，但登录 Worker 正常。开发模式（npm run dev）一切正常。

**根因：`dist-scripts/*.bundle.js` 文件未打包进安装版 exe，导致 `load_bundle()` 失败，Worker 窗口从未被创建。**

### 证据链

登录 Worker 和数据 Worker 的窗口创建路径只有**一处差异**：

| 步骤 | 登录 Worker | 数据 Worker |
|---|---|---|
| 加载 bundle 脚本 | **无**（直接导航到 URL） | `s.injector.load_bundle(&platform)` |
| 构建 WebView2 窗口 | `build()` + `data_directory(cookie_dir)` | `build()` + `data_directory(cookie_dir)` |

`do_dispatch` 中 bundle 加载失败的处理（[dispatch.rs#L80-L91](file:///d:/Trae/PcGetPic/src-tauri/src/dispatch.rs#L80-L91)）：
```rust
let bundle_content = match s.injector.load_bundle(&platform) {
    Ok(content) => content,
    Err(e) => {
        // 任务立即失败，continue 跳过 → Worker 窗口从未创建
        emit_ui_event(app, "task-failed", &task_id, ...);
        s.worker_pool.complete_worker_task(worker_id);
        continue;
    }
};
```

`load_bundle()` 在安装版 exe 中的执行流程：
1. `find_dev_bundles_dir()` 尝试 5 种开发机路径 → 用户电脑上全不存在 → 返回 `None`
2. 回退到 `bundles_dir` = `app_data_dir/bundles/`（如 `C:\Users\xxx\AppData\Local\com.dangtu.client\bundles\`）
3. **此目录为空**——从未有代码将 bundle 文件复制进去
4. `fs::read_to_string(...taobao.bundle.js)` → 文件不存在 → **Err**

### 为何 `tauri.conf.json` 缺少配置
当前 [tauri.conf.json](file:///d:/Trae/PcGetPic/src-tauri/tauri.conf.json#L28-L45) 的 `bundle` 配置中**没有 `resources` 字段**，Tauri 构建时不会把 `dist-scripts/` 下的文件打包进 exe。

### 旧 spec 为何错误
旧 spec（`fix-win10-worker-window-creation`、本 spec 的上一个版本）将根因归结为 `data_directory` 文件锁 / WebView2 进程退出。但如果是锁问题，那么：
- 登录窗口也使用同一个 `data_directory`（[commands.rs#L495](file:///d:/Trae/PcGetPic/src-tauri/src/commands.rs#L495)），也应该受影响
- 同事按旧方案修改后（先创建 Worker 再关闭登录窗口）应该已修复，但实测依然失败

这证明锁理论不成立。真正的阻断点在 bundle 加载阶段，远在窗口创建之前。

## What Changes
- **核心修复**：`tauri.conf.json` 添加 `bundle.resources` 将 `dist-scripts/*` 打包进 exe
- `state.rs` / `lib.rs`：`bundles_dir` 改用 `resource_dir`（资源目录）而非 `app_data_dir`
- 保留同事的改动（不关登录窗口就创建 Worker），它们无害且是对代码的改进

## Impact
- Affected code:
  - `src-tauri/tauri.conf.json` — 新增 `bundle.resources`（**核心修复**）
  - `src-tauri/src/lib.rs` — 传递 `resource_dir` 给 `AppState::new()`
  - `src-tauri/src/state.rs` — `AppState::new` 增加 `resource_dir` 参数

## ADDED Requirements

### Requirement: Bundle 文件打包到安装包
系统 SHALL 在 Tauri 构建时将 `dist-scripts/*.bundle.js` 包含在安装包资源中。

#### Scenario: 安装版 exe 能加载 bundle
- **GIVEN** 安装版 exe 运行在用户电脑上
- **WHEN** `ScriptInjector::load_bundle("taobao")` 被调用
- **THEN** 从资源目录 `bundles/taobao.bundle.js` 成功读取文件内容

## MODIFIED Requirements

### Requirement: AppState 初始化传入 resource_dir
`AppState::new` SHALL 接收 `resource_dir: PathBuf`，`bundles_dir` 设为 `resource_dir.join("bundles")`。

### Requirement: lib.rs 传递 resource_dir
`setup` 闭包 SHALL 调用 `app.path().resource_dir()` 并传给 `AppState::new()`。