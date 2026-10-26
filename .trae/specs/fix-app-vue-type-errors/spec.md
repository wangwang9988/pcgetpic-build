# 修复 App.vue 类型飘红与逻辑 Bug Spec

## Why
App.vue 中存在 naive-ui NSplit 组件的类型不兼容问题（导致 CatPaw 等编辑器显示飘红），以及 `handleUpdateSize` 函数中比例值转像素的逻辑 Bug。

## What Changes
- 修复 `handleUpdateSize` 回调函数的类型签名，绕过 naive-ui `SplitOnUpdateSize` 的 `string & number` 交叉类型 Bug
- 修复 `handleUpdateSize` 中数字比例值转像素宽度的逻辑错误
- 添加 `.vscode/settings.json` 配置 Vue 语言服务器设置（可选）

## Impact
- Affected code: `src/App.vue` 中 `handleUpdateSize` 函数及 `@update:size` 事件绑定
- Affected specs: 无其他 spec 受影响

## ADDED Requirements

### Requirement: 修复 NSplit @update:size 类型兼容性
系统 SHALL 确保 `handleUpdateSize` 回调函数的类型签名与 naive-ui NSplit 组件的 `onUpdate:size` 事件类型兼容，消除编辑器中的类型飘红。

#### Scenario: 类型检查通过
- **WHEN** 任意 TypeScript/Vue 语言服务器对 App.vue 进行类型检查
- **THEN** `@update:size="handleUpdateSize"` 绑定不产生类型错误

### Requirement: 修复侧边栏宽度保存逻辑
系统 SHALL 正确处理 NSplit `@update:size` 回调返回的数字比例值，将其转换为像素宽度后保存到 localStorage。

#### Scenario: 比例值正确转换为像素
- **WHEN** NSplit 返回数字类型的 size（如 0.5，代表占容器 50%）
- **THEN** 系统根据容器实际宽度将比例值转换为像素值（如容器宽 1000px，0.5 → 500px）
- **AND** 转换后的像素值在 300~600 范围内时保存到 localStorage

#### Scenario: 字符串值正确解析
- **WHEN** NSplit 返回字符串类型的 size（如 "340px"）
- **THEN** 系统解析字符串得到像素值并保存

## MODIFIED Requirements
无

## REMOVED Requirements
无
