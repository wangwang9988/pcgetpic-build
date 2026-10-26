# 多平台商品链接 URL 清洗 & ID 提取 Spec

## Why
目前仅淘宝/天猫等部分平台实现了商品链接 URL 清洗，且 ID 提取逻辑硬编码在 `ResultPreview.vue` 中（仅覆盖 taobao/jd/pdd 三个平台），与 URL 清洗逻辑分离。核心问题：
1. 同一平台的 URL 清洗和 ID 提取逻辑分散在不同文件，维护时需同步修改多处
2. 新增平台时需同时修改 `platforms.ts`（清洗）和 `ResultPreview.vue`（ID 提取），容易遗漏
3. 没有遵循参考项目 `GetPic/entrypoints/modules/` 的"一个平台一个模块"设计哲学

**核心改进**：引入 `PlatformHandler` 接口，将每个平台的 URL 清洗 + ID 提取 + 标题提示逻辑封装为一个自包含的处理器对象，通过注册表统一管理。

## What Changes
- 在 `src/utils/platforms.ts` 中新增 `PlatformHandler` 接口（`cleanUrl` + `extractProductId` + `extractTitleHint?`）
- 新增 `createOriginPathnameHandler()` 工厂函数，为 17 个通用平台消除重复代码
- 新增 `createPassthroughHandler()` 工厂函数，为 6 个无规则平台提供统一占位
- 新增 `PLATFORM_HANDLERS` 注册表 + `getHandler()` 访问器
- 重构 `cleanUrl()` 为委托模式（向后兼容）
- 新增 `extractProductId()` 和 `extractTitleHint()` 统一入口函数
- 重构 `ResultPreview.vue` 的 `resultTitle()` 函数，使用 `extractProductId()` 替代硬编码 if-else
- 补充第二批 9 个平台（vvic、xz、yiwugo、bao66、17zwd、kuaishou、redbook、ebay、yupoo）的清洗规则

## Impact
- Affected specs: `fix-ad-url-normalization`（淘宝清洗已实装，本次扩展并重构）
- Affected code:
  - [platforms.ts](file:///d:/Trae/PcGetPic/src/utils/platforms.ts) — 新增接口 + 工厂函数 + 注册表 + 重构 cleanUrl + 新增 extractProductId/extractTitleHint
  - [ResultPreview.vue](file:///d:/Trae/PcGetPic/src/components/ResultPreview.vue) — resultTitle() 改用 extractProductId(url) 替代内联 if-else
- 不受影响的代码（明确排除）：
  - `scraper-scripts/` — 运行在 WebView 上下文，无法共享 platforms.ts 逻辑，本次不改动
  - `src-tauri/src/platform_resolver.rs` — Rust 侧平台检测和 bundle 映射，已完整覆盖 40 个平台，本次不改动
  - `scraper-scripts/shared/utils.ts::getProductId()` — 仅覆盖 taobao/jd，后续随各平台 scraper 脚本开发时扩展

---

## ADDED Requirements

### Requirement: PlatformHandler 接口
系统 SHALL 定义 `PlatformHandler` 接口，将每个平台的 URL 清洗、ID 提取、标题提示逻辑封装为自包含模块。

```typescript
export interface PlatformHandler {
  /** 平台键名，与 PLATFORM_PATTERNS 的 key 对应 */
  readonly platform: string

  /** URL 清洗：去除追踪参数/会话参数，返回干净的规范化 URL */
  cleanUrl(rawUrl: string): string

  /** 商品 ID 提取：从 URL 中提取该平台的商品唯一标识 */
  extractProductId(url: string): string

  /** 可选：从 URL 中推断标题提示信息（大多数平台返回空字符串） */
  extractTitleHint?(url: string): string
}
```

设计原则：
- **一个平台一个处理器**：修改某平台只需改该平台的 handler，不影响其他平台
- **对齐参考项目**：类似 `GetPic/entrypoints/modules/` 中每个平台一个 `*GetHylinkTitle.js`
- **复用性**：`cleanUrl`、`extractProductId`、`extractTitleHint` 可被不同调用方复用

### Requirement: createOriginPathnameHandler 工厂函数
系统 SHALL 提供 `createOriginPathnameHandler()` 工厂函数，为 17 个共享 `origin + pathname` 清洗策略的平台消除重复代码。

```typescript
function createOriginPathnameHandler(
  platform: string,
  idPattern: RegExp,
  titleHintFn?: (url: string) => string
): PlatformHandler
```

此工厂创建的 handler：
- `cleanUrl`：`new URL(url).origin + new URL(url).pathname`（对齐参考项目中 17 个平台的通用清洗模式）
- `extractProductId`：`url.match(idPattern)?.[1] ?? ''`
- `extractTitleHint`：若传入 `titleHintFn` 则调用，否则不提供

适用平台（17 个）：alibaba、aliexpress、shein、lazada、shopee、temu、douyin、walmart、wayfair、ozon、wildberries、dhgate、suning、dangdang、made-in-china、mercadolibre、mydepot

### Requirement: createPassthroughHandler 工厂函数
系统 SHALL 提供 `createPassthroughHandler()` 工厂函数，为无清洗规则的平台提供统一占位。

```typescript
function createPassthroughHandler(
  platform: string,
  idPattern?: RegExp
): PlatformHandler
```

此工厂创建的 handler：
- `cleanUrl`：返回原始 URL（带 TODO 注释说明待源项目更新后同步）
- `extractProductId`：若传入 `idPattern` 则正则匹配，否则尝试通用兜底

适用平台（6 个）：coupang、goofish、sina、vip、amazon、etsy

### Requirement: PLATFORM_HANDLERS 注册表与 getHandler 访问器
系统 SHALL 使用 `PLATFORM_HANDLERS` 注册表实现平台到 handler 的映射。

```typescript
const PLATFORM_HANDLERS: Record<string, PlatformHandler> = {
  taobao: taobaoHandler,
  jd: jdHandler,
  // ... 每个平台一个
}

export function getHandler(platform: string): PlatformHandler | null {
  return PLATFORM_HANDLERS[platform] ?? null
}
```

### Requirement: 统一调度函数
系统 SHALL 提供以下统一调度函数（向后兼容现有调用方）：

```typescript
export function cleanUrl(urlStr: string): string {
  const trimmed = urlStr.trim()
  if (!trimmed) return ''
  const platform = detectPlatform(trimmed)
  const handler = platform ? getHandler(platform) : null
  return handler ? handler.cleanUrl(trimmed) : trimmed
}

export function extractProductId(urlStr: string): string {
  const trimmed = urlStr.trim()
  if (!trimmed) return ''
  const platform = detectPlatform(trimmed)
  const handler = platform ? getHandler(platform) : null
  return handler ? handler.extractProductId(trimmed) : ''
}

export function extractTitleHint(urlStr: string): string {
  const trimmed = urlStr.trim()
  if (!trimmed) return ''
  const platform = detectPlatform(trimmed)
  const handler = platform ? getHandler(platform) : null
  return handler?.extractTitleHint?.(trimmed) ?? ''
}
```

### Requirement: ResultPreview.vue 使用 extractProductId
`ResultPreview.vue` 的 `resultTitle()` 函数 SHALL 使用 `extractProductId(url)` 替代内联的 if-else ID 提取逻辑。

修改前（硬编码）：
```typescript
let itemId = '';
if (platform === 'taobao') {
  const match = result.url.match(/[?&]id=(\d+)/);
  if (match) itemId = match[1];
} else if (platform === 'jd') {
  const match = result.url.match(/item\.jd\.com\/(\d+)\.html/);
  if (match) itemId = match[1];
} else if (platform === 'pdd') {
  const match = result.url.match(/[?&]goods_id=(\d+)/);
  if (match) itemId = match[1];
}
if (!itemId) {
  const match = result.url.match(/\/(\d{6,})\b/);
  if (match) itemId = match[1];
}
```

修改后（复用 PlatformHandler）：
```typescript
const itemId = extractProductId(result.url)
```

### Requirement: 各平台 handler 严格对齐参考项目
所有平台的 `cleanUrl` 和 `extractProductId` 逻辑 SHALL 严格对齐 `GetPic/entrypoints/modules/` 下对应 `*GetHylinkTitle.js` 的代码。

#### 通用平台（17 个，使用 createOriginPathnameHandler）

| 平台 | 键名 | idPattern | 来源脚本 |
|------|------|-----------|---------|
| 阿里巴巴 | `alibaba` | `/_(\d+)\.html/i` | alibabaGetHylinkTitle.js |
| 速卖通 | `aliexpress` | 多正则备选 | aliexpressGetHylinkTitle.js |
| SHEIN | `shein` | `/[?&]goods_id=(\d+)/` 或 `/-p-(\d+)\.html/` | sheinGetHylinkTitle.js |
| Lazada | `lazada` | `/[?&]goods_id=(\d+)/` 或 `/-p-(\d+)\.html/` | lazadaGetHylinkTitle.js |
| Shopee | `shopee` | `/[?&]itemid=(\d+)/` 或 `/-i\.(\d+)\.(\d+)/` | shopeeGetHylinkTitle.js |
| Temu | `temu` | `/[?&]goods_id=(\d+)/` 或 `/-g-(\d+)\.html/` | TemuGetHylinkTitle.js |
| 抖音 | `douyin` | `/[?&](?:id\|product_id\|promotion_id)=(\d+)/` | DouyinGetHylinkTitle.js |
| 沃尔玛 | `walmart` | `/\/(\d{6,})$/` | walmartGetHylinkTitle.js |
| Wayfair | `wayfair` | `/[?&]piid=(\d+)/` 或 `/-w(\d+)\.html/i` | wayfairGetHylinkTitle.js |
| Ozon | `ozon` | `/\/product\/(?:.*-)?(\d+)/` | ozonGetHylinkTitle.js |
| Wildberries | `wildberries` | `/\/catalog\/(\d+)/` | wildberriesGetHylinkTitle.js |
| 敦煌网 | `dhgate` | 多方式备选 | dhgateGetHylinkTitle.js |
| 苏宁 | `suning` | `/\/(\d+)\.html/i` | SuningGetHylinkTitle.js |
| 当当 | `dangdang` | 路径提取 | dangdangGetHylinkTitle.js |
| 中国制造网 | `made-in-china` | `/\/product(?:-detail)?\/([^\/]+)\//` | madeGetHylinkTitle.js |
| 美客多 | `mercadolibre` | `/([A-Z]{3})[-]?(\d+)/` | mercadolibreGetHylinkTitle.js |
| MyDepot | `mydepot` | `/\/products\/([^\/]+)/` | mydepotGetHylinkTitle.js |

#### 专用平台（18 个，各自独立的 handler）

**淘宝/天猫 (`taobao`)** — 策略 C：提取 `id` 参数重构为 `${baseUrl}?id=${id}`
- `cleanUrl`：对齐 `tbGetHylinkTitle.js` 第 326-363 行
- `extractProductId`：`url.match(/[?&]id=(\d+)/)?.[1] ?? ''`

**京东 (`jd`)** — 策略 A 变体：清空 search + hash
- `cleanUrl`：对齐 `jdGetHylinkTitle.js` 第 243-256 行 — `urlObj.search = ''; urlObj.hash = ''; return urlObj.href`
- `extractProductId`：`url.match(/item\.jd\.com\/(\d+)\.html/)?.[1] ?? ''`

**1688 (`ali1688`)** — 策略 A：`split('?')[0]`
- `cleanUrl`：对齐 `ali1688GetHylinkTitle.js` 第 266 行
- `extractProductId`：`url.match(/\/(\d+)\.html$/)?.[1] ?? ''`

**拼多多 (`pdd`)** — 策略 C：提取 `goods_id` 重构为标准 URL
- `cleanUrl`：对齐 `pddGetHylinkTitle.js` — 重构为 `https://mobile.yangkeduo.com/goods.html?goods_id=${goodsId}`
- `extractProductId`：`url.match(/[?&]goods_id=(\d+)/)?.[1] ?? ''`

**拼多多批发 (`pddpf`)** — 策略 C：保留 `gid` 参数
- `cleanUrl`：对齐 `pddpfGetHylinkTitle.js` — 保留 `gid` 参数重构
- `extractProductId`：`url.match(/[?&]gid=(\d+)/)?.[1] ?? ''`

**乐天 (`rakuten`)** — 策略 A 变体：末尾强制加 `/`
- `cleanUrl`：对齐 `rakutenGetHylinkTitle.js` — `origin + pathname`，确保末尾有 `/`
- `extractProductId`：路径 `{shop}/{item_id}` 提取

**Newegg (`newegg`)** — 策略 A 变体：有条件保留 `Item` 参数
- `cleanUrl`：对齐 `neweggGetHylinkTitle.js` — 若有 `Item` 参数则保留
- `extractProductId`：对齐 `neweggGetHylinkTitle.js` — `getNeweggItemId()` 逻辑

**Macy's (`macys`)** — 策略 A 变体：保留 `ID` 参数
- `cleanUrl`：对齐 `macysGetHylinkTitle.js` — `origin + pathname + ?ID=productId`
- `extractProductId`：`urlObj.searchParams.get("ID")` 或正则

**TikTok (`tiktok`)** — 策略 A 变体：`origin + pathname`
- `cleanUrl`：对齐 `tiktokGetHylinkTitle.js` — 提取 ID 时 `origin + pathname`
- `extractProductId`：对齐 `tiktokGetHylinkTitle.js` — 路径数字段

**eBay (`ebay`)** — 策略 C：URL 重构
- `cleanUrl`：对齐 `eBayGetHylinkTitle.js` — 提取 ID 后 `origin + '/itm/' + productId`
- `extractProductId`：`url.match(/\/itm\/([0-9]+)/)?.[1] ?? ''`

**小红书 (`redbook`)** — 策略 B：复杂条件清洗
- `cleanUrl`：对齐 `RedbookGetHylinkTitle.js` — 含 keyword 参数时保留；否则 `origin/explore/${productId}`
- `extractProductId`：对齐 `RedbookGetHylinkTitle.js` — `/explore/` 路径 + keyword 参数循环解码

**搜款网 (`vvic`)** — 策略 B：`/item/{ID}`
- `cleanUrl`：对齐 `vvicGetHylinkTitle.js` — `origin + /item/{字母数字ID}`
- `extractProductId`：`url.match(/\/item\/([a-zA-Z0-9]+)/)?.[1] ?? ''`

**四季星座 (`xz`)** — 策略 B：`/item/{数字ID}`
- `cleanUrl`：对齐 `xzGetHylinkTitle.js` — `origin + /item/{数字ID}`
- `extractProductId`：`url.match(/\/item\/(\d+)/)?.[1] ?? ''`

**义乌购 (`yiwugo`)** — 策略 B：`/product/detail/{ID}.html`
- `cleanUrl`：对齐 `yiwugoGetHylinkTitle.js` — `origin + /product/detail/{ID}.html`
- `extractProductId`：`url.match(/\/product\/detail\/(\d+)/)?.[1] ?? ''`

**包牛牛 (`bao66`)** — 策略 B：保留核心路径
- `cleanUrl`：对齐 `bao66GetHylinkTitle.js` — 保留核心路径片段
- `extractProductId`：对齐 `bao66GetHylinkTitle.js` — 多模式提取

**17网 (`17zwd`)** — 策略 B：`/item/{数字ID}`
- `cleanUrl`：对齐 `zwdGetHylinkTitle.js` — `origin + /item/{数字ID}`
- `extractProductId`：`url.match(/[?&]id=(\d+)/)?.[1] ?? ''`

**快手 (`kuaishou`)** — 策略 B：`/goods/{id}` 或 `/item/{id}`
- `cleanUrl`：对齐 `kuaishouHylinkTitle.js` — 匹配 `/goods/{id}` 或 `/item/{id}`，否则 `origin + pathname`
- `extractProductId`：对齐 `kuaishouHylinkTitle.js` — 路径提取

**又拍图库 (`yupoo`)** — 策略 C：保留 `gid` 参数
- `cleanUrl`：对齐 `YupooGetHylinkTitle.js` — `origin + pathname + ?gid=${productId}`
- `extractProductId`：`url.match(/[?&]gid=([^&]+)/)?.[1] ?? ''`

#### 无清洗规则平台（6 个，使用 createPassthroughHandler）

| 平台 | 键名 | idPattern | 来源脚本 |
|------|------|-----------|---------|
| Coupang | `coupang` | `/\/vp\/products\/(\d+)/i` | CoupangGetHylinkTitle.js |
| 闲鱼 | `goofish` | `/[?&]id=(\d+)/i` | GoofishGetHylinkTitle.js |
| 新浪/微博 | `sina` | `/[?&]id=(\d+)/` 或 `/\/u\/(\d+)/` | SinaGetHylinkTitle.js |
| 唯品会 | `vip` | `/-(\d+)\.html$/` | VIPGetHylinkTitle.js |
| 亚马逊 | `amazon` | `/\/(?:dp\|gp\/product\|gp\/aw\/d)\/([A-Z0-9]{10})/i` | getHylinkTitle.js |
| Etsy | `etsy` | `/\/listing\/(\d+)/` | getHylinkTitle.js |

代码中 SHALL 添加 TODO 注释说明这些平台的 `cleanUrl` 待源项目更新后同步。

### Requirement: 清洗函数幂等性
所有 `cleanUrl` 实现 SHALL 保证幂等：对已清洗的 URL 再次清洗，结果不变。

### Requirement: 文件组织
所有 handler 定义 SHALL 集中在 `src/utils/platforms.ts` 中（单文件方案），与现有的 `PLATFORM_PATTERNS`、`PLATFORM_LABELS`、`PLATFORM_ICONS`、`detectPlatform()` 保持一致。当某个 handler 逻辑超过 ~50 行时再考虑拆分为独立文件。

### Requirement: 与 Scraper Scripts 的关系和扩展性
`PlatformHandler` 是客户端侧（Tauri 宿主进程）的 URL 处理抽象，与 WebView 侧的 scraper scripts 是**两个独立上下文**，职责不同但逻辑同源。

**架构关系图**：
```
┌─────────────────────────────────────────────────────────────────┐
│  客户端侧（Tauri 宿主进程）— platforms.ts                        │
│                                                                   │
│  PlatformHandler { cleanUrl, extractProductId, extractTitleHint } │
│  用途：URL 预处理（入队前清洗）、ID 展示（ResultPreview）、         │
│       标题提示（抓取前占位）                                       │
│  调用方：LinkInput.vue、ResultPreview.vue、taskQueue.ts           │
└─────────────────────────────────────────────────────────────────┘
          ↕ 逻辑同源（均抄录自 GetPic）
          ↕ 但运行在不同上下文，无法直接 import
┌─────────────────────────────────────────────────────────────────┐
│  WebView 侧（注入脚本）— scraper-scripts/                        │
│                                                                   │
│  xxxGetHylinkTitle.ts { cleanProductUrl, getProductId }           │
│  用途：从页面 DOM 提取标题、清洗 URL、提取 ID，通过 tauriBridge   │
│       上报给宿主进程                                               │
│  调用方：tauriBridge.send('productLink', cleanUrl)                │
│         tauriBridge.send('productId', id)                         │
└─────────────────────────────────────────────────────────────────┘
```

**关键设计决策**：
1. **不强行统一**：scraper scripts 运行在 WebView 中，无法 import 客户端侧的 `platforms.ts`。两套逻辑各自维护，但均抄录自同一参考项目，保持同步即可
2. **PlatformHandler 不包含 scraper 逻辑**：`PlatformHandler` 只负责纯 URL 计算（无 DOM、无网络），不涉及图片/视频抓取。图片/视频抓取由 `scraper-scripts/{platform}/` 下的各子模块负责
3. **新增平台的完整流程**：
   - 步骤1：在 `platforms.ts` 中添加 `PlatformHandler`（URL 清洗 + ID 提取）— **本次 Spec 范围**
   - 步骤2：在 `scraper-scripts/{platform}/` 中添加抓取脚本（GetMain/Sku/Detail/Video/HylinkTitle）— **后续 Spec**
   - 步骤3：在 `src-tauri/src/platform_resolver.rs` 中添加平台枚举和 bundle 映射 — **后续 Spec**

**关于 `scraper-scripts/shared/utils.ts::getProductId()`**：
当前此函数仅覆盖 taobao 和 jd 两个平台。随着新平台 scraper 脚本的开发，此函数需要同步扩展。但这是 scraper scripts 的职责范围，不在本次 Spec 内。各平台的 `xxxGetHylinkTitle.ts` 也可以实现自己的 ID 提取逻辑（而非依赖 `shared/utils.ts`），这与 `PlatformHandler.extractProductId()` 的设计理念一致——每个平台独立维护自己的提取规则。

**淘宝平台代码不需要结构调整**：
当前 `scraper-scripts/taobao/tbGetHylinkTitle.ts` 中的 `cleanProductUrl()` 和 `getProductId()` 与 `platforms.ts` 中的 `cleanTaobaoUrl()` 和 `extractProductId()` 存在逻辑重复，但这是**有意为之**——两个文件运行在不同上下文，无法共享代码。只要两者均抄录自同一参考项目并保持同步，这种重复是可接受的。

## MODIFIED Requirements

### Requirement: 统一清洗入口 `cleanUrl`（重构为 PlatformHandler 模式）
`cleanUrl` 函数 SHALL 从 `switch-case` 链重构为通过 `PLATFORM_HANDLERS` 注册表分发。现有的各 `cleanXxxUrl()` 独立函数 SHALL 被对应的 handler 对象替代。

### Requirement: ResultPreview.vue 的 ID 提取（重构为复用 extractProductId）
`ResultPreview.vue` 的 `resultTitle()` 函数 SHALL 从内联 if-else 重构为调用 `extractProductId(url)`。

## REMOVED Requirements
无移除需求。
