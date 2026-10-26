# 下载按钮增加「部分下载」状态 Spec

## Why
ResultPreview.vue 顶部的下载按钮当前仅有两种可视状态（下载 / 已下载），但下载状态机实际存在四种（`idle` / `downloading` / `downloaded` / `partial-failed`）。`partial-failed` 状态被复用为"已下载"（`warning` 类型 + "已下载" 文案），用户在部分图片下载失败时无法从按钮上识别出来，必须主动展开面板或进入下载目录才能发现，影响排查与重试效率。

## What Changes
- **修改** `src/components/ResultPreview.vue` 的下载按钮渲染：
  - 区分 `downloaded` 与 `partial-failed` 的视觉表现
  - 引入第三种可见状态「部分下载」
  - 为 `partial-failed` 增加悬停 Tooltip 展示失败数/总数
- **不修改** `src/stores/downloadState.ts`（状态机与判定逻辑保持不变，详见下方「不修改说明」）
- **不修改** 其他组件（`DownloadSettings.vue` / `DownloadStatus.vue` 等未涉及该按钮）

## 不修改说明
- `DownloadStatus` 类型不新增枚举值，仍为 `idle | downloading | downloaded | partial-failed`
- 状态判定逻辑（`failedFiles > 0 ? 'partial-failed' : 'downloaded'`）保持不变
- `retryFailedDownloads(taskId)` 行为不变
- 既有四项验收：原 `add-auto-download-button` spec 中的「四态 UI 展示正确」仍然成立，本 spec 仅在「四态」基础上**细分部分下载的视觉表现**

## ADDED Requirements

### Requirement: 下载按钮三态可视区分
在 ResultPreview header-extra 区域中，按钮在不同状态下的视觉表现如下：

| 状态 | type | ghost | loading | disabled | 文案 | 点击行为 |
|------|------|-------|---------|----------|------|----------|
| idle | default | false | false | false | 下载 | 触发下载 |
| downloading | warning | false | true | true | 下载中 | 无 |
| downloaded | success | true | false | false | 已下载 | 打开下载目录 |
| **partial-failed** | **warning** | **false** | **false** | **false** | **部分下载** | **重试失败项** |

要点：
- `downloaded` 与 `partial-failed` 必须从按钮文案上一眼可区分（"已下载" vs "部分下载"）
- `downloaded` 保持 `success` 类型 + `ghost` 样式
- `partial-failed` 使用 `warning` 类型 + **非 ghost** 样式（实心 + 警告色 = 强烈提示存在异常）
- `partial-failed` 不再使用 `loading` 或 `disabled` 态，确保可点击重试

### Requirement: partial-failed 悬停提示
- 当任务处于 `partial-failed` 状态时，鼠标悬停在按钮上，弹出 NTooltip 提示：
  - 格式：`部分资源下载失败（成功 N / 共 M），点击重试`
  - N = `state.completedFiles`，M = `state.totalFiles`
- 仅在 `partial-failed` 状态下显示该 Tooltip，其他状态不显示

### Requirement: 点击行为保持兼容
- `idle` → 触发下载（`triggerManualDownload`）
- `downloading` → 无操作（按钮 disabled）
- `downloaded` → 打开下载目录（`DownloadManager.openDownloadFolder`）
- `partial-failed` → 重试失败项（`retryFailedDownloads`）—— 与原逻辑一致，仅文案与样式变化

## MODIFIED Requirements

### Requirement: ResultPreview.vue 下载按钮渲染函数
修改以下三个函数以体现「部分下载」独立状态：

- `isDownloadedOrFailed(taskId)` → 拆分为：
  - `isDownloaded(taskId)`：`s === 'downloaded'`
  - `isPartialFailed(taskId)`：`s === 'partial-failed'`
  - 原 `isDownloadedOrFailed` 保留为 `isDownloaded || isPartialFailed`（保持兼容，控制是否使用 ghost）
- `downloadButtonType(taskId)`：
  - `downloaded` → `success`
  - `downloading` → `warning`
  - `partial-failed` → `warning`（**不变，但与 `downloading` 区分通过 ghost/loading 实现**）
  - `idle` → `default`
- `downloadButtonText(taskId)`：将 `partial-failed` 的文案从 `'已下载'` 改为 `'部分下载'`

### Requirement: 按钮属性绑定调整
- `:ghost` 绑定从 `isDownloadedOrFailed` 调整为 `isDownloaded`（仅全成功才用 ghost 样式）
- `:loading` 仍为 `isTaskDownloading`（`partial-failed` 时 loading 必须为 false）
- `:disabled` 仍为 `isTaskDownloading`（`partial-failed` 时 disabled 必须为 false，确保可点击重试）

## REMOVED Requirements
无

## 状态流转

```
         idle ──触发──► downloading ──全部成功──► downloaded
                            │
                            └──部分失败──► partial-failed ──点击──► downloading
                                                │
                                                └──悬停显示"成功 N/共 M"提示
```

## 边界情况

| 场景 | 策略 |
|------|------|
| `partial-failed` 时点击 | 走 `retryFailedDownloads` 逻辑：completedFiles/failedFiles 归零后重新触发下载 |
| `partial-failed` 时再次抓取新数据 | `notifyDataUpdate` 内 `status !== 'idle'` 守卫自动跳过，不会覆盖 partial-failed |
| `partial-failed` 时再次点重试 | 走 `retryFailedDownloads`，status 被改为 `idle` 后再进入 `downloading` |
| `totalFiles = 0` 不会进入 partial-failed | 现有逻辑 `if (items.length === 0) setTaskStatus(taskId, 'downloaded')` 保证 |
| Tooltip 文案长度 | 限制在 32 字符以内，失败数/总数超出时不溢出 |

## 影响范围

- 受影响文件：
  - `src/components/ResultPreview.vue`（渲染层）
- 不受影响：
  - `src/stores/downloadState.ts`（状态机）
  - `src/stores/taskQueue.ts`（任务调度）
  - `src/utils/downloadManager.ts`（下载引擎）
  - `src/components/DownloadStatus.vue`（独立组件，不涉及该按钮）
