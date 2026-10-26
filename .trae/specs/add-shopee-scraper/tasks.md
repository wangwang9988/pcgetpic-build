# Tasks

- [x] Task 1: 创建 Shopee 共享工具函数（URL 清洗/验证/哈希提取）
  - [x] SubTask 1.1: 在 `scraper-scripts/shopee/` 下创建 `shopeeUtils.ts`，实现 `extractImageHash`、`cleanShopeeImageUrl`、`isValidShopeeImageUrl` 三个核心函数
  - 验收标准：函数逻辑与参考插件 `shopeeGetMain.js` 中的 `extractImageHash`/`cleanImageUrl`/`isValidProductImageUrl` 一致，支持 32 位十六进制和带连字符哈希格式，能正确剥离 `@resize_w82_nl.webp` 等缩略图后缀

- [x] Task 2: 创建 shopeeGetMain.ts（主图提取模块）
  - [x] SubTask 2.1: 实现 DOM 容器扫描逻辑（`._OguPS` / `.airUhU` / `.UBG7wZ`），从 `picture > source[srcset]`、`picture > img[src]`、`img[src]` 提取图片 URL
  - [x] SubTask 2.2: 使用 `shopeeUtils` 清洗 URL 并去重，通过 `tauriBridge.send('MainPic', urls)` 上报
  - [x] SubTask 2.3: 实现 `MAX_RETRIES + RETRY_INTERVAL` 轮询等待异步渲染
  - 验收标准：导出 `run()` 函数，与 `tbGetMain.ts` 模式一致（轮询 + 额外抓取），使用 Shopee 特有的 URL 清洗逻辑

- [x] Task 3: 创建 shopeeGetSku.ts（SKU 图提取模块）
  - [x] SubTask 3.1: 实现 DOM 容器扫描逻辑（`.W5LiQM` / `.KIoPj6` / `.j7HL5Q`）
  - [x] SubTask 3.2: 使用 `shopeeUtils` 清洗 URL 并去重，通过 `tauriBridge.send('SkuPic', urls)` 上报
  - [x] SubTask 3.3: 实现 MutationObserver 兜底 + 轮询等待
  - 验收标准：导出 `run()` 函数，与 `tbGetSku.ts` 模式一致（首次扫描 + MutationObserver + 轮询兜底）

- [x] Task 4: 创建 shopeeGetDetail.ts（详情图提取模块）
  - [x] SubTask 4.1: 实现 DOM 容器扫描逻辑（`.product-detail` / `.page-product__detail` / `.QN2lPu` / `.I_DV_3`）
  - [x] SubTask 4.2: 使用 `shopeeUtils` 清洗 URL 并去重，通过 `tauriBridge.send('DetailPic', urls)` 上报
  - [x] SubTask 4.3: 实现多轮提取 + 轮询等待
  - 验收标准：导出 `run()` 函数，与 `tbGetDetail.ts` 模式一致

- [x] Task 5: 创建 shopeeGetVideo.ts（视频提取模块）
  - [x] SubTask 5.1: 实现 DOM video 标签提取（`video[src]`、`video > source[src]`）
  - [x] SubTask 5.2: 实现 Script 标签正则提取（`susercontent.com.*\.mp4`）
  - [x] SubTask 5.3: 实现 MutationObserver 动态监听 video 元素变化
  - [x] SubTask 5.4: 去重后以 `[{url: '...'}]` 格式通过 `tauriBridge.send('VideoUrls', videoObjects)` 上报
  - 验收标准：导出 `run()` 函数，与 `tbGetVideo.ts` 模式一致（MutationObserver + 轮询），视频域名验证覆盖 `susercontent.com` / `shopeemobile.com`

- [x] Task 6: 创建 shopeeGetHylinkTitle.ts（标题/链接/商品ID 提取模块）
  - [x] SubTask 6.1: 实现标题提取（`document.title` 优先 → `h1` → `meta[og:title]` → 备用选择器），清洗 `| Shopee` 后缀
  - [x] SubTask 6.2: 实现商品ID提取（URL 参数 `itemid` → 路径模式 `-i.SHOPID.ITEMID` → `/product/SHOPID/ITEMID` → 9位以上数字兜底）
  - [x] SubTask 6.3: 实现链接清洗（`origin + pathname`，去除查询参数）
  - [x] SubTask 6.4: 通过 `tauriBridge.send('productTitle'/'productLink'/'productId', ...)` 上报
  - 验收标准：导出 `run()` 函数，与 `tbGetHylinkTitle.ts` 模式一致

- [x] Task 7: 创建 index.ts（入口编排）
  - [x] SubTask 7.1: 实现与 `taobao/index.ts` 一致的入口编排模式：视频模块立即启动 → DOMContentLoaded 后登录检测 → 模拟滚动 → 并行启动 Main/Sku/Detail/HylinkTitle → `waitForCompletion` 数据静默判定
  - [x] SubTask 7.2: 添加 Shopee 登录选择器（如 `.shopee-login` 等常见登录元素）和验证码监控
  - 验收标准：脚本被注入后能按正确时序启动各模块，完成后调用 `tauriBridge.completeTask()`

- [x] Task 8: 注册 Shopee 到构建脚本
  - [x] SubTask 8.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `shopee: resolve(projectRoot, 'scraper-scripts/shopee/index.ts')`
  - 验收标准：执行构建脚本后产出 `dist-scripts/shopee.bundle.js`

# Task Dependencies
- Task 1 → Task 2, Task 3, Task 4, Task 5, Task 6（共享工具函数被所有模块依赖）
- Task 2, Task 3, Task 4, Task 5, Task 6 → Task 7（入口编排依赖各模块的 `run()` 导出）
- Task 7 → Task 8（构建注册依赖入口文件存在）
- Task 2, Task 3, Task 4, Task 5, Task 6 可并行开发
