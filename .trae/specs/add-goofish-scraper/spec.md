# 闲鱼(Goofish)抓取脚本 Spec

## Why
项目已实现淘宝、京东、拼多多等平台的抓取脚本，但闲鱼平台（goofish.com / xianyu.com / 2.taobao.com）尚未实现。Rust 侧 `Platform::Goofish` 枚举和前端平台注册已就绪，唯独缺少 `scraper-scripts/goofish/` 目录下的 5 个抓取模块及构建入口。

## What Changes
- 新增 `scraper-scripts/goofish/` 目录，包含 6 个文件：
  - `gfGetMain.ts` — 主图提取（从 `[class*="item-main-window-list-item"] img` 提取，URL 去缩略图后缀）
  - `gfGetDetail.ts` — 详情图提取（从 `[class*="feeds-image"]` 容器提取，支持 iframe 穿透）
  - `gfGetSku.ts` — SKU 图提取（闲鱼无 SKU 图，发送空数组防数据污染）
  - `gfGetVideo.ts` — 视频提取（XHR/Fetch 拦截 + MutationObserver + Performance API + DOM video/source 元素扫描）
  - `gfGetHylinkTitle.ts` — 标题/链接/商品ID提取（document.title + URL 参数 `id=`）
  - `index.ts` — 入口编排（视频模块 document_start，其余模块 DOMContentLoaded 后并行运行）
- 修改 `scripts/build-scraper.mjs` — 注册 `goofish` 平台入口

## Impact
- Affected specs: 无（新增平台，不影响已有功能）
- Affected code:
  - `scripts/build-scraper.mjs`（新增一行入口）
  - `scraper-scripts/goofish/`（全新目录）

## ADDED Requirements

### Requirement: 闲鱼主图提取 (gfGetMain)
系统 SHALL 从闲鱼商品页 DOM 中提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### Scenario: 正常提取主图
- **WHEN** 闲鱼商品页 DOM 中存在 `[class*="item-main-window-list-item"]` 容器且包含 img 元素
- **THEN** 提取所有 img 的 src，清洗 URL（补 https 前缀、去除缩略图后缀如 `_450x10000Q90.jpg_.webp`），去重后上报

#### Scenario: 主图延迟渲染
- **WHEN** 首次扫描未找到主图容器
- **THEN** 以 500ms 间隔轮询，最多 100 次，直到提取到图片或超时

### Requirement: 闲鱼详情图提取 (gfGetDetail)
系统 SHALL 从闲鱼商品页 DOM 中提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### Scenario: 从 feeds-image 容器提取
- **WHEN** 页面中存在 `[class*="feeds-image"]` 容器
- **THEN** 遍历容器内 img 标签（排除 `.icon-img` 装饰图标），清洗 URL 后去重上报

#### Scenario: iframe 穿透提取
- **WHEN** 详情图位于同源 iframe 中
- **THEN** 通过 iframe contentDocument 穿透查找 feeds-image 容器并提取图片

### Requirement: 闲鱼 SKU 图提取 (gfGetSku)
系统 SHALL 对闲鱼平台发送空的 SKU 图数组，防止其他平台残留数据污染。

#### Scenario: 闲鱼无 SKU 图
- **WHEN** 闲鱼商品页加载完成
- **THEN** 发送 `tauriBridge.send('SkuPic', [])` 清空旧数据

### Requirement: 闲鱼视频提取 (gfGetVideo)
系统 SHALL 从闲鱼商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videos)` 上报。

#### Scenario: 从 DOM video/source 元素提取
- **WHEN** 页面中存在 `<video>` 或 `<source>` 元素且 src 匹配视频格式
- **THEN** 提取视频 URL，分类为主图视频/详情视频后上报

#### Scenario: XHR/Fetch 拦截捕获
- **WHEN** 页面发起 XHR 或 Fetch 请求返回视频 URL 或包含视频 URL 的 JSON
- **THEN** 递归遍历 JSON 对象查找视频 URL 并上报

#### Scenario: Performance API 监控
- **WHEN** 浏览器 Performance API 记录到视频资源请求
- **THEN** 通过 rAF 循环检查 resource 条目捕获视频 URL

### Requirement: 闲鱼标题/链接/商品ID提取 (gfGetHylinkTitle)
系统 SHALL 从闲鱼商品页提取标题、链接和商品ID，通过 `tauriBridge.send` 分别上报。

#### Scenario: 正常提取
- **WHEN** 闲鱼商品页加载完成
- **THEN** 从 `document.title` 提取标题（排除默认标题如"闲鱼"、"goofish"等），从 URL 参数 `id=` 提取商品ID，生成访问时间后上报

#### Scenario: 标题延迟加载
- **WHEN** 初始时 document.title 为默认标题
- **THEN** 等待最多 15 秒（每 300ms 检查一次 + MutationObserver 监听 title 元素变化），直到标题变为有效商品标题

### Requirement: 闲鱼入口编排 (index.ts)
系统 SHALL 按照淘宝/京东的入口模式编排闲鱼 5 个模块的执行时序。

#### Scenario: 视频模块立即启动
- **WHEN** 脚本加载（document_start 阶段）
- **THEN** 立即启动 gfGetVideo 模块（拦截 XHR/Fetch 需要尽早执行）

#### Scenario: 其余模块 DOMContentLoaded 后并行运行
- **WHEN** DOM 加载完成
- **THEN** 先检测登录状态，然后并行启动 gfGetMain/gfGetSku/gfGetDetail/gfGetHylinkTitle，同时启动数据静默完成判定

### Requirement: 构建脚本注册
系统 SHALL 在 `scripts/build-scraper.mjs` 中注册 goofish 平台入口，使 Vite IIFE 构建产出 `goofish.bundle.js`。

#### Scenario: 构建产出
- **WHEN** 执行 `node scripts/build-scraper.mjs`
- **THEN** 产出 `dist-scripts/goofish.bundle.js`

## URL 清洗规则（闲鱼特有）
闲鱼图片 URL 常见缩略图后缀模式：
- `xxx.heic_450x10000Q90.jpg_.webp` → `xxx.heic`
- `xxx.jpg_220x293` → `xxx.jpg`
- 正则：`/(\.(?:jpg|png|jpeg|gif|bmp|heic|webp))[_?].*$/i` → `$1`
- 同时去除查询参数（`?` 后所有内容）
