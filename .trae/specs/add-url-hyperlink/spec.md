# 为结果链接添加超链接 Spec

## Why
ResultPreview 组件中显示的商品链接仅为纯文本，用户无法直接点击跳转到对应商品页面，需要手动复制链接到浏览器中打开，体验不佳。

## What Changes
- 将 `result.url` 的纯文本展示改为可点击的超链接，链接目标为 `result.url` 自身
- 链接在新标签页中打开（`target="_blank"`）
- 保持现有的视觉样式不变

## Impact
- Affected code: `src/components/ResultPreview.vue`（第 46 行模板及样式部分）

## ADDED Requirements

### Requirement: 结果链接可点击跳转
系统 SHALL 将抓取结果中的商品 URL 显示为可点击的超链接，点击后在新标签页中打开对应页面。

#### Scenario: 用户点击商品链接
- **WHEN** 用户点击结果面板中的 URL 文本
- **THEN** 浏览器在新标签页中打开该 URL 对应的商品页面

#### Scenario: 链接视觉样式
- **WHEN** 页面渲染包含 URL 的结果行
- **THEN** URL 文本保持现有的 `font-size: 12px`、`word-break: break-all` 样式，并具有超链接的默认交互提示（如悬停时显示手型光标）
