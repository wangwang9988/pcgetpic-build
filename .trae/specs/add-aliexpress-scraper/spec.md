# 速卖通(AliExpress)抓取脚本 Spec

## Why
项目已实现淘宝/京东/拼多多/唯品会/1688 等平台的抓取脚本，但速卖通（AliExpress）作为全球最大的跨境电商平台之一，尚未实现其 `scraper-scripts/aliexpress/` 目录下的抓取脚本。Rust 侧 `Platform::Aliexpress` 枚举、前端平台识别、URL 清洗等基础设施已就绪，仅需补全核心抓取脚本层。

## What Changes
- 新增 `scraper-scripts/aliexpress/` 目录，包含 6 个模块文件：
  - `index.ts` — 入口编排（登录检测、验证码监控、模块并行调度、完成判定）
  - `aeGetMain.ts` — 主图提取（4 种提取方式：DCData script / DOM 容器 / __AER_DATA__ JSON / bigpic_floor 容器）
  - `aeGetDetail.ts` — 详情图提取（Shadow DOM 穿透、iframe 同源提取、路径去重）
  - `aeGetSku.ts` — SKU 图提取（sku--wrap 容器 + data-spm="sku_floor" 容器双通道）
  - `aeGetVideo.ts` — 视频提取（runParams JS 对象 / DOM video 标签 / __AER_DATA__ JSON 三通道）
  - `aeGetHylinkTitle.ts` — 标题/链接/商品ID 提取（script 标签 + DOM 多渠道）
- 更新 `scripts/build-scraper.mjs`，注册 `aliexpress` 平台入口
- 新增 `src-tauri/src/login/default.rs` 中注册 AliExpress 登录策略（使用 DefaultLoginStrategy）

## Impact
- Affected specs: 无破坏性变更，纯新增功能
- Affected code:
  - `scraper-scripts/aliexpress/` — 全新目录
  - `scripts/build-scraper.mjs` — 新增一行平台注册
  - `src-tauri/src/login/mod.rs` — 新增 AliExpress 登录策略注册

## ADDED Requirements

### Requirement: AliExpress 主图提取 (aeGetMain)
系统 SHALL 从速卖通商品页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### 提取方式
1. **DCData script 标签**：从 `_d_c_.DCData.imagePathList` 正则提取
2. **DOM 容器**：从 `[class*="main-image--wrap--"]` 容器提取 img src
3. **__AER_DATA__ JSON**：从 `script#__AER_DATA__[type="application/json"]` 递归查找 gallery 数组
4. **bigpic_floor 容器**：从 `[data-spm="bigpic_floor"]` 及相关类名容器提取 source/img

#### URL 清洗规则
- 协议相对 URL（`//`）→ 补全为 `https:`
- aliexpress.com 格式：`xxx.jpg_640x640.jpg_.webp` → 截断到第一个有效扩展名 `xxx.jpg`
- aliexpress.ru 格式：`xxx.jpg_960x960.jpg`（无 `_.` 后缀）→ 保持原样
- 通用格式：移除查询参数、hash，截断到第一个有效扩展名

#### 排除规则
- 路径包含 `/flags/`、`/avatar/`、`/review/`、`/icon`、`/logo`、`/sprite`、`/placeholder`、`/loading`、`/default`、`/s.gif`、`48x48.png`、`sale_tag`

#### Scenario: 成功提取主图
- **WHEN** 速卖通商品页加载完成
- **THEN** 通过 4 种方式合并提取主图 URL，去重后通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: 页面未完全渲染
- **WHEN** 首次提取结果为空
- **THEN** 以 500ms 间隔重试，最多 30 次，直到获取到图片或超时

### Requirement: AliExpress 详情图提取 (aeGetDetail)
系统 SHALL 从速卖通商品页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### 提取方式
1. **容器扫描**：从 `#product-description`、`#content_anchor`、`[class*="description--wrap"]` 等选择器定位容器
2. **Shadow DOM 穿透**：递归遍历元素的 shadowRoot，提取内部 img
3. **iframe 同源提取**：访问同源 iframe 的 contentDocument，在 iframe 内查找详情容器
4. **路径去重**：基于 `/kf/` 路径段去重（同一图片可能通过 alicdn.com 和 aliexpress-media.com 两个域名访问）

#### Scenario: 成功提取详情图
- **WHEN** 详情区域渲染完成（含 Shadow DOM 和 iframe）
- **THEN** 穿透 Shadow DOM 和 iframe 提取图片，路径去重后上报

### Requirement: AliExpress SKU 图提取 (aeGetSku)
系统 SHALL 从速卖通商品页提取 SKU 图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### 提取方式
1. **sku--wrap 容器**：从 `[class*="sku--wrap--"]` 提取 img 的 src/data-src
2. **sku_floor 容器**：从 `[data-spm="sku_floor"]` 提取 source[srcset] 和 img[src]

#### Scenario: 成功提取 SKU 图
- **WHEN** SKU 区域渲染完成
- **THEN** 双通道合并提取，去重后上报

### Requirement: AliExpress 视频提取 (aeGetVideo)
系统 SHALL 从速卖通商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videos)` 上报。

#### 提取方式
1. **JS 对象**：从 `window.runParams.data` 和 `window.__INITIAL_STATE__` 提取 videoUrl
2. **DOM video 标签**：从 `<video>` 和 `<source>` 元素提取 src
3. **__AER_DATA__ JSON**：递归查找 gallery 数组中的 videoUrl

#### 视频格式
- 上报格式：`{ url: string }[]` 对象数组
- URL 清洗：协议相对 URL 补全、相对路径补全域名

#### Scenario: 成功提取视频
- **WHEN** 视频元素或数据加载完成
- **THEN** 三通道合并提取，去重后以对象数组格式上报

### Requirement: AliExpress 标题/链接/商品ID 提取 (aeGetHylinkTitle)
系统 SHALL 从速卖通商品页提取商品元数据，通过 `tauriBridge.send()` 上报。

#### 提取方式
1. **script 标签**：从 runParams/DCData 中正则提取 subject（标题）和 productId
2. **DOM**：从 h1、title、meta[og:title]、`[class*="title--wrap--"]` 提取标题

#### 商品 ID 提取规则
- URL 格式 `/item/{id}.html` 或 `/i/{id}.html`
- URL 参数 `productId` / `product_id`
- 10 位以上纯数字匹配

#### 上报字段
- `productTitle` — 清洗后的标题（去除 AliExpress 后缀、合并空格）
- `productLink` — 清洗后的商品 URL（仅保留 origin + pathname）
- `productId` — 商品 ID

#### Scenario: 成功提取元数据
- **WHEN** 页面标题和 ID 信息可用
- **THEN** 多渠道合并提取，清洗后分别上报三个字段

### Requirement: AliExpress 入口编排 (index.ts)
系统 SHALL 提供统一的入口脚本，编排各模块的执行流程。

#### 编排逻辑
1. iframe 防护：`if (window !== window.top) return`
2. 登录检测：使用 `probeAndReportLogin()` 检测登录状态
3. 模拟滚动：调用 `simulateScroll()` 触发懒加载
4. 验证码监控：MutationObserver 监控验证码 DOM
5. 模块并行启动：Main/Sku/Detail/HylinkTitle 四模块后台并行
6. 视频模块：立即启动（document_start 阶段）
7. 完成判定：`waitForCompletion()` 数据静默超时 + 最大等待超时

#### 登录选择器
- `.login-form`、`.login-box`、`.qrcode-login`、`.passport-login`

#### Scenario: 正常抓取流程
- **WHEN** 页面加载且无需登录
- **THEN** 并行启动各模块，等待数据静默判定完成后调用 `tauriBridge.completeTask()`

#### Scenario: 需要登录
- **WHEN** 检测到登录元素
- **THEN** 上报 `LoginRequired`，跳过抓取模块

### Requirement: 构建脚本注册
系统 SHALL 在 `scripts/build-scraper.mjs` 中注册 `aliexpress` 平台入口。

#### Scenario: 构建产物
- **WHEN** 执行 `node scripts/build-scraper.mjs`
- **THEN** 生成 `dist-scripts/aliexpress.bundle.js`

### Requirement: AliExpress 登录策略注册
系统 SHALL 在 Rust 侧 `LoginStrategyRegistry` 中注册 AliExpress 的登录策略。

#### 配置
- 使用 `DefaultLoginStrategy`
- 登录 URL 模式：`login.aliexpress.com`
- 无验证码 URL 模式

## MODIFIED Requirements

### Requirement: 构建脚本平台列表
`scripts/build-scraper.mjs` 的 PLATFORMS 对象 SHALL 新增 `aliexpress` 条目，入口指向 `scraper-scripts/aliexpress/index.ts`。

## REMOVED Requirements
无
