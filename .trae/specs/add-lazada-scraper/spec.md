# Lazada 抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东、唯品会、1688、拼多多、Shopee 等平台的抓取脚本，但 Lazada（东南亚最大电商平台，覆盖 6 国站点）尚未实现。用户需要通过 PcGetPic 的 Worker 窗口自动加载 Lazada 商品页，提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/lazada/` 目录，包含 7 个 TypeScript 文件（index / lazadaGetMain / lazadaGetSku / lazadaGetDetail / lazadaGetVideo / lazadaGetHylinkTitle / lazadaUtils）
- 在 `scripts/build-scraper.mjs` 中注册 lazada 平台入口
- 在 `src-tauri/src/login/` 中新增 `lazada.rs` 登录策略并注册到 `LoginStrategyRegistry`
- 前端平台注册表和 Rust `Platform` 枚举已有 Lazada 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/lazada/` (新增 7 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/lazada.rs` (新增)
  - `src-tauri/src/login/mod.rs` (注册策略)

## 设计对齐说明

本 Spec 严格遵循项目规范，与淘宝/京东/Shopee 已有实现保持一致：

### 对齐要点
1. **模块结构**：6 文件结构（index + 5 子模块）+ 共享工具文件 `lazadaUtils.ts`，与 Shopee 模式一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与项目规范一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，由 Tauri 宿主接管
4. **保留核心提取逻辑**：Script 标签 JSON 提取（skuGalleries/skuInfos/product.desc）、DOM 选择器、URL 清洗正则、MutationObserver — 全部保留
5. **完成判定**：使用 `waitForCompletion()` 数据静默判定，与淘宝/京东一致
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针，与淘宝入口模板一致

### Lazada 特有的复杂度（非过度设计）
Lazada 页面结构与淘宝/京东有差异，以下逻辑是必需的：
- **`skuGalleries` 括号匹配法**：Lazada 商品主图数据嵌套在 `skuGalleries` JSON 对象中，需要大括号计数法提取完整对象后解析。淘宝用 `__ICE_APP_CONTEXT__`，京东用 `pageConfig`
- **`product.desc` HTML 字符串解析**：Lazada 详情图存储在 `__moduleData__` 的 `product.desc` 字段中，该字段是包含 `<img>` 标签的 HTML 字符串，需要正则提取 src。淘宝/京东的详情图直接从 DOM 容器提取
- **`skuInfos` + `productOption` 双源 SKU 提取**：Lazada SKU 图有两个数据源（`skuInfos[].image` 和 `productOption.skuBase.properties[].values[].image`），需要合并去重
- **Lazada 缩略图后缀**：独有的 `_thumbnail_220x293`、`_square_thumbnail_900x`、`.jpg_400x400q90.jpg_.webp` 等格式，需要专门的正则清理。淘宝/京东的缩略图后缀格式不同
- **6 国站点域名**：lazada.sg / lazada.com.my / lazada.vn / lazada.co.th / lazada.com.ph / lazada.co.id

## ADDED Requirements

### Requirement: Lazada 共享工具模块 (lazadaUtils.ts)
系统 SHALL 提供 Lazada 平台共享的工具函数，供各子模块复用：

#### Scenario: 缩略图后缀清理
- **WHEN** 获取到带缩略图后缀的 Lazada 图片 URL
- **THEN** 按优先级依次清理：`_(?:square_)?thumbnail_\d+x?\d*` → `\.(jpg|jpeg|png|webp|gif)_\d+x\d+[^.]*\.(jpg|jpeg|png|webp|gif)` 双扩展名 → `\.(jpg|jpeg|png|webp|gif)_\d+x\d+$` 尾部尺寸参数 → 去除查询字符串

#### Scenario: 图片 URL 验证
- **WHEN** 需要验证 URL 是否为有效的 Lazada 商品图片
- **THEN** 检查 URL 包含有效图片扩展名（.jpg/.jpeg/.png/.webp/.gif），排除小图标（含 `-tps-`/`-64-64`/`-22-22` 的 URL）

#### Scenario: 大括号计数法 JSON 提取
- **WHEN** 需要从 script 标签文本中提取嵌套 JSON 对象
- **THEN** 通过 `tryParseNestedObject(text, key)` 函数定位 `"key"` 后的 `{`，用大括号计数法找到匹配的 `}`，截取子串后 `JSON.parse()` 解析

#### Scenario: 图片哈希去重
- **WHEN** 需要对图片 URL 去重
- **THEN** 从 URL 路径中提取 `/p/` 后的哈希值或 20+ 位十六进制字符串作为唯一标识

### Requirement: Lazada 主图提取 (lazadaGetMain)
系统 SHALL 从 Lazada 商品页提取所有主图 URL，遵循项目 GetMain 模板（初始化空值 → 提取 → 重试 → 额外抓取 → 上报）：

#### Scenario: skuGalleries 数据提取（主方案）
- **WHEN** 页面 script 标签中包含 `skuGalleries` 数据
- **THEN** 通过 `tryParseNestedObject()` 提取完整 `skuGalleries` 对象，遍历所有 SKU ID，提取 `type !== 'video'` 的条目的 `src` 或 `poster` 字段

#### Scenario: JSON-LD 数据提取（备用方案A）
- **WHEN** 页面存在 `application/ld+json` 类型的 script 标签
- **THEN** 递归搜索 JSON 对象中的 `image` 字段（支持数组和字符串），提取所有图片 URL

#### Scenario: URL 清洗与去重
- **WHEN** 收集到原始图片 URL
- **THEN** 使用 `cleanLazadaImageUrl()` 清理缩略图后缀，使用 `isValidLazadaImageUrl()` 验证，使用 `extractImageHash()` 去重

#### Scenario: 重试与额外抓取
- **WHEN** 首次提取无结果
- **THEN** 以 500ms 间隔最多重试 100 次；有结果后再额外抓取 3 次确保完整

### Requirement: Lazada SKU 图提取 (lazadaGetSku)
系统 SHALL 从 Lazada 商品页提取 SKU 颜色图 URL，遵循项目 GetSku 模板：

#### Scenario: skuInfos 数据提取（主方案）
- **WHEN** 页面 script 标签中包含 `skuInfos` 数据
- **THEN** 通过 `tryParseNestedObject()` 提取 `skuInfos` 对象，遍历所有 SKU ID，提取 `image` 字段

#### Scenario: productOption 数据提取（备用方案A）
- **WHEN** 页面 script 标签中包含 `productOption` 数据
- **THEN** 提取 `productOption.skuBase.properties[].values[]` 中的 `image` 和 `hoverImage` 字段

#### Scenario: URL 清洗与哈希去重
- **WHEN** 收集到原始 SKU 图片 URL
- **THEN** 使用共享工具函数清洗、验证、哈希去重

### Requirement: Lazada 详情图提取 (lazadaGetDetail)
系统 SHALL 从 Lazada 商品页提取详情图 URL，遵循项目 GetDetail 模板：

#### Scenario: product.desc HTML 提取（主方案）
- **WHEN** 页面 script 标签中包含 `__moduleData__` 和 `"desc"` 字段
- **THEN** 优先通过 `tryParseNestedObject()` 提取 `product` 对象后访问 `desc` 字段；失败则用正则 `"desc"\s*:\s*"((?:[^"\\]|\\.)*)"` 提取并解码转义字符；从 HTML 字符串中用 `<img[^>]+src\s*=\s*["']([^"']+)["']` 正则提取所有图片 URL

#### Scenario: DOM 容器提取（备用方案）
- **WHEN** script 标签提取失败
- **THEN** 从 `.pdp-product-desc img`、`.pdp-product-detail img`、`.product-description img`、`.detail-content img`、`.description-content img`、`[class*="description"] img`、`[class*="detail"] img`、`article img` 等选择器提取 `data-src`/`data-original`/`data-lazySrc`/`src` 属性

#### Scenario: URL 清洗（详情图专用）
- **WHEN** 获取到详情图 URL
- **THEN** 使用详情图专用清洗逻辑：匹配第一个有效扩展名位置截断后续内容（处理 `.jpg_80x80q80.jpg_.webp` 等复杂后缀），再移除 `_thumbnail_\d+x\d*` 和 `_\d+x\d+$` 残余后缀

### Requirement: Lazada 视频提取 (lazadaGetVideo)
系统 SHALL 从 Lazada 商品页提取视频 URL，遵循项目 GetVideo 模板（立即启动 → 拦截/检测 → 定时全量检测）：

#### Scenario: Script 标签视频提取
- **WHEN** 页面 script 标签中包含 `gbRawData` 和 `videoUrl`/`video_url` 字段
- **THEN** 通过正则 `"videoUrl"\s*:\s*"([^"]+)"` 和 `"video_url"\s*:\s*"([^"]+)"` 提取；同时尝试解析 `gbRawData` JSON 对象，从 `modules.productInfo.currentSkcImgInfo.videoUrl`、`modules.productInfo.video_url`、`modules.goods_detail.video_url` 路径提取

#### Scenario: DOM 视频标签检测
- **WHEN** 页面中存在 `video`/`source` 标签
- **THEN** 从 `src`、`currentSrc` 属性提取视频 URL，排除 `blob:` 和 `data:` 协议

#### Scenario: HTML 正则全文搜索
- **WHEN** 前两种方式未找到视频
- **THEN** 使用正则在 `document.documentElement.innerHTML` 中搜索 `.mp4`/`.m3u8`/`.webm` 格式的视频 URL

#### Scenario: MutationObserver 动态监听
- **WHEN** 页面 DOM 发生变化且涉及 video 元素
- **THEN** 通过 MutationObserver 检测新增 video 元素或 src 属性变化，防抖 300ms 后重新提取

#### Scenario: 视频数据上报
- **WHEN** 发现视频 URL
- **THEN** 转换为 `{url: '...'}` 对象数组格式，通过 `tauriBridge.send('VideoUrls', ...)` 上报

### Requirement: Lazada 标题/链接/商品ID 提取 (lazadaGetHylinkTitle)
系统 SHALL 从 Lazada 商品页提取商品标题、链接和商品 ID：

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `document.title` 提取标题文本并清理（移除多余空白/换行）；回退到 `h1` 元素、`meta[property="og:title"]`、`[class*="title"]`/`[class*="name"]` 选择器

#### Scenario: 商品 ID 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 优先匹配 `goods_id=(\d+)` 查询参数；回退匹配 `-p-(\d+).html` 路径模式；再回退匹配 9 位以上纯数字；最后从 script 标签中搜索 `"goods_id"\s*:\s*"?(\d+)"?`

#### Scenario: 商品链接清洗
- **WHEN** 提取到商品链接
- **THEN** 仅保留 `origin + pathname`，去除查询参数

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报 `productTitle`、`productLink`、`productId`

### Requirement: Lazada 抓取脚本入口 (index.ts)
系统 SHALL 提供统一的 Lazada 抓取脚本入口，严格遵循项目入口模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `lazadaGetVideo` 模块（MutationObserver 和轮询需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(LAZADA_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块。Lazada 登录选择器：`.login-panel`、`.login-container`、`.login-form`、`[class*="login"]`、`[class*="signin"]`

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `lazadaGetMain`、`lazadaGetSku`、`lazadaGetDetail`、`lazadaGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将 Lazada 平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `lazada: resolve(projectRoot, 'scraper-scripts/lazada/index.ts')`，生成 `dist-scripts/lazada.bundle.js`

### Requirement: Lazada 登录策略
系统 SHALL 在 Rust 后端实现 Lazada 登录检测策略。由于需要 `extract_product_id()` 提取商品 ID（用于 URL 纠偏），必须自定义实现（参考 `jd.rs` 模式，而非 `default.rs`）：

#### Scenario: 登录页检测
- **WHEN** Worker 导航到 Lazada 登录相关 URL
- **THEN** 检测 `login.lazada`、`lazada.com/login`、`lazada.sg/login` 等 6 国站点的登录页面模式，返回 `LoginRequired`

#### Scenario: 验证码检测
- **WHEN** 页面出现 Lazada CAPTCHA
- **THEN** 检测 `lazada.com/verify`、`captcha` 等 URL 模式，返回 `Captcha`

#### Scenario: 商品 ID 提取
- **WHEN** 需要从 URL 提取商品 ID
- **THEN** 匹配 `-p-(\d+).html` 路径格式或 `goods_id=(\d+)` 查询参数格式提取商品 ID

#### Scenario: 平台非商品页检测
- **WHEN** CaptchaBlocked 恢复时
- **THEN** `is_still_on_platform_non_product()` 判断 URL 是否仍在 `lazada.` 域名下但非商品详情页

#### Scenario: 登录 Cookie 检测
- **WHEN** 需要判断是否已有登录态
- **THEN** 检查 `lzd_cid`、`lzd_sid`、`hng` 等 Cookie

#### Scenario: 验证码选择器
- **WHEN** 前端脚本需要检测验证码 DOM 元素
- **THEN** 返回 `[class*="captcha"]`、`[class*="verify"]`、`#nc_1_n1z` 选择器

## MODIFIED Requirements

### Requirement: LoginStrategyRegistry
`LoginStrategyRegistry::new()` SHALL 注册 Lazada 登录策略实例：
```rust
registry.register(Arc::new(lazada::LazadaLoginStrategy));
```

## REMOVED Requirements
无移除项。
