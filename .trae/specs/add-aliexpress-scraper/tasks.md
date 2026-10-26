# Tasks

- [x] Task 1: 创建 aeGetMain.ts 主图提取模块
  - [x] 实现 4 种提取方式：DCData script / DOM 容器 / __AER_DATA__ JSON / bigpic_floor 容器
  - [x] 实现 AliExpress 专用 URL 清洗函数（区分 .com 和 .ru 格式）
  - [x] 实现排除规则（flags/avatar/review/icon/logo 等）
  - [x] 实现 MAX_RETRIES=30 + RETRY_INTERVAL=500ms 轮询等待
  - [x] 实现 MAX_EXTRA_FETCHES=3 额外抓取确保数据完整
  - [x] 导出 `run()` 函数，通过 tauriBridge.send('MainPic', urls) 上报

- [x] Task 2: 创建 aeGetDetail.ts 详情图提取模块
  - [x] 实现容器选择器（#product-description / #content_anchor / [class*="description--wrap"] 等）
  - [x] 实现 Shadow DOM 穿透递归提取
  - [x] 实现同源 iframe 内容器提取
  - [x] 实现 /kf/ 路径去重逻辑
  - [x] 实现 MAX_CONTAINER_RETRIES=5 + EXTRACTION_PASSES=3 多轮提取
  - [x] 导出 `run()` 函数，通过 tauriBridge.send('DetailPic', urls) 上报

- [x] Task 3: 创建 aeGetSku.ts SKU 图提取模块
  - [x] 实现双通道提取：[class*="sku--wrap--"] + [data-spm="sku_floor"]
  - [x] 实现 source[srcset] 和 img[src/data-src] 双属性提取
  - [x] 实现 srcset 多 URL 解析（逗号分隔取第一个）
  - [x] 实现备用选择器 [class*="sku-item--image--"]
  - [x] 导出 `run()` 函数，通过 tauriBridge.send('SkuPic', urls) 上报

- [x] Task 4: 创建 aeGetVideo.ts 视频提取模块
  - [x] 实现三通道提取：window.runParams / DOM video 标签 / __AER_DATA__ JSON
  - [x] 实现视频 URL 清洗（协议补全、相对路径补全）
  - [x] 实现视频 URL 有效性校验（排除 blob/data URL）
  - [x] 上报格式：{ url: string }[] 对象数组
  - [x] 导出 `run()` 函数，通过 tauriBridge.send('VideoUrls', videos) 上报

- [x] Task 5: 创建 aeGetHylinkTitle.ts 标题/链接/商品ID 提取模块
  - [x] 实现多渠道标题提取：script 标签 subject / h1 / title / meta[og:title] / [class*="title--wrap--"]
  - [x] 实现商品 ID 提取（/item/{id}.html、/i/{id}.html、URL 参数、10 位数字匹配）
  - [x] 实现标题清洗（去除 AliExpress 后缀、合并空格）
  - [x] 实现 URL 清洗（仅保留 origin + pathname）
  - [x] 导出 `run()` 函数，分别上报 productTitle / productLink / productId

- [x] Task 6: 创建 index.ts 入口编排模块
  - [x] 实现 iframe 防护（window !== window.top）
  - [x] 实现登录检测（probeAndReportLogin + AliExpress 专用选择器）
  - [x] 实现验证码监控（MutationObserver + 节流）
  - [x] 实现模块并行启动（Main/Sku/Detail/HylinkTitle 后台并行）
  - [x] 实现视频模块立即启动（document_start 阶段）
  - [x] 实现完成判定（waitForCompletion + completeTask）
  - [x] 实现异常处理（有数据则 complete，无数据则 fail）

- [x] Task 7: 更新构建脚本 scripts/build-scraper.mjs
  - [x] 在 PLATFORMS 对象中新增 aliexpress 条目，入口指向 scraper-scripts/aliexpress/index.ts

- [x] Task 8: 注册 AliExpress 登录策略
  - [x] 在 src-tauri/src/login/mod.rs 的 LoginStrategyRegistry::new() 中新增 AliExpress DefaultLoginStrategy 注册

- [x] Task 9: 构建验证
  - [x] 执行 node scripts/build-scraper.mjs 确认 aliexpress.bundle.js 生成成功
  - [x] 执行 cargo check 确认 Rust 侧编译通过

# Task Dependencies
- Task 1~5 可并行开发（各模块独立）
- Task 6 依赖 Task 1~5（需要导入各模块的 run 函数）
- Task 7 依赖 Task 6（需要入口文件存在）
- Task 8 独立于 Task 1~7（Rust 侧修改）
- Task 9 依赖 Task 6~8（需要所有代码就绪后验证）
