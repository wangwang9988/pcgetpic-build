# Tasks

- [x] Task 1: 创建 vipGetMain.ts — 唯品会主图提取模块
  - [x] 实现 `#J-img-content` 容器查找与重试（20 次，1s 间隔）
  - [x] 实现 `data-original` 优先 → `src` 回退的图片 URL 提取
  - [x] 实现 URL 清洗：`//` 补全 `https:`、移除缩略图尺寸后缀 `_\d+x\d+_\d+\.(ext)`
  - [x] 实现容器出现后 3 次定时抓取（500ms 间隔）
  - [x] 通过 `tauriBridge.send('MainPic', urls)` 上传数据
  - [x] 参考 `scraper-scripts/taobao/tbGetMain.ts` 的模块结构和 `GetPic/entrypoints/modules/vip/VIPGetMain.js` 的提取逻辑

- [x] Task 2: 创建 vipGetSku.ts — 唯品会 SKU 图提取模块
  - [x] 实现 `#J_detail_color` 和 `#J_detail_size` 双容器查找
  - [x] 实现 `data-original` 优先 → `src` 回退的图片 URL 提取
  - [x] 实现 URL 清洗（与主图相同逻辑）
  - [x] 实现重试机制（5 次基础 + 3 次额外，500ms 间隔）
  - [x] 实现 MutationObserver 监听 DOM 变化，增量更新
  - [x] 通过 `tauriBridge.send('SkuPic', urls)` 上传数据
  - [x] 参考 `scraper-scripts/taobao/tbGetSku.ts` 的模块结构和 `GetPic/entrypoints/modules/vip/VIPGetSku.js` 的提取逻辑

- [x] Task 3: 创建 vipGetDetail.ts — 唯品会详情图提取模块
  - [x] 实现 `.dc-img-detail` 容器查找与重试（5 次，1s 间隔）
  - [x] 实现 `data-original` 优先 → `src` 回退的图片 URL 提取
  - [x] 实现 URL 清洗（补全协议、移除尺寸后缀、移除反引号）
  - [x] 实现多轮提取（5 轮，1s 间隔），检测图片数量变化
  - [x] 通过 `tauriBridge.send('DetailPic', urls)` 上传数据
  - [x] 参考 `scraper-scripts/taobao/tbGetDetail.ts` 的模块结构和 `GetPic/entrypoints/modules/vip/VIPGetDetail.js` 的提取逻辑

- [x] Task 4: 创建 vipGetVideo.ts — 唯品会视频提取模块
  - [x] 实现 XHR/Fetch 拦截，检测媒体资源响应
  - [x] 实现 Performance API 监控网络请求中的媒体资源
  - [x] 实现 MutationObserver 监听 `<video>` 标签
  - [x] 实现从 `<script>` 标签 JSON 数据和 `window` 对象提取视频 URL
  - [x] 实现视频分类（主图视频 vs 详情页视频）和去重
  - [x] 通过 `tauriBridge.send('VideoUrls', videoObjects)` 上传数据
  - [x] 参考 `scraper-scripts/taobao/tbGetVideo.ts` 的模块结构和 `GetPic/entrypoints/modules/vip/VIPGetVideo.js` 的提取逻辑

- [x] Task 5: 创建 vipGetHylinkTitle.ts — 唯品会标题/链接/商品ID提取模块
  - [x] 实现 `.pib-title-detail` 元素查找与等待（5 次重试，1s 间隔）
  - [x] 实现标题提取：`title` 属性 → `textContent` → `<head><title>` 降级
  - [x] 实现商品 ID 从 URL 提取（正则 `/-(\d+)\.html$/`）
  - [x] 通过 `tauriBridge.send()` 上传 `productTitle`、`productLink`、`productId`
  - [x] 参考 `scraper-scripts/taobao/tbGetHylinkTitle.ts` 的模块结构和 `GetPic/entrypoints/modules/vip/VIPGetHylinkTitle.js` 的提取逻辑

- [x] Task 6: 创建 index.ts — 唯品会抓取脚本入口
  - [x] 实现 iframe 防护（`window !== window.top` 退出）
  - [x] 实现视频模块立即启动（document_start 阶段）
  - [x] 实现 `runModulesOnIdle()`：登录检测 → 模拟滚动 → 并行启动 4 个模块 → 数据静默判定
  - [x] 实现验证码监控（VIP 验证码选择器待确认，暂设为空数组）
  - [x] 实现模块超时保护（15s）和异常处理
  - [x] 完全对齐 `scraper-scripts/taobao/index.ts` 和 `scraper-scripts/jd/index.ts` 的架构模式

- [x] Task 7: 修改 build-scraper.mjs — 注册唯品会构建入口
  - [x] 在 `PLATFORMS` 对象中添加 `vip: resolve(projectRoot, 'scraper-scripts/vip/index.ts')`
  - [x] 验证构建输出 `dist-scripts/vip.bundle.js`

# Task Dependencies
- [Task 1] ~ [Task 5] 互相独立，可并行开发
- [Task 6] 依赖 [Task 1] ~ [Task 5]（入口需要导入各模块）
- [Task 7] 依赖 [Task 6]（构建入口依赖 index.ts 存在）
