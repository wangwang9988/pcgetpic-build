# 梅西百货 (Macy's) 抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688 等平台的抓取脚本，但梅西百货 (macys.com) 平台尚未实现 `scraper-scripts/macys/` 目录下的抓取模块。前端平台识别（URL 匹配、商品 ID 提取、URL 清洗）和 Rust 端 `Platform::Macys` 枚举已就绪，缺少的是注入 WebView 的核心抓取脚本。

## What Changes
- 新增 `scraper-scripts/macys/` 目录，包含 6 个模块文件：
  - `macysGetMain.ts` — 主图提取
  - `macysGetSku.ts` — SKU/变体图提取
  - `macysGetDetail.ts` — 详情图提取
  - `macysGetVideo.ts` — 视频提取
  - `macysGetHylinkTitle.ts` — 标题/链接/商品 ID 提取
  - `index.ts` — 入口编排
- 修改 `scripts/build-scraper.mjs`，注册 `macys` 平台入口

## Impact
- Affected code: `scraper-scripts/` (新增目录)、`scripts/build-scraper.mjs` (新增一行)
- 前端 `src/utils/platforms/` 和 Rust `platform_resolver.rs` 已支持 macys，无需修改
- 不涉及登录策略（macys 无需登录检测）

## ADDED Requirements

### Requirement: 梅西百货主图提取 (macysGetMain)
系统 SHALL 从 macys.com 商品页 DOM 中提取商品主图的高清 URL。

#### Scenario: 主图轮播区域提取
- **WHEN** 页面包含 `.main-image-carousel .slideshow-item picture img` 元素
- **THEN** 从 `data-src` 或 `src` 属性提取 URL，过滤仅包含 `macysassets.com` 的链接，移除查询参数后拼接 `?wid=1200&fmt=jpeg` 还原高清版本

#### Scenario: 缩略图列表区域提取
- **WHEN** 页面包含 `.alt-desktop-images .image-wrapper picture img` 元素
- **THEN** 同上策略提取并清洗 URL

#### Scenario: 异步渲染等待
- **WHEN** 页面 DOM 尚未渲染完成（首次提取结果为空）
- **THEN** 以 500ms 间隔重试，最多 100 次，直到获取到图片或超时

### Requirement: 梅西百货 SKU 图提取 (macysGetSku)
系统 SHALL 从 macys.com 商品页提取 SKU/变体图片 URL。

#### Scenario: Stylitics 穿搭模块提取
- **WHEN** 页面包含 `img[data-testid="stylitics-ui-image"]` 元素或 `[data-collage-img]` 属性元素
- **THEN** 提取 URL 并通过 `processToLargeImage` 转换为高清版本

#### Scenario: 原生轮播图提取
- **WHEN** 页面包含 `.product-qv-images picture img.picture-image` 元素
- **THEN** 提取 URL 并通过 `processToLargeImage` 转换

#### Scenario: Adobe Scene7 URL 清洗
- **WHEN** 图片 URL 路径包含 `/is/image/`
- **THEN** 设置 `wid=1500`、`fmt=jpeg`、`qlt=90`，删除 `fit` 和 `op_sharpen` 参数

#### Scenario: Stylitics CDN URL 处理
- **WHEN** 图片 URL 域名包含 `stylitics.com`
- **THEN** 保持原 URL 不变（裸链接即为原图）

### Requirement: 梅西百货详情图提取 (macysGetDetail)
系统 SHALL 从 macys.com 商品页提取详情图 URL。

#### Scenario: Syndigo 容器提取
- **WHEN** 页面包含 `.syndigo-powerpage-grid` 容器
- **THEN** 从容器内的 `picture` 元素提取图片，优先取 JPG 格式 `source[srcset]`，其次取 `img[srcset]`，最后取 `img[src]`

#### Scenario: Shadow DOM 穿透
- **WHEN** 页面包含 `syndigo-powerpage` 自定义元素且其 `shadowRoot` 可访问
- **THEN** 在 shadowRoot 作用域内重复执行 Syndigo 容器提取逻辑

#### Scenario: srcset 最高分辨率提取
- **WHEN** `srcset` 属性包含多个分辨率候选
- **THEN** 选择宽度最大的 URL

### Requirement: 梅西百货视频提取 (macysGetVideo)
系统 SHALL 从 macys.com 商品页提取视频 URL。

#### Scenario: __MODERN_ROUTER_DATA__ JSON 提取
- **WHEN** 页面包含 `#__MODERN_ROUTER_DATA__` script 标签
- **THEN** 解析 JSON，遍历 `loaderData` → `page_config.components_map` → `product_info.product_base.video` 提取视频 URL

#### Scenario: DOM video 元素提取
- **WHEN** 页面包含 `<video>` 元素
- **THEN** 从 `src`、`currentSrc` 属性和 `<source>` 子元素提取视频 URL

#### Scenario: Macy's 视频 CDN 识别
- **WHEN** URL 包含 `macyscdn-us.com`、`macyscdn.com`、`ttcdn-us.com` 等域名且路径包含 `/video/`
- **THEN** 识别为 Macy's 视频，归为主图视频

#### Scenario: XHR/Fetch 拦截
- **WHEN** 页面发起网络请求
- **THEN** 拦截 XMLHttpRequest 和 Fetch，检测响应中的视频 URL

#### Scenario: MutationObserver 动态监听
- **WHEN** DOM 中动态插入 `<video>` 或 `<script>` 元素
- **THEN** 检查新元素中的视频信息

### Requirement: 梅西百货标题/链接提取 (macysGetHylinkTitle)
系统 SHALL 从 macys.com 商品页提取商品标题、链接和商品 ID。

#### Scenario: 商品 ID 提取
- **WHEN** URL 包含 `?ID=xxxxx` 查询参数
- **THEN** 从查询参数提取商品 ID

#### Scenario: 旧版 PDP 链接支持
- **WHEN** URL 路径包含 `/shop/pdp/` 且路径末段为纯数字
- **THEN** 从路径中提取商品 ID

#### Scenario: URL 清洗
- **WHEN** 成功提取商品 ID
- **THEN** 构建标准化 URL，保留 `origin + pathname + ?ID=productId`

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 从 `document.title` 提取商品标题

### Requirement: 入口编排 (index.ts)
系统 SHALL 提供统一的入口脚本编排所有模块的执行时序。

#### Scenario: 视频模块立即启动
- **WHEN** 脚本加载（document_start 阶段）
- **THEN** 立即启动 `macysGetVideo` 模块（需要拦截网络请求）

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发或 document.readyState 不为 loading
- **THEN** 依次启动 Main、Sku、Detail、HylinkTitle 模块

#### Scenario: 任务完成判定
- **WHEN** 所有模块执行完毕且图片数据静默超过阈值
- **THEN** 调用 `tauriBridge.completeTask()` 完成任务

#### Scenario: 异常处理
- **WHEN** 模块执行超时或抛出异常
- **THEN** 记录错误日志，不影响其他模块运行；若已上传数据则尝试以完成状态结束

### Requirement: 构建注册
系统 SHALL 将 macys 平台注册到构建脚本中。

#### Scenario: 构建脚本注册
- **WHEN** 执行 `scripts/build-scraper.mjs`
- **THEN** 输出 `dist-scripts/macys.bundle.js`
