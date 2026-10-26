# 扩展外部浏览器登录范围 Spec

## Why
当前仅 1688 平台登录时弹出外部浏览器，其余平台均使用 WebView2 Worker 窗口登录。但多数平台的 WAF 或登录机制在 WebView2 中体验不佳或被拦截，需要扩大外部浏览器登录的覆盖范围。

## What Changes
- 修改 `platform_resolver.rs` 的 `use_external_browser_login()` 方法：将返回 `true` 的范围从仅 `Ali1688` 扩展为**除 Taobao、Jd、Vip 以外的所有平台**
- 修改 `commands.rs` 的 `is_external_browser_login` 命令：将平台字符串到 `Platform` 枚举的映射补全（当前仅映射 `ali1688`，其余全部映射为 `Unknown`）
- 修改 `PlatformDetect.vue` 中 `handlePreLogin` 的提示文案：当前硬编码"1688 登录"，需改为动态平台名
- 修改 `external_login_url()` 方法：为新增的外部浏览器登录平台提供合适的登录 URL

## Impact
- Affected specs: 登录策略、防拥堵机制
- Affected code:
  - `src-tauri/src/platform_resolver.rs` — `use_external_browser_login()` + `external_login_url()`
  - `src-tauri/src/commands.rs` — `is_external_browser_login` 命令
  - `src/components/PlatformDetect.vue` — 登录提示文案
  - `src/stores/taskQueue.ts` — `openLogin()` 逻辑（可能无需改动，已通过 `isExternalBrowserPlatform` 动态判断）

## ADDED Requirements

### Requirement: 扩展外部浏览器登录范围

系统 SHALL 在用户点击登录按钮时，根据平台类型决定使用外部浏览器还是 WebView2 Worker 窗口：
- **使用 WebView2 Worker 窗口登录**（保持不变）：淘宝(Taobao)、京东(Jd)、唯品会(Vip)
- **使用外部浏览器登录**（保持不变）：1688(Ali1688)
- **使用外部浏览器登录**（新增）：拼多多(Pdd)、速卖通(Aliexpress)、Alibaba、Amazon、Ebay、SHEIN、Lazada、Shopee、Temu、TikTok、抖音(Douyin)、小红书(Redbook)、快手(Kuaishou)、Walmart、Wayfair、Ozon、Wildberries、Coupang、Rakuten、Etsy、敦煌网(Dhgate)、义乌购(Yiwugo)、四季星座(Vvic)、包牛牛(Bao66)、17网(Zwd)、咸鱼(Goofish)、苏宁(Suning)、当当(Dangdang)、Macys、Newegg、MadeInChina、Mercadolibre、Mydepot、新浪(Sina)、Yupoo、Xz、拼多多批发(Pddpf)

#### Scenario: 非 Taobao/Jd/Vip 平台点击登录
- **WHEN** 用户在平台卡片上点击登录按钮，且平台不是 Taobao、Jd、Vip
- **THEN** 系统打开外部浏览器（Chrome/Edge），用户在浏览器中完成登录后点击「已完成登录」导入 Cookie

#### Scenario: Taobao/Jd/Vip 平台点击登录
- **WHEN** 用户在淘宝、京东或唯品会平台卡片上点击登录按钮
- **THEN** 系统打开 WebView2 Worker 窗口登录（行为不变）

### Requirement: is_external_browser_login 命令补全平台映射

`is_external_browser_login` Tauri Command SHALL 将所有前端传入的平台字符串正确映射到对应的 `Platform` 枚举变体，而非将未知平台映射为 `Unknown`（`Unknown` 的 `use_external_browser_login()` 返回 `false`，会导致本应使用外部浏览器登录的平台被错误地使用 WebView2）。

#### Scenario: 前端查询 Pdd 平台登录方式
- **WHEN** 前端调用 `is_external_browser_login("pdd")`
- **THEN** 返回 `true`（应使用外部浏览器登录）

### Requirement: 登录提示文案动态化

PlatformDetect.vue 中 `handlePreLogin` 的提示信息 SHALL 使用动态平台名称，而非硬编码"1688"。

#### Scenario: 用户点击拼多多登录按钮
- **WHEN** 用户点击拼多多的浏览器登录按钮
- **THEN** 提示信息显示"请在弹出的浏览器中完成 拼多多 登录，然后点击「✅ 已完成登录」按钮"

### Requirement: external_login_url 为各平台提供登录页

`external_login_url()` 方法 SHALL 为所有使用外部浏览器登录的平台提供对应的登录页 URL。对于没有独立登录页的平台，使用其主页 URL 作为 fallback。

## MODIFIED Requirements

### Requirement: use_external_browser_login 判定逻辑

原有逻辑：仅 `Platform::Ali1688` 返回 `true`。
修改为：**排除法** — 仅 `Platform::Taobao`、`Platform::Jd`、`Platform::Vip` 返回 `false`，其余所有已知平台变体均返回 `true`。`Platform::Unknown` 返回 `false`。
