# 修复 getImageSrc 冗余死代码 Spec

## Why
`ImageDisplay.vue` 的 `getImageSrc()` 函数中存在冗余的内层 `if (!proxiedUrls.has(originalUrl))` 检查，该条件在外层 `if (isAntiHotlinkUrl(url) && !proxiedUrls.has(originalUrl))` 中已保证为 true，属于死代码。对比同逻辑的 `VideoDisplay.vue` 实现无此冗余。

## What Changes
- 移除 `ImageDisplay.vue` 中 `getImageSrc()` 函数的冗余内层 `if` 及其闭合大括号

## Impact
- Affected code: `src/components/ImageDisplay.vue` 的 `getImageSrc()` 函数

## ADDED Requirements

（无新增需求）

## MODIFIED Requirements

### Requirement: getImageSrc() 代码质量
移除冗余内层 `if (!proxiedUrls.has(originalUrl))` 及其闭合大括号，使代码逻辑与 `VideoDisplay.vue` 的 `getVideoSrc()` 保持一致。

## REMOVED Requirements

（无移除项）
