# Tasks

- [x] Task 1: 创建 amGetMain.ts — 亚马逊主图提取模块
  - [x] SubTask 1.1: 实现 `getOriginalUrl()` 高清原图还原函数（移除 `._[A-Z0-9,._]+_.` 尺寸后缀）
  - [x] SubTask 1.2: 实现 `isValidAmazonImageUrl()` 过滤函数（占位图/图标/视频图标/SVG/非 `/images/I/` 路径）
  - [x] SubTask 1.3: 实现 `extractImagesFromAmazonHtml()` JSON colorImages 解析（括号匹配法提取完整对象 + initial/颜色变体分支 + ImageBlockATF/imageGalleryData 备用方案）
  - [x] SubTask 1.4: 实现 `smartQuoteReplacement()` Amazon 数据专用引号/逗号/JS 表达式修复函数
  - [x] SubTask 1.5: 实现 `extractFromAltImages()` #altImages 容器 DOM 提取
  - [x] SubTask 1.6: 实现 `extractFromASpacingSmall()` .a-spacing-small 容器 DOM 提取
  - [x] SubTask 1.7: 实现 `run()` 导出函数：整合三方案（JSON → #altImages → .a-spacing-small），带重试和 `tauriBridge.send('MainPic', ...)` 上报

- [x] Task 2: 创建 amGetSku.ts — 亚马逊 SKU 图提取模块
  - [x] SubTask 2.1: 实现 `extractSkuImagesFromJson()` 从 colorImages 各颜色变体提取首张高清图
  - [x] SubTask 2.2: 实现亚马逊 SKU DOM 选择器列表（`#variation_color_name li img`、`#imgSwatch img` 等 10 个选择器）
  - [x] SubTask 2.3: 实现 `collectUrlsFromImageElement()` 从 `data-a-dynamic-image`/`data-a-hires`/`data-src`/`src` 多属性提取
  - [x] SubTask 2.4: 实现 `run()` 导出函数：JSON 主方案 → DOM 备用方案，带重试和 `tauriBridge.send('SkuPic', ...)` 上报

- [x] Task 3: 创建 amGetDetail.ts — 亚马逊详情图提取模块
  - [x] SubTask 3.1: 实现 A+ Content 容器选择器列表（`#aplus`、`.aplus-v2`、`#productDescription` 等 12 个选择器）
  - [x] SubTask 3.2: 实现 `getAmazonOriginalUrl()` A+ 图片高清还原（移除裁剪后缀 `.__...__.` + 尺寸后缀 `._..._.`）
  - [x] SubTask 3.3: 实现 `processFoundDetailGallery()` 多属性提取（img 标签 6 种属性 + noscript + background-image + data-a-dynamic-image）
  - [x] SubTask 3.4: 实现 `isValidDetailImageUrl()` 和 `cleanAndNormalizeDetailUrl()` URL 验证与清洗
  - [x] SubTask 3.5: 实现 `run()` 导出函数：容器查找（5 次重试）→ 多轮提取 → 去重清洗 → `tauriBridge.send('DetailPic', ...)` 上报

- [x] Task 4: 创建 amGetVideo.ts — 亚马逊视频提取模块
  - [x] SubTask 4.1: 实现视频 URL 去重机制（`normalizeVideoUrl` + `isVideoDuplicate`）
  - [x] SubTask 4.2: 实现亚马逊视频分类（`isAmazonVideoUrl`/`isLikelyMainVideo`/`isMainVideoUrl`），过滤广告和 Prime Video
  - [x] SubTask 4.3: 实现 XHR/Fetch 拦截 + JSON 响应体递归搜索
  - [x] SubTask 4.4: 实现 Performance API 监控 + MutationObserver 动态监听
  - [x] SubTask 4.5: 实现 JSON 嗅探器注入（扫描 `window` 全局变量）
  - [x] SubTask 4.6: 实现 `simulateInteraction()` 模拟用户交互触发视频加载
  - [x] SubTask 4.7: 实现 `run()` 导出函数：初始化 → 拦截注册 → DOM 检测 → 定时全量检测（10 次，每秒一次）

- [x] Task 5: 创建 amGetHylinkTitle.ts — 亚马逊标题/链接/ASIN 提取模块
  - [x] SubTask 5.1: 实现标题提取（`#productTitle` 优先 → `head title` 回退 → 移除 `Amazon.com:` / `Amazon.co.jp:` 等站点前缀）
  - [x] SubTask 5.2: 扩展 `shared/utils.ts` 的 `getProductId()` 函数，增加亚马逊 ASIN 匹配：`/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i`
  - [x] SubTask 5.3: 实现 `run()` 导出函数：等待动态内容 → 提取 → `tauriBridge.send` 上报 `productTitle`/`productLink`/`productId`

- [x] Task 6: 创建 index.ts — 亚马逊抓取脚本入口
  - [x] SubTask 6.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 6.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 6.3: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 超时保护）
  - [x] SubTask 6.4: 实现登录探针检测（`AMAZON_LOGIN_SELECTORS`：`#ap_signin1a_pagelet`、`.a-sign-in`、`#authportal-main-section`、`.signin-row`、`#signInSubmit`）
  - [x] SubTask 6.5: 实现验证码检测（`CAPTCHA_SELECTORS`：`#captchacharacters`、`.cvf-widget-form`、`#cvf-input-code`，节流上限 3 次）
  - [x] SubTask 6.6: 实现 `waitTaskCompletion()` 数据静默判定（复用 `waitForCompletion`）
  - [x] SubTask 6.7: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 7: 注册 amazon 到构建脚本
  - [x] SubTask 7.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `amazon` 入口

- [x] Task 8: 实现亚马逊登录策略
  - [x] SubTask 8.1: 创建 `src-tauri/src/login/amazon.rs`，自定义实现 `AmazonLoginStrategy`（参考 `taobao.rs` 模式，不使用 `DefaultLoginStrategy`，因为需要 `extract_product_id()` 提取 ASIN）
  - [x] SubTask 8.2: 实现登录页检测（`signin.amazon`、`ap/signin` → `LoginRequired`；`ap/` 非登录页 → `LoginIntermediate`；`captcha`、`cvf/verification` → `Captcha`）
  - [x] SubTask 8.3: 实现 `extract_product_id()`（ASIN 正则：`/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i`）
  - [x] SubTask 8.4: 实现 `is_still_on_platform_non_product()`（`amazon.` 域名下但非 `/dp/` 商品页）
  - [x] SubTask 8.5: 实现 `login_cookie_names()`（`session-id`、`ubid-main`、`x-main`）
  - [x] SubTask 8.6: 实现 `captcha_selectors()`（`#captchacharacters`、`.cvf-widget-form`、`#cvf-input-code`）
  - [x] SubTask 8.7: 在 `src-tauri/src/login/mod.rs` 中注册 `amazon::AmazonLoginStrategy`

- [x] Task 9: 构建验证
  - [x] SubTask 9.1: 运行 `node scripts/build-scraper.mjs` 确认 `amazon.bundle.js` 生成成功
  - [x] SubTask 9.2: 运行 `cargo check` 确认 Rust 编译通过

# Task Dependencies
- Task 1 ~ 5: 可并行开发（各模块独立）
- Task 6: 依赖 Task 1 ~ 5（入口文件导入各模块）
- Task 7: 依赖 Task 6（构建脚本需入口文件存在）
- Task 8: 独立于 Task 1 ~ 7，可并行开发
- Task 9: 依赖 Task 7 和 Task 8（最终验证）
