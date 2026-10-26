# Tasks

- [x] Task 1: 创建 `scraper-scripts/rakuten/rkGetMain.ts` — 主图提取模块
  - [x] 实现三路合并提取策略：AppData JSON + JSON-LD + DOM 多选择器
  - [x] 实现 URL 清洗：补全协议头、去除查询参数、过滤 .svg、去重
  - [x] 使用 tauriBridge.send 上报数据，轮询等待异步渲染（MAX_RETRIES + RETRY_INTERVAL）
  - [x] 导出 `run()` 函数

- [x] Task 2: 创建 `scraper-scripts/rakuten/rkGetDetail.ts` — 详情图提取模块
  - [x] 实现 4 个容器选择器扫描（#prd-page、.item_desc、.sale_desc、#description）
  - [x] 排除 icon-img 装饰性图标
  - [x] 实现 URL 清洗：补全协议头、去除尺寸参数 _60w_60h_4e、去除查询参数
  - [x] 使用 MutationObserver 监听动态加载（1 秒防抖）
  - [x] 导出 `run()` 函数

- [x] Task 3: 创建 `scraper-scripts/rakuten/rkGetSku.ts` — SKU 图提取模块
  - [x] 实现漏斗式五级选择器策略
  - [x] 实现 URL 清洗：补全协议头、去除查询参数
  - [x] 使用 MutationObserver + 轮询兜底
  - [x] 导出 `run()` 函数

- [x] Task 4: 创建 `scraper-scripts/rakuten/rkGetVideo.ts` — 视频提取模块
  - [x] 实现五路并行检测：AppData JSON + JSON-LD + DOM + Performance API + XHR/Fetch 拦截
  - [x] 实现视频分类（主图视频 vs 详情视频）和双重去重
  - [x] 实现 Shadow DOM 遍历
  - [x] 实现 MutationObserver 监听动态插入的 video 元素
  - [x] 导出 `run()` 函数（同步，立即启动拦截）

- [x] Task 5: 创建 `scraper-scripts/rakuten/rkGetHylinkTitle.ts` — 标题/链接/商品 ID 提取模块
  - [x] 实现标题轮询等待（最多 2 秒）
  - [x] 实现商品 ID 从 URL 路径提取（排除非商品路径）
  - [x] 实现链接清洗（去除查询参数，末尾加 /）
  - [x] 导出 `run()` 函数

- [x] Task 6: 创建 `scraper-scripts/rakuten/index.ts` — 入口编排
  - [x] 视频模块立即启动（document_start 阶段拦截）
  - [x] 其余模块 DOMContentLoaded 后并行启动
  - [x] 登录检测（probeAndReportLogin）
  - [x] 验证码监控（MutationObserver）
  - [x] 任务完成判定（waitForCompletion）

- [x] Task 7: 修改 `scripts/build-scraper.mjs` — 注册 rakuten 构建入口
  - [x] 在 PLATFORMS 对象中添加 `rakuten: resolve(projectRoot, 'scraper-scripts/rakuten/index.ts')`

- [x] Task 8: 修改 `src-tauri/src/login/mod.rs` — 添加 Rakuten 登录策略
  - [x] 注册 `DefaultLoginStrategy::new("rakuten", &["login.rakuten.co.jp"], &[])`

# Task Dependencies
- Task 6 依赖 Task 1-5（入口需导入所有子模块）
- Task 7 依赖 Task 6（构建入口指向 index.ts）
- Task 1-5 之间无依赖，可并行开发
- Task 8 独立于 Task 1-7
