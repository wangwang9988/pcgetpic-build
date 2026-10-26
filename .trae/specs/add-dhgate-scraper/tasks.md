# Tasks

- [x] Task 1: 创建 dhgateGetMain.ts — 敦煌网主图提取模块
  - [x] SubTask 1.1: 实现 `decodeUnicodeUrl()` Unicode URL 解码函数
  - [x] SubTask 1.2: 实现 `cleanDhgateImageUrl()` 高清原图还原函数（替换 `/webp/m/\d+x\d+/` 为 `/webp/m/0x0/`，替换 `/\d+x\d+/` 为 `/0x0/`，补全相对协议，Unicode 解码）
  - [x] SubTask 1.3: 实现 `extractFromJsonLd()` 方案1：从 `script[type="application/ld+json"]` 提取 `@type=Product` 的 `image` 字段
  - [x] SubTask 1.4: 实现 `extractFromNextJs()` 方案2：从 `prodImg` 数据块和 `seoOriImgList` 提取 `/albu/` 路径图片
  - [x] SubTask 1.5: 实现 `extractFromDomImageList()` 方案3：从 `[spm-c="imagelist"]` 容器提取
  - [x] SubTask 1.6: 实现 `tryDomFallback()` DOM 备用方案（`.masterMap_smallMapList__JTkBX img` 等）
  - [x] SubTask 1.7: 实现 `gatherAllImages()` 三源汇总 + `deduplicateUrls` 去重
  - [x] SubTask 1.8: 实现 `run()` 导出函数：初始空上报 → 重试获取 → 额外探测 → 最终上报，使用共享 `sleep`/`deduplicateUrls`

- [x] Task 2: 创建 dhgateGetSku.ts — 敦煌网 SKU 图提取模块
  - [x] SubTask 2.1: 实现 `extractSkuImagesFromNextJs()` 方案1：从 `picUrl`/`pic0x0Url`、`attachImgVo.oriImgList`、`prodSku` 块、`attrValName` 上下文提取
  - [x] SubTask 2.2: 实现 `extractSkuImagesFromSkuDom()` 方案2：从 `div[spm-c="sku"]` 容器提取
  - [x] SubTask 2.3: 实现 `tryDomFallback()` 方案3：7 个 SKU 通用选择器备用提取
  - [x] SubTask 2.4: 实现 `scanAllSources()` 三方案并行提取 + 去重
  - [x] SubTask 2.5: 实现 MutationObserver 精确监听（`div[spm-c="sku"]` 等容器 + attributes 变化 src/data-src）
  - [x] SubTask 2.6: 实现轮询兜底（MAX_POLLS × POLL_INTERVAL）
  - [x] SubTask 2.7: 实现 `run()` 导出函数：初始空上报 → 首轮扫描 → Observer + 轮询 → 返回清理函数（同时清理 Observer 和定时器）

- [x] Task 3: 创建 dhgateGetDetail.ts — 敦煌网详情图提取模块
  - [x] SubTask 3.1: 实现 `getDhgateOriginalUrl()` 高清还原函数（替换 `/webp/m/\d+x\d+/` 为 `/webp/m/0x0/`，移除 `_\d+x\d+\.` 缩放后缀）
  - [x] SubTask 3.2: 实现 `cleanAndNormalizeDetailUrl()` URL 清洗函数（优先使用共享 `cleanImageUrl()` + 敦煌网特有高清还原）
  - [x] SubTask 3.3: 实现 `isValidDetailImageUrl()` URL 验证函数（过滤 data URL，检查图片扩展名）
  - [x] SubTask 3.4: 实现 URL 编码图片提取：4 个正则模式匹配 + `decodeURIComponent()` 解码
  - [x] SubTask 3.5: 实现 DOM 容器提取（`.product-details`、`#descWrap`）和 `descriptionFirstImgUrl` 备用
  - [x] SubTask 3.6: 实现 `run()` 导出函数：初始空上报 → 重试等待容器 → 多轮提取 → 去重清洗 → 最终上报，使用共享 `sleep`

- [x] Task 4: 创建 dhgateGetVideo.ts — 敦煌网视频提取模块
  - [x] SubTask 4.1: 实现视频 URL 去重机制（`normalizeVideoUrl` + `isVideoDuplicate` 双重去重）
  - [x] SubTask 4.2: 实现视频分类（`isLikelyMainVideo`/`isMainVideoUrl`），过滤广告，识别敦煌网特有路径（`cloudv-transfer`、`product-videos`）
  - [x] SubTask 4.3: 实现 XHR/Fetch 拦截 + JSON 响应体递归搜索
  - [x] SubTask 4.4: 实现 Performance API 增量监控（游标增量检测 + `requestAnimationFrame` 持续轮询）
  - [x] SubTask 4.5: 实现 MutationObserver 动态监听（`<video>` + `<script>` 新增）
  - [x] SubTask 4.6: 实现 JSON 嗅探器注入（扫描 `window` 全局变量：`__INITIAL_STATE__`、`__NEXT_DATA__` 等）
  - [x] SubTask 4.7: 实现 `simulateInteraction()` 模拟用户交互触发视频加载
  - [x] SubTask 4.8: 实现视频增量上报（"先读后写"策略：`tauriBridge.get` → 去重 → `tauriBridge.send`），VideoItem 包含 `timestamp`/`pageUrl` 字段
  - [x] SubTask 4.9: 实现 `run()` 导出函数：立即启动层（XHR/Fetch/PerformanceAPI）→ DOMContentLoaded 后启动层（Observer + 梯度扫描）

- [x] Task 5: 创建 dhgateGetHylinkTitle.ts — 敦煌网标题/链接/商品ID/访问时间 提取模块
  - [x] SubTask 5.1: 实现标题提取（`#productTitle` 优先 → `head title` 回退 → 移除 ` - DHgate.com` / ` | DHgate` 后缀）
  - [x] SubTask 5.2: 实现商品 ID 提取（URL 路径 `/product/xxx/(\d+).html` → URL 参数 `resource_id`/`itemCode`/`productId` → DOM `input#itemCode`）
  - [x] SubTask 5.3: 实现 `cleanDhgateProductUrl()` URL 清洗（仅保留 `origin + pathname`）
  - [x] SubTask 5.4: 实现 `generateVisitTime()` 访问时间生成（格式 `YYYY-MM-DD HH:mm`）
  - [x] SubTask 5.5: 实现 `run()` 导出函数：初始空上报 → 等待动态内容 → 提取 → 四字段上报（`productTitle`/`productLink`/`productId`/`visitTime`），使用共享 `sleep`

- [x] Task 6: 创建 index.ts — 敦煌网抓取脚本入口
  - [x] SubTask 6.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 6.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 6.3: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 15s 超时保护）
  - [x] SubTask 6.4: 实现登录探针检测（`DHGATE_LOGIN_SELECTORS`，暂定空数组）
  - [x] SubTask 6.5: 实现验证码检测（`CAPTCHA_SELECTORS`，暂定空数组，节流上限 3 次）
  - [x] SubTask 6.6: 实现 `waitTaskCompletion()` 数据静默判定（复用 `waitForCompletion`）
  - [x] SubTask 6.7: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 7: 注册 dhgate 到构建脚本
  - [x] SubTask 7.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `dhgate` 入口

- [x] Task 8: 注册敦煌网登录策略
  - [x] SubTask 8.1: 在 `src-tauri/src/login/mod.rs` 中使用 `DefaultLoginStrategy` 注册 dhgate 平台（`login.dhgate.com`）

- [x] Task 9: 构建验证
  - [x] SubTask 9.1: 运行 `node scripts/build-scraper.mjs` 确认 `dhgate.bundle.js` 生成成功（26.92 kB）
  - [x] SubTask 9.2: 运行 `cargo check` 确认 Rust 编译通过

# Task Dependencies
- Task 1 ~ 5: 可并行开发（各模块独立）
- Task 6: 依赖 Task 1 ~ 5（入口文件导入各模块）
- Task 7: 依赖 Task 6（构建脚本需入口文件存在）
- Task 8: 独立于 Task 1 ~ 7，可并行开发
- Task 9: 依赖 Task 7 和 Task 8（最终验证）
