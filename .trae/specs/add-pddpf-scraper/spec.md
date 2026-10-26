# 拼多多批发(pddpf)抓取脚本实现 Spec

## Why
拼多多批发平台(pinduoduo.com)的前端平台识别、URL 清洗、商品 ID 提取已在项目中注册，但缺少核心的抓取脚本(`scraper-scripts/pddpf/`)和构建入口注册，导致该平台实际无法执行图片/视频抓取。

## What Changes
- 新增 `scraper-scripts/pddpf/` 目录，包含 6 个 TypeScript 模块文件：index.ts、pddpfGetMain.ts、pddpfGetDetail.ts、pddpfGetSku.ts、pddpfGetVideo.ts、pddpfGetHylinkTitle.ts
- 在 `scripts/build-scraper.mjs` 中注册 pddpf 构建入口，生成 `pddpf.bundle.js`

## Impact
- Affected specs: 拼多多批发平台抓取能力
- Affected code: `scraper-scripts/pddpf/`(新增)、`scripts/build-scraper.mjs`(修改)

## ADDED Requirements

### Requirement: 拼多多批发抓取脚本

系统 SHALL 提供拼多多批发平台(pinduoduo.com)的完整抓取脚本，包含主图、详情图、SKU图、视频、标题/链接/商品ID 五个数据维度的提取能力。

#### Scenario: 主图提取成功
- **WHEN** 用户输入拼多多批发商品 URL（如 `https://pifa.pinduoduo.com/goods/detail/?gid=21112319255`）
- **THEN** 系统通过 5 策略容器选择器（data-testid / Car_ 类名 / goods-image-wrapper / 缩略图 / 移动端滑块）+ SSR `__cava_ssr_data__` 数据提取主图 URL，去除查询参数还原原图，去重后通过 tauriBridge.send('MainPic', urls) 上报

#### Scenario: 详情图提取成功
- **WHEN** 拼多多批发商品详情页加载完成
- **THEN** 系统通过 4 策略（img.goodsIntroImg / video[poster] / .detailContent .DCImg / [class*="goods-intro_introduction"]）提取详情图 URL，去除查询参数，去重后通过 tauriBridge.send('DetailPic', urls) 上报

#### Scenario: SKU图提取成功
- **WHEN** 拼多多批发商品页 SKU 区域渲染完成
- **THEN** 系统通过 3 选择器（img.sku-image-inner / .sku-list-row .sku-image img / .beast-mobile-drawer-content [style*="url("]）提取 SKU 图 URL，支持 background-image 提取，去除查询参数，去重后通过 tauriBridge.send('SkuPic', urls) 上报

#### Scenario: 视频提取成功
- **WHEN** 拼多多批发商品页包含视频内容
- **THEN** 系统通过 DOM video 元素 + iframe/Shadow DOM 穿透 + __NEXT_DATA__ + JSON-LD + XHR/fetch 拦截 + Performance API + MutationObserver 提取视频 URL，分类为主视频/详情视频，去重后通过 tauriBridge.send('VideoUrls', videos) 上报

#### Scenario: 标题/链接/商品ID提取成功
- **WHEN** 拼多多批发商品页标题区域渲染完成
- **THEN** 系统通过 3 级降级策略（goods-share data-clipboard-text 去价格标签 → goods-n-title → document.title）提取标题，从 URL gid 参数提取商品 ID，清洗 URL 只保留 gid 参数，通过 tauriBridge.send 上报 productTitle/productLink/productId

#### Scenario: 构建产物生成
- **WHEN** 运行 scraper 构建脚本
- **THEN** 生成 `dist-scripts/pddpf.bundle.js` IIFE 格式文件，可被 Rust 端 injector 注入 WebView

### Requirement: 适配 Tauri 架构约束

所有 pddpf 抓取脚本 SHALL 遵循项目 Tauri 架构约束：
- 使用 `tauriBridge.send()` 替代 `browser.runtime.sendMessage()`
- 使用共享工具函数 `simulateScroll()`、`waitForCompletion()`、`probeAndReportLogin()`
- 移除插件特有逻辑（SPA 导航检测、页面可见性、不活动超时、状态保存/恢复）
- 视频模块在 document_start 阶段启动（XHR/fetch 拦截需尽早执行）
- 其他模块在 DOMContentLoaded 后启动
- iframe 防护：非视频模块在 iframe 中不执行
