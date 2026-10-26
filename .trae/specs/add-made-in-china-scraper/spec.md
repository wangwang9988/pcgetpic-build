# 中国制造网(Made-in-China)抓取脚本 Spec

## Why
项目已实现淘宝/天猫、京东、唯品会、1688 等平台的抓取脚本，但中国制造网（Made-in-China.com / madeinchina.cn）尚未实现。用户需要通过 PcGetPic 的 Worker 窗口自动加载中国制造网商品页，提取主图、SKU 图、详情图、视频和商品元数据。

## What Changes
- 新增 `scraper-scripts/made-in-china/` 目录，包含 6 个 TypeScript 模块（index / madeGetMain / madeGetSku / madeGetDetail / madeGetVideo / madeGetHylinkTitle）
- 在 `scripts/build-scraper.mjs` 中注册 `made-in-china` 平台入口
- 前端平台注册表和 Rust `Platform` 枚举已有 MadeInChina 支持，无需修改
- 中国制造网无需登录策略（公开商品页无需登录即可浏览，无验证码场景）

## Impact
- Affected specs: 抓取脚本体系（新增平台）
- Affected code:
  - `scraper-scripts/made-in-china/` (新增 6 个文件)
  - `scripts/build-scraper.mjs` (新增 1 行入口)

## 设计对齐说明

本 Spec 严格遵循 `docs/平台抓取脚本开发指南.md` 的规范，与淘宝/京东/唯品会/1688 已有实现保持一致：

### 对齐开发指南的要点
1. **模块结构**：6 文件结构（index + 5 子模块），与指南第二章目录结构规范一致
2. **通信层替换**：所有 `browser.runtime.sendMessage` → `tauriBridge.send()`，与指南通用规则 4.1 一致
3. **移除插件特有逻辑**：`defineContentScript` 包装、`INACTIVITY_TIMEOUT`、`isScriptStopped`/`handlePageInactive`、URL 变化检测、页面可见性检测、用户活动唤醒 — 全部移除，由 Tauri 宿主的静默判定机制接管（指南第一章 1.1/1.2 节）
4. **保留核心提取逻辑**：DOM 选择器、URL 清洗正则、MutationObserver、XHR/Fetch 拦截、Performance API — 全部保留（指南 4.2~4.6 节）
5. **完成判定**：使用 `waitForCompletion()` 前端辅助 + Rust 后端 7 秒静默自动完成（指南第一章 1.2/1.4 节）
6. **入口模板**：严格遵循指南第三章标准模板（iframe 防护 + 视频立即启动 + DOMContentLoaded 后并行启动 + 登录探针 + 验证码检测）
7. **共享 sleep**：使用 `import { sleep } from '../shared/utils'`，不在模块内重复定义本地 `sleep` 函数（指南 4.1 第 5 条）
8. **初始空上报**：模块入口处先 `await tauriBridge.send(key, [])` 清空旧数据（指南 4.1 第 6 条）
9. **增量上报**：SKU/视频/详情图等动态数据使用增量上报模式，每次检测到变化立即 `tauriBridge.send()`（指南 4.1 第 7 条）
10. **GetSku 返回清理函数**：返回 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }` 同时清理 Observer 和定时器（指南 4.3 关键要点第 5 条）
11. **GetSku 精确监听**：对特定 SKU 容器元素挂载 Observer，监听 `attributes` 变化（`src`、`data-original`），而非 `document.body` 全局监听（指南 4.3 关键要点第 3 条）
12. **GetVideo Performance API 增量监控**：使用游标增量检测 + `requestAnimationFrame` 持续轮询（指南 4.5 策略表）
13. **GetVideo 延时梯度扫描**：DOMContentLoaded 后执行延时梯度扫描（1s/3s/5s/10s）（指南 4.5 执行流程第 6 步）
14. **GetHylinkTitle 四字段输出**：必须输出 `productTitle`、`productLink`、`productId`、`visitTime` 四个字段（指南 4.6 字段表）

### 中国制造网特有逻辑（非过度设计）
中国制造网页面结构与淘宝/京东有差异，以下逻辑是必需的：
- **主图 `fsrc` 属性提取**：中国制造网主图使用 `.sr-proMainInfo-slide-picItem` 容器的 `fsrc` 属性存储高清图 URL，而非 `src`。淘宝用 `#picGalleryEle` 的 `img.src`
- **详情图 `.detail-desc` 容器**：中国制造网详情图在 `.detail-desc` 容器中，使用 `data-original` 懒加载属性。淘宝用 `#content`/`#container`
- **SKU 图 `valueItem` 类名**：中国制造网 SKU 使用 `[class*="valueItem--"]` 动态类名，需匹配子串。京东/淘宝用固定 ID 选择器
- **视频 `ads-data` JSON 属性**：中国制造网视频信息存储在 `.J-play-video` 元素的 `ads-data` 属性中（JSON 含 `cloud_media_url`），以及 `script[type="text/data-video"]` 标签中的 `videoUrl`。淘宝/京东无此结构
- **产品 ID 路径格式**：中国制造网 URL 格式为 `/product/{ID}/` 或 `/product-detail/{ID}/`，ID 为字母数字混合（如 `rFGJXqKonYWk`），非纯数字

## ADDED Requirements

### Requirement: 中国制造网主图提取 (madeGetMain)
系统 SHALL 从中国制造网商品页提取所有主图 URL，遵循开发指南 4.2 GetMain 模板（唯品会风格——简洁清晰）：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await tauriBridge.send('MainPic', [])` 清空旧数据

#### Scenario: fsrc 属性提取（主方案）
- **WHEN** 页面包含 `.sr-proMainInfo-slide-picItem` 容器
- **THEN** 从每个容器的 `fsrc` 属性（自身或子元素）提取图片 URL

#### Scenario: URL 截断到扩展名
- **WHEN** 获取到图片 URL
- **THEN** 查找最早出现的有效图片扩展名（.jpg/.jpeg/.png/.gif/.webp/.bmp/.heic），截断到扩展名位置，移除缩略图后缀还原高清原图

#### Scenario: 重试与额外抓取
- **WHEN** 首次提取无数据
- **THEN** 最多重试 20 次（每次 1000ms，使用共享 `sleep`）；有数据后再额外抓取 3 轮（每次 500ms）确保完整

#### Scenario: 最终上报
- **WHEN** 提取完成
- **THEN** 使用 `deduplicateUrls()` 去重后 `tauriBridge.send('MainPic', images)` 上报

### Requirement: 中国制造网 SKU 图提取 (madeGetSku)
系统 SHALL 从中国制造网商品页提取 SKU 变体图片 URL，遵循开发指南 4.3 GetSku 模板（初始扫描 + MutationObserver 精确监听 + 轮询兜底 + 返回清理函数）：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await tauriBridge.send('SkuPic', [])` 清空旧数据

#### Scenario: valueItem 容器提取（主方案）
- **WHEN** 页面包含 `[class*="valueItem--"]` 类名的元素
- **THEN** 从每个 valueItem 内的 `img` 标签提取 URL，收集多属性来源（src、placeholder、data-src、data-original、style background-image、父元素 data 属性）

#### Scenario: 固定选择器提取（备用方案）
- **WHEN** valueItem 方案失败
- **THEN** 按优先级尝试 `#skuOptionsArea`、`.skuWrapper--`、`.root--`、`.content--` 选择器

#### Scenario: URL 清洗与过滤
- **WHEN** 提取到 SKU 图片 URL
- **THEN** 移除反引号、截断到扩展名、过滤 `tps-2-2.png` 占位图

#### Scenario: MutationObserver 精确监听
- **WHEN** 首轮扫描完成
- **THEN** 对特定 SKU 容器元素挂载 Observer（而非 `document.body`），监听 `childList`、`subtree` 和 `attributes` 变化（`attributeFilter: ['src', 'data-original']`），防抖后重新扫描上报

#### Scenario: 轮询兜底
- **WHEN** 首轮扫描无结果
- **THEN** 启动定时轮询（20 次/1s），获取到结果或有结果时停止

#### Scenario: 返回清理函数
- **WHEN** 模块执行完成
- **THEN** 返回 `() => { observer.disconnect(); if (pollTimer) clearInterval(pollTimer); }` 同时清理 Observer 和定时器，防止内存泄漏

### Requirement: 中国制造网详情图提取 (madeGetDetail)
系统 SHALL 从中国制造网商品页提取详情区域的图片，遵循开发指南 4.4 GetDetail 模板（重试等待容器 + 多轮次遍历 + 增量上报）：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await tauriBridge.send('DetailPic', [])` 清空旧数据

#### Scenario: .detail-desc 容器查找
- **WHEN** 页面加载完成
- **THEN** 查找 `.detail-desc` 容器，支持最多 5 次重试（每次 1000ms，使用共享 `sleep`）等待容器渲染

#### Scenario: 多属性图片提取
- **WHEN** 找到详情容器
- **THEN** 从 `img` 标签的 `data-original`（优先）和 `src` 属性提取 URL

#### Scenario: URL 验证与清洗
- **WHEN** 提取到原始 URL
- **THEN** 移除反引号、处理 `//` 相对协议、验证有效图片扩展名、标准化 URL

#### Scenario: 多轮提取
- **WHEN** 首次提取完成
- **THEN** 执行 3 轮提取（每轮间隔 2000ms，使用共享 `sleep`），每轮扫描容器内 img 标签，合并去重后增量上报

### Requirement: 中国制造网视频提取 (madeGetVideo)
系统 SHALL 从中国制造网商品页提取视频 URL，遵循开发指南 4.5 GetVideo 模板（立即启动 → 拦截注册 → DOM 检测 → 延时梯度扫描）：

#### Scenario: 立即启动层
- **WHEN** `run()` 被调用（document_start 阶段）
- **THEN** 清空历史状态，启动 XHR 拦截、Fetch 拦截、Performance API 增量监控（游标增量检测 + `requestAnimationFrame` 持续轮询）

#### Scenario: ads-data JSON 属性提取（中国制造网特有）
- **WHEN** 页面包含 `.sr-proMainInfo-slide-picItem.J-play-video` 元素
- **THEN** 从 `ads-data` 属性解析 JSON，提取 `cloud_media_url` 字段作为视频 URL；JSON 解析失败时回退到正则提取 `"cloud_media_url":\s*"([^"]+)"`

#### Scenario: script 标签视频数据提取
- **WHEN** 页面包含 `script[type="text/data-video"]` 标签
- **THEN** 解析标签内容中的 JSON，提取 `videoUrl` 字段；JSON 解析失败时回退到正则提取 `"videoUrl":\s*"([^"]+)"`

#### Scenario: 网络请求拦截
- **WHEN** 页面发起 XHR/Fetch 请求
- **THEN** 拦截请求，检测响应 URL 和响应体中的视频 URL（mp4/m3u8/flv 格式），递归搜索 JSON 响应体

#### Scenario: DOMContentLoaded 后启动层
- **WHEN** DOM 加载完成
- **THEN** 注册 MutationObserver 监听 `<video>` 和 `<script>` 新增；执行延时梯度扫描（1s/3s/5s/10s），每轮提取页面内嵌 JSON、检查 window 全局变量、扫描视频容器 DOM、首次执行时模拟用户交互触发懒加载

#### Scenario: 视频分类与过滤
- **WHEN** 发现视频 URL
- **THEN** 分类为主图视频（URL 含 `made-in-china.com` 或 `v.made-in-china.com`）或详情视频；过滤广告（ad）、评论（comment）、UGC、头像（avatar）

#### Scenario: 双重去重
- **WHEN** 发现新视频 URL
- **THEN** 原始 URL 集合 + 归一化视频 ID 集合双重去重，归一化 ID 包含 Made-in-China 特有标识匹配（`[a-f0-9]+/[a-f0-9]+_h264_def`）

#### Scenario: 视频上报格式
- **WHEN** 发现有效视频
- **THEN** 采用"先读后写"策略：先 `tauriBridge.get('VideoUrls')` 获取已上报列表，去重后追加到列表头部并回写。上报格式：`{ url, type: 'main'|'detail', timestamp, pageUrl }`

### Requirement: 中国制造网标题/链接/商品ID/访问时间提取 (madeGetHylinkTitle)
系统 SHALL 从中国制造网商品页提取商品标题、链接、商品 ID 和访问时间，遵循开发指南 4.6 GetHylinkTitle 模板，**必须输出全部四个字段**：

#### Scenario: 初始空上报
- **WHEN** 模块启动
- **THEN** 先 `await Promise.all([tauriBridge.send('productTitle', ''), tauriBridge.send('productLink', ''), tauriBridge.send('productId', '')])` 清空旧数据

#### Scenario: 等待动态内容
- **WHEN** 页面尚未加载完成
- **THEN** 等待 `h1.J-baseInfo-name` 元素出现（最多 10 次重试，每次 1000ms，使用共享 `sleep`）

#### Scenario: 标题提取
- **WHEN** 页面加载完成
- **THEN** 优先从 `h1.J-baseInfo-name` 元素提取标题文本；回退到 `h1` 元素；最终回退到 `head title` 标签

#### Scenario: 商品 ID 提取
- **WHEN** 从商品 URL 提取商品 ID
- **THEN** 匹配 `/product(?:-detail)?\/([^\/]+)\//` 格式提取商品 ID（如 `rFGJXqKonYWk`）

#### Scenario: URL 清洗
- **WHEN** 提取到商品链接
- **THEN** 使用 `cleanMadeProductUrl()` 仅保留 `origin + pathname`，移除查询参数和 hash

#### Scenario: 访问时间生成
- **WHEN** 提取完成
- **THEN** 生成 `visitTime`，格式为 `YYYY-MM-DD HH:mm`

#### Scenario: 数据上报
- **WHEN** 提取完成
- **THEN** 通过 `Promise.all` 并行上报 `productTitle`、`productLink`、`productId`、`visitTime` 四个字段

### Requirement: 中国制造网抓取脚本入口 (index.ts)
系统 SHALL 提供统一的中国制造网抓取脚本入口，严格遵循指南第三章标准模板：

#### Scenario: iframe 防护
- **WHEN** 脚本在 iframe 中执行
- **THEN** 立即返回，不在 iframe 中重复执行

#### Scenario: 视频模块立即启动
- **WHEN** 脚本注入（document_start 阶段）
- **THEN** 立即启动 `madeGetVideo` 模块（网络拦截需尽早注册）

#### Scenario: 登录探针检测
- **WHEN** DOMContentLoaded 后、启动抓取模块前
- **THEN** 调用 `probeAndReportLogin()` 检测是否需要登录，若需要则跳过抓取模块。中国制造网使用通用登录选择器即可

#### Scenario: 验证码检测
- **WHEN** 中国制造网页面出现验证码元素
- **THEN** 中国制造网无已知验证码场景，`CAPTCHA_SELECTORS` 留空数组，`setupCaptchaWatcher()` 自动跳过

#### Scenario: DOM 就绪后启动其余模块
- **WHEN** DOMContentLoaded 事件触发且无需登录
- **THEN** 调用 `simulateScroll()` 触发懒加载，启动 `madeGetMain`、`madeGetSku`、`madeGetDetail`、`madeGetHylinkTitle` 模块（后台并行，带 15s 超时保护），并立即启动数据静默判定

#### Scenario: 完成判定
- **WHEN** 所有模块后台运行
- **THEN** 使用 `waitForCompletion()` 进行数据静默判定（7s 无新数据 → 完成；15s 最大超时 → 强制完成），判定完成后清理各模块后台资源

#### Scenario: 异常处理
- **WHEN** 流程发生异常
- **THEN** 若已有数据上传则 `completeTask`，否则 `failTask`

### Requirement: 构建系统集成
系统 SHALL 将中国制造网平台注册到 IIFE 构建流程：

#### Scenario: 构建脚本注册
- **WHEN** 运行 `scripts/build-scraper.mjs`
- **THEN** 在 `PLATFORMS` 对象中包含 `'made-in-china': resolve(projectRoot, 'scraper-scripts/made-in-china/index.ts')`，生成 `dist-scripts/made-in-china.bundle.js`

## MODIFIED Requirements
无修改项。前端平台注册表（`PLATFORM_PATTERNS`/`PLATFORM_LABELS`/`PLATFORM_ICONS`/`registry.ts`）和 Rust `Platform` 枚举、`from_url()`、`bundle_name()` 已有 MadeInChina 支持，无需修改。

## REMOVED Requirements
无移除项。
