# Tasks

- [x] Task 1: 创建 jdGetMain.ts — 京东主图提取模块
  - [x] SubTask 1.1: 从 `GetPic/entrypoints/modules/jd/jdGetMain.js` 提取核心 URL 解析逻辑（IMAGE_CONTAINERS、extractImagesFromScript、processImageUrl、processFoundGallery 中的 DOM 扫描和 jfs/ 路径提取部分）
  - [x] SubTask 1.2: 将 `browser.runtime.sendMessage({action:'setStorage', key:'MainPic', value:...})` 替换为 `tauriBridge.send('MainPic', ...)`，移除 MainPicAll 累积逻辑
  - [x] SubTask 1.3: 移除页面可见性检测、5分钟不活动超时、SPA URL 变化检测、状态保存/恢复等插件特有逻辑
  - [x] SubTask 1.4: 按照 tbGetMain.ts 的模式重构为 `export async function run(): Promise<void>`，使用轮询重试 + 额外抓取机制
  - [x] SubTask 1.5: 保留京东特有的 URL 清洗逻辑（jfs/ 路径拼接 img14.360buyimg.com/imgzone/、扩展名截断、占位图过滤）

- [x] Task 2: 创建 jdGetSku.ts — 京东 SKU 图提取模块
  - [x] SubTask 2.1: 从 `GetPic/entrypoints/modules/jd/jdGetSku.js` 提取核心逻辑（extractImageUrlsFromContainer、cleanAndProcessUrl、collectUrlsFromImageElement）
  - [x] SubTask 2.2: 将 `browser.runtime.sendMessage` 替换为 `tauriBridge.send()`，移除 SkuPicAll 累积逻辑
  - [x] SubTask 2.3: 移除页面可见性、不活动超时、SPA 导航检测、导航屏蔽期、状态保存/恢复等逻辑
  - [x] SubTask 2.4: 按照 tbGetSku.ts 的模式重构，使用 MutationObserver（300ms 防抖）+ 轮询兜底（10 次，3s 间隔）
  - [x] SubTask 2.5: 保留京东特有的 cleanAndProcessUrl（jfs/ 路径提取、尺寸前缀移除 s228x228_、扩展名截断）和多属性收集逻辑

- [x] Task 3: 创建 jdGetDetail.ts — 京东详情图提取模块
  - [x] SubTask 3.1: 从 `GetPic/entrypoints/modules/jd/jdGetDetail.js` 提取核心逻辑（extractUrlsFromValueAttributes、extractUrlsFromImgTags、extractUrlsFromBackgroundImages、extractUrlsFromStyleTags、scanSpecificContainers）
  - [x] SubTask 3.2: 将 `browser.runtime.sendMessage` 替换为 `tauriBridge.send()`，移除 DetailPicAll 累积逻辑
  - [x] SubTask 3.3: 移除页面可见性、不活动超时、SPA 导航检测、导航屏蔽期、状态保存/恢复等逻辑
  - [x] SubTask 3.4: 按照 tbGetDetail.ts 的模式重构，使用容器等待 + 多轮提取 + MutationObserver 实时监听
  - [x] SubTask 3.5: 保留京东特有的 normalizeImageUrl（CDN 双后缀移除 .jpg.avif → .jpg、尺寸参数移除 _360x360）、isValidImageUrl（京东 UI 标志/广告过滤）、processImageUrl（jfs/ 路径补全 img13 域名）

- [x] Task 4: 创建 jdGetVideo.ts — 京东视频提取模块
  - [x] SubTask 4.1: 从 `GetPic/entrypoints/modules/jd/jdGetVideo.js` 提取核心逻辑（checkVideoElement、traverseShadowRoot、enhanceDataExtraction、extractVideosFromScripts、findVideosInObject、scanVideoContainers）
  - [x] SubTask 4.2: 将 `browser.runtime.sendMessage` 替换为 `tauriBridge.send()` / `tauriBridge.get()`，移除 videoUrlsAll 累积逻辑和存储队列重试机制
  - [x] SubTask 4.3: 移除页面可见性、焦点检测、不活动超时、SPA 导航检测、视频暂停/恢复、状态保存/恢复等逻辑
  - [x] SubTask 4.4: 按照 tbGetVideo.ts 的模式重构，使用 Performance API + XHR/Fetch 拦截 + MutationObserver + 页面数据提取 + 定时检测
  - [x] SubTask 4.5: 保留京东特有的视频检测逻辑（jdPatterns 正则匹配 __detail_data__ 等、Shadow DOM 遍历、京东视频 ID 归一化 normalizeVideoUrl）

- [x] Task 5: 创建 jdGetHylinkTitle.ts — 京东标题/链接/ID 提取模块
  - [x] SubTask 5.1: 从 `GetPic/entrypoints/modules/jd/jdGetHylinkTitle.js` 提取核心逻辑（processTitleExtraction 中的标题提取、URL 清洗、商品 ID 提取）
  - [x] SubTask 5.2: 将 `browser.runtime.sendMessage` 替换为 `tauriBridge.send()`，移除 productLinkAll 历史记录累积逻辑
  - [x] SubTask 5.3: 移除页面可见性、焦点检测、不活动超时、SPA 导航检测、状态保存/恢复等逻辑
  - [x] SubTask 5.4: 按照 tbGetHylinkTitle.ts 的模式重构为 `export async function run(): Promise<void>`
  - [x] SubTask 5.5: 保留京东特有的 URL 清洗逻辑（清空 search + hash、路径名正则 /(\d+)\.html 提取商品 ID）

- [x] Task 6: 创建 index.ts — 京东平台入口
  - [x] SubTask 6.1: 按照 taobao/index.ts 的标准模板创建京东入口
  - [x] SubTask 6.2: 配置京东验证码选择器（如有已知的京东滑块验证码选择器则配置，否则留空数组）
  - [x] SubTask 6.3: 编排模块执行时序：document_start 启动 Video → DOMContentLoaded 并行启动 Main/Sku/Detail/HylinkTitle → waitForCompletion
  - [x] SubTask 6.4: 实现 iframe 防护（`if (window !== window.top) return;`）

- [x] Task 7: 更新 vite.scraper.config.ts 构建配置
  - [x] SubTask 7.1: 在 entries 对象中添加 `jd: resolve(__dirname, 'scraper-scripts/jd/index.ts')`
  - [x] SubTask 7.2: 验证 `npm run build:scraper` 能成功产出 `dist-scripts/jd.bundle.js`

# Task Dependencies
- [Task 1] [Task 2] [Task 3] [Task 4] [Task 5] 可并行开发（无依赖关系）
- [Task 6] 依赖 [Task 1] [Task 2] [Task 3] [Task 4] [Task 5]（需要导入各模块的 run 函数）
- [Task 7] 依赖 [Task 6]（需要入口文件路径）
