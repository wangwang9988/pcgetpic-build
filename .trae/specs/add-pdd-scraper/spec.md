# 拼多多(PDD)平台抓取脚本 Spec

## Why
项目已实现淘宝/天猫和京东两个平台的抓取脚本，拼多多作为国内主流电商平台之一，需要补齐其抓取能力。参考 `GetPic/entrypoints/pdd.content.js` 及其子模块，将浏览器插件的 PDD 抓取逻辑适配为 Tauri WebView 注入脚本。

## What Changes
- 新增 `scraper-scripts/pdd/` 目录，包含 6 个模块：`index.ts`、`pddGetMain.ts`、`pddGetSku.ts`、`pddGetDetail.ts`、`pddGetVideo.ts`、`pddGetHylinkTitle.ts`
- 更新 `scripts/build-scraper.mjs` 注册 `pdd` 平台入口
- Rust 侧 `platform_resolver.rs` 已有 `Platform::Pdd` 枚举变体及 `bundle_name() => "pdd"`，无需修改
- 前端 `src/utils/platforms/pdd.ts` 已有 `pddHandler`，无需修改
- 登录策略已通过 `DefaultLoginStrategy` 注册在 `login/mod.rs`，无需修改

## Impact
- Affected code: `scraper-scripts/pdd/`（新增）、`scripts/build-scraper.mjs`（修改）
- 不影响现有淘宝/京东/VIP 抓取脚本
- Rust 后端和前端平台注册已就绪，无需额外修改

## 设计原则（对齐开发指南）

### 核心原则：窗口关闭与脚本执行无关，只与数据值变化有关
- 脚本只负责生产数据（通过 `tauriBridge.send()` 上报），不负责完成判定
- 完成判定由 Rust 后端的 7 秒数据静默检测 + 60 秒看门狗兜底实现
- 脚本可以无限运行（MutationObserver、rAF 循环等），只要上报的数据值没有变化就不会影响完成判定

### 需要移除的插件特有逻辑（对齐开发指南 §8.3）
从参考项目 `pdd.content.js` 及其子模块适配时，以下逻辑**必须移除**：
- **`defineContentScript` 包装**：PcGetPic 不使用 WXT 框架，直接导出 `run()` 函数
- **`browser.runtime.sendMessage`**：替换为 `tauriBridge.send()`
- **`browser.storage.session/local`**：替换为 `tauriBridge.send()` / `tauriBridge.get()`
- **`INACTIVITY_TIMEOUT`（5分钟不活动）**：不需要，Rust 后端 7 秒静默判定替代
- **`isScriptStopped` / `handlePageInactive`**：不需要，窗口关闭时脚本自动终止
- **URL 变化检测（SPA 导航 `setInterval` 500ms 轮询）**：PcGetPic 每个 WebView 只加载一个商品页，不需要
- **页面可见性检测（`visibilitychange`/`focus`/`blur`）**：不需要，WebView 始终在前台
- **用户活动唤醒（`mousemove`/`keydown` 等重置不活动定时器）**：不需要，无用户交互
- **页面状态保存/恢复（`handlePageUnload`/`restorePageState`）**：不需要，Tauri 宿主管理窗口生命周期
- **`MainPicAll`/`SkuPicAll`/`DetailPicAll`/`videoUrlsAll`/`productLinkAll` 历史记录**：不需要，PcGetPic 不需要跨页面历史数据

### 需要保留的核心逻辑（对齐开发指南 §8.4）
- **DOM 选择器**：各模块的元素定位选择器
- **rawData 注入脚本**：PDD 特有的通过 `document.createElement('script')` 注入到 MAIN world 读取 `window.rawData` 的机制
- **CAVA SSR 数据提取**：解析 `#__cava_ssr_data__` 中的 `__CAVA_INIT_DATA__`
- **URL 清洗逻辑**：移除 `?` 参数、占位符过滤、跨 CDN 子域名去重
- **MutationObserver 监听**：SKU 图和详情图的动态加载监听
- **XHR/Fetch 拦截**：视频模块需要拦截网络请求
- **Performance API 监控**：视频模块需要检测媒体资源
- **去重逻辑**：URL 级和路径级去重

## ADDED Requirements

### Requirement: PDD 主图提取 (pddGetMain)
系统 SHALL 从拼多多商品页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

遵循开发指南 §4.3 GetMain 模板：重试等待 → 额外抓取 → 上报。

#### 数据源优先级
1. **rawData（最高优先级）**：通过注入脚本读取 `window.rawData.store.initDataObj.goods`，提取 `viewImageData`（字符串数组）和 `topGallery`（`{url: string}` 对象数组）
2. **SSR 数据**：解析 `#__cava_ssr_data__` script 标签中的 `__CAVA_INIT_DATA__`，提取 `goodsDetail.data.imageUrl` 和 `goodsDetail.data.goodsCarouselInfos[].url`
3. **DOM 扫描**：查找 `.QFNLpbqP`、`.mui-mobile-swipe-child` 容器内的 `img` 元素，取 `src` 或 `data-src`

#### rawData 注入脚本机制
PDD 的 `window.rawData` 运行在页面 MAIN world，内容脚本无法直接访问。采用注入脚本方案：
1. 创建 `document.createElement('script')`，注入代码读取 `window.rawData.store.initDataObj.goods`
2. 提取 `viewImageData` 和 `topGallery` 中的 URL
3. 通过 `document.dispatchEvent(new CustomEvent('pdd_main_raw_data', { detail: urls }))` 回传
4. 内容脚本监听 `pdd_main_raw_data` 事件接收数据并缓存

#### URL 清洗规则
- 移除 `?` 及后续参数（`url.split('?')[0]`）
- rawData URL 天然干净无需额外处理
- 跨 CDN 子域名去重：以 URL pathname 为去重键，`img.pddpic.com/xxx` 和 `img-2.pddpic.com/xxx` 视为同一张图，优先保留 rawData 版本

#### Scenario: 成功提取主图
- **WHEN** 拼多多商品页加载完成，rawData 或 DOM 中存在主图
- **THEN** 通过 `tauriBridge.send('MainPic', urls)` 上报清洗后的 URL 数组

#### Scenario: 页面未加载完成
- **WHEN** 首次提取无结果
- **THEN** 以 1 秒间隔重试，最多 20 次，直到获取到图片

### Requirement: PDD SKU 图提取 (pddGetSku)
系统 SHALL 从拼多多商品页提取 SKU 缩略图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

遵循开发指南 §4.3 GetSku 模板：首次扫描 → MutationObserver 持续监听 → 轮询兜底。

#### 数据源
1. **rawData**：`window.rawData.store.initDataObj.goods.skus[].thumbUrl`（通过注入脚本 + `pdd_sku_raw_data` CustomEvent 回传）
2. **CAVA SSR**：`__CAVA_INIT_DATA__.goodsDetail.data.skus[].thumbUrl` 或 `goods.skus[].thumbUrl`
3. **DOM 容器**：`.xkr85Q1j`、`.beast-mobile-drawer-content`、`div[role="dialog"]`、`.IuvVTIp4` 内的 `img` 元素
4. **独立选择器**：`img[aria-label="点击查看大图"]`

#### URL 清洗规则
- 移除 `?` 及后续参数
- 过滤占位符 URL：匹配 `placeholder|lowres|avatars|temp|default|avatar|promotion|/promo/|/mall/|/upload/|funimg|chat|emojis|commimg|pdd_ims|mainObject|oms-img-promotion|\.svg$|\.gif$` 的 URL 丢弃
- 白名单：包含 `/mms-goods-image/` 的 URL 保留
- 跨 CDN 子域名去重，rawData 优先

#### Scenario: 成功提取 SKU 图
- **WHEN** SKU 容器或 rawData 中存在 SKU 缩略图
- **THEN** 通过 `tauriBridge.send('SkuPic', urls)` 上报清洗后的 URL 数组

#### Scenario: SKU 图动态变化
- **WHEN** MutationObserver 检测到 SKU 图片 src 变化
- **THEN** 重新提取并上报更新后的 URL 数组

### Requirement: PDD 详情图提取 (pddGetDetail)
系统 SHALL 从拼多多商品页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

遵循开发指南 §4.3 GetDetail 模板：等待容器 → 多轮提取 → 上报。

#### 数据源
1. **rawData**：`window.rawData.store.initDataObj.goods.detailGallery[].url`（通过注入脚本 + `pdd_detail_raw_data` CustomEvent 回传）
2. **CAVA SSR**：`__CAVA_INIT_DATA__.goodsDetail.data.detailGallery[].url`
3. **DOM 容器**：`.Blmqu2TV`、`[class*="goods-intro_introduction"]`、`.UhNRiWLO`、`.ssd-module-wrap`、`.ssd-module-item` 内的 `img` 标签和 CSS 背景图
4. **降级方案**：`[role="button"][aria-label="点击查看大图"]` 父容器

#### URL 清洗规则
- 与 SKU 图相同的清洗规则
- img 标签属性优先级：`data-bimg-src` > `data-src` > `src`
- 背景图：通过 `getComputedStyle` 提取 `backgroundImage`，解析 `url()` 中的地址
- 路径级去重：同 pathname 优先保留 `img.pddpic.com`（非 `img-2` 等子域名）

#### Scenario: 成功提取详情图
- **WHEN** 详情容器或 rawData 中存在详情图
- **THEN** 通过 `tauriBridge.send('DetailPic', urls)` 上报清洗后的 URL 数组

### Requirement: PDD 视频提取 (pddGetVideo)
系统 SHALL 从拼多多商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', videoData)` 上报。

遵循开发指南 §4.3 GetVideo 模板：立即启动 → 持续监听（不返回 Promise）。

#### 检测手段
1. **XHR/Fetch 拦截**：拦截网络请求，检测媒体文件 URL
2. **Performance API**：通过 `requestAnimationFrame` 循环轮询 `performance.getEntriesByType('resource')` 检测媒体资源
3. **MutationObserver**：监听 DOM 中新增的 `video` 元素
4. **Script 标签解析**：从页面 JSON 数据中提取视频 URL

#### 视频分类
- `main`：主视频（URL 包含 `main`/`product`/`detailVideo`/`5000`）
- `detail`：详情视频

#### 去重规则
- URL 级去重 + 归一化 ID 去重（从 URL pathname 提取文件名作为 ID）

#### Scenario: 成功提取视频
- **WHEN** 页面中存在视频元素或网络请求中有媒体文件
- **THEN** 通过 `tauriBridge.send('VideoUrls', [{url, type, timestamp, pageUrl}])` 上报

### Requirement: PDD 标题/链接/商品ID提取 (pddGetHylinkTitle)
系统 SHALL 从拼多多商品页提取商品标题、商品链接和商品 ID，分别通过 `tauriBridge.send('productTitle', title)`、`tauriBridge.send('productLink', url)`、`tauriBridge.send('productId', id)` 上报。

遵循开发指南 §4.3 GetHylinkTitle 模板：初始化空值 → 等待动态内容 → 提取上报。

#### 标题提取策略
1. `.tLYIg_Ju` 容器内 `span` 文本
2. `.enable-select` 容器内 `span` 文本
3. `.Vrv3bF_E` 容器内 `span` 文本
4. `#main` 容器内第一个有文本的 `span`
5. 兜底：`document.title`

#### 商品 ID 提取
- 从 URL 参数中匹配 `goods_id` 或 `goodsId`

#### 商品链接清洗
- 重构为 `https://mobile.yangkeduo.com/goods.html?goods_id={id}`

#### Scenario: 成功提取标题
- **WHEN** 页面加载完成，标题容器渲染
- **THEN** 通过 tauriBridge 上报 productTitle、productLink、productId

#### Scenario: 标题延迟渲染
- **WHEN** 首次提取标题为兜底值（document.title）
- **THEN** 以 500ms 间隔重试，最多 10 次

### Requirement: PDD 入口脚本 (index.ts)
系统 SHALL 提供 PDD 平台统一入口脚本，编排各模块的执行时序。

遵循开发指南 §3 平台入口标准模板，严格对齐淘宝/京东 `index.ts` 的实现模式。

#### 时序编排
1. **立即执行（document_start）**：`pddGetVideo`（需要拦截网络请求）
2. **DOMContentLoaded 后执行**：`pddGetMain`、`pddGetSku`、`pddGetDetail`、`pddGetHylinkTitle`（并行启动，不阻塞完成判定）

#### iframe 防护
- 入口函数起首检查 `window !== window.top`，若在 iframe 中则直接返回

#### 登录检测
- 使用 `probeAndReportLogin()` 检测登录状态，若需要登录则跳过抓取模块
- PDD 登录选择器：参考 `login/mod.rs` 中 `DefaultLoginStrategy` 的配置

#### 完成判定
- 使用 `waitForCompletion()` 数据驱动完成判定（前端侧辅助）
- 模块后台并行运行，不阻塞完成判定
- 真正的完成判定由 Rust 后端 7 秒数据静默检测实现

#### 验证码检测
- PDD 平台暂无已知验证码选择器，`CAPTCHA_SELECTORS` 设为空数组

#### 模块超时保护
- 每个模块 15 秒超时保护（`withTimeout`），防止单模块卡死

#### 异常处理
- 流程异常时：若已有数据上报则 `completeTask`，否则 `failTask`

### Requirement: 构建脚本注册
`scripts/build-scraper.mjs` 的 `PLATFORMS` 对象 SHALL 包含 `pdd` 入口，指向 `scraper-scripts/pdd/index.ts`。

## MODIFIED Requirements

### Requirement: 构建脚本 (scripts/build-scraper.mjs)
在 `PLATFORMS` 对象中新增 `pdd` 键：
```javascript
const PLATFORMS = {
  taobao: resolve(projectRoot, 'scraper-scripts/taobao/index.ts'),
  jd: resolve(projectRoot, 'scraper-scripts/jd/index.ts'),
  vip: resolve(projectRoot, 'scraper-scripts/vip/index.ts'),
  pdd: resolve(projectRoot, 'scraper-scripts/pdd/index.ts'),
};
```

## REMOVED Requirements
无删除项。
