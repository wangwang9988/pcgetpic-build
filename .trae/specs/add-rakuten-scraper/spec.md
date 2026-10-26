# Rakuten 抓取脚本实现 Spec

## Why
项目已在前端平台检测（`PLATFORM_PATTERNS`、`registry.ts`）、Rust 平台解析器（`Platform::Rakuten`）和标签映射中注册了 Rakuten 平台，但缺少核心的抓取脚本（`scraper-scripts/rakuten/`）和构建入口。需要参考 `GetPic/entrypoints/modules/rakuten/` 下的浏览器插件脚本，将其核心提取逻辑移植为 Tauri WebView 注入的 IIFE 脚本，替换通信层（`browser.runtime.sendMessage` → `tauriBridge.send`），并移除插件特有的页面可见性/焦点/SPA 导航检测逻辑（由 Tauri 宿主的静默判定机制接管）。

## What Changes
- 新增 `scraper-scripts/rakuten/` 目录，包含 6 个模块文件：
  - `index.ts` — 入口编排（视频模块立即启动，其余模块 DOMContentLoaded 后并行启动）
  - `rkGetMain.ts` — 主图提取（三路合并：AppData JSON + JSON-LD + DOM 多选择器）
  - `rkGetDetail.ts` — 详情图提取（4 个容器选择器 + MutationObserver）
  - `rkGetSku.ts` — SKU 图提取（漏斗式五级选择器）
  - `rkGetVideo.ts` — 视频提取（五路并行 + XHR/Fetch 拦截 + Performance API）
  - `rkGetHylinkTitle.ts` — 标题/链接/商品 ID 提取
- 修改 `scripts/build-scraper.mjs` — 注册 `rakuten` 构建入口
- 修改 `src-tauri/src/login/mod.rs` — 为 Rakuten 添加 `DefaultLoginStrategy`（登录页检测 `login.rakuten.co.jp`）

## Impact
- Affected specs: Rakuten 平台抓取能力（从"仅注册不可用"到"完整可用"）
- Affected code:
  - `scraper-scripts/rakuten/` (新增 6 文件)
  - `scripts/build-scraper.mjs` (新增 1 行构建入口)
  - `src-tauri/src/login/mod.rs` (新增 1 个 DefaultLoginStrategy 注册)

## ADDED Requirements

### Requirement: Rakuten 主图提取
系统 SHALL 从 Rakuten 商品页提取主图 URL，采用三路合并策略：
1. 从 `#item-page-app-data` JSON 数据提取 `media.images[].location`
2. 从 `application/ld+json` Schema.org Product 类型提取 `image` 和 `offers[].image`
3. 从 DOM 多选择器提取缩略图，去除查询参数还原大图

URL 清洗规则：补全 `//` 协议头 → 去除 `?` 后查询参数 → 过滤 `.svg` 文件 → 去重

#### Scenario: 成功从 AppData JSON 提取主图
- **WHEN** 页面包含 `<script type="application/json" id="item-page-app-data">` 标签
- **AND** JSON 中 `newApi.itemInfoSku.media.images` 或 `api.data.itemInfoSku.media.images` 有数据
- **THEN** 提取所有 `img.location` 作为主图 URL

#### Scenario: AppData 为空时从 JSON-LD 兜底
- **WHEN** AppData 提取结果为空
- **AND** 页面包含 `application/ld+json` 的 Product 类型数据
- **THEN** 从 `image` 字段和 `offers[].image` 字段提取主图 URL

#### Scenario: JSON 数据源均无结果时从 DOM 兜底
- **WHEN** AppData 和 JSON-LD 均未提取到主图
- **THEN** 使用多选择器从 DOM 缩略图提取，去除查询参数还原大图

### Requirement: Rakuten 详情图提取
系统 SHALL 从 Rakuten 商品页详情区域提取详情图 URL：
- 容器选择器：`#prd-page`、`.item_desc`、`.sale_desc`、`#description`
- 排除 `icon-img` 类的装饰性图标
- URL 清洗：补全协议头 → 去除尺寸参数 `_60w_60h_4e` → 去除查询参数
- 使用 MutationObserver 监听动态加载（1 秒防抖）

#### Scenario: 从详情容器提取图片
- **WHEN** 页面包含 `#prd-page` 或 `.item_desc` 等详情容器
- **THEN** 收集容器内所有 `img` 元素的 `src`/`data-src`，清洗后上报

### Requirement: Rakuten SKU 图提取
系统 SHALL 从 Rakuten 商品页提取 SKU 颜色图，采用漏斗式五级选择器：
1. `li[data-ratid='rba_item_sku_thumbnail'] img`（数据埋点 ID，最稳健）
2. `img.item-sku-actions-color-image`（具体图片类名）
3. `.item-sku-actions-color-list .item-sku-actions-color-item img`（层级结构）
4. `.item-sku-actions-color img`（宽泛保底）
5. `.product-list img`（商品列表容器）

URL 清洗：补全协议头 → 去除查询参数

#### Scenario: 从 SKU 容器提取颜色图
- **WHEN** 页面包含 SKU 选择区域
- **THEN** 按优先级从五级选择器提取 SKU 图 URL

### Requirement: Rakuten 视频提取
系统 SHALL 从 Rakuten 商品页提取视频 URL，采用五路并行策略：
1. 从 `#item-page-app-data` JSON 提取 `media.video.location`
2. 从 `application/ld+json` VideoObject 类型提取 `contentURL`/`embedUrl`
3. 从 DOM `video`/`source` 元素提取（含 Shadow DOM 遍历）
4. Performance API 监听网络资源请求
5. XHR/Fetch 拦截，递归搜索 JSON 响应体中的视频 URL

视频分类：主图视频 vs 详情视频
去重机制：URL 精确匹配 + 规范化内容 ID 匹配

#### Scenario: 从 AppData JSON 提取视频
- **WHEN** 页面 AppData JSON 中包含 `media.video.location`
- **THEN** 提取视频 URL 并分类为主图视频

#### Scenario: 拦截 XHR 响应中的视频数据
- **WHEN** 页面发起 XHR 请求，响应为 JSON 格式
- **THEN** 递归搜索 JSON 对象中的视频 URL

### Requirement: Rakuten 标题/链接/商品 ID 提取
系统 SHALL 从 Rakuten 商品页提取商品标题、链接和商品 ID：
- 标题：`document.title`，带轮询等待（最多 2 秒，200ms 间隔）
- 商品 ID：从 URL 路径提取，`item.rakuten.co.jp/{shop_name}/{item_id}/` 格式取第二段
- 链接清洗：去除查询参数，确保路径以 `/` 结尾

#### Scenario: 从标准 Rakuten 商品 URL 提取 ID
- **WHEN** URL 为 `https://item.rakuten.co.jp/shop123/item456/`
- **THEN** 商品 ID 为 `item456`

#### Scenario: 排除非商品路径
- **WHEN** URL 路径段包含 `search`/`category`/`event`/`campaign`/`ranking`/`review`
- **THEN** 不提取该段作为商品 ID

### Requirement: Rakuten 构建入口注册
系统 SHALL 在 `scripts/build-scraper.mjs` 中注册 `rakuten` 构建入口，指向 `scraper-scripts/rakuten/index.ts`，使构建脚本生成 `rakuten.bundle.js`。

### Requirement: Rakuten 登录策略
系统 SHALL 为 Rakuten 平台注册 `DefaultLoginStrategy`，检测 `login.rakuten.co.jp` 登录页。

## MODIFIED Requirements
无

## REMOVED Requirements
无
