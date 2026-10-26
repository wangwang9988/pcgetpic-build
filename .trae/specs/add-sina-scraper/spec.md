# 新浪微博抓取脚本 Spec

## Why
项目已注册新浪/微博平台（platform_resolver.rs、前端 platforms/index.ts、registry.ts 等均已就绪），但缺少核心的 `scraper-scripts/sina/` 抓取脚本实现。需要参考 `GetPic/entrypoints/sina.content.js` 及其子模块，将浏览器插件的抓取逻辑适配为 Tauri WebView 注入的 IIFE 脚本。

## What Changes
- 新增 `scraper-scripts/sina/` 目录，包含 6 个文件：index.ts、sinaGetMain.ts、sinaGetDetail.ts、sinaGetSku.ts、sinaGetVideo.ts、sinaGetHylinkTitle.ts
- 修改 `scripts/build-scraper.mjs`，注册 sina 平台入口
- 可选：在 `src-tauri/src/login/mod.rs` 中注册 sina 的 DefaultLoginStrategy（微博登录检测）

## Impact
- Affected specs: 新浪/微博平台抓取能力
- Affected code:
  - `scraper-scripts/sina/` (新增)
  - `scripts/build-scraper.mjs` (修改)
  - `src-tauri/src/login/mod.rs` (可选修改)

## ADDED Requirements

### Requirement: 新浪微博抓取脚本实现
系统 SHALL 提供新浪微博平台的完整抓取脚本，包含 5 个业务模块和 1 个入口文件。

#### Scenario: 微博页面图片抓取
- **WHEN** 用户输入微博 URL（weibo.com / sina.com.cn 等）并启动抓取
- **THEN** 系统应能提取该页面中的所有图片（主图/详情图/SKU图）、视频、标题和链接

#### Scenario: 微博缩略图还原
- **WHEN** 抓取到 sinaimg.cn 域名的缩略图 URL
- **THEN** 系统应将缩略图尺寸标识（orj360/mw690/thumb150/bmiddle/square/thumbnail/small）替换为 large，还原为原图大图

#### Scenario: 微博视频抓取
- **WHEN** 微博页面包含视频内容
- **THEN** 系统应通过 XHR/Fetch 拦截、MutationObserver、Performance API 等多渠道检测并提取视频 URL

#### Scenario: 微博标题与链接提取
- **WHEN** 抓取微博页面
- **THEN** 系统应提取页面标题（去除"- 微博"后缀）、商品ID（从URL参数id或路径/u/数字提取）、当前URL

### Requirement: 模块架构对齐
所有模块 SHALL 遵循项目既有的 scraper-scripts 架构模式：
- 使用 `tauriBridge.send()` 替代 `browser.runtime.sendMessage`
- 使用 `export function run()` 导出主函数
- 移除浏览器插件特有的页面可见性/焦点/SPA导航检测逻辑（由 Tauri 宿主接管）
- 移除 `SkuPicAll`/`DetailPicAll`/`VideoUrlsAll` 等历史累积逻辑（Tauri 端仅发送当前数据）
- 移除 `defineContentScript` 包装

### Requirement: 构建注册
`scripts/build-scraper.mjs` SHALL 注册 sina 平台入口，使 `npm run build:scraper` 能生成 `dist-scripts/sina.bundle.js`。

### Requirement: 登录策略（可选）
如微博需要登录检测，在 `src-tauri/src/login/mod.rs` 中注册 DefaultLoginStrategy，匹配 `login.sina.com.cn`、`passport.weibo.com` 等登录域名。

## MODIFIED Requirements
无

## REMOVED Requirements
无
