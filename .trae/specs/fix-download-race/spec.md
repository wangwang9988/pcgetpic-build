# 修复并发下载文件夹命名串扰 Spec

## Why

`DownloadManager.waitForProductData` 在轮询等待商品元数据时依赖全局 `store.currentResult`，多链接并发场景下 `currentResult` 可能被其他任务切换，导致商品 A 的图片下载到商品 B 的文件夹中。

同事已提供详细根因分析和方案一（taskId 精确查找），方案直接可用。

## What Changes

- **downloadManager.ts**：`productMeta` 增加 `taskId` 字段，`waitForProductData` 用 `store.results.get(taskId)` 替代 `store.currentResult`
- **ImageDisplay.vue**：新增 `resultId` prop，`startDownload` 调用时传入 `taskId`
- **VideoDisplay.vue**：新增 `resultId` prop，`startDownload` 调用时传入 `taskId`
- **ResultPreview.vue**：向 ImageDisplay 和 VideoDisplay 传入 `:resultId="result.taskId"`
- **ResultPreview.vue**：`expandedNames` 类型从 `string[]` 改为 `string | null`（手风琴模式规范类型）

## Impact
- Affected code: `src/utils/downloadManager.ts`、`src/components/ImageDisplay.vue`、`src/components/VideoDisplay.vue`、`src/components/ResultPreview.vue`
- 不涉及 Rust 端修改

## MODIFIED Requirements

### Requirement: 下载元数据按 taskId 精确查找
`waitForProductData` SHALL 通过 `store.results.get(taskId)` 精确获取商品元数据，不再依赖全局 `store.currentResult`。

#### Scenario: 并发下载时元数据不串扰
- **WHEN** 任务 A 和任务 B 同时触发下载，A 的元数据尚未就绪
- **AND** `waitForProductData` 在轮询等待 A 的元数据
- **THEN** 始终从 `results.get(taskId_A)` 读取 A 的数据，不受 B 影响

#### Scenario: 元数据就绪后正常返回
- **WHEN** taskId 对应的 result 已包含 productId 和 productTitle
- **THEN** `waitForProductData` 立即返回正确的元数据

### Requirement: ImageDisplay/VideoDisplay 传入 taskId
ImageDisplay 和 VideoDisplay 组件 SHALL 接受 `resultId` prop，并在调用 `DownloadManager.startDownload` 时将其作为 `taskId` 传入 `productMeta`。

#### Scenario: 下载时传递 taskId
- **WHEN** 用户点击下载按钮
- **THEN** `startDownload` 的 `productMeta` 中包含 `taskId` 字段

### Requirement: ResultPreview 传递 taskId
ResultPreview SHALL 将 `result.taskId` 作为 `resultId` prop 传递给 ImageDisplay 和 VideoDisplay。

### Requirement: expandedNames 类型规范化
`expandedNames` SHALL 声明为 `ref<string | null>(null)`，与 NCollapse accordion 模式绑定规范一致。