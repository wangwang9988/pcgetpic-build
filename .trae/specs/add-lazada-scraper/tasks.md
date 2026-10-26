# Tasks

- [x] Task 1: 创建 lazadaUtils.ts — Lazada 共享工具模块
  - [x] SubTask 1.1: 实现 `cleanLazadaImageUrl()` 缩略图后缀清理函数（`_thumbnail_` / `_square_thumbnail_` / 双扩展名 `.jpg_400x400q90.jpg_.webp` / 尾部尺寸 `_\d+x\d+$` / 查询字符串移除）
  - [x] SubTask 1.2: 实现 `isValidLazadaImageUrl()` 图片 URL 验证函数（检查有效扩展名，排除 `-tps-`/`-64-64`/`-22-22` 小图标）
  - [x] SubTask 1.3: 实现 `tryParseNestedObject()` 大括号计数法 JSON 提取函数（定位 `"key"` → 找 `{` → 大括号计数 → 截取 → `JSON.parse()`）
  - [x] SubTask 1.4: 实现 `extractImageHash()` 图片哈希去重函数（提取 `/p/` 后的哈希值或 20+ 位十六进制字符串）
  - [x] SubTask 1.5: 实现 `cleanLazadaDetailImageUrl()` 详情图专用清洗函数（匹配第一个有效扩展名位置截断后续内容，再移除残余缩略图后缀）

- [x] Task 2: 创建 lazadaGetMain.ts — Lazada 主图提取模块
  - [x] SubTask 2.1: 实现 `extractFromScriptTags()` — skuGalleries 数据提取（`tryParseNestedObject()` 提取 → 遍历 SKU → 过滤 video 类型 → 取 src/poster）
  - [x] SubTask 2.2: 实现 `extractFromJsonLd()` — JSON-LD 数据提取（`application/ld+json` script 标签 → 递归搜索 `image` 字段）
  - [x] SubTask 2.3: 实现 `gatherAllImages()` — 合并两种来源 → `cleanLazadaImageUrl()` 清洗 → `isValidLazadaImageUrl()` 验证 → `extractImageHash()` 去重
  - [x] SubTask 2.4: 实现 `run()` 导出函数：初始化空值 → 重试（100 次/500ms）→ 额外抓取 3 次 → `tauriBridge.send('MainPic', ...)` 上报

- [x] Task 3: 创建 lazadaGetSku.ts — Lazada SKU 图提取模块
  - [x] SubTask 3.1: 实现 `extractFromSkuInfos()` — skuInfos 数据提取（`tryParseNestedObject()` → 遍历 SKU ID → 取 `image` 字段）
  - [x] SubTask 3.2: 实现 `extractFromProductOption()` — productOption 数据提取（`tryParseNestedObject()` → `skuBase.properties[].values[]` → 取 `image`/`hoverImage`）
  - [x] SubTask 3.3: 实现 `gatherAllSkuImages()` — 合并两种来源 → 清洗 → 验证 → 哈希去重
  - [x] SubTask 3.4: 实现 `run()` 导出函数：初始化空值 → 重试 → 额外抓取 → `tauriBridge.send('SkuPic', ...)` 上报

- [x] Task 4: 创建 lazadaGetDetail.ts — Lazada 详情图提取模块
  - [x] SubTask 4.1: 实现 `extractFromScriptTags()` — product.desc HTML 提取（`tryParseNestedObject()` 提取 `product` 对象 → 访问 `desc` 字段；失败则正则 `"desc"\s*:\s*"((?:[^"\\]|\\.)*)"` 提取 → 解码转义 → 正则提取 `<img src>`）
  - [x] SubTask 4.2: 实现 `extractFromDOM()` — DOM 容器提取（`.pdp-product-desc img` / `.pdp-product-detail img` / `.product-description img` 等 8 个选择器 → `data-src`/`data-original`/`data-lazySrc`/`src` 属性）
  - [x] SubTask 4.3: 实现 `gatherAllDetailImages()` — 合并两种来源 → `cleanLazadaDetailImageUrl()` 清洗 → 验证 → 哈希去重
  - [x] SubTask 4.4: 实现 `run()` 导出函数：初始化空值 → 重试 → 额外抓取 → `tauriBridge.send('DetailPic', ...)` 上报

- [x] Task 5: 创建 lazadaGetVideo.ts — Lazada 视频提取模块
  - [x] SubTask 5.1: 实现 `extractFromScriptTags()` — gbRawData 视频提取（正则 `"videoUrl"`/`"video_url"` + JSON 解析 `modules.productInfo.currentSkcImgInfo.videoUrl` 等路径）
  - [x] SubTask 5.2: 实现 `extractVideoFromDOM()` — DOM video/source 标签提取（排除 `blob:`/`data:` 协议）
  - [x] SubTask 5.3: 实现 `extractVideoUrlsFromHTML()` — HTML 正则全文搜索（`.mp4`/`.m3u8`/`.webm` 格式）
  - [x] SubTask 5.4: 实现 MutationObserver 动态监听（检测 video 元素变化，防抖 300ms）
  - [x] SubTask 5.5: 实现 `processAndStoreVideos()` — 合并所有来源 → 去重 → 转换为 `{url: '...'}` 对象数组 → `tauriBridge.send('VideoUrls', ...)` 上报
  - [x] SubTask 5.6: 实现 `run()` 导出函数：初始化空值 → 启动 MutationObserver → 首次提取 → 轮询 30 次（1s 间隔）

- [x] Task 6: 创建 lazadaGetHylinkTitle.ts — Lazada 标题/链接/商品ID 提取模块
  - [x] SubTask 6.1: 实现标题提取（`document.title` 优先 → `h1` → `meta[property="og:title"]` → `[class*="title"]`/`[class*="name"]` 选择器回退）
  - [x] SubTask 6.2: 实现商品 ID 提取（URL `goods_id=(\d+)` → URL `-p-(\d+).html` → 9+ 位纯数字 → script 标签 `"goods_id"\s*:\s*"?(\d+)"?`）
  - [x] SubTask 6.3: 实现商品链接清洗（仅保留 `origin + pathname`）
  - [x] SubTask 6.4: 实现 `run()` 导出函数：等待动态内容 → 提取 → `tauriBridge.send` 上报 `productTitle`/`productLink`/`productId`

- [x] Task 7: 创建 index.ts — Lazada 抓取脚本入口
  - [x] SubTask 7.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 7.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 7.3: 实现登录探针检测（`LAZADA_LOGIN_SELECTORS`：`.login-panel`、`.login-container`、`.login-form`、`[class*="login"]`、`[class*="signin"]`）
  - [x] SubTask 7.4: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 15s 超时保护）
  - [x] SubTask 7.5: 实现 `waitTaskCompletion()` 数据静默判定（复用 `waitForCompletion`）
  - [x] SubTask 7.6: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 8: 注册 lazada 到构建脚本
  - [x] SubTask 8.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `lazada` 入口

- [x] Task 9: 实现 Lazada 登录策略
  - [x] SubTask 9.1: 创建 `src-tauri/src/login/lazada.rs`，自定义实现 `LazadaLoginStrategy`（参考 `jd.rs` 模式，因为需要 `extract_product_id()` 提取商品 ID）
  - [x] SubTask 9.2: 实现登录页检测（6 国站点的 `login.lazada`/`lazada.*/login` 模式 → `LoginRequired`）
  - [x] SubTask 9.3: 实现 `extract_product_id()`（`-p-(\d+).html` 路径格式 + `goods_id=(\d+)` 查询参数格式）
  - [x] SubTask 9.4: 实现 `is_still_on_platform_non_product()`（`lazada.` 域名下但非商品详情页）
  - [x] SubTask 9.5: 实现 `login_cookie_names()`（`lzd_cid`、`lzd_sid`、`hng`）
  - [x] SubTask 9.6: 实现 `captcha_selectors()`（`[class*="captcha"]`、`[class*="verify"]`、`#nc_1_n1z`）
  - [x] SubTask 9.7: 在 `src-tauri/src/login/mod.rs` 中注册 `lazada::LazadaLoginStrategy`

- [x] Task 10: 构建验证
  - [x] SubTask 10.1: 运行 `node scripts/build-scraper.mjs` 确认 `lazada.bundle.js` 生成成功
  - [x] SubTask 10.2: 运行 `cargo check` 确认 Rust 编译通过

# Task Dependencies
- Task 1: 无依赖（共享工具模块，其他模块依赖它）
- Task 2 ~ 6: 依赖 Task 1（各模块导入 lazadaUtils），可并行开发
- Task 7: 依赖 Task 2 ~ 6（入口文件导入各模块）
- Task 8: 依赖 Task 7（构建脚本需入口文件存在）
- Task 9: 独立于 Task 1 ~ 8，可并行开发
- Task 10: 依赖 Task 8 和 Task 9（最终验证）
