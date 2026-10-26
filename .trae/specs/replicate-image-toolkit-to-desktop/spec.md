# 桌面客户端复现图片工具箱 Spec

## Why

GetPic 浏览器插件的 `ImageToolkitPanel.vue` 已经提供了一套完整的「电商图片批量处理」能力（格式转换、等比/定边缩放、体积控制、批量重命名、电商比例补白/裁切、ZIP/文件夹导出）。为了提升桌面客户端的独立生产力，需要把该能力无缝复现到 `src/` 桌面客户端中，使用项目当前的 Naive UI + Tauri v2 技术栈重新实现，并保持与原插件一致的处理行为。

## What Changes

- 在桌面客户端新增「图片工具箱」工作模式，与现有「极速 / 单链接 / 批量」并列切换。
- 新增 `ImageToolkitPanel.vue` 组件（Naive UI 重写，暗黑主题适配）。
- 新增 `useImageToolkit.ts` composable 管理图片工具箱状态。
- 迁移并适配 `GetPic/entrypoints/newtab/image-toolkit/` 下的核心处理逻辑到 `src/utils/image-toolkit/`。
- 新增 Rust Command `save_blob_to_file`，用于把前端生成的图片 Blob / ZIP Blob 保存到用户选定的本地目录。
- 新增/更新 Tauri 能力配置与 npm 依赖（`pica`、`browser-image-compression`、`jszip`、图标库）。

## Impact

- Affected specs: `enhance-admin-dashboard`（无直接冲突，管理后台不受影响）。
- Affected code:
  - `src/App.vue`（扩展 `activeMode` 类型）。
  - `src/components/SiderPanel.vue`（新增模式 Tab 与切换逻辑）。
  - `src/components/ImageToolkitPanel.vue`（新增）。
  - `src/composables/useImageToolkit.ts`（新增）。
  - `src/utils/image-toolkit/*`（新增）。
  - `src-tauri/src/commands/file_ops.rs`（新增 `save_blob_to_file` 命令）。
  - `src-tauri/src/lib.rs`（注册新命令）。
  - `src-tauri/capabilities/default.json`（按需补充命令权限）。
  - `package.json`（新增 npm 依赖）。

## ADDED Requirements

### Requirement: 图片工具箱模式入口

The system SHALL 在桌面客户端侧边栏提供「图片工具箱」模式入口，与现有三种模式并列切换。

#### Scenario: 成功切换

- **WHEN** 用户点击侧边栏的「图片工具箱」Tab
- **THEN** 主内容区展示 `ImageToolkitPanel.vue`，其他抓取模式的内容区隐藏
- **AND** 切换时若抓取任务正在运行，应提示用户先停止任务

### Requirement: 本地图片上传与拖拽

The system SHALL 支持用户通过点击上传或拖拽方式选择本地图片（PNG / JPG / JPEG / WEBP / GIF / BMP / AVIF），单次最多处理 100 张。

#### Scenario: 上传成功

- **WHEN** 用户拖入图片或点击上传区选择图片
- **THEN** 图片列表被加载，首张图片被选中，原图尺寸与体积被读取并展示
- **AND** 超大图片（像素超过 8000 万）给出处理性能警告

#### Scenario: 无有效图片

- **WHEN** 用户上传非图片文件
- **THEN** 显示提示「未识别到可处理的图片文件」

### Requirement: 图片处理设置

The system SHALL 提供五种处理开关，用户可自由组合启用：格式转换、修改尺寸、控制体积、批量重命名、电商比例。

#### Scenario: 格式转换

- **WHEN** 启用「格式转换」并选择 JPG / PNG / WEBP
- **THEN** 所有输出图片按所选格式导出（GIF/BMP/AVIF 等输入格式按所选格式重新编码）

#### Scenario: 修改尺寸

- **WHEN** 启用「修改尺寸」并选择按比例 / 指定宽 / 指定高 / 限制长边
- **THEN** 输出图片按对应规则等比缩放，输入值范围为 1~12000

#### Scenario: 控制体积

- **WHEN** 启用「控制体积」并选择 300K / 500K / 1M / 2M / 3M / 5M / 自定义
- **THEN** 系统以安全线（目标值 × 0.9）进行压缩，尽量使输出体积落在安全线以内
- **AND** PNG 目标下给出「PNG 为无损格式，不一定能压到目标以内」的提示
- **AND** 若压到最低质量仍超标，提示用户降低尺寸或目标

#### Scenario: 批量重命名

- **WHEN** 启用「批量重命名」
- **THEN** 支持「保留原名」或「统一名称」两种模式
- **AND** 支持前面加 / 后面加 / 编号 001 / 随机码（4~8 位）
- **AND** 重名时自动补 `_2`、`_3`

#### Scenario: 电商比例

- **WHEN** 启用「电商比例」并选择 1:1 / 3:4 / 2:3 的补白或裁切
- **THEN** 输出图片按要求比例处理，补白时使用用户选择的背景色
- **AND** JPG 导出时背景色会填充到画布

### Requirement: 实时预览

The system SHALL 在文件列表中展示所有已选图片的缩略图、文件名、原图尺寸与体积、处理状态。

#### Scenario: 切换选中

- **WHEN** 用户点击列表中的某张图片
- **THEN** 右侧预览区展示该图片的处理后预览（未处理时展示原图）
- **AND** 展示原图 / 输出 / 文件名三行元信息

### Requirement: 处理与导出

The system SHALL 提供「预览当前 / 下载当前 / 批量处理 / 批量导出 ZIP / 批量导出」五种操作。

#### Scenario: 下载当前

- **WHEN** 用户点击「下载当前」
- **THEN** 当前选中图片按当前设置被处理并保存到用户下载目录

#### Scenario: 批量处理

- **WHEN** 用户点击「批量处理」
- **THEN** 所有图片按当前设置被处理，状态显示处理进度

#### Scenario: 批量导出 ZIP

- **WHEN** 用户点击「批量导出 ZIP」且图片数量大于 1
- **THEN** 所有图片处理完成后打包为 ZIP 并保存
- **AND** 仅 1 张图片时直接保存单张图片

#### Scenario: 批量导出到文件夹

- **WHEN** 用户点击「批量导出」
- **THEN** 所有图片处理完成后保存到用户下载目录下的指定子文件夹
- **AND** 默认文件夹名由启用的功能标签 + 随机码组成，用户可自定义

### Requirement: Tauri 本地文件保存

The system SHALL 通过 Tauri 能力将前端生成的图片 Blob / ZIP Blob 安全保存到用户选择的本地目录。

#### Scenario: 保存成功

- **WHEN** 用户触发任意保存操作
- **THEN** 若未设置下载目录，弹出系统目录选择对话框
- **AND** 文件通过 Rust `save_blob_to_file` 命令写入磁盘，父目录不存在时自动创建
- **AND** 写入成功后前端显示成功提示

#### Scenario: 用户取消选择目录

- **WHEN** 用户在目录选择对话框中取消
- **THEN** 中止保存操作并显示提示

### Requirement: 视觉与交互一致性

The system SHALL 复用客户端现有的暗黑主题、玻璃拟态、微交互动效，使用 Naive UI 组件和项目现有 CSS 变量。

## MODIFIED Requirements

无现有需求被修改，仅扩展新的工作模式。

## REMOVED Requirements

无需求被移除。
