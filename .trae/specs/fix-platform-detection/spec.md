# 平台检测逻辑审查与修复 Spec

## Why
当前 `src/utils/platforms.ts` 中的平台 URL 匹配规则与参考项目 `GetPic/entrypoints/` 中各平台 content script 的 `matches` 定义存在多处不一致，部分平台缺失、正则转换有误、优先级顺序可能导致误匹配，需要系统性修复以确保平台判定逻辑的准确性。

## What Changes
- 修复 `PLATFORM_PATTERNS` 中多个平台的正则表达式与参考项目 matches 不一致的问题
- 新增缺失的 `pddpf`（拼多多批发）平台
- 修复 `xiaohongshu` 平台 key 与 scraper-scripts 目录命名不一致的问题
- 修复 `sina`、`yupoo`、`vvic`、`bao66`、`mydepot`、`made-in-china` 等平台缺少裸域名匹配的问题
- 修复 `walmart` 缺少 `sku.ninja` 域名匹配的问题
- 修复 `kuaishou` 的 `xmmicvfxi.com` 缺少 http 协议匹配的问题
- 调整 `PLATFORM_ORDER` 优先级，确保子域名更具体的平台优先匹配（如 `ali1688` 优先于 `alibaba`）
- 修复 `etsy` 平台正则过于宽泛的问题（当前 `*.etsy.com` 会匹配所有子域名，参考项目有精确的国家级域名列表）

## Impact
- Affected code: `src/utils/platforms.ts`
- Affected consumers: `src/stores/taskQueue.ts`、`src/components/ResultPreview.vue`、`src/utils/platforms.ts`（cleanUrl）
- Affected labels/icons: `PLATFORM_LABELS`、`PLATFORM_ICONS` 需同步新增 `pddpf`

## ADDED Requirements

### Requirement: 平台正则表达式必须严格对齐参考项目 matches
系统 SHALL 确保每个平台的正则表达式覆盖范围与 `GetPic/entrypoints/<platform>.content.js` 中的 `matches` 数组完全一致。

#### Scenario: 拼多多批发链接正确识别
- **WHEN** 用户输入 `https://pf.pinduoduo.com/xxx` 类链接
- **THEN** 系统识别为 `pddpf` 平台而非 `pdd` 平台

#### Scenario: 闲鱼链接正确识别
- **WHEN** 用户输入 `https://www.goofish.com/item/xxx` 或 `https://www.xianyu.com/xxx` 或 `https://2.taobao.com/xxx`
- **THEN** 系统识别为 `goofish` 平台

#### Scenario: 搜款网裸域名匹配
- **WHEN** 用户输入 `https://vvic.com/xxx`（无子域名）
- **THEN** 系统识别为 `vvic` 平台

#### Scenario: 1688 与 alibaba 不误匹配
- **WHEN** 用户输入 `https://detail.1688.com/xxx`
- **THEN** 系统识别为 `ali1688` 平台（而非 `alibaba`）
- **WHEN** 用户输入 `https://www.alibaba.com/xxx`
- **THEN** 系统识别为 `alibaba` 平台

### Requirement: 平台优先级顺序避免子域名误匹配
系统 SHALL 按照从具体到一般的顺序排列平台检测优先级，确保子域名更具体的平台优先匹配。

#### Scenario: pddpf 与 pdd 的区分
- **WHEN** 用户输入拼多多批发平台链接
- **THEN** 系统优先匹配 `pddpf`，而非 `pdd`

### Requirement: 新增 pddpf 平台支持
系统 SHALL 支持 `pddpf`（拼多多批发）平台的检测，匹配规则为 `*://*.pinduoduo.com/*`。

### Requirement: sina 平台匹配 weibo 裸域名
系统 SHALL 在 `sina` 平台中匹配 `weibo.com`（无子域名前缀）的链接。

#### Scenario: 微博裸域名匹配
- **WHEN** 用户输入 `https://weibo.com/xxx`
- **THEN** 系统识别为 `sina` 平台

## MODIFIED Requirements

### Requirement: 修复 vvic 正则缺少裸域名
当前 `vvic` 平台正则为 `/^https?:\/\/([a-zA-Z0-9-]+\.)*vvic\.com\//`，该正则可以匹配 `www.vvic.com` 等子域名，但参考项目还有 `*://vvic.com/*`（裸域名）。虽然当前正则中 `([a-zA-Z0-9-]+\.)*` 的 `*` 量词允许零次匹配，所以裸域名 `vvic.com` 实际上也能匹配。**经确认此条无需修改**。

### Requirement: 修复 made-in-china 正则缺少裸域名
当前 `made-in-china` 平台正则缺少对 `made-in-china.com`（无子域名）和 `madeinchina.cn`（无子域名）的匹配。参考项目有 `*://made-in-china.com/*` 和 `*://madeinchina.cn/*`。与 vvic 同理，`([a-zA-Z0-9-]+\.)*` 的 `*` 量词允许零次匹配，裸域名也能匹配。**经确认此条无需修改**。

### Requirement: 修复 walmart 缺少 sku.ninja 匹配
当前 `walmart` 平台缺少对 `sku.ninja` 和 `media.sku.ninja` 域名的匹配。参考项目有 `*://media.sku.ninja/*` 和 `*://*.sku.ninja/*`。

## REMOVED Requirements

### Requirement: 无需移除
**Reason**: 本次为修复和补充，不涉及功能移除。

---

## 详细差异清单

以下是对 `platforms.ts` 与参考项目 matches 的逐平台对比结果：

### 🔴 需要修复的问题（7 项）

| # | 平台 | 问题描述 | 参考项目 matches | 当前 platforms.ts |
|---|------|---------|-----------------|------------------|
| 1 | **pddpf** | 完全缺失 | `*://*.pinduoduo.com/*` | 不存在 |
| 2 | **xiaohongshu** | 平台 key 与 scraper-scripts 不一致 | `*://*.xiaohongshu.com/*` | key 为 `xiaohongshu`，但参考项目目录为 `redbook`，scraper-scripts 中也应为 `redbook` |
| 3 | **walmart** | 缺少 sku.ninja 域名 | `*://media.sku.ninja/*`, `*://*.sku.ninja/*` | 无 sku.ninja 匹配 |
| 4 | **kuaishou** | xmmicvfxi.com 仅匹配 https | `*://*.xmmicvfxi.com/*`（含 http） | 仅 `https` 正则 |
| 5 | **sina** | weibo.com 裸域名无法匹配 | `*://weibo.com/*` | `([a-zA-Z0-9-]+\.)*weibo\.com` 要求有子域名前缀 |
| 6 | **etsy** | 正则过于宽泛 | 有精确的 24 个国家级域名 | 仅 `*.etsy.com` 一个宽泛正则 |
| 7 | **mydepot** | 缺少裸域名 mydepot.com | `*://mydepot.com/*` | 仅 `*.mydepot.com` |

### 🟡 优先级顺序问题（2 项）

| # | 问题 | 说明 |
|---|------|------|
| 1 | **ali1688 应优先于 alibaba** | `detail.1688.com` 也能被 `alibaba` 的 `*.alibaba.com` 匹配？不会，1688.com ≠ alibaba.com。但 `ali1688` 排在 `alibaba` 前面更安全 |
| 2 | **pddpf 应优先于 pdd** | `pddpf` 的 `*.pinduoduo.com` 与 `pdd` 的 `*.pinduoduo.com` 完全重叠，需要 pddpf 排在 pdd 前面 |

### 🟢 已正确匹配（无需修改）

taobao、jd、pdd、ali1688、alibaba、aliexpress、amazon、ebay、shein、lazada、shopee、temu、tiktok、douyin、vip、goofish、ozon、wildberries、coupang、rakuten、dhgate、yiwugo、vvic、bao66、17zwd、suning、dangdang、macys、newegg、mercadolibre、xz、yupoo（裸域名因 `*` 量词可匹配）
