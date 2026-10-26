# 京东平台抓取脚本 Spec

## Why
PcGetPic 桌面客户端目前仅支持淘宝/天猫平台的商品图片与视频抓取。京东（JD）是国内第二大电商平台，用户需求量大，需要新增京东平台支持以覆盖核心电商场景。

## What Changes
- 新增 `scraper-scripts/jd/` 目录，包含 6 个模块文件（index.ts、jdGetMain.ts、jdGetSku.ts、jdGetDetail.ts、jdGetVideo.ts、jdGetHylinkTitle.ts）
- 修改 `vite.scraper.config.ts`，添加 `jd` 入口配置
- 所有 URL 提取逻辑严格参考 `GetPic/entrypoints/modules/jd/` 下对应模块，保持核心解析算法一致
- 将浏览器插件的通信模式（`browser.runtime.sendMessage`）替换为 `tauriBridge.send()`
- 移除插件特有的生命周期管理逻辑（页面可见性、5分钟不活动超时、SPA导航检测、状态保存/恢复等），由 Tauri 宿主的 7 秒静默判定机制接管

## Impact
- Affected code: `scraper-scripts/jd/`（新增）、`vite.scraper.config.ts`（修改）
- Rust 后端 `platform_resolver.rs` 无需修改（`Platform::Jd` 及 `bundle_name() => "jd"` 已存在）
- 前端 `src/utils/platforms/` 无需修改（`jd` 平台匹配正则和 `jdHandler` 已存在）

## ADDED Requirements

### Requirement: 京东主图提取 (jdGetMain)
系统 SHALL 从京东商品页面提取主图 URL 列表，通过 `tauriBridge.send('MainPic', urls)` 上报。

#### 提取策略
1. **Script 标签提取**：解析 `<script>` 标签中的 `imageList` 数据，提取相对路径，拼接 `https://img14.360buyimg.com/imgzone/` 域名
2. **DOM 容器提取**：扫描 `#main-image`、`.image-carousel-content`、`#spec-list`（使用 `data-url` 属性）容器中的 `<img>` 元素
3. **URL 清洗**：从 DOM 图片 URL 中提取 `jfs/` 路径（支持 `_jfs/` 新格式），移除下划线前缀，拼接 `https://img14.360buyimg.com/imgzone/`，截断到有效图片扩展名（.jpg/.png/.webp 等）
4. **占位图过滤**：排除 4 个京东硬编码占位图 URL
5. **去重**：使用 `deduplicateUrls()` 去重

#### Scenario: 成功提取主图
- **WHEN** 用户输入京东商品链接，WebView 加载页面后注入脚本
- **THEN** jdGetMain 模块通过轮询重试（最多 100 次，500ms 间隔）提取主图，找到图片后额外抓取 3 轮确保完整，最终通过 `tauriBridge.send('MainPic', urls)` 上报

### Requirement: 京东 SKU 图提取 (jdGetSku)
系统 SHALL 从京东商品页面提取 SKU 图片 URL 列表，通过 `tauriBridge.send('SkuPic', urls)` 上报。

#### 提取策略
1. **DOM 容器提取**：扫描 `#choose-attrs`、`#specification-panel`、`[class*="item-sku"]` 容器（排除 `.detail` 区域内的元素）
2. **多属性收集**：从 `<img>` 元素的 src、data-src、data-original、placeholder、style 背景图、父元素 data-src 等多属性收集 URL
3. **URL 清洗**：`cleanAndProcessUrl()` 提取 `jfs/` 路径，移除尺寸前缀（`s228x228_`），截断到有效扩展名
4. **MutationObserver**：监听 SKU 容器 DOM 变化（300ms 防抖），检测到图片数量增加时重新抓取
5. **轮询兜底**：最多 10 次轮询（3s 间隔），仅在尚未获取到图片时执行

#### Scenario: 成功提取 SKU 图
- **WHEN** 京东商品页面的 SKU 区域加载完成
- **THEN** jdGetSku 模块通过 DOM 扫描 + MutationObserver + 轮询兜底三层机制提取 SKU 图片，通过 `tauriBridge.send('SkuPic', urls)` 上报

### Requirement: 京东详情图提取 (jdGetDetail)
系统 SHALL 从京东商品页面提取详情图 URL 列表，通过 `tauriBridge.send('DetailPic', urls)` 上报。

#### 提取策略
1. **隐藏数据容器**：提取 `#zbViewWeChatMiniImages`、`[id*="WeChatMiniImages"]`、`#zbViewModulesH` 的 value/data-value 属性中的图片列表
2. **主容器 img 标签**：扫描 `#J-detail-content`、`#detail-main` 中的 `<img>` 元素
3. **CSS 背景图**：深度扫描主容器内所有子元素的 `background-image`
4. **Style 标签**：解析容器内 `<style>` 标签中的 `url(...)` 引用
5. **URL 清洗**：`normalizeImageUrl()` 移除 CDN 双后缀（`.jpg.avif` → `.jpg`）、移除尺寸参数（`_360x360`）、补全协议
6. **URL 验证**：`isValidImageUrl()` 过滤 base64 占位图、京东 UI 标志/广告标识、非图片扩展名
7. **MutationObserver**：监听 DOM 变化实时捕获动态加载的详情图

#### Scenario: 成功提取详情图
- **WHEN** 京东商品页面的详情区域加载完成
- **THEN** jdGetDetail 模块通过多源提取 + MutationObserver 实时监听提取详情图，通过 `tauriBridge.send('DetailPic', urls)` 上报

### Requirement: 京东视频提取 (jdGetVideo)
系统 SHALL 从京东商品页面提取视频 URL 列表，通过 `tauriBridge.send('VideoUrls', videoObjs)` 上报。

#### 提取策略
1. **Performance API 监控**：通过 `requestAnimationFrame` 循环检查 `performance.getEntriesByType('resource')` 中的媒体资源
2. **XHR/Fetch 拦截**：劫持 `XMLHttpRequest.prototype.send` 和 `window.fetch`，监控响应中的视频 URL
3. **MutationObserver**：监听新增 `<video>` 元素及其属性变化，支持 Shadow DOM 深度遍历（递归深度限制 10 层）
4. **页面数据提取**：解析 `window.__detail_data__`、`window.__product_data__` 等全局变量中的视频数据
5. **Script 标签解析**：匹配京东特定的数据结构（`videoInfo`、`videoList`、`mainVideo`、`videoUrl` 等）
6. **视频分类**：分为 `main`（主视频）和 `detail`（详情视频）
7. **去重**：双重去重（原始 URL 集合 + 归一化视频 ID 集合）

#### Scenario: 成功提取视频
- **WHEN** 京东商品页面包含视频内容
- **THEN** jdGetVideo 模块在 document_start 阶段立即启动，通过多渠道拦截和检测提取视频 URL，以 `{url, type, timestamp, pageUrl}` 对象数组形式通过 `tauriBridge.send('VideoUrls', videoObjs)` 上报

### Requirement: 京东标题/链接/ID 提取 (jdGetHylinkTitle)
系统 SHALL 从京东商品页面提取商品标题、清洁链接和商品 ID。

#### 提取策略
1. **标题提取**：从 `<head><title>` 元素获取
2. **链接清洗**：使用 URL API 标准化处理，清空 search 和 hash
3. **商品 ID 提取**：从路径名中正则匹配 `/(\d+)\.html`

#### Scenario: 成功提取元数据
- **WHEN** 京东商品页面加载完成
- **THEN** jdGetHylinkTitle 模块提取标题、清洗链接、商品 ID，分别通过 `tauriBridge.send('productTitle', title)`、`tauriBridge.send('productLink', cleanUrl)`、`tauriBridge.send('productId', productId)` 上报

### Requirement: 京东平台入口 (index.ts)
系统 SHALL 提供京东平台的统一入口脚本，编排各模块的执行时序。

#### 执行时序
1. **document_start 阶段**：立即启动 `runVideo()`（需尽早拦截网络请求）
2. **DOMContentLoaded 后**：并行启动 `runMain()`、`runSku()`、`runDetail()`、`runHylinkTitle()`
3. **数据静默判定**：立即启动 `waitForCompletion()`，与模块并行运行
4. **验证码检测**：监听京东滑块验证码选择器（如有）

#### Scenario: 完整抓取流程
- **WHEN** 用户输入京东商品链接
- **THEN** 入口脚本按正确时序编排各模块，7 秒数据静默后自动完成任务

### Requirement: 构建配置更新
系统 SHALL 在 `vite.scraper.config.ts` 中添加 `jd` 入口配置，使 `npm run build:scraper` 能产出 `dist-scripts/jd.bundle.js`。

## MODIFIED Requirements
无

## REMOVED Requirements
无
