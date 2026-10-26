# SHEIN 平台抓取脚本 Spec

## Why
项目已支持淘宝、京东、唯品会、1688 等平台的图片/视频抓取，但尚未实现 SHEIN 平台的抓取脚本。SHEIN 是全球头部跨境电商平台，用户有强烈的商品图片批量下载需求。参考项目 `GetPic` 中已有完整的 SHEIN 抓取实现（5 个模块），需要将其适配到 Tauri 架构中，严格遵循 `docs/平台抓取脚本开发指南.md` 中的最佳实践。

## What Changes
- 新增 `scraper-scripts/shein/` 目录，包含 6 个模块：`index.ts`、`sheinGetMain.ts`、`sheinGetDetail.ts`、`sheinGetSku.ts`、`sheinGetVideo.ts`、`sheinGetHylinkTitle.ts`
- 新增 `src/utils/platforms/shein.ts` 平台 Handler（URL 清洗 + 商品 ID 提取）
- 修改 `scripts/build-scraper.mjs` 注册 shein 平台入口
- 修改 `src-tauri/src/login/mod.rs` 注册 SHEIN 登录策略（使用 DefaultLoginStrategy）

## Impact
- Affected specs: 平台抓取能力扩展
- Affected code:
  - `scraper-scripts/shein/` (新增)
  - `src/utils/platforms/shein.ts` (新增)
  - `scripts/build-scraper.mjs` (修改)
  - `src-tauri/src/login/mod.rs` (修改)

## 已有基础设施（无需修改）
以下 SHEIN 相关配置已存在于项目中，无需新增：
- `src-tauri/src/platform_resolver.rs` — `Platform::Shein` 枚举变体、`from_url()` 匹配 `shein.`、`bundle_name()` 返回 `"shein"`
- `src/utils/platforms/index.ts` — `PLATFORM_PATTERNS.shein`（8 个域名正则）、`PLATFORM_LABELS.shein = 'SHEIN'`、`PLATFORM_ICONS.shein = '💃'`
- `src/utils/platforms/registry.ts` — `sheinHandler` 已注册（但 `shein.ts` 文件不存在，需创建）
- `src-tauri/src/utils.rs` — `get_platform_label("shein") => "SHEIN"`

## ADDED Requirements

### Requirement: 全局编码规范
所有 SHEIN 模块 SHALL 遵循以下开发指南强制要求：

1. **共享 `sleep`**：必须使用 `import { sleep } from '../shared/utils'`，禁止本地定义 `sleep` 函数
2. **共享 `cleanImageUrl`**：优先使用 `shared/utils` 的 `cleanImageUrl()` 进行通用 URL 清洗，仅在 SHEIN 有特殊缩略图后缀时才在模块内自定义清洗逻辑
3. **共享 `deduplicateUrls`**：使用 `shared/utils` 的 `deduplicateUrls()` 进行 URL 去重
4. **初始空上报**：模块入口处先 `await tauriBridge.send(key, [])` 或 `await tauriBridge.send(key, '')` 清空旧数据
5. **增量上报**：当数据可能动态增加时，每次检测到变化立即 `tauriBridge.send()`，由 tauriBridge 内部去重保护避免重复触发时间戳更新
6. **清理函数**：注册了 MutationObserver/setInterval 的模块**必须**返回清理函数，同时清理 Observer 和定时器

---

### Requirement: SHEIN 主图抓取 (sheinGetMain)
系统 SHALL 从 SHEIN 商品页提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### 数据来源（三层提取）
1. **Script 标签提取** — 从页面 `<script>` 内容中提取：
   - `origin_image` 字段：正则 `/"origin_image"\s*:\s*"([^"]+)"/g`，过滤必须包含 `ltwebstatic`
   - `skcImages` 数组：正则 `/"skcImages"\s*:\s*\[([\s\S]*?)\]/g`，内部提取 `ltwebstatic` URL
   - `skuImages` 对象：正则 `/"skuImages"\s*:\s*\{([^}]+)\}/g`，内部提取 `ltwebstatic` URL
   - `goodsDetailSchema` JSON-LD：提取 ProductGroup 的 image 数组和 hasVariant 中每个 Product 的 image 字段
2. **DOM 提取** — 从 `.main-picture` 容器内提取：
   - `.crop-image-container[data-before-crop-src]` 属性
   - `img` 标签的 `data-src`（懒加载）和 `src`（已加载）

#### URL 清洗规则
1. `//` 开头 → 补 `https:`
2. 移除 SHEIN 特有缩略图后缀：`_(?:square_)?thumbnail_\d+x?\d*`（如 `_thumbnail_220x293`、`_square_thumbnail_900x`）
3. 移除查询字符串

#### 执行模式（重试获取 + 额外探测）
```
1. 初始空上报 MainPic: []
2. 循环重试（MAX_RETRIES=40 × RETRY_INTERVAL=500ms）
   ↓ 每轮调用 gatherAllImages()（合并 Script + DOM 两路结果）
   ↓ 若获取到图片 → 跳出重试循环
3. 额外抓取（MAX_EXTRA_FETCHES=3 × RETRY_INTERVAL=500ms）
   ↓ 再次调用 gatherAllImages() 合并去重
4. 最终上报 MainPic: images
```

#### Scenario: 成功提取主图
- **WHEN** 用户输入 SHEIN 商品页 URL 并开始抓取
- **THEN** 系统从 Script 标签和 DOM 容器中提取主图 URL，清洗后去重，通过 `tauriBridge.send('MainPic', urls)` 上报

#### Scenario: 页面异步渲染未完成
- **WHEN** 首次提取无结果
- **THEN** 系统以 500ms 间隔重试，最多 40 次（20 秒），获取到图片后额外抓取 3 次确保完整

---

### Requirement: SHEIN 详情图抓取 (sheinGetDetail)
系统 SHALL 从 SHEIN 商品页提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### DOM 选择器（9 个）
```typescript
const selectors = [
  '.product-intro__description img',
  '.product-intro__description-table img',
  '.j-pro-desc img',
  '.product-detail-img',
  '.desc-container img',
  '.detail-description img',
  '#goodsDetail img',
  '.product-description img',
  '.details-pic__img img',
];
```

#### 图片属性提取优先级
`data-src` → `data-original` → `data-lazySrc` → `src`

#### background-image 提取
从 `.product-intro__description` 内的 `[style*="background-image"]` 元素提取 CSS 背景图 URL

#### URL 清洗规则
1. `//` 开头 → 补 `https:`
2. 移除查询字符串
3. 移除 SHEIN 特有缩略图后缀 `_thumbnail_\d+x\d+`
4. 移除尺寸后缀 `_\d+x\d+$`

#### 排除路径模式
`/flags/`、`/avatar/`、`/review/`、`/icon`、`/logo`、`/sprite`、`/placeholder`、`/loading`、`/default`、`/s.gif`、`/badge`、`/tag`、`/acp/`

#### 执行模式（重试等待容器 + 多轮遍历 + MutationObserver 持续监听）
```
1. 初始空上报 DetailPic: []
2. 重试等待容器出现（MAX_CONTAINER_RETRIES=5 × RETRY_DELAY_MS=1000）
3. 多轮提取（EXTRACTION_PASSES=3 × PASS_DELAY_MS=2000）
   ↓ 每轮扫描 9 个选择器容器 + background-image
   ↓ 排除路径模式过滤
4. 最终上报 DetailPic
5. MutationObserver 持续监听（返回清理函数）
   ↓ 检测到图片增加 → 增量上报
```

#### Scenario: 成功提取详情图
- **WHEN** SHEIN 商品页 DOM 加载完成
- **THEN** 系统扫描 9 个选择器容器 + background-image，清洗后去重上报

#### Scenario: 懒加载延迟渲染
- **WHEN** 详情图使用懒加载
- **THEN** MutationObserver 监听 DOM 变化触发重新提取并增量上报，返回清理函数供主流程统一销毁

---

### Requirement: SHEIN SKU 图抓取 (sheinGetSku)
系统 SHALL 从 SHEIN 商品页提取 SKU/颜色图 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### 数据来源
1. **Script 标签提取** — 只提取 `goods_image` 字段（完整商品图 1340x1785），不提取 `goods_color_image`（颜色色块小图 80x80）
   - 正则：`/"goods_image"\s*:\s*"([^"]+)"/g`，过滤必须包含 `ltwebstatic`
2. **DOM 提取**（三种方法）：
   - `.purchase-control` 内的 `.bs-attr-crop-image-container[data-before-crop-src]`
   - `img.bs-attr-crop-image-container__img` 的 `data-src` 和 `src`
   - `.main-sales-attr__color [data-before-crop-src]`

#### URL 清洗规则
与主图相同：移除 `_(?:square_)?thumbnail_\d+x?\d*` + 查询字符串

#### 去重机制
基于图片文件名哈希值去重（同一张图片可能有 `.webp` 和 `.jpg` 两种扩展名）

#### 执行模式（初始获取 + MutationObserver 精确监听 + 轮询兜底 + 返回清理函数）
```
1. 初始空上报 SkuPic: []
2. 首轮扫描 scanDomContainers()
   ↓ 有结果 → 立即上报
3. 注册 MutationObserver 精确监听 SKU 容器
   ↓ 监听目标：.purchase-control、.main-sales-attr__color（而非 document.body）
   ↓ 监听属性变化：src、data-src、data-original
   ↓ 图片数量增加 → 防抖后重新扫描上报
4. 轮询兜底（MAX_POLLS=10 × POLL_INTERVAL=3000）
   ↓ 首轮无结果时启动
   ↓ 获取到结果时停止
5. 返回清理函数：() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }
```

#### Scenario: 成功提取 SKU 图
- **WHEN** SHEIN 商品页加载完成
- **THEN** 系统从 Script 标签和 DOM 容器中提取 SKU 图，清洗后哈希去重上报

---

### Requirement: SHEIN 视频抓取 (sheinGetVideo)
系统 SHALL 从 SHEIN 商品页提取视频 URL，通过 `tauriBridge.send('VideoUrls', [{url, type, timestamp, pageUrl}])` 上报。

#### 数据来源
1. **Script 标签提取**（三种方法）：
   - `videoUrl` 字段：`/"videoUrl"\s*:\s*"([^"]+)"/g`
   - `video_url` 字段：`/"video_url"\s*:\s*"([^"]+)"/g`
   - JSON 解析 `gbRawData`：提取 `data?.modules?.productInfo?.currentSkcImgInfo?.videoUrl`、`data?.modules?.productInfo?.video_url`、`data?.modules?.goods_detail?.video_url`
2. **DOM 提取**：
   - `video` 元素的 `src` 属性
   - `video > source` 元素的 `src` 属性
   - 独立的 `source` 元素
3. **XHR/Fetch 拦截**（立即启动层）：
   - 劫持 `XMLHttpRequest.prototype.send`，监听响应中的视频 URL
   - 劫持 `window.fetch`，解析 JSON 响应中的视频 URL
4. **Performance API 增量监控**（立即启动层）：
   - 使用 `performance.getEntriesByType('resource')` + 游标增量检测
   - `requestAnimationFrame` 持续轮询

#### 视频有效性验证
- 排除 `blob:` 和 `data:` URL
- 排除 API 接口链接（`api-shein`、`/h5/playvimeo`、`/api/`、`?video_url=`）
- 通过扩展名判断：`.mp4`、`.m3u8`、`.webm`、`.mov`

#### 视频分类
区分主图视频（main）和详情视频（detail），上报格式：
```typescript
const videoObj = {
  url: videoUrl,
  type: 'main' | 'detail',
  timestamp: Date.now(),
  pageUrl: window.location.href
};
```

采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写。

#### 双重去重
- 原始 URL 集合 `foundVideoUrls`
- 归一化视频 ID 集合 `normalizedVideoIds`（从 URL 路径提取视频标识符）

#### 执行模式（多手段、尽早介入的无限制截获）
```
【立即启动层】（run() 被调用时即执行，不等待 DOMContentLoaded）
1. 清空历史状态
2. 启动 XHR 拦截
3. 启动 Fetch 拦截
4. 启动 Performance API 增量监控（requestAnimationFrame 循环）

【DOMContentLoaded 后启动层】
5. 注册 MutationObserver 监听 <video> 和 <script> 新增
6. 延时梯度扫描（1s/3s/5s/10s）
   ↓ 提取页面内嵌 JSON（Script 标签）
   ↓ 扫描视频容器 DOM
```

#### Scenario: 成功提取视频
- **WHEN** SHEIN 商品页包含视频
- **THEN** 系统从 Script 标签、DOM、网络拦截中提取视频 URL，验证有效性后分类上报

#### Scenario: 视频动态加载
- **WHEN** 视频元素延迟出现
- **THEN** MutationObserver 监控 `video` 元素新增和 `src` 变化（300ms 防抖），Performance API 持续检测新资源

---

### Requirement: SHEIN 标题/链接/商品ID/访问时间抓取 (sheinGetHylinkTitle)
系统 SHALL 从 SHEIN 商品页提取商品标题、链接、ID 和访问时间，分别通过 `tauriBridge.send()` 上报。

#### 必须输出的四个字段

| 字段 | key | 说明 |
|------|-----|------|
| 商品标题 | `productTitle` | 优先从特定 DOM 获取，兜底 `document.title` |
| 商品ID | `productId` | 优先 URL 参数 `goods_id`，兜底路径和 Script 标签 |
| 商品链接 | `productLink` | 只保留 origin + pathname，移除查询参数 |
| 访问时间 | `visitTime` | 格式 `YYYY-MM-DD HH:mm`，**必须包含** |

#### 商品 ID 提取（三种来源）
1. URL 参数：`goods_id=324309161`
2. URL 路径：`-p-(\d+)\.html`
3. Script 标签：`/"goods_id"\s*:\s*"?(\d+)"?/g`

#### 标题提取（多渠道，优先 DOM）
1. `document.title`（排除 `shein |` 开头或包含 `global fashion` 的占位标题）
2. `h1` 元素
3. `meta[property="og:title"]`
4. 通用选择器：`[class*="title"]`、`[class*="name"]`、`[class*="goods"]`（文本长度 5-500）

#### 标题清洗
移除 `| SHEIN...`、`- SHEIN...`、`at SHEIN...` 后缀

#### 链接清洗
只保留 `origin + pathname`，移除查询参数

#### Scenario: 成功提取标题和链接
- **WHEN** SHEIN 商品页加载完成
- **THEN** 系统提取商品标题（清洗后）、商品链接（去参）、商品 ID、访问时间，分别上报

---

### Requirement: SHEIN 平台入口脚本 (index.ts)
系统 SHALL 提供 SHEIN 平台统一入口脚本，编排各模块执行时序，严格遵循开发指南的标准模板。

#### 模块编排
- **立即执行（document_start）**：`sheinGetVideo`（需要拦截网络请求）
- **DOM 就绪后执行（DOMContentLoaded）**：`sheinGetMain`、`sheinGetSku`、`sheinGetDetail`、`sheinGetHylinkTitle`

#### 入口职责（标准模板）
1. iframe 防护：`if (window !== window.top) return;`
2. 登录检测：使用 `probeAndReportLogin()` + SHEIN 登录选择器检测登录页
3. 验证码监控：MutationObserver 监控验证码元素出现/消失（SHEIN 暂无已知验证码选择器，`CAPTCHA_SELECTORS` 留空）
4. 模块并行启动：四个图片/标题模块 `forEach` 后台并行，不阻塞完成判定
5. 超时保护：`withTimeout` 单模块 15s 上限
6. 数据静默完成判定：`waitForCompletion()` + 异常处理（有数据则 completeTask，无数据则 failTask）
7. 清理函数：模块返回的 cleanup function 由 `waitTaskCompletion` 统一调用

#### SHEIN 登录选择器
```typescript
const LOGIN_SELECTORS = [
  '.login-panel',
  '.qrcode-login',
];
```

#### Scenario: 正常抓取流程
- **WHEN** SHEIN 商品页加载
- **THEN** 视频模块立即启动（XHR/Fetch 拦截），DOM 就绪后其余模块并行启动，数据静默 7 秒后判定完成

---

### Requirement: SHEIN 平台 Handler (shein.ts)
系统 SHALL 提供前端平台 Handler，支持 URL 清洗和商品 ID 提取。

#### URL 清洗
- 只保留 `origin + pathname`，移除查询参数和 hash

#### 商品 ID 提取
1. URL 参数 `goods_id=xxx`
2. URL 路径 `-p-(\d+)\.html`
3. 兜底：9 位以上纯数字

---

### Requirement: SHEIN 登录策略
系统 SHALL 在 Rust 端注册 SHEIN 的登录检测策略。

#### 实现
使用 `DefaultLoginStrategy`，配置：
- 登录域名：`shein.com/user/login`、`shein.com/login`、`login.shein.com`
- 验证码选择器：空（SHEIN 无已知验证码 DOM 选择器）

---

### Requirement: 构建注册
系统 SHALL 在 `scripts/build-scraper.mjs` 中注册 shein 平台入口，使构建脚本生成 `shein.bundle.js`。

## MODIFIED Requirements
无

## REMOVED Requirements
无
