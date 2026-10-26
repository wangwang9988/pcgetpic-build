# Tasks

> **Scope Note**: 本 Spec 仅覆盖 `src/utils/platforms.ts` 的 PlatformHandler 改造和 `ResultPreview.vue` 的重构。
> Scraper scripts（`scraper-scripts/`）和 Rust 平台解析（`src-tauri/src/platform_resolver.rs`）不在本次范围内。
> 新增平台的完整流程：步骤1 PlatformHandler（本次）→ 步骤2 Scraper Scripts（后续）→ 步骤3 Rust Resolver（后续）

## 批次一：基础设施 + 通用平台 + 国内核心电商

- [x] Task 1: 定义 PlatformHandler 接口 + 工厂函数 + 注册表 + 调度函数
  - [x] SubTask 1.1: 定义 `PlatformHandler` 接口（`platform` + `cleanUrl` + `extractProductId` + `extractTitleHint?`）
  - [x] SubTask 1.2: 实现 `createOriginPathnameHandler(platform, idExtractor)` 工厂函数（扩展支持 RegExp | Function）
  - [x] SubTask 1.3: 实现 `createPassthroughHandler(platform, idExtractor?)` 工厂函数
  - [x] SubTask 1.4: 创建 `PLATFORM_HANDLERS: Record<string, PlatformHandler>` 注册表
  - [x] SubTask 1.5: 实现 `getHandler(platform)` 访问器函数
  - [x] SubTask 1.6: 重构 `cleanUrl()` 为委托模式（通过 `PLATFORM_HANDLERS[platform].cleanUrl` 分发）
  - [x] SubTask 1.7: 新增 `extractProductId()` 统一入口函数
  - [x] SubTask 1.8: 新增 `extractTitleHint()` 统一入口函数
  - [x] SubTask 1.9: 将已有 `cleanTaobaoUrl` 重构为 taobao handler，注册到 PLATFORM_HANDLERS

- [x] Task 2: 注册 17 个通用平台 handler（使用 createOriginPathnameHandler）
  - [x] SubTask 2.1: `alibaba` handler — `createOriginPathnameHandler('alibaba', /_(\d+)\.html/i)`
  - [x] SubTask 2.2: `aliexpress` handler — 多正则备选 ID 提取（自定义 aliexpressIdExtractor 函数）
  - [x] SubTask 2.3: `shein` handler — ID: `goods_id` 参数 + `/-p-(\d+)\.html/`（自定义 sheinIdExtractor）
  - [x] SubTask 2.4: `lazada` handler — ID: `goods_id` 参数 + `/-p-(\d+)\.html/`（自定义 lazadaIdExtractor）
  - [x] SubTask 2.5: `shopee` handler — ID: `itemid` 参数 + `/-i\.(\d+)\.(\d+)/`（自定义 shopeeIdExtractor）
  - [x] SubTask 2.6: `temu` handler — ID: `goods_id` 参数 + `/-g-(\d+)\.html/`（自定义 temuIdExtractor）
  - [x] SubTask 2.7: `douyin` handler — ID: `id/product_id/promotion_id` 参数
  - [x] SubTask 2.8: `walmart` handler — ID: 路径最后一段纯数字（自定义 walmartIdExtractor）
  - [x] SubTask 2.9: `wayfair` handler — ID: `piid` 参数 + `/-w(\d+)\.html/i`（自定义 wayfairIdExtractor）
  - [x] SubTask 2.10: `ozon` handler — ID: `/product/(?:.*-)?(\d+)/`
  - [x] SubTask 2.11: `wildberries` handler — ID: `/catalog/(\d+)/`
  - [x] SubTask 2.12: `dhgate` handler — ID: 多方式备选（自定义 dhgateIdExtractor）
  - [x] SubTask 2.13: `suning` handler — ID: `/(\d+)\.html/i`
  - [x] SubTask 2.14: `dangdang` handler — ID: 路径提取（自定义 dangdangIdExtractor）
  - [x] SubTask 2.15: `made-in-china` handler — ID: `/product(?:-detail)?\/([^\/]+)\//`
  - [x] SubTask 2.16: `mercadolibre` handler — ID: `/([A-Z]{3})[-]?(\d+)/`（自定义 mercadolibreIdExtractor）
  - [x] SubTask 2.17: `mydepot` handler — ID: `/products\/([^\/]+)/`

- [x] Task 3: 添加国内核心电商专用 handler（4 个平台）
  - [x] SubTask 3.1: `jd` handler — `cleanUrl` 对齐 `jdGetHylinkTitle.js`，`extractProductId` 对齐参考项目
  - [x] SubTask 3.2: `ali1688` handler — `cleanUrl` 对齐 `ali1688GetHylinkTitle.js`，`extractProductId` 对齐参考项目
  - [x] SubTask 3.3: `pdd` handler — `cleanUrl` 对齐 `pddGetHylinkTitle.js`，`extractProductId` 对齐参考项目
  - [x] SubTask 3.4: `pddpf` handler — `cleanUrl` 对齐 `pddpfGetHylinkTitle.js`，`extractProductId` 对齐参考项目

## 批次二：策略 A 变体 + 策略 C 平台

- [x] Task 4: 添加策略 A 变体专用 handler（4 个平台）
  - [x] SubTask 4.1: `rakuten` handler — `cleanUrl` 末尾加 `/`，`extractProductId` 路径提取
  - [x] SubTask 4.2: `newegg` handler — `cleanUrl` 有 Item 参数时保留，`extractProductId` 对齐参考项目
  - [x] SubTask 4.3: `macys` handler — `cleanUrl` 加回 `?ID=xxx`，`extractProductId` 从 searchParams 提取
  - [x] SubTask 4.4: `tiktok` handler — `cleanUrl` 提取 ID 时 `origin+pathname`，`extractProductId` 路径数字段

- [x] Task 5: 添加策略 C 专用 handler（2 个平台）
  - [x] SubTask 5.1: `ebay` handler — `cleanUrl` 有 ID 时 `origin+'/itm/'+id`，`extractProductId` 正则 `\/itm\/([0-9]+)`
  - [x] SubTask 5.2: `yupoo` handler — `cleanUrl` 保留 `gid` 参数，`extractProductId` 从 `gid` 提取

## 批次三：策略 B 平台 + 无规则平台

- [x] Task 6: 添加策略 B 专用 handler（7 个平台）
  - [x] SubTask 6.1: `redbook` handler — `cleanUrl` keyword 条件分支，`extractProductId` `/explore/` 路径
  - [x] SubTask 6.2: `vvic` handler — `cleanUrl` `/item/{ID}`，`extractProductId` 路径提取
  - [x] SubTask 6.3: `xz` handler — `cleanUrl` `/item/{数字ID}`，`extractProductId` 正则提取
  - [x] SubTask 6.4: `yiwugo` handler — `cleanUrl` `/product/detail/{ID}.html`，`extractProductId` 正则提取
  - [x] SubTask 6.5: `bao66` handler — `cleanUrl` 保留核心路径，`extractProductId` 多模式
  - [x] SubTask 6.6: `17zwd` handler — `cleanUrl` `/item/{数字ID}`，`extractProductId` 正则提取
  - [x] SubTask 6.7: `kuaishou` handler — `cleanUrl` `/goods/{id}` 或 `/item/{id}`，`extractProductId` 路径提取

- [x] Task 7: 添加无清洗规则平台 handler（5 个平台，使用 createPassthroughHandler）
  - [x] SubTask 7.1: `coupang` handler — `createPassthroughHandler('coupang', /\/vp\/products\/(\d+)/i)`
  - [x] SubTask 7.2: `goofish` handler — `createPassthroughHandler('goofish', /[?&]id=(\d+)/i)`
  - [x] SubTask 7.3: `sina` handler — `createPassthroughHandler('sina', sinaIdExtractor)` 多正则
  - [x] SubTask 7.4: `vip` handler — `createPassthroughHandler('vip', /-(\d+)\.html$/)`
  - [x] SubTask 7.5: `amazon` handler — `createPassthroughHandler('amazon', /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)`
  - [x] SubTask 7.6: `etsy` handler — 改用 `createOriginPathnameHandler('etsy', /\/listing\/(\d+)/)`（参考项目有清洗规则）

## 批次四：ResultPreview 重构 + 清理旧代码 + 验证

- [x] Task 8: 重构 ResultPreview.vue 的 ID 提取逻辑
  - [x] SubTask 8.1: 导入 `extractProductId` 替代内联 if-else
  - [x] SubTask 8.2: 简化 `resultTitle()` 函数，使用 `extractProductId(result.url)` 获取 ID
  - [x] SubTask 8.3: 移除通用兜底提取逻辑（已由各平台 handler 覆盖）

- [x] Task 9: 清理旧代码
  - [x] SubTask 9.1: 移除 `cleanUrlOriginPathname` 内部函数（已被 `createOriginPathnameHandler` 替代）
  - [x] SubTask 9.2: 移除各 `cleanXxxUrl()` 独立导出函数（已被 handler 注册表替代）
  - [x] SubTask 9.3: 移除 `cleanUrl` 中的 `switch-case` 分发逻辑（已被注册表分发替代）

- [x] Task 10: 验证与类型检查
  - [x] SubTask 10.1: 验证所有 `cleanUrl` 实现的幂等性
  - [x] SubTask 10.2: 验证淘宝/天猫清洗功能不受影响（回归）
  - [x] SubTask 10.3: 验证 `ResultPreview.vue` 的 ID 显示正确
  - [x] SubTask 10.4: 验证无清洗规则平台原样返回 URL + ID 正确提取
  - [x] SubTask 10.5: 运行 `npx vue-tsc --noEmit` 确保类型安全（通过，退出码 0）

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 1]
- [Task 6] depends on [Task 1]
- [Task 7] depends on [Task 1]
- [Task 8] depends on [Task 1]
- [Task 9] depends on [Task 2, Task 3, Task 4, Task 5, Task 6, Task 7]
- [Task 10] depends on [Task 8, Task 9]
- [Task 2]、[Task 3] 可并行
- [Task 4]、[Task 5]、[Task 6]、[Task 7] 可并行

# 实施偏差记录
- **Etsy 平台分类修正**：原 Spec 将 Etsy 归入"无清洗规则平台"，但参考项目 `etsy/getHylinkTitle.js` 实际执行了 `origin + pathname` 清洗，故改用 `createOriginPathnameHandler`。无清洗规则平台从 6 个修正为 5 个（coupang, goofish, sina, vip, amazon）。
- **createOriginPathnameHandler 参数扩展**：原 Spec 的 `idPattern: RegExp` 参数扩展为 `idExtractor: RegExp | ((url: string) => string)`，以支持 aliexpress、shopee 等多正则备选 ID 提取的平台。
- **createPassthroughHandler 参数扩展**：同上，`idPattern` 扩展为 `idExtractor?: RegExp | ((url: string) => string)`，以支持 sina 等多正则备选 ID 提取的平台。
