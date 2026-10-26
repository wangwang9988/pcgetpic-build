# Tasks

- [x] Task 1: 创建 `scraper-scripts/yupoo/ypGetMain.ts` — 主图提取模块
  - [x] SubTask 1.1: 定义 Yupoo 图片容器选择器常量（参考 YupooGetMain.js 的 YUPOO_IMAGE_SELECTORS）
  - [x] SubTask 1.2: 实现 `extractBigImageUrl` 函数（优先级：data-origin-src > data-src > src）
  - [x] SubTask 1.3: 实现 `extractMainImagesFromDOM` 函数（多容器选择器独立查询 + 合并）
  - [x] SubTask 1.4: 实现 URL 清洗函数（协议相对 URL → https://、去除查询参数、验证 Yupoo 域名）
  - [x] SubTask 1.5: 实现 `run` 导出函数（轮询等待 + tauriBridge.send 上报）

- [x] Task 2: 创建 `scraper-scripts/yupoo/ypGetDetail.ts` — 详情图占位模块
  - [x] SubTask 2.1: 实现 `run` 导出函数，发送 `tauriBridge.send('DetailPic', [])`

- [x] Task 3: 创建 `scraper-scripts/yupoo/ypGetSku.ts` — SKU 图占位模块
  - [x] SubTask 3.1: 实现 `run` 导出函数，发送 `tauriBridge.send('SkuPic', [])`

- [x] Task 4: 创建 `scraper-scripts/yupoo/ypGetVideo.ts` — 视频提取模块
  - [x] SubTask 4.1: 实现视频 URL 去重和规范化逻辑（参考 tbGetVideo.ts）
  - [x] SubTask 4.2: 实现 XHR/Fetch 拦截、Performance API 监控、MutationObserver 动态监听
  - [x] SubTask 4.3: 实现 DOM `<video>` 标签扫描和 JSON-LD 结构化数据提取
  - [x] SubTask 4.4: 实现 `run` 导出函数，初始化所有检测渠道并通过 tauriBridge 上报

- [x] Task 5: 创建 `scraper-scripts/yupoo/ypGetHylinkTitle.ts` — 标题/链接/商品ID提取模块
  - [x] SubTask 5.1: 实现标题提取（优先 `h2.goods-name span.goods-n-title`，回退 document.title）
  - [x] SubTask 5.2: 实现商品 ID 提取（从 URL 路径 `/albums/` 后提取相册 ID）
  - [x] SubTask 5.3: 实现 URL 清洗（仅保留 origin + pathname）
  - [x] SubTask 5.4: 实现 `run` 导出函数，通过 tauriBridge.send 上报 productTitle/productLink/productId/visitTime

- [x] Task 6: 创建 `scraper-scripts/yupoo/index.ts` — 入口编排模块
  - [x] SubTask 6.1: 导入所有子模块和共享工具
  - [x] SubTask 6.2: 实现 iframe 防护（window !== window.top 时退出）
  - [x] SubTask 6.3: 实现模块编排逻辑（视频模块立即启动，其余模块 DOMContentLoaded 后并行启动）
  - [x] SubTask 6.4: 实现 waitForCompletion 完成判定和 completeTask/failTask 上报

- [x] Task 7: 在 `scripts/build-scraper.mjs` 中注册 yupoo 构建入口
  - [x] SubTask 7.1: 在 PLATFORMS 对象中添加 `yupoo: resolve(projectRoot, 'scraper-scripts/yupoo/index.ts')`

- [x] Task 8: 修复 `src/utils/platforms/yupoo.ts` 的 URL 清洗和商品 ID 提取逻辑
  - [x] SubTask 8.1: 修改 `cleanUrl` 为仅保留 origin + pathname（移除 gid 参数逻辑）
  - [x] SubTask 8.2: 修改 `extractProductId` 为从 URL 路径 `/albums/` 后提取相册 ID

# Task Dependencies
- [Task 1] [Task 2] [Task 3] [Task 4] [Task 5] 可并行开发（无相互依赖）
- [Task 6] 依赖 [Task 1-5] 全部完成（需要导入各子模块）
- [Task 7] 依赖 [Task 6] 完成（需要入口文件存在）
- [Task 8] 独立于其他任务，可并行开发
