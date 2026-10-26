# Wildberries 平台抓取脚本 Spec

## Why
项目已支持淘宝、京东、Ozon 等 26 个平台的抓取脚本，但 Wildberries（俄罗斯最大电商平台）尚未实现。Wildberries 的前端基础设施（平台识别、URL Handler、平台标签）已全部就绪，仅缺少 `scraper-scripts/wildberries/` 目录下的抓取脚本和构建注册。

## What Changes
- 新增 `scraper-scripts/wildberries/` 目录，包含 6 个模块文件（index / wbGetMain / wbGetDetail / wbGetSku / wbGetVideo / wbGetHylinkTitle）
- 修改 `scripts/build-scraper.mjs`，注册 wildberries 构建入口
- 修改 `src-tauri/src/utils.rs`，添加 Wildberries CDN 域名的 Referer 映射

## Impact
- Affected specs: 抓取脚本体系（新增 Wildberries 平台支持）
- Affected code: `scraper-scripts/`（新增）、`scripts/build-scraper.mjs`（修改）、`src-tauri/src/utils.rs`（修改）

## ADDED Requirements

### Requirement: Wildberries 主图提取 (wbGetMain)
系统 SHALL 从 Wildberries 商品详情页 DOM 中提取主图 URL。

#### Scenario: 正常提取主图
- **WHEN** Worker 加载 Wildberries 商品详情页并注入 wildberries.bundle.js
- **THEN** 脚本从 `[class*="mediaSlider"]`、`[class*="slidersStickyWrap"]`、`[class*="sliders"]`、`[class*="miniatureSlide"]` 容器中提取 `<img>` 元素的 URL
- **AND** 优先使用 `data-src-pb` 属性，其次 `img.src`，最后 `getAttribute('src')`
- **AND** 对 URL 执行原图还原：`/tm/` → `/big/`，`/c\d+x\d+/` → `/big/`
- **AND** 通过 `tauriBridge.send('MainPic', urls)` 上报去重后的 URL 列表

#### Scenario: 动态加载的主图
- **WHEN** 主图容器通过 React 异步渲染延迟出现
- **THEN** 脚本通过 `MAX_RETRIES=20` 轮询（间隔 1s）等待容器出现
- **AND** 通过 `MutationObserver` 监听 DOM 变化，防抖 300ms 后重新提取

### Requirement: Wildberries 详情图提取 (wbGetDetail)
系统 SHALL 从 Wildberries 商品详情页 DOM 中提取详情图 URL。

#### Scenario: 正常提取详情图
- **WHEN** Worker 加载 Wildberries 商品详情页
- **THEN** 脚本从 `[class*="richContent"]`、`[class*="richPreview"]`、`[class*="richItems"]`、`[class*="richGallery"]`、`[class*="richItemTrustFactor"]`、`[class*="richText"]`、`[class*="richList"]` 容器中提取 `<img>` 的 `src` 属性
- **AND** 补全 `//` 协议前缀为 `https:`
- **AND** 通过 `tauriBridge.send('DetailPic', urls)` 上报去重后的 URL 列表

#### Scenario: 详情容器延迟加载
- **WHEN** rich* 系列容器通过 React 异步渲染延迟出现
- **THEN** 脚本通过 `MutationObserver` 监听容器出现，触发后进入持续轮询模式
- **AND** 连续 10 次无新增图片则停止轮询

### Requirement: Wildberries SKU 图提取 (wbGetSku)
系统 SHALL 从 Wildberries 商品详情页 DOM 中提取 SKU 变体图 URL。

#### Scenario: 正常提取 SKU 图
- **WHEN** Worker 加载 Wildberries 商品详情页
- **THEN** 脚本从 `.sizesAndColors--Rb8Ln`、`.product-colors-container`、`.slide--QgAtn`、`[class*="mainWrap"]`、`[class*="arrowWrapper"]` 容器中提取 `<img>` 元素 URL
- **AND** 优先使用 `data-src-pb`（需以 `http` 开头），其次 `getAttribute('src')` 或 `img.src`
- **AND** 对 URL 执行原图还原：`/tm/` → `/big/`，截断到合法图片扩展名位置，排除 `tps-2-2.png`
- **AND** 通过 `tauriBridge.send('SkuPic', urls)` 上报去重后的 URL 列表

#### Scenario: SKU 容器动态变化
- **WHEN** SKU 容器因用户选择颜色/尺码而动态更新
- **THEN** `MutationObserver` 监听容器变化，防抖 300ms 后重新提取

### Requirement: Wildberries 视频提取 (wbGetVideo)
系统 SHALL 从 Wildberries 商品详情页提取视频 URL，支持多渠道检测。

#### Scenario: 多渠道视频检测
- **WHEN** Worker 加载 Wildberries 商品详情页
- **THEN** 脚本通过以下渠道检测视频：
  1. DOM `<video>` 标签的 `src`/`currentSrc`
  2. 页面 `<script>` 标签中的 JSON 数据
  3. `window` 全局变量（`__playinfo__`、`videoInfo`、`wb`、`product` 等）
  4. `Performance API` 网络资源监控
  5. `XMLHttpRequest` 拦截
  6. `Fetch API` 拦截
  7. `MutationObserver` 监听 `<video>` 和 `<script>` 插入
- **AND** 视频分类为 `main`（主图视频）或 `detail`（详情视频）
- **AND** 通过 `tauriBridge.send('VideoUrls', videos)` 上报视频对象数组

#### Scenario: 视频去重
- **WHEN** 同一视频通过多个渠道被检测到
- **THEN** 脚本通过双层去重机制（原始 URL 匹配 + 归一化 ID 匹配）避免重复上报

#### Scenario: 视频模块需在 document_start 阶段启动
- **WHEN** 脚本注入页面
- **THEN** 视频模块立即启动 XHR/Fetch 拦截，不等待 DOMContentLoaded

### Requirement: Wildberries 标题/链接/商品ID提取 (wbGetHylinkTitle)
系统 SHALL 从 Wildberries 商品详情页提取商品标题、链接和商品 ID。

#### Scenario: 正常提取元数据
- **WHEN** Worker 加载 Wildberries 商品详情页
- **THEN** 标题提取优先级：`.mainTitle--R75fTcZL` 的 `title` 属性 > `textContent` > `<head><title>` > `document.title`
- **AND** 商品 ID 从 URL 中正则匹配 `/catalog/(\d+)` 提取
- **AND** URL 清洗：移除查询参数，仅保留 `origin + pathname`
- **AND** 通过 `tauriBridge.send('productTitle', title)` / `tauriBridge.send('productLink', url)` / `tauriBridge.send('productId', id)` 上报

### Requirement: Wildberries 入口编排 (index.ts)
系统 SHALL 提供 Wildberries 平台的统一入口脚本，编排各模块执行。

#### Scenario: 模块编排
- **WHEN** wildberries.bundle.js 被注入 WebView
- **THEN** 入口脚本立即启动视频模块（不等待 DOMContentLoaded）
- **AND** 等待 DOMContentLoaded 后并行启动 Main/Sku/Detail/HylinkTitle 四个模块
- **AND** 各模块有 15 秒超时保护
- **AND** 通过 `waitForCompletion()` 判定任务完成后调用 `tauriBridge.completeTask()`

### Requirement: 构建注册
系统 SHALL 将 Wildberries 平台注册到 scraper 构建流程中。

#### Scenario: 构建入口注册
- **WHEN** 执行 `npm run build:scraper` 或相关构建命令
- **THEN** `scripts/build-scraper.mjs` 中包含 `wildberries` 入口
- **AND** 输出 `dist-scripts/wildberries.bundle.js`

### Requirement: Referer 映射
系统 SHALL 为 Wildberries CDN 域名提供正确的 Referer 映射以防止防盗链。

#### Scenario: Wildberries 图片下载
- **WHEN** 下载 Wildberries CDN（`basket-*.wbbasket.ru`、`wildberries.ru`）上的图片资源
- **THEN** Rust 端 `get_referer_for_url()` 返回 `https://www.wildberries.ru/` 作为 Referer

## MODIFIED Requirements

### Requirement: build-scraper.mjs 平台列表
在现有 26 个平台构建入口基础上，新增 `wildberries` 入口，使总数达到 27 个。

### Requirement: utils.rs Referer 映射表
在现有 5 条 Referer 映射规则基础上，新增 Wildberries CDN 域名映射规则。

## REMOVED Requirements
无移除项。
