# 敦煌网(DHgate)抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东、唯品会、1688、亚马逊等 10 个平台的抓取脚本，但敦煌网（DHgate，中国领先的小额批发跨境电商平台）尚未实现。平台识别层（Rust 枚举、前端 Handler/注册表/模式）已完整配置，但核心功能层（Scraper 抓取脚本、构建脚本注册、登录策略）缺失。用户需要通过 PcGetPic 的 Worker 窗口自动加载敦煌网商品页，提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/dhgate/` 目录，包含 6 个 TypeScript 模块（index / dhgateGetMain / dhgateGetSku / dhgateGetDetail / dhgateGetVideo / dhgateGetHylinkTitle）
- 在 `scripts/build-scraper.mjs` 中注册 dhgate 平台入口
- 在 `src-tauri/src/login/` 中使用 `DefaultLoginStrategy` 注册敦煌网登录策略
- 前端平台注册表和 Rust `Platform` 枚举已有 Dhgate 支持，无需修改

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/dhgate/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)
  - `src-tauri/src/login/mod.rs` (注册 DefaultLoginStrategy)

## 设计对齐说明

本 Spec 严格遵循 `docs/平台抓取脚本开发指南.md` 的规范，与淘宝/京东已有实现保持一致：

### 对齐开发指南的要点
1. **模块结构**：6 文件结构（index + 5 子模块），与淘宝/京东完全一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与指南一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，与指南 3.2 节一致
4. **保留核心提取逻辑**：DOM 选择器、JSON-LD 解析、Next.js script 数据提取、URL 编码图片提取、URL 清洗正则、MutationObserver、XHR/Fetch 拦截、Performance API — 全部保留，与指南 4.x 节一致
5. **完成判定**：使用 `waitForCompletion()` 前端辅助 + Rust 后端 7 秒静默自动完成，与指南第一/六章一致
6. **入口模板**：iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测，与指南第三章模板一致
7. **共享 sleep**：使用 `import { sleep } from '../shared/utils'`，不在模块内重复定义，与指南 4.1 第5条一致
8. **GetSku 返回清理函数**：返回同时清理 Observer 和定时器的函数，与指南 4.3 推荐范式一致
9. **GetSku 精确监听**：监听特定 SKU 容器 + 属性变化（src、data-src），与指南 4.3 推荐范式一致
10. **GetHylinkTitle 四字段**：必须输出 `productTitle`、`productLink`、`productId`、`visitTime`，与指南 4.6 一致
11. **优先使用共享清洗函数**：通用场景优先使用 `cleanImageUrl()`（来自 `shared/utils`），仅敦煌网特有清洗（`/webp/m/\d+x\d+/` → `/webp/m/0x0/`）在模块内自定义，与指南 7.3 一致
12. **GetVideo Performance API 增量检测**：使用游标增量检测 + `requestAnimationFrame` 持续轮询，与指南 4.5 京东/1688 做法一致

### 敦煌网特有逻辑（非过度设计）
敦煌网页面结构与淘宝/京东有本质差异，以下逻辑是必需的：
- **三重主图提取策略**：JSON-LD `@type=Product` 的 `image` 字段 + Next.js `prodImg.oriImgList` + DOM `[spm-c="imagelist"]` 容器，三种方式独立提取后汇总去重。淘宝/京东仅使用 DOM + 内嵌脚本两种方式
- **Next.js script 数据提取**：敦煌网使用 Next.js SSR，商品数据存储在 `self.__next_f.push()` 中，需要从 HTML 源码中正则匹配提取。淘宝/京东使用 `__ICE_APP_CONTEXT__` 或 `pageConfig`
- **URL 编码图片提取**：详情图片在 Next.js script 中以 URL 编码形式存在（如 `%2F%2Fimg4.dhresource.com%2Fwebp%2Fm%2F`），需要 `decodeURIComponent()` 解码。淘宝/京东无此问题
- **高清原图还原**：敦煌网图片 URL 包含尺寸参数（如 `/webp/m/100x100/`），需替换为 `/webp/m/0x0/` 获取原图。淘宝/京东仅需截断到扩展名
- **Unicode URL 解码**：部分 URL 包含 `\uXXXX` 转义序列，需要解码。淘宝/京东无此问题
- **SKU 数据结构**：SKU 图片存储在 `prodSku.itemAttrList` 的 `picUrl`/`pic0x0Url` 字段和 `attachImgVo.oriImgList` 中，需要多种正则模式提取。淘宝/京东使用 DOM 选择器即可

## ADDED Requirements

### Requirement: 敦煌网主图提取 (dhgateGetMain)
系统 SHALL 从敦煌网商品页提取所有主图 URL，遵循开发指南 GetMain 模板（初始化空值 → 重试获取 → 额外探测 → 上报）：

#### Scenario: 三源汇总提取（gatherAllImages）
- **WHEN** 调用 `gatherAllImages()` 收集图片
- **THEN** 依次执行三路提取并汇总去重：
  1. **JSON-LD 提取**：从 `script[type="application/ld+json"]` 解析 `@type=Product` 的 `image` 字段，支持字符串和数组格式，解码 Unicode 转义序列
  2. **Next.js prodImg 提取**：从 HTML 中 `prodImg` 数据块后 8000 字符范围内提取 `dhresource.com/dhgate.com` 的 `/albu/` 路径图片；备用：匹配 `seoOriImgList` 数组中的 URL
  3. **DOM imagelist 提取**：从 `[spm-c="imagelist"]` 容器内 `img` 元素的 `src`/`data-src` 提取
  4. **DOM 备用**（三路均空时）：从 `.masterMap_smallMapList__JTkBX img`、`.masterMap_bigMap__f74jp img` 提取；进一步备用：`img[src*="dhresource.com"]` 且含 `/albu/`

#### Scenario: 高清原图 URL 还原（cleanDhgateImageUrl）
- **WHEN** 获取到带尺寸参数的敦煌网图片 URL（如 `/webp/m/100x100/`）
- **THEN** 补全相对协议（`//` → `https://`），将 `/webp/m/\d+x\d+/` 替换为 `/webp/m/0x0/`，将 `/\d+x\d+/` 替换为 `/0x0/`，解码 Unicode 转义序列

#### Scenario: 重试+额外探测模式
- **WHEN** `run()` 执行
- **THEN** 初始空上报 `MainPic: []` → 循环重试 `gatherAllImages()`（MAX_RETRIES × RETRY_INTERVAL）→ 获取到图片后额外抓取（MAX_EXTRA_FETCHES × RETRY_INTERVAL）→ 最终上报 `MainPic: images`

#### Scenario: 使用共享工具
- **WHEN** 需要延时或去重
- **THEN** 使用 `import { sleep, deduplicateUrls } from '../shared/utils'`，不重复定义本地 `sleep`

### Requirement: 敦煌网 SKU 图提取 (dhgateGetSku)
系统 SHALL 从敦煌网商品页提取 SKU 变体图片 URL，遵循开发指南 GetSku 模板（初始化空值 → DOM 扫描 → MutationObserver → 轮询兜底 → 返回清理函数）：

#### Scenario: Next.js prodSku 数据提取（方案1）
- **WHEN** 页面 HTML 中包含 `prodSku` 数据
- **THEN** 从 `itemAttrList` 的 `picUrl`/`pic0x0Url` 字段提取 SKU 图片；从 `attachImgVo.oriImgList` 提取附加 SKU 图片；从 `prodSku` 块中提取所有 `/albu/` 路径的 dhresource 图片；从 `attrValName` 上下文的 `picUrl` 提取

#### Scenario: DOM spm-c="sku" 容器提取（方案2）
- **WHEN** 页面存在 `div[spm-c="sku"]` 容器
- **THEN** 从容器内所有 `img` 元素的 `src`/`data-src` 属性提取 dhresource.com/dhgate.com 域名的图片 URL

#### Scenario: DOM 通用备用方案（方案3）
- **WHEN** 前两种方案均失败
- **THEN** 按优先级尝试 7 个 SKU 选择器：`.sku_item img`、`.skuAttrvalListMod_attrValItem img`、`[class*="attrValItem"] img`、`[class*="sku"] img[src*="dhresource"]`、`[class*="skuImageType"] img`、`[class*="imageTypeItem"] img`、`.masterMap_smallMapList__JTkBX img`

#### Scenario: SKU 图片高清还原
- **WHEN** 获取到 SKU 图片 URL
- **THEN** 应用 `cleanDhgateImageUrl()` 还原高清原图（替换尺寸参数 + Unicode 解码 + 相对协议补全）

#### Scenario: 精确监听 + 属性变化
- **WHEN** 注册 MutationObserver
- **THEN** 精确监听 SKU 容器（`div[spm-c="sku"]` 等），而非 `document.body`；同时监听 `attributes` 变化（`src`、`data-src`），因为图片可能仅改变属性而不新增 DOM 节点

#### Scenario: 返回清理函数
- **WHEN** `run()` 执行完成
- **THEN** 返回 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }` 清理函数，同时清理 Observer 和定时器，防止内存泄漏

### Requirement: 敦煌网详情图提取 (dhgateGetDetail)
系统 SHALL 从敦煌网商品页提取详情区域的图片，遵循开发指南 GetDetail 模板（初始化空值 → 容器查找 → 多轮提取 → URL 清洗 → 上报）：

#### Scenario: URL 编码的 Next.js script 提取（主方案）
- **WHEN** 页面 HTML 中包含 URL 编码的图片数据（`%2F%2Fimg4.dhresource.com%2Fwebp%2Fm%2F` 或 `https%3A%2F%2F` 格式）
- **THEN** 使用 4 个正则模式匹配 URL 编码的图片 URL，`decodeURIComponent()` 解码后提取，支持 dhresource.com 和 image/img*.dhgate.com 域名

#### Scenario: descriptionFirstImgUrl 备用提取
- **WHEN** URL 编码方案未找到图片
- **THEN** 从 `"descriptionFirstImgUrl":"..."` 提取首张详情图

#### Scenario: DOM 容器提取
- **WHEN** 页面存在 `.product-details` 或 `#descWrap` 容器
- **THEN** 从容器内所有 `img` 标签的 `src`/`data-src`/`_src` 属性提取图片 URL

#### Scenario: 详情图 URL 清洗
- **WHEN** 获取到详情图 URL
- **THEN** 截断图片扩展名后的多余内容（如 `%22`、查询参数），应用 `getDhgateOriginalUrl()` 高清还原（替换 `/webp/m/\d+x\d+/` 为 `/webp/m/0x0/`，移除 `_\d+x\d+\.` 缩放后缀）

#### Scenario: 重试等待容器 + 多轮提取
- **WHEN** `run()` 执行
- **THEN** 初始空上报 `DetailPic: []` → 重试等待容器出现（MAX_CONTAINER_RETRIES）→ 多轮提取（EXTRACTION_PASSES）→ 去重清洗 → 最终上报

### Requirement: 敦煌网视频提取 (dhgateGetVideo)
系统 SHALL 从敦煌网商品页提取视频 URL，遵循开发指南 GetVideo 模板（立即启动 → 拦截注册 → DOM 检测 → 定时全量检测）：

#### Scenario: 立即启动层（run() 被调用时即执行）
- **WHEN** `run()` 被调用（document_start 阶段）
- **THEN** 清空历史状态 → 启动 XHR 拦截 → 启动 Fetch 拦截 → 启动 Performance API 增量监控（`requestAnimationFrame` 循环 + 游标增量检测）

#### Scenario: DOMContentLoaded 后启动层
- **WHEN** DOM 加载完成
- **THEN** 注册 MutationObserver 监听 `<video>` 和 `<script>` 新增 → 延时梯度扫描（10 次，每秒一次）→ 首次执行时模拟用户交互触发懒加载

#### Scenario: 网络请求拦截
- **WHEN** 页面发起 XHR/Fetch 请求
- **THEN** 拦截请求，检测响应 URL 和响应体中的视频 URL（mp4/m3u8/flv/webm 格式），递归搜索 JSON 响应体

#### Scenario: 视频分类与过滤
- **WHEN** 发现视频 URL
- **THEN** 分类为主图视频（main：包含 `/videos/`、`/video/`、`cloudv-transfer`、`product-videos` 等）或详情视频（detail），过滤广告（advertisement、banner、commercial、promo）

#### Scenario: 双重去重
- **WHEN** 发现新视频 URL
- **THEN** 使用原始 URL 集合（`foundVideoUrls`）+ 归一化视频 ID 集合（`normalizedVideoIds`）双重去重

#### Scenario: 视频增量上报
- **WHEN** 发现新视频
- **THEN** 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写 `tauriBridge.send('VideoUrls', videos)`

#### Scenario: JSON 嗅探器
- **WHEN** 页面加载
- **THEN** 扫描 `window` 全局变量（`__INITIAL_STATE__`、`__NEXT_DATA__`、`__REDUX_STATE__`、`videoBlock`、`productVideoData` 等）中的视频 URL

### Requirement: 敦煌网标题/链接/商品ID/访问时间 提取 (dhgateGetHylinkTitle)
系统 SHALL 从敦煌网商品页提取商品标题、链接、商品 ID 和访问时间，遵循开发指南 GetHylinkTitle 模板（初始化空值 → 等待动态内容 → 提取 → 上报）：

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `#productTitle` 元素提取标题文本；回退到 `head title` 标签并移除 ` - DHgate.com` / ` | DHgate` 等后缀

#### Scenario: 商品 ID 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 匹配 `/product/xxxxx/(\d+).html` 格式提取数字 ID；备用方案：从 URL 参数 `resource_id`/`itemCode`/`productId` 提取；最终备用：从 DOM `input#itemCode`/`input[name="itemCode"]` 提取

#### Scenario: URL 清洗
- **WHEN** 获取到商品链接
- **THEN** 使用 `cleanDhgateProductUrl()` 移除查询参数和 hash，仅保留 `origin + pathname`

#### Scenario: 四字段上报
- **WHEN** 提取完成
- **THEN** 通过 `tauriBridge.send` 上报四个字段：`productTitle`、`productLink`、`productId`、`visitTime`（格式 `YYYY-MM-DD HH:mm`）

### Requirement: 敦煌网抓取脚本入口 (index.ts)
系统 SHALL 提供统一的敦煌网抓取脚本入口，严格遵循开发指南第三章标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `dhgateGetVideo` 模块（网络拦截需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin(DHGATE_LOGIN_SELECTORS)` 检测是否需要登录，若需要则跳过抓取模块。敦煌网登录选择器暂定为空数组（使用 `loginProbe.ts` 内置通用选择器）

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `dhgateGetMain`、`dhgateGetSku`、`dhgateGetDetail`、`dhgateGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 验证码检测
- **WHEN** 页面出现验证码元素
- **THEN** 通过 MutationObserver 检测验证码出现/消失，发送 `captcha-detected`/`captcha-resolved` 事件（节流上限 3 次）。敦煌网验证码选择器暂定为空数组

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成）

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将敦煌网平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `dhgate: resolve(projectRoot, 'scraper-scripts/dhgate/index.ts')`，生成 `dist-scripts/dhgate.bundle.js`

### Requirement: 敦煌网登录策略
系统 SHALL 在 Rust 后端注册敦煌网登录检测策略。由于敦煌网登录流程简单（跳转型登录），使用 `DefaultLoginStrategy` 即可：

#### Scenario: 登录页检测
- **WHEN** Worker 导航到敦煌网登录相关 URL
- **THEN** 检测 `login.dhgate.com` 等登录页面模式，返回 `LoginRequired`

## MODIFIED Requirements

### Requirement: LoginStrategyRegistry
`LoginStrategyRegistry::new()` SHALL 注册敦煌网登录策略实例：
```rust
registry.register(Arc::new(default::DefaultLoginStrategy::new(
    "dhgate",
    &["login.dhgate.com"],
    &[],
)));
```

## REMOVED Requirements
无移除项。
