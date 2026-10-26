---
name: fix-image-format-redownload
overview: 确认并修复「修改图片保存格式后，同一商品/任务再次下载仍沿用旧文件格式」的隐蔽缺陷：根因是下载历史里上一次落盘文件的扩展名被回填成 imageFormat，覆盖了用户当前设置。修复集中在两个规划函数上，并补充回归测试。
todos:
  - id: fix-collected-download-batches
    content: 在 collectedDownloads.ts 新增文件名格式对齐工具并删除历史扩展名回填 imageFormat
    status: completed
  - id: fix-collected-download-preview
    content: 修正 collectedDownloadState.ts 预览策略回填，复用对齐工具保证预览与实际落盘路径一致
    status: completed
    dependencies:
      - fix-collected-download-batches
  - id: add-format-regression-tests
    content: 补充三个测试文件的格式切换回归用例，并跑 Vitest 与类型检查验证无回归
    status: completed
    dependencies:
      - fix-collected-download-preview
---

## 产品概述

修复「图个吉利客户端」中图片保存格式设置对“同一商品/同一任务再次下载”不生效的隐蔽缺陷，使其行为与新设置一致。

## 用户现象（已确认可复现）

1. 用户在设置中把「图片保存格式」设为统一 JPEG 或统一 PNG，首次下载 A 链接商品图片，格式正确。
2. 下载完成后修改该设置为另一格式，再次下载同一个 A 链接的图片，仍然按修改前的格式落盘。
3. 换一个从未下载过的 B 链接，则能正确使用新格式。

## 核心功能要求

- 同一商品/任务在存在历史下载记录的情况下再次下载时，落盘格式必须严格遵循当前「图片保存格式」设置（保持原格式 / 优先兼容 / 统一 JPEG / 统一 PNG）。
- 结果页单条下载、结果页下载选中、结果控制台批量下载、自动保存四条入口行为保持一致。
- 复用上次的文件序号与目录（不重编号、不新建商品文件夹），仅在目标格式改变时按新格式产出对应扩展名文件；旧扩展名文件保留不删除。
- 不改变“历史终态任务保留格式快照”的既有设计，也不改变「下载记录 → 重新下载」强制保留原始字节的行为。
- 补充回归测试，保证现有编号/目录/文件状态判定用例不被破坏。

## 技术栈（沿用现有项目）

- 前端：Vue 3 + TypeScript + Vite，状态管理为 `src/composables/desktopEngine/*` 组合式引擎
- 测试：Vitest（`tests/*.test.ts`）
- Rust 侧（`src-tauri/src/downloads/image_conversion.rs`）保持不变：每次下载都按请求的 `image_format` 实时转换，无格式缓存

## 根因定位（已核对代码，确认 bug 存在）

手动下载传入的确实是全局实时策略：`App.vue:395-400 downloadResourceList` → `useDownloadExecution.ts:76-78`（默认参数 `imageSavePolicy.value`）→ `performDownloadResources` 第 215 行把 `effectivePolicy.imageFormat` 写入请求。但在此之前，`planSpecializedDownloadUpdates` → `planCollectedDownloadBatches` 会**用下载历史里上一次落盘文件的扩展名反推并覆盖 imageFormat**：

- `src/collectedDownloads.ts:116-121`：`if (previous?.path) { ... targetPolicy.imageFormat = 扩展名 → jpeg/png/original }`
- `src/collectedDownloadState.ts:69-72`：结果控制台预览/批量提交的 `item.policy` 再次用 `prior.path` 扩展名覆盖 `imageFormat`

因此：A 链接已有 completed 历史（`xxx.jpg`）→ 新设置 png 被改回 jpeg → 仍按旧格式；B 链接无历史 → 直接使用实时策略 → 正确。与用户描述完全吻合。

补充结论：`task.imageSavePolicy` 快照（`useTaskRegistry.ts:323-343`，终态任务只同步 `createCategorySubfolders/autoPackZip`）是有意设计并有测试断言，**不是**本次根因，仅影响自动保存与「重试下载」，本次不改。

## 实现方案

原则：**格式以用户当前设置为唯一真源；历史文件只贡献“序号/目录/文件名主干”**。

1. `src/collectedDownloads.ts`

- 新增并导出工具函数 `alignDownloadFilenameToFormat(filename, resource, format)`：
    - `jpeg` → 扩展名 `jpg`；`png` → 扩展名 `png`；
    - `original` / `compatible` 无法预知真实输出格式：当资源自带可靠元数据（`resource.extension` 或 `mimeType`，用现有 `inferResourceExtension` 推断）时以它为准，否则沿用上次落盘扩展名；
    - 无扩展名时按目标扩展名补全；扩展名相同则原样返回。
- `planCollectedDownloadBatches` 的 `previous?.path` 分支：保留 `downloadRoot` 与文件名主干，`suggestedFilename` 改用上述函数对齐，**删除按历史扩展名回填 `imageFormat` 的三元表达式**（`targetPolicy.imageFormat` 保持 `policy.imageFormat`）。
- `inferResourceExtension` 从 `./downloadNaming/common` 引入（index 未导出）。

2. `src/collectedDownloadState.ts`

- `collectedDownloadPreview` 中 `prior.path` 分支：`suggestedFilename` 用同一函数对齐，`targetPolicy` 只覆盖 `downloadRoot`，**删除 `imageFormat` 覆盖**。这样预览路径（`collectedTargetPath`）、提交策略与实际落盘路径三者一致（Rust 对非 `original` 请求会再按真实字节校正扩展名）。

3. 一致性与边界

- 批量分组键仍为 `downloadRoot\0imageFormat`，同格式自动合并；格式变化时扩展名变化属预期行为，旧扩展名文件保留（非破坏性，不改 Rust、不做删除）。
- 目标格式与上次相同时文件名不变，`overwriteExisting + preservePresetPath` 仍原地覆盖，不产生 `(2)` 副本。
- 复杂度不变：仍在 O(资源数 + 历史数) 的既有单次遍历内，仅新增常数级字符串处理。

## 架构与数据流

```mermaid
flowchart LR
  A["设置面板 imageFormat"] --> B["ctx.imageSavePolicy（实时全局）"]
  B --> C["App.vue downloadResourceList / useCollectedDownloads.preview"]
  C --> D["planSpecializedDownloadUpdates"]
  D --> E["planCollectedDownloadBatches（历史只提供序号/目录/主干）"]
  E --> F["performDownloadResources: imageFormat = 实时策略"]
  F --> G["Rust finalize_download_with_overwrite 按请求格式转换并校正扩展名"]
```

## 目录结构

```
TuGet-Client/
├── src/
│   ├── collectedDownloads.ts        # [MODIFY] 新增 alignDownloadFilenameToFormat；planCollectedDownloadBatches 删除历史扩展名→imageFormat 回填，改为对齐文件名扩展名；引入 inferResourceExtension
│   └── collectedDownloadState.ts    # [MODIFY] collectedDownloadPreview 删除历史扩展名→imageFormat 回填，suggestedFilename 复用对齐函数，targetPolicy 仅覆盖 downloadRoot（保证预览路径与落盘一致）
└── tests/
    ├── collected-downloads.test.ts        # [MODIFY] 新增回归用例：历史 .jpg + 当前 png → batch.policy.imageFormat='png' 且文件名 主图N.png；反向 jpg 用例
    ├── collected-download-state.test.ts   # [MODIFY] 新增用例：修改格式后预览 item.policy.imageFormat 跟随新设置、path 扩展名同步、旧文件仅存时判定为 missing
    └── specialized-download-updates.test.ts # [MODIFY] 补断言：webp 历史 + imageFormat='png' 时 suggestedFilename 为 SKU图N.png，original 且资源带 webp 元数据时保持 .webp
```

## 执行注意

- 现有用例（`collected-downloads.test.ts`、`download-hardening.test.ts`、`specialized-download-updates.test.ts`）历史路径均为 `.jpg`/`.webp` 且默认策略为 `original`，修改后 `suggestedFilename` 与 `state` 判定必须保持不变，作为回归守门。
- 不改动 Rust、不改动 `imageSavePolicy.ts` 的终态快照语义、不改动 `useDownloadHistoryActions.ts` 中强制 `imageFormat:'original'` 的重新下载路径。
- 验证：`npm run test`（Vitest）+ `tsc`/`npm run build`；若 IDE agent 环境触发 node-safe-delete-shim，可在终端清空 `NODE_OPTIONS` 后执行。