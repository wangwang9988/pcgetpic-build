# Lazada 抓取脚本对齐开发指南 Spec

## Why
Lazada 抓取脚本已实现基本功能，但与《平台抓取脚本开发指南》的最佳实践存在 6 处差距，主要集中在 GetVideo 模块（缺少游标增量检测、模拟用户交互、延时梯度扫描、多属性源检查、返回清理函数）、GetSku 轮询逻辑冗余、GetDetail 缺少持续监听、index.ts 缺少守卫条件。对齐指南可提升抓取完整性、性能和健壮性。

## What Changes
- **lazadaGetVideo.ts**：Performance API 改为游标增量检测；新增 `simulateInteraction()` 模拟用户交互；延时扫描改为梯度 `[1s, 3s, 5s, 10s]`；新增 `checkVideoElement()` 多属性源检查；新增 `scanVideoContainers()` 视频容器扫描；`run()` 返回清理函数
- **lazadaGetSku.ts**：移除冗余 `pollCounter` 定时器，将计数逻辑合并到 `pollTimer` 回调内
- **lazadaGetDetail.ts**：最终上报后注册 MutationObserver 持续监听详情区域，检测到图片增加时增量上报；返回清理函数
- **index.ts**：`setupCaptchaWatcher()` 添加 `CAPTCHA_SELECTORS.length === 0` 守卫

## Impact
- Affected specs: 抓取脚本体系（Lazada 平台模块优化）
- Affected code:
  - `scraper-scripts/lazada/lazadaGetVideo.ts` (重写核心逻辑)
  - `scraper-scripts/lazada/lazadaGetSku.ts` (简化轮询)
  - `scraper-scripts/lazada/lazadaGetDetail.ts` (添加持续监听)
  - `scraper-scripts/lazada/index.ts` (添加守卫)

## ADDED Requirements

### Requirement: GetVideo 游标增量 Performance API 检测
系统 SHALL 使用游标增量方式检测 Performance API 中的媒体资源，而非全量扫描：

#### Scenario: 增量检测新资源
- **WHEN** `requestAnimationFrame` 回调执行时
- **THEN** 仅处理 `checkedResourceCount` 之后的新增条目，处理完毕后更新游标位置，避免重复检查已处理条目

### Requirement: GetVideo 模拟用户交互
系统 SHALL 在首次延时扫描时模拟用户交互触发懒加载视频：

#### Scenario: 触发懒加载视频
- **WHEN** 延时梯度扫描首次执行（1s 时）
- **THEN** 调用 `simulateInteraction()` 定位视频容器，依次触发 `scrollIntoView` → `mouseover` → `click` 事件，激活懒加载视频

### Requirement: GetVideo 延时梯度扫描
系统 SHALL 使用延时梯度 `[1s, 3s, 5s, 10s]` 覆盖页面渲染关键时间节点：

#### Scenario: 梯度扫描
- **WHEN** DOMContentLoaded 后启动 DOM 检测
- **THEN** 在 1s/3s/5s/10s 四个时间点分别执行 `extractVideosFromPageJson()`、`checkWindowForVideos()`、`scanVideoContainers()`，首次（1s）额外执行 `simulateInteraction()`

### Requirement: GetVideo 多属性源检查
系统 SHALL 从 `<video>` 元素的多个属性和子元素中提取视频 URL：

#### Scenario: 多属性源提取
- **WHEN** 发现 `<video>` 元素
- **THEN** 检查 `src`、`currentSrc`、`data-src`、`data-video-url`、`poster`（仅媒体格式）属性，以及 `<source>` 子元素的 `src`，过滤 `blob:` 和 `data:` 协议

### Requirement: GetVideo 视频容器扫描
系统 SHALL 通过 CSS 选择器定位视频播放器容器并提取视频信息：

#### Scenario: 容器扫描
- **WHEN** 延时梯度扫描执行时
- **THEN** 扫描 `.video-player`、`.vjs-tech`、`[class*="video"]`、`[class*="player"]`、`[id*="video"]`、`[id*="player"]` 选择器匹配的容器，提取其中的 `<video>` 元素和 `data-url`/`data-video`/`data-src`/`data-source` 自定义属性

### Requirement: GetVideo 返回清理函数
系统 SHALL 返回清理函数以释放常驻资源：

#### Scenario: 清理资源
- **WHEN** 任务完成判定触发清理
- **THEN** 清理函数断开 MutationObserver、取消 requestAnimationFrame 循环、清除所有延时定时器

### Requirement: GetSku 简化轮询逻辑
系统 SHALL 使用单一 `pollTimer` 定时器完成轮询扫描和计数限制：

#### Scenario: 单定时器轮询
- **WHEN** 首轮扫描无结果需启动轮询
- **THEN** 在 `pollTimer` 的回调内用 `pollCount++` 计数，达到 `MAX_POLLS` 时 `clearInterval`，获取到结果时也 `clearInterval`，不再使用独立的 `pollCounter` 定时器

### Requirement: GetDetail MutationObserver 持续监听
系统 SHALL 在最终上报后注册 MutationObserver 持续监听详情区域：

#### Scenario: 持续监听增量上报
- **WHEN** 多轮提取完成并上报 DetailPic 后
- **THEN** 对详情图容器注册 MutationObserver，检测到图片数量增加时重新扫描并增量上报；返回清理函数供主流程调用

### Requirement: index.ts 验证码守卫
系统 SHALL 在 `setupCaptchaWatcher()` 中添加守卫条件：

#### Scenario: 无验证码选择器时跳过
- **WHEN** `CAPTCHA_SELECTORS.length === 0`
- **THEN** 直接返回，不创建 MutationObserver

## MODIFIED Requirements

### Requirement: Lazada 视频提取 (lazadaGetVideo)
原 Spec 中的视频提取逻辑 SHALL 升级为指南推荐的多手段完整模式：XHR/Fetch 拦截 + Performance API 游标增量 + MutationObserver + 页面内嵌 JSON + Window 全局变量 + 模拟用户交互 + 视频分类上报 + 双重去重 + 多属性源检查 + 视频容器扫描 + 延时梯度扫描 + 返回清理函数。

### Requirement: Lazada SKU 图提取 (lazadaGetSku)
原 Spec 中的 SKU 轮询逻辑 SHALL 简化为单一 `pollTimer` 定时器模式，移除冗余的 `pollCounter` 定时器。

### Requirement: Lazada 详情图提取 (lazadaGetDetail)
原 Spec 中的详情图提取 SHALL 在最终上报后增加 MutationObserver 持续监听，并返回清理函数。

## REMOVED Requirements
无移除项。
