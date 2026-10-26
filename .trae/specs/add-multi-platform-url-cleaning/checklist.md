# Checklist

## 基础设施
- [x] `PlatformHandler` 接口已定义（`platform` + `cleanUrl` + `extractProductId` + `extractTitleHint?`）
- [x] `createOriginPathnameHandler()` 工厂函数已实现
- [x] `createPassthroughHandler()` 工厂函数已实现
- [x] `PLATFORM_HANDLERS` 注册表已创建
- [x] `getHandler()` 访问器函数已实现
- [x] `cleanUrl` 已重构为通过 `PLATFORM_HANDLERS[platform].cleanUrl` 分发
- [x] `extractProductId` 已新增，通过 `PLATFORM_HANDLERS[platform].extractProductId` 分发
- [x] `extractTitleHint` 已新增，通过 `PLATFORM_HANDLERS[platform].extractTitleHint?` 分发
- [x] 已有的 `cleanTaobaoUrl` 已重构为 taobao handler，淘宝/天猫功能不受影响

## 通用平台（18 个，使用 createOriginPathnameHandler）
- [x] `alibaba` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `aliexpress` — `cleanUrl: origin+pathname`，`extractProductId` 多正则备选
- [x] `shein` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `lazada` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `shopee` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `temu` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `douyin` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `walmart` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `wayfair` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `ozon` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `wildberries` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `dhgate` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `suning` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `dangdang` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `made-in-china` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `mercadolibre` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `mydepot` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目
- [x] `etsy` — `cleanUrl: origin+pathname`，`extractProductId` 对齐参考项目（修正：参考项目有清洗规则）

## 专用平台（18 个）
- [x] `taobao` — `cleanUrl` 对齐 `tbGetHylinkTitle.js`，`extractProductId` 对齐参考项目
- [x] `jd` — `cleanUrl` 对齐 `jdGetHylinkTitle.js`，`extractProductId` 对齐参考项目
- [x] `ali1688` — `cleanUrl` 对齐 `ali1688GetHylinkTitle.js`，`extractProductId` 对齐参考项目
- [x] `pdd` — `cleanUrl` 对齐 `pddGetHylinkTitle.js`，`extractProductId` 对齐参考项目
- [x] `pddpf` — `cleanUrl` 对齐 `pddpfGetHylinkTitle.js`，`extractProductId` 对齐参考项目
- [x] `rakuten` — `cleanUrl` 末尾加 `/`，`extractProductId` 路径提取
- [x] `newegg` — `cleanUrl` 有 Item 参数时保留，`extractProductId` 对齐参考项目
- [x] `macys` — `cleanUrl` 加回 `?ID=xxx`，`extractProductId` 从 searchParams 提取
- [x] `tiktok` — `cleanUrl` 提取 ID 时 `origin+pathname`，`extractProductId` 路径数字段
- [x] `ebay` — `cleanUrl` 有 ID 时 `origin+'/itm/'+id`，`extractProductId` 正则提取
- [x] `yupoo` — `cleanUrl` 保留 `gid` 参数，`extractProductId` 从 `gid` 提取
- [x] `redbook` — `cleanUrl` keyword 条件分支，`extractProductId` `/explore/` 路径
- [x] `vvic` — `cleanUrl` `/item/{ID}`，`extractProductId` 路径提取
- [x] `xz` — `cleanUrl` `/item/{数字ID}`，`extractProductId` 正则提取
- [x] `yiwugo` — `cleanUrl` `/product/detail/{ID}.html`，`extractProductId` 正则提取
- [x] `bao66` — `cleanUrl` 保留核心路径，`extractProductId` 多模式
- [x] `17zwd` — `cleanUrl` `/item/{数字ID}`，`extractProductId` 正则提取
- [x] `kuaishou` — `cleanUrl` `/goods/{id}` 或 `/item/{id}`，`extractProductId` 路径提取

## 无清洗规则平台（5 个，使用 createPassthroughHandler）
- [x] `coupang` — `cleanUrl` 返回原链接 + TODO 注释，`extractProductId` 对齐参考项目
- [x] `goofish` — `cleanUrl` 返回原链接 + TODO 注释，`extractProductId` 对齐参考项目
- [x] `sina` — `cleanUrl` 返回原链接 + TODO 注释，`extractProductId` 对齐参考项目
- [x] `vip` — `cleanUrl` 返回原链接 + TODO 注释，`extractProductId` 对齐参考项目
- [x] `amazon` — `cleanUrl` 返回原链接 + TODO 注释，`extractProductId` 对齐参考项目

## ResultPreview.vue 重构
- [x] `resultTitle()` 使用 `extractProductId(url)` 替代内联 if-else
- [x] 移除了通用兜底提取逻辑（已由各平台 handler 覆盖）

## 旧代码清理
- [x] `cleanUrlOriginPathname` 内部函数已移除
- [x] 各 `cleanXxxUrl()` 独立导出函数已移除
- [x] `cleanUrl` 中的 `switch-case` 分发逻辑已替换为注册表分发

## 质量验证
- [x] 所有 `cleanUrl` 实现幂等：对已清洗 URL 再次清洗结果不变
- [x] 淘宝/天猫清洗功能不受影响（回归验证）
- [x] `ResultPreview.vue` 的 ID 显示正确
- [x] 无清洗规则平台原样返回 URL + ID 正确提取
- [x] `npx vue-tsc --noEmit` 通过，无类型错误
- [x] 所有清洗和 ID 提取逻辑严格来自 `GetPic`

## 架构一致性
- [x] `PlatformHandler` 仅负责纯 URL 计算（无 DOM、无网络），不涉及图片/视频抓取
- [x] `scraper-scripts/` 不受本次改动影响（运行在不同上下文）
- [x] `src-tauri/src/platform_resolver.rs` 不受本次改动影响（Rust 侧已完整覆盖）
- [x] 新增平台的完整流程已在 Spec 中明确（步骤1: PlatformHandler → 步骤2: Scraper Scripts → 步骤3: Rust Resolver）
