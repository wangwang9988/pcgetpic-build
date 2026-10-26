# Yupoo (又拍图库) 抓取脚本 Spec

## Why
Yupoo 平台在前端识别层（URL 匹配、标签、图标、Handler）和 Rust 后端层（枚举变体、bundle 名称、Referer 映射）均已注册，但核心抓取脚本 `scraper-scripts/yupoo/` 尚未实现，导致平台识别后无法实际注入脚本进行数据抓取。需要参考 `GetPic/entrypoints/modules/yupoo/` 下的浏览器插件脚本，将其适配为 Tauri WebView 注入的 IIFE 模块。

## What Changes
- 新增 `scraper-scripts/yupoo/` 目录，包含 6 个 TypeScript 模块文件
- 在 `scripts/build-scraper.mjs` 中注册 yupoo 构建入口
- 修复 `src/utils/platforms/yupoo.ts` 中 `extractProductId` 和 `cleanUrl` 的错误逻辑（当前错误地使用 PDD 的 `gid` 参数模式，Yupoo 的商品 ID 是 URL 路径中的相册 ID）

## Impact
- Affected specs: Yupoo 平台抓取能力
- Affected code:
  - `scraper-scripts/yupoo/` (新增)
  - `scripts/build-scraper.mjs` (修改)
  - `src/utils/platforms/yupoo.ts` (修改)

## ADDED Requirements

### Requirement: Yupoo 主图提取 (ypGetMain)
系统 SHALL 从 Yupoo 相册页面提取所有主图 URL。

#### Scenario: 相册页面主图提取
- **WHEN** 用户输入 Yupoo 相册 URL（如 `https://xxx.x.yupoo.com/albums/xxxxxx`）
- **THEN** 脚本通过多容器选择器策略扫描 DOM，从 `img` 标签的 `data-origin-src` > `data-src` > `src` 属性中提取图片 URL，清洗协议相对 URL（`//` → `https://`），去除查询参数，验证为 Yupoo 图片域名，去重后通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: 图片延迟渲染
- **WHEN** 页面 DOM 尚未完全加载
- **THEN** 脚本以 500ms 间隔轮询重试（最多 100 次），等待图片容器出现后再提取

### Requirement: Yupoo 详情图占位 (ypGetDetail)
系统 SHALL 为 DetailPic 发送空数组，因为 Yupoo 没有详情图。

#### Scenario: 清空详情图数据
- **WHEN** 脚本运行
- **THEN** 通过 `tauriBridge.send('DetailPic', [])` 上报空数组，防止其他平台残留数据污染

### Requirement: Yupoo SKU 图占位 (ypGetSku)
系统 SHALL 为 SkuPic 发送空数组，因为 Yupoo 没有 SKU 图。

#### Scenario: 清空 SKU 图数据
- **WHEN** 脚本运行
- **THEN** 通过 `tauriBridge.send('SkuPic', [])` 上报空数组，防止其他平台残留数据污染

### Requirement: Yupoo 视频提取 (ypGetVideo)
系统 SHALL 从 Yupoo 页面提取视频 URL。

#### Scenario: 视频提取
- **WHEN** 页面包含视频内容
- **THEN** 脚本通过 XHR/Fetch 拦截、Performance API 监控、MutationObserver 动态监听、DOM `<video>` 标签扫描、JSON-LD 结构化数据提取等多种手段捕获视频 URL，去重后通过 `tauriBridge.send('VideoUrls', videos)` 上报

#### Scenario: 无视频
- **WHEN** 页面不包含视频内容
- **THEN** 通过 `tauriBridge.send('VideoUrls', [])` 上报空数组

### Requirement: Yupoo 标题/链接/商品ID提取 (ypGetHylinkTitle)
系统 SHALL 从 Yupoo 页面提取商品标题、链接和商品 ID。

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `h2.goods-name span.goods-n-title` DOM 元素提取标题，回退到 `document.title`

#### Scenario: 商品 ID 提取
- **WHEN** 页面 URL 为 `https://xxx.x.yupoo.com/albums/ALBUM_ID` 格式
- **THEN** 从 URL 路径中提取相册 ID（`/albums/` 后的路径段），通过 `tauriBridge.send('productId', albumId)` 上报

#### Scenario: URL 清洗
- **WHEN** 原始 URL 包含查询参数或 hash
- **THEN** 仅保留 `origin + pathname`，通过 `tauriBridge.send('productLink', cleanUrl)` 上报

### Requirement: Yupoo 入口编排 (index.ts)
系统 SHALL 提供统一的 Yupoo 抓取脚本入口，编排各模块执行时序。

#### Scenario: 脚本启动
- **WHEN** Yupoo bundle.js 被注入到 WebView
- **THEN** 入口脚本立即启动视频拦截模块（document_start 时序），等待 DOMContentLoaded 后并行启动 Main/Sku/Detail/HylinkTitle 模块，通过 `waitForCompletion` 判定任务完成

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中运行
- **THEN** 立即退出，防止重复注入

### Requirement: 构建注册
系统 SHALL 在构建脚本中注册 Yupoo 平台入口。

#### Scenario: 构建入口注册
- **WHEN** 执行 `npm run build:scraper` 或项目构建
- **THEN** `scripts/build-scraper.mjs` 中包含 `yupoo: resolve(projectRoot, 'scraper-scripts/yupoo/index.ts')` 入口，生成 `dist-scripts/yupoo.bundle.js`

## MODIFIED Requirements

### Requirement: Yupoo 平台 Handler URL 清洗逻辑
当前 `src/utils/platforms/yupoo.ts` 的 `cleanUrl` 和 `extractProductId` 错误地使用 PDD 的 `gid` 查询参数模式。Yupoo 的 URL 格式为 `https://xxx.x.yupoo.com/albums/ALBUM_ID`，商品 ID 是路径中的相册 ID，而非查询参数。

**修改后**：
- `cleanUrl`: 仅保留 `origin + pathname`，移除所有查询参数和 hash
- `extractProductId`: 从 URL 路径 `/albums/` 后提取相册 ID（路径段），回退到其他数字路径段

## REMOVED Requirements

无移除的需求。
