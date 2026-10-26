# Tasks

- [x] Task 1: 创建 pddpfGetMain.ts 主图提取模块
  - [x] 实现 5 策略容器选择器 DOM 扫描（data-testid / Car_ 类名 / goods-image-wrapper / 缩略图 / 移动端滑块）
  - [x] 实现 SSR `__cava_ssr_data__` 数据提取（goodsDetail.data.imageUrl + goodsCarouselInfos）
  - [x] 实现 URL 清洗（去除 `?` 后查询参数，保留 `.a.jpeg` 后缀，补全 `//` 协议）
  - [x] 实现图片 URL 验证（扩展名检查 .jpg/.jpeg/.png/.webp/.gif）
  - [x] 实现去重合并逻辑（DOM + SSR 结果合并去重）
  - [x] 实现轮询重试机制（MAX_RETRIES=40, RETRY_INTERVAL=800ms, MAX_EXTRA_FETCHES=3）
  - [x] 通过 tauriBridge.send('MainPic', urls) 上报

- [x] Task 2: 创建 pddpfGetDetail.ts 详情图提取模块
  - [x] 实现 4 策略提取（img.goodsIntroImg / video[poster] / .detailContent .DCImg / [class*="goods-intro_introduction"]）
  - [x] 优先获取 data-bimg-src 属性，备选 src
  - [x] 实现 URL 清洗（去除查询参数，补全协议）
  - [x] 实现多轮提取 + MutationObserver 动态监听
  - [x] 通过 tauriBridge.send('DetailPic', urls) 上报

- [x] Task 3: 创建 pddpfGetSku.ts SKU图提取模块
  - [x] 实现 3 选择器扫描（img.sku-image-inner / .sku-list-row .sku-image img / .beast-mobile-drawer-content [style*="url("]）
  - [x] 支持 background-image CSS 属性提取（url() 解析 + &quot; 实体处理）
  - [x] 实现 URL 清洗（去除查询参数，补全协议）
  - [x] 实现 MutationObserver + 轮询双保险机制
  - [x] 通过 tauriBridge.send('SkuPic', urls) 上报

- [x] Task 4: 创建 pddpfGetVideo.ts 视频提取模块
  - [x] 实现 DOM video 元素扫描 + source 子元素提取
  - [x] 实现 iframe/Shadow DOM 穿透查找
  - [x] 实现 __NEXT_DATA__ JSON 解析提取
  - [x] 实现 JSON-LD (application/ld+json) VideoObject 提取
  - [x] 实现 XHR/Fetch 拦截 + JSON 响应递归搜索
  - [x] 实现 Performance API 增量监控
  - [x] 实现 MutationObserver 动态监听
  - [x] 实现视频去重（URL 完全匹配 + 规范化文件名 ID 去重）
  - [x] 实现视频分类（主视频/详情视频）
  - [x] 通过 tauriBridge.send('VideoUrls', videos) 上报

- [x] Task 5: 创建 pddpfGetHylinkTitle.ts 标题/链接/商品ID提取模块
  - [x] 实现 3 级降级标题提取（goods-share data-clipboard-text 去价格标签 → goods-n-title → document.title）
  - [x] 实现 URL 清洗（只保留 gid 参数）
  - [x] 实现商品 ID 提取（gid 参数优先，备选 5 位以上纯数字参数）
  - [x] 实现访问时间生成
  - [x] 通过 tauriBridge.send 上报 productTitle/productLink/productId/visitTime

- [x] Task 6: 创建 index.ts 入口文件
  - [x] 视频模块在 document_start 阶段立即启动（XHR/fetch 拦截需尽早执行）
  - [x] iframe 防护：非视频模块在 iframe 中不执行
  - [x] DOMContentLoaded 后启动其他 4 个模块（后台并行运行）
  - [x] 登录检测（probeAndReportLogin）
  - [x] 模拟滚动（simulateScroll）
  - [x] 数据驱动完成判定（waitForCompletion）
  - [x] 异常兜底（有数据则 completeTask，无数据则 failTask）

- [x] Task 7: 注册构建入口
  - [x] 在 scripts/build-scraper.mjs 的 PLATFORMS 对象中添加 pddpf 入口
  - [x] 验证构建成功生成 dist-scripts/pddpf.bundle.js

# Task Dependencies
- Task 1-5 可并行开发（各模块独立）
- Task 6 依赖 Task 1-5（index.ts 需要导入各模块的 run 函数）
- Task 7 依赖 Task 6（构建入口需要 index.ts 存在）
