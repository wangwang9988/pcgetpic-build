# 阿里巴巴国际站抓取脚本 Spec

## Why
项目已实现淘宝/京东/唯品会/1688/AliExpress/Amazon 等平台的抓取脚本，但阿里巴巴国际站（alibaba.com）的 `scraper-scripts/alibaba/` 目录尚未创建，导致该平台无法在 Tauri 客户端中正常抓取商品数据。

## What Changes
- 新增 `scraper-scripts/alibaba/` 目录，包含 7 个文件：`abGetMain.ts`、`abGetSku.ts`、`abGetDetail.ts`、`abGetVideo.ts`、`abGetHylinkTitle.ts`、`abGetUtils.ts`、`index.ts`
- 在 `scripts/build-scraper.mjs` 中注册 alibaba 平台入口
- 在 `src-tauri/src/login/mod.rs` 中注册 alibaba 登录策略（使用 DefaultLoginStrategy）
- 前端平台注册（`PLATFORM_PATTERNS`、`PLATFORM_HANDLERS`、`PLATFORM_LABELS`、`PLATFORM_ICONS`）已存在，无需修改
- Rust 侧 `Platform::Alibaba` 枚举变体及 `bundle_name()` 已存在，无需修改

## Impact
- Affected code: `scraper-scripts/`（新增目录）、`scripts/build-scraper.mjs`（新增一行）、`src-tauri/src/login/mod.rs`（新增一行注册）
- 参考来源：`GetPic/entrypoints/modules/alibaba/` 下的 5 个 JS 模块
- 开发指南：`docs/平台抓取脚本开发指南.md`

## ADDED Requirements

### Requirement: 平台特有工具函数 (abGetUtils.ts)
系统 SHALL 提供 `scraper-scripts/alibaba/abGetUtils.ts`，封装阿里巴巴国际站特有的 URL 清洗和辅助函数，供各模块复用。

#### 包含函数
- `normalizeUrl(url)`: 补全 `//` 开头的协议头为 `https:`
- `cleanThumbnailSuffix(url)`: 找到第一个有效图片扩展名后截断，移除缩略图后缀（如 `_350x350.jpg`、`.jpg_.webp`）
- `isPlaceholderUrl(url)`: 判断是否为占位图（含 `-tps-`、`s.gif`、`blank.gif`、`data:image`）
- `isFlagOrIconImage(url)`: 判断是否为标志/图标图片（哈希文件名 UI 检测、尺寸模式检测、路径关键词检测）
- `normalizeCdnUrl(url)`: CDN 域名归一化（alicdn 子域名统一为 img.alicdn.com）
- `extractAlibabaVideoId(url)`: 从视频 URL 提取唯一标识（gv.videocdn.alibaba.com 格式）
- `extractVideoQuality(url)`: 从视频 URL 解析清晰度等级（hd/sd/ld）

### Requirement: 阿里巴巴国际站主图抓取 (abGetMain)
系统 SHALL 从 alibaba.com 商品页的 `<script type="application/ld+json">` 中提取 `@type=Product` 的 `image` 字段作为主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### Scenario: JSON-LD 中存在 Product 数据
- **WHEN** 页面包含 `<script type="application/ld+json">` 且解析出 `@type=Product` 对象
- **THEN** 提取 `image` 字段（支持数组和字符串），使用 `cleanThumbnailSuffix` 清洗 URL，使用 `isPlaceholderUrl` 过滤占位图，使用 `deduplicateUrls` 去重后上报

#### Scenario: JSON-LD 尚未加载
- **WHEN** 首次提取未找到数据
- **THEN** 以 1s 间隔重试，最多 20 次，直到找到有效数据

#### Scenario: 额外抓取
- **WHEN** 首次获取到图片后
- **THEN** 执行 3 轮额外抓取（间隔 500ms），合并去重后最终上报

#### 遵循开发指南
- 初始空上报 `await tauriBridge.send('MainPic', [])`
- 使用 `deduplicateUrls` 和 `sleep` from `shared/utils`
- 使用 `cleanThumbnailSuffix` 和 `isPlaceholderUrl` from `./abGetUtils`

### Requirement: 阿里巴巴国际站SKU图抓取 (abGetSku)
系统 SHALL 从 `[data-testid="sku-info"]`、`[data-testid="sku-list"]`、`[data-testid="sku-list-item"]` 容器中提取 SKU 图片 URL，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### Scenario: SKU 容器存在
- **WHEN** 页面包含 SKU 相关 data-testid 容器
- **THEN** 提取容器内 `img` 标签的 `src` 属性，使用 `cleanThumbnailSuffix` 清洗 URL，去重后上报

#### Scenario: SKU 容器尚未渲染
- **WHEN** 首次提取未找到容器
- **THEN** 以 500ms 间隔重试，最多 30 次

#### Scenario: 动态变化
- **WHEN** 用户切换 SKU 选项导致图片变化
- **THEN** MutationObserver 检测到变化后防抖重新扫描上报

#### 遵循开发指南
- 初始空上报 `await tauriBridge.send('SkuPic', [])`
- 精确监听 SKU 容器（而非 document.body），监听 attributes 变化（src, data-src）
- 返回清理函数，同时清理 MutationObserver 和轮询定时器
- 使用 `deduplicateUrls` from `shared/utils`

### Requirement: 阿里巴巴国际站详情图抓取 (abGetDetail)
系统 SHALL 通过多种方式提取详情图：iframe 内容提取、主文档容器提取、MutationObserver + IntersectionObserver 持续监听，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### Scenario: 从 iframe 中提取详情图
- **WHEN** 页面 `#container` 下存在同源 iframe
- **THEN** 提取 iframe 内 `img[data-src]` 和 `img[src]`，过滤占位图和标志图，清洗后上报

#### Scenario: 从主文档容器提取详情图
- **WHEN** 页面存在 `[data-module-name*="module_structure_description"]` 等详情容器
- **THEN** 提取容器内图片 URL，过滤占位图/标志/图标图，清洗后上报

#### Scenario: 动态内容加载
- **WHEN** MutationObserver 检测到新的 iframe 或详情容器插入
- **THEN** 自动提取新内容中的图片 URL 并增量上报

#### 遵循开发指南
- 初始空上报 `await tauriBridge.send('DetailPic', [])`
- 重试等待容器出现（最多 20 次，间隔 1s）
- 多轮提取（5 轮，间隔 2s），每轮扫描容器和 iframe
- 返回清理函数，同时清理 MutationObserver、IntersectionObserver 和轮询定时器
- 使用 `cleanImageUrl`、`deduplicateUrls`、`sleep` from `shared/utils`
- 使用 `isPlaceholderUrl`、`isFlagOrIconImage`、`normalizeCdnUrl` from `./abGetUtils`

### Requirement: 阿里巴巴国际站视频抓取 (abGetVideo)
系统 SHALL 通过两层架构提取视频 URL，通过 `tauriBridge.send('VideoUrls', videoData)` 上报。

#### 立即启动层（run() 被调用时即执行）
- 清空历史状态
- 启动 XHR 拦截
- 启动 Fetch 拦截
- 启动 Performance API 增量监控（requestAnimationFrame 循环）

#### DOMContentLoaded 后启动层
- 注册 MutationObserver 监听 `<video>` 和 `<script>` 新增
- 延时梯度扫描（1s/3s/5s/10s）：提取页面内嵌 JSON、检查 window 全局变量、扫描视频容器 DOM
- 模拟用户交互触发懒加载
- iframe 内视频提取（带重试机制）
- 注入脚本嗅探页面全局变量中的视频链接

#### Scenario: 清晰度优先去重
- **WHEN** 同一视频存在多清晰度版本（hd/sd/ld）
- **THEN** 保留最高清晰度版本，丢弃低清晰度版本

#### Scenario: 视频分类
- **WHEN** 发现视频 URL
- **THEN** 根据平台特征判断为主图视频（main）或详情视频（detail），上报格式 `{ url, type, timestamp, pageUrl }`

#### 遵循开发指南
- 使用 `extractAlibabaVideoId` 和 `extractVideoQuality` from `./abGetUtils`
- 双重去重：原始 URL 集合 + 归一化视频 ID 集合
- 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加回写
- 返回清理函数，清理 MutationObserver、rAF 循环、XHR/Fetch 拦截

### Requirement: 阿里巴巴国际站标题链接抓取 (abGetHylinkTitle)
系统 SHALL 从 JSON-LD 的 Product 数据中提取商品标题和 ID，从 URL 中提取商品 ID，输出全部四个字段。

#### 必须输出的四个字段
| 字段 | key | 说明 |
|------|-----|------|
| 商品标题 | `productTitle` | 优先 JSON-LD Product.name，降级 DOM 选择器或 document.title |
| 商品ID | `productId` | 优先 URL 路径 `_(\d+)\.html` 模式，降级 JSON-LD Product.@id |
| 商品链接 | `productLink` | 移除查询参数，仅保留 origin + pathname |
| 访问时间 | `visitTime` | 格式 `YYYY-MM-DD HH:mm` |

#### Scenario: JSON-LD 中存在 Product 数据
- **WHEN** 页面包含 `<script type="application/ld+json">` 且解析出 `@type=Product` 对象
- **THEN** 提取 `name` 作为标题，`@id` 作为商品 ID

#### Scenario: JSON-LD 不可用
- **WHEN** 无法从 JSON-LD 提取数据
- **THEN** 降级使用 DOM 选择器 `.mainTitle--R75fTcZL` 的 title 属性或 document.title

#### 遵循开发指南
- 初始空上报 `productTitle`/`productLink`/`productId` 为空字符串
- 等待动态内容加载（重试检测 JSON-LD 出现）
- 使用 `getProductId` from `shared/utils` 作为兜底

### Requirement: 统一入口脚本 (index.ts)
系统 SHALL 提供与开发指南标准模板一致的入口编排。

#### 关键流程
1. iframe 防护（`window !== window.top` 检查）
2. 立即启动视频拦截模块（document_start 阶段）
3. DOMContentLoaded 后：
   - 登录检测（`probeAndReportLogin`）
   - 模拟滚动（`simulateScroll`）
   - 验证码检测（`setupCaptchaWatcher`）
   - 四个模块（Main/Sku/Detail/HylinkTitle）后台并行运行
   - 数据驱动完成判定（`waitForCompletion`）
4. 异常处理：有数据则 `completeTask`，无数据则 `failTask`

#### 登录选择器
```typescript
const LOGIN_SELECTORS: string[] = [];
```
阿里巴巴国际站通常不需要登录即可查看商品详情页，登录选择器留空。

#### 验证码选择器
```typescript
const CAPTCHA_SELECTORS: string[] = [];
```
阿里巴巴国际站商品页暂无已知验证码机制，留空。

### Requirement: 构建注册
系统 SHALL 在 `scripts/build-scraper.mjs` 的 PLATFORMS 对象中注册 `alibaba` 入口路径。

### Requirement: 登录策略注册
系统 SHALL 在 `src-tauri/src/login/mod.rs` 中为 alibaba 平台注册 DefaultLoginStrategy，登录域名为 `login.alibaba.com`。
