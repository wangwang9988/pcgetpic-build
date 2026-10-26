# Tasks

- [x] Task 1: 创建 `scraper-scripts/newegg/neUtils.ts` 共享工具模块
  - [x] 实现 `getNeweggItemId(url: string): string` 函数：优先从 `?Item=` 参数提取，备选从 `/p/` 路径段提取
  - [x] 实现 Newegg 主图 URL 清洗函数 `cleanNeweggImageUrl(url: string): string`：将 `/productimage/nb{非1280数字}/` 和 `/ProductImageCompress[A-Za-z0-9]+/` 替换为 `/productimage/nb1280/`
  - [x] 实现 SKU 图高清化函数 `processToLargeImage(url: string): string`：Adobe Scene7 追加 wid=1500&fmt=jpeg&qlt=90；Stylitics 保持原样；其他兜底返回原 URL

- [x] Task 2: 创建 `scraper-scripts/newegg/neGetMain.ts` 主图提取模块
  - [x] 定义 DOM 选择器数组：`#ProductViewSticky img:not(.logo)`、`.objImages img:not(.logo)`、`.product-view-bar-box img:not(.logo)`、`.swiper-zoom-container img:not(.logo)`、`.product-hover-panel img:not(.logo)`
  - [x] 实现 `extractImagesFromDOM()`：遍历选择器提取 `data-src` 或 `src`，排除 logo 类名和 alt 含 "logo" 的图片
  - [x] 调用 `cleanNeweggImageUrl` 清洗 URL，去重后返回
  - [x] 实现 `run()` 函数：轮询等待（MAX_RETRIES=100, RETRY_INTERVAL=500ms），通过 `tauriBridge.send('MainPic', urls)` 上报

- [x] Task 3: 创建 `scraper-scripts/newegg/neGetSku.ts` SKU 图提取模块
  - [x] 实现 Stylitics 穿搭模块提取：`img[data-testid="stylitics-ui-image"]` 和 `[data-collage-img]`
  - [x] 实现原生轮播图提取：`.product-qv-images picture img.picture-image`
  - [x] 调用 `processToLargeImage` 处理 URL
  - [x] 实现 `run()` 函数：轮询等待 + MutationObserver 动态监听，通过 `tauriBridge.send('SkuPic', urls)` 上报

- [x] Task 4: 创建 `scraper-scripts/newegg/neGetDetail.ts` 详情图提取模块
  - [x] 定义图片黑名单（`Autor.png` 等）
  - [x] 从 `#overview-desktop` 和 `#product-details` 容器提取 img 标签 src
  - [x] 过滤黑名单和非 http 链接
  - [x] 实现 `run()` 函数：轮询等待 + MutationObserver 动态监听，通过 `tauriBridge.send('DetailPic', urls)` 上报

- [x] Task 5: 创建 `scraper-scripts/newegg/neGetVideo.ts` 视频提取模块
  - [x] 定义 Newegg 视频 CDN 域名特征（`macyscdn-us.com`、`ttcdn-us.com` 等）
  - [x] 实现 `isNeweggVideoUrl()` 判断函数
  - [x] 实现多策略视频检测：DOM video 元素、`__MODERN_ROUTER_DATA__` JSON 解析、XHR/Fetch 拦截、Performance API 监控、MutationObserver
  - [x] 实现视频去重（原始URL + 归一化ID 双重去重）
  - [x] 实现 `run()` 函数：清空旧数据、启动所有检测策略、延时梯度扫描，通过 `tauriBridge.send('VideoUrls', videos)` 上报

- [x] Task 6: 创建 `scraper-scripts/newegg/neGetHylinkTitle.ts` 标题/链接提取模块
  - [x] 等待 `document.title` 加载完成（轮询检测）
  - [x] 提取标题：`document.title.trim()`
  - [x] 提取商品 ID：调用 `getNeweggItemId`
  - [x] 清洗 URL：保留 `origin + pathname`，若有 `Item` 参数则追加
  - [x] 实现 `run()` 函数：通过 `tauriBridge.send('productTitle'/'productLink'/'productId', ...)` 上报

- [x] Task 7: 创建 `scraper-scripts/newegg/index.ts` 入口编排
  - [x] iframe 防护：`if (window !== window.top) return`
  - [x] 立即启动视频模块 `runVideo()`
  - [x] DOMContentLoaded 后启动 `runModulesOnIdle()`：登录检测 → simulateScroll → 并行启动 Main/Sku/Detail/HylinkTitle → waitForCompletion → completeTask
  - [x] 异常处理：有已上传数据则 completeTask，否则 failTask

- [x] Task 8: 修改 `scripts/build-scraper.mjs` 注册 newegg 平台
  - [x] 在 PLATFORMS 对象中添加 `newegg: resolve(projectRoot, 'scraper-scripts/newegg/index.ts')`

- [x] Task 9: 构建验证
  - [x] 运行构建脚本确认 `dist-scripts/newegg.bundle.js` 生成成功

# Task Dependencies
- [Task 2] depends on [Task 1] (neGetMain 使用 neUtils 的 cleanNeweggImageUrl)
- [Task 3] depends on [Task 1] (neGetSku 使用 neUtils 的 processToLargeImage)
- [Task 4] depends on [Task 1] (neGetDetail 使用 neUtils 的 getNeweggItemId)
- [Task 6] depends on [Task 1] (neGetHylinkTitle 使用 neUtils 的 getNeweggItemId)
- [Task 7] depends on [Task 2, Task 3, Task 4, Task 5, Task 6] (index 编排所有模块)
- [Task 8] depends on [Task 7] (构建入口依赖 index.ts 存在)
- [Task 9] depends on [Task 8] (验证构建产物)
