# Tasks

- [x] Task 1: 创建 `scraper-scripts/17zwd/zwdUtils.ts` — 平台共享工具
  - [x] 导出 `URL_BLACKLIST` 常量数组（9 项过滤规则）
  - [x] 导出 `DETAIL_URL_BLACKLIST`（含额外 `preview_100_100`）
  - [x] 导出 `isZwdProductImage(url)`：协议 + 黑名单 + 扩展名检查
  - [x] 导出 `convertToOriginalUrl(url)`：移除缩略图后缀 + 补全协议 + 移除查询参数
  - [x] 导出 `extractUrlFromImg(img)`：遍历 4 个属性 + 调用上述函数
  - [x] 导出 `deduplicateZwdUrls(urls)`：基于 convertToOriginalUrl 去重

- [x] Task 2: 创建 `scraper-scripts/17zwd/zwdGetMain.ts` — 主图提取模块
  - [x] 使用 `zwdUtils.extractUrlFromImg` 和 `zwdUtils.deduplicateZwdUrls`
  - [x] 使用 `shared/utils` 的 `deduplicateUrls` 和 `sleep`（禁止本地定义 sleep）
  - [x] 实现三种提取方法：全页面 img 扫描、Swiper 容器类名匹配、视频容器同级元素
  - [x] 遵循"重试获取 + 额外探测"模式：初始空上报 → 循环重试(20次/500ms) → 额外抓取(3次/500ms) → 最终上报
  - [x] 通过 `tauriBridge.send('MainPic', images)` 上报

- [x] Task 3: 创建 `scraper-scripts/17zwd/zwdGetSku.ts` — SKU图提取模块
  - [x] 使用 `zwdUtils` 和 `shared/utils` 的工具函数
  - [x] 实现三种提取方法："颜色"标签定位、`ant-space-horizontal` 容器、SKU 类名模式匹配
  - [x] 遵循"MutationObserver 动态监听 + 返回清理函数"模式：
    - 首轮扫描 → MutationObserver 精确监听 SKU 容器（childList + subtree + attributes） → 轮询兜底
    - 返回清理函数：同时 `observer.disconnect()` + `clearInterval(pollTimer)`

- [x] Task 4: 创建 `scraper-scripts/17zwd/zwdGetDetail.ts` — 详情图提取模块
  - [x] 使用 `zwdUtils`（DETAIL_URL_BLACKLIST、convertToOriginalUrl）和 `shared/utils`
  - [x] 实现四种提取方法："宝贝详情"标题定位、类名模式匹配、ant-row 参数区域兄弟元素、goodsParamsWrapper 兄弟元素
  - [x] 遵循"重试等待容器 + 多轮次遍历 + MutationObserver 持续监听"模式：
    - 重试等待容器(20次/500ms) → 多轮提取(5轮/1s间隔) → MutationObserver 持续监听增量上报
    - 返回清理函数：同时清理 Observer 和定时器

- [x] Task 5: 创建 `scraper-scripts/17zwd/zwdGetVideo.ts` — 视频提取模块
  - [x] 实现 XHR/Fetch 拦截，拦截 JSON 响应递归查找视频 URL
  - [x] 实现 Performance API 增量监控（游标 + requestAnimationFrame 循环）
  - [x] 实现 MutationObserver 动态监听新增 `<video>` 和 `<script>` 元素
  - [x] 实现页面 `<script>` 标签 JSON 数据提取和 `window` 全局变量检查
  - [x] 实现延时梯度扫描（1s/3s/5s/10s）
  - [x] 实现视频 URL 规范化去重（提取文件名长数字 ID）
  - [x] 所有视频默认分类为 `main` 类型
  - [x] 视频上报采用"先读后写"策略：`tauriBridge.get('VideoUrls')` → 去重追加 → `tauriBridge.send`

- [x] Task 6: 创建 `scraper-scripts/17zwd/zwdGetHylinkTitle.ts` — 标题/链接/商品ID/访问时间提取模块
  - [x] 实现标题提取：`document.title`（移除" - 17网"/" - 一起做网店"后缀），回退 `<h1>`
  - [x] 实现商品 ID 提取：URL 中 `/item/(\d+)` 匹配
  - [x] 实现商品链接清洗：`{origin}/item/{id}` 格式
  - [x] 实现访问时间生成：`YYYY-MM-DD HH:mm` 格式（**必须输出**）
  - [x] 等待 `document.title` 非 "loading..." 后再提取（使用 `shared/utils` 的 `sleep`，最多 10 秒）
  - [x] 上报全部四个字段：`productTitle`、`productLink`、`productId`、`visitTime`

- [x] Task 7: 创建 `scraper-scripts/17zwd/index.ts` — 入口编排模块
  - [x] 严格遵循开发指南标准模板
  - [x] iframe 防护（`window !== window.top`）
  - [x] 立即启动视频拦截模块
  - [x] DOMContentLoaded 后：登录检测 → 重置标志 → 模拟滚动 → 后台并行启动 4 个模块（withTimeout 15s） → waitForCompletion
  - [x] 完成后调用各模块返回的清理函数 + `tauriBridge.completeTask()`
  - [x] 异常处理：有数据 completeTask，无数据 failTask
  - [x] 登录选择器：`.login-panel`、`.qrcode-login`、`.ant-login-form`
  - [x] 验证码选择器留空

- [x] Task 8: 更新 `scripts/build-scraper.mjs` 注册 17zwd 平台入口
  - [x] 在 PLATFORMS 对象中添加 `'17zwd': resolve(projectRoot, 'scraper-scripts/17zwd/index.ts')`

- [x] Task 9: 更新 `src-tauri/src/login/mod.rs` 注册 17zwd 登录策略
  - [x] 使用 DefaultLoginStrategy 注册 17zwd 平台，登录域名包含 `login.17zwd.com`

# Task Dependencies
- Task 2-4 依赖 Task 1（使用 zwdUtils 共享工具）
- Task 7 依赖 Task 2-6（index.ts 导入各模块的 run 函数）
- Task 8 依赖 Task 7（构建入口需要 index.ts 存在）
- Task 9 独立于 Task 1-8
- Task 5-6 独立于 Task 1-4，可并行实现
