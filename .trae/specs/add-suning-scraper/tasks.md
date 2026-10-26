# Tasks

- [x] Task 1: 创建 snGetMain.ts — 苏宁主图提取模块
  - [x] SubTask 1.1: 实现 extractBestUrlFromImg — 从 img 标签提取 src-large 属性，补全协议
  - [x] SubTask 1.2: 实现 cleanUrl — 去除查询参数，过滤 .svg 和黑名单URL
  - [x] SubTask 1.3: 实现 gatherAllImages — 遍历所有 img 标签提取主图，去重
  - [x] SubTask 1.4: 实现 run 入口函数 — 轮询重试 + 额外抓取 + tauriBridge.send

- [x] Task 2: 创建 snGetSku.ts — 苏宁SKU图提取模块
  - [x] SubTask 2.1: 实现 extractSkuImagesFromDOM — 扫描 #J-TZM/#colorItemList/.clr-item 容器
  - [x] SubTask 2.2: 实现 cleanUrl — 补全协议、清洗尺寸参数（_\d+w_\d+h_\w+）
  - [x] SubTask 2.3: 实现 run 入口函数 — 轮询重试 + MutationObserver + tauriBridge.send

- [x] Task 3: 创建 snGetDetail.ts — 苏宁详情图提取模块
  - [x] SubTask 3.1: 实现 isValidDetailImageUrl — 校验苏宁CDN域名、图片格式、排除小图标
  - [x] SubTask 3.2: 实现 processSuningUrl — 补全协议、清洗尺寸参数、去除查询参数
  - [x] SubTask 3.3: 实现 extractImagesFromDOM — 多容器扫描 + img标签提取
  - [x] SubTask 3.4: 实现 run 入口函数 — 容器等待 + 多轮提取 + MutationObserver + tauriBridge.send

- [x] Task 4: 创建 snGetVideo.ts — 苏宁视频提取模块
  - [x] SubTask 4.1: 实现视频URL归一化去重（normalizeVideoUrl + isVideoDuplicate）
  - [x] SubTask 4.2: 实现视频有效性判断（isLikelyMainVideo + isMainVideoUrl + isMediaRequest）
  - [x] SubTask 4.3: 实现 DOM video 元素扫描（checkVideoElement + scanVideoContainers）
  - [x] SubTask 4.4: 实现 Script 标签 JSON 解析（extractVideosFromPageJson + findVideosInObject）
  - [x] SubTask 4.5: 实现网络请求拦截（interceptXHR + interceptFetch + monitorNetworkRequests）
  - [x] SubTask 4.6: 实现 MutationObserver 动态监听 + 模拟交互
  - [x] SubTask 4.7: 实现 run 入口函数 — 初始化所有检测策略 + 延时梯度扫描

- [x] Task 5: 创建 snGetHylinkTitle.ts — 苏宁标题/链接/商品ID提取模块
  - [x] SubTask 5.1: 实现 waitForTitle — 轮询等待标题加载（含苏宁特征校验）
  - [x] SubTask 5.2: 实现商品ID提取 — URL路径中 .html 前数字 + 备用路径段提取
  - [x] SubTask 5.3: 实现 run 入口函数 — 清空旧数据 + 等待加载 + 提取上报

- [x] Task 6: 创建 index.ts — 苏宁抓取脚本统一入口
  - [x] SubTask 6.1: 实现模块编排（Video立即启动，Main/Sku/Detail/HylinkTitle等DOMContentLoaded）
  - [x] SubTask 6.2: 实现登录检测（苏宁登录选择器 + probeAndReportLogin）
  - [x] SubTask 6.3: 实现验证码监控（MutationObserver + captcha事件发射）
  - [x] SubTask 6.4: 实现任务完成判定（waitForCompletion + completeTask/failTask）

- [x] Task 7: 修改 build-scraper.mjs — 注册 suning 平台入口

# Task Dependencies
- [Task 1] [Task 2] [Task 3] [Task 4] [Task 5] 可并行开发（无相互依赖）
- [Task 6] 依赖 [Task 1-5] 全部完成（入口需要导入所有模块）
- [Task 7] 依赖 [Task 6] 完成（构建需要入口文件存在）
