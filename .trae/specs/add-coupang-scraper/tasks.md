# Tasks

- [x] Task 1: 创建 Coupang 共享工具函数模块 `scraper-scripts/coupang/cpUtils.ts`
  - [x] SubTask 1.1: 实现 `getOriginalCoupangUrl(url)` — 缩略图域名替换（thumbnail→image）+ 路径段删除（/thumbnails/remote/{尺寸}/）+ 查询参数移除
  - [x] SubTask 1.2: 实现 `isValidCoupangImageUrl(url)` — 图片扩展名检查 + 产品路径验证（/vendor_inventory/、/retail/、/product/、/productDetail/）+ 无效模式过滤（/icons/、/logos/、/badges/ 等）
  - [x] SubTask 1.3: 实现 `extractJsonObject(str, startKey)` — 括号匹配法提取 JSON 对象（处理嵌套大括号、字符串内转义）
  - [x] SubTask 1.4: 实现 `unescapeNextJsData(rawData)` — Next.js 脚本反转义（\\" → "、\\\\ → \\、\\u003c → <、\\u003e → >、\\u0022 → "）

- [x] Task 2: 创建 Coupang 主图提取模块 `scraper-scripts/coupang/cpGetMain.ts`
  - [x] SubTask 2.1: 实现 JSON-LD `@type=Product` 的 `image` 字段提取
  - [x] SubTask 2.2: 实现 Next.js `attributeVendorItemMap` 中 `images[].origin` 提取（使用 cpUtils 的 unescapeNextJsData + extractJsonObject）
  - [x] SubTask 2.3: 实现 Next.js `options.optionRows` 中 `attributes[].image.origin` 提取
  - [x] SubTask 2.4: 实现重试轮询（MAX_RETRIES=100, RETRY_INTERVAL=500，使用共享 sleep）和额外抓取（3 轮）
  - [x] SubTask 2.5: 通过 `tauriBridge.send('MainPic', images)` 上报数据（使用 deduplicateUrls 去重）

- [x] Task 3: 创建 Coupang SKU 图提取模块 `scraper-scripts/coupang/cpGetSku.ts`
  - [x] SubTask 3.1: 实现 Next.js `options.optionRows` 中 `colorAttribute===true` 的 `attributes[].image.origin` 提取
  - [x] SubTask 3.2: 实现 DOM `.fashion-option` 容器图片提取
  - [x] SubTask 3.3: 实现 MutationObserver 精确监听 `[data-widget="webAspects"]` 和 `.pdp_q6`（监听 childList + attributes: src/data-src），防抖 500ms
  - [x] SubTask 3.4: 实现轮询兜底（MAX_POLLS=10, POLL_INTERVAL=3000，使用共享 sleep）
  - [x] SubTask 3.5: 返回清理函数 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }`
  - [x] SubTask 3.6: 通过 `tauriBridge.send('SkuPic', images)` 上报数据

- [x] Task 4: 创建 Coupang 详情图提取模块 `scraper-scripts/coupang/cpGetDetail.ts`
  - [x] SubTask 4.1: 实现 Next.js 脚本标签中 `<img src>` 正则匹配提取（主正则 + 备用正则，使用 cpUtils 的 unescapeNextJsData）
  - [x] SubTask 4.2: 实现 DOM `.product-detail-content-inside` 和 `.product-detail-content` 容器提取
  - [x] SubTask 4.3: 实现容器查找重试（MAX_CONTAINER_RETRIES=5, RETRY_DELAY_MS=1000，使用共享 sleep）
  - [x] SubTask 4.4: 实现 URL 清洗（协议补全、getOriginalCoupangUrl 缩略图还原、去重）
  - [x] SubTask 4.5: 通过 `tauriBridge.send('DetailPic', images)` 上报数据

- [x] Task 5: 创建 Coupang 视频提取模块 `scraper-scripts/coupang/cpGetVideo.ts`
  - [x] SubTask 5.1: 实现 XHR/Fetch 请求拦截和视频 URL 检测
  - [x] SubTask 5.2: 实现 `<video>` 标签和 `<source>` 子元素检测
  - [x] SubTask 5.3: 实现页面 JSON 嗅探（script 标签正则 + JSON-LD 递归遍历，深度限制 15 层 + 循环引用检测）
  - [x] SubTask 5.4: 实现 data-* 属性和 meta 标签提取
  - [x] SubTask 5.5: 实现 Performance API 增量监控（游标增量检测 + requestAnimationFrame 循环）
  - [x] SubTask 5.6: 实现视频双重去重（URL 集合 + 归一化 ID）和分类过滤
  - [x] SubTask 5.7: 实现视频增量上报（先读后写策略：tauriBridge.get → 去重追加 → tauriBridge.send）

- [x] Task 6: 创建 Coupang 标题/链接/商品ID 提取模块 `scraper-scripts/coupang/cpGetHylinkTitle.ts`
  - [x] SubTask 6.1: 实现 `#productTitle` DOM 元素标题提取，回退到 `head title` 并清理站点后缀（쿠팡/Coupang）
  - [x] SubTask 6.2: 实现 URL 正则 `/vp/products/(\d+)` 商品 ID 提取
  - [x] SubTask 6.3: 通过 `tauriBridge.send` 上报全部四个字段：productTitle、productLink、productId、visitTime（YYYY-MM-DD HH:mm）

- [x] Task 7: 创建 Coupang 抓取脚本入口 `scraper-scripts/coupang/index.ts`
  - [x] SubTask 7.1: 实现 iframe 防护（`window !== window.top` 检查）
  - [x] SubTask 7.2: 立即启动 `cpGetVideo` 模块（document_start 阶段）
  - [x] SubTask 7.3: DOMContentLoaded 后执行登录探针检测（使用通用登录选择器）
  - [x] SubTask 7.4: 验证码检测（CAPTCHA_SELECTORS 留空数组，setupCaptchaWatcher 内部守卫自动跳过）
  - [x] SubTask 7.5: 并行启动 cpGetMain/cpGetSku/cpGetDetail/cpGetHylinkTitle（带 15s 超时保护 + 清理函数收集）
  - [x] SubTask 7.6: 使用 `waitForCompletion()` 数据静默判定（7s idle + 15s maxWait + 3s minStay）
  - [x] SubTask 7.7: 实现异常处理（有数据 → completeTask，无数据 → failTask）

- [x] Task 8: 注册 Coupang 平台到构建脚本 `scripts/build-scraper.mjs`
  - [x] SubTask 8.1: 在 `PLATFORMS` 对象中添加 `coupang: resolve(projectRoot, 'scraper-scripts/coupang/index.ts')`

- [x] Task 9: 构建验证
  - [x] SubTask 9.1: 运行构建脚本确认 `dist-scripts/coupang.bundle.js` 生成成功
  - [x] SubTask 9.2: 检查 TypeScript 类型无报错

# Task Dependencies
- Task 1 (cpUtils) → Task 2, 3, 4 (cpGetMain/cpGetSku/cpGetDetail 依赖共享工具函数)
- Task 5 (cpGetVideo) 无依赖，可并行开发
- Task 6 (cpGetHylinkTitle) 无依赖，可并行开发
- Task 7 (index) 依赖 Task 2, 3, 4, 5, 6 (入口导入所有子模块)
- Task 8 (build-scraper) 依赖 Task 7 (需要入口文件存在)
- Task 9 (构建验证) 依赖 Task 8 (需要构建配置完成)
