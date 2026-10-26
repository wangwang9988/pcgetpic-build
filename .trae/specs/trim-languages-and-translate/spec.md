# 精简语言支持与核心语言翻译补全

> 将官网支持语言从 53 种精简为 11 种 SEO 核心语言，补全这些语言的翻译，删除未适配语言的 locale 文件和配置。

## Why

当前官网支持 53 种语言，但除了 zh-CN 和 en-US 外，其余语言的翻译几乎全部为空字符串（fallback 到中文），导致韩语、日语等页面几乎不显示文字。这些空翻译页面既损害用户体验，又对 SEO 无益。应精简到电商图片下载工具的 SEO 核心市场语言，并补全翻译。

## What Changes

- **精简语言列表**：从 53 种减少到 11 种（zh-CN, en-US, zh-TW, ja, ko, es, de, pt-BR, vi, th, id）
- **删除未适配语言的 locale JSON 文件**（约 42 个文件）
- **更新 `i18n.ts`**：locales 数组和 localeFlagMap 只保留 11 种语言
- **更新 `CORE_LOCALES`**：从 5 种扩展到 11 种（与保留语言一致）
- **补全 9 种非中英语言的翻译**：zh-TW, ja, ko, es, de, pt-BR, vi, th, id
- **LangSwitcher.vue**：自动跟随 i18n.ts 配置，无需单独修改

## Impact

- Affected specs: `refine-desktop-compare-section`（前次 i18n 结构更新已覆盖所有文件，删除文件不影响）
- Affected code:
  - **修改** `website/app/config/i18n.ts` — locales/CORE_LOCALES/localeFlagMap 精简
  - **修改** `website/i18n/locales/zh-TW.json` — 补全翻译
  - **修改** `website/i18n/locales/ja.json` — 补全翻译
  - **修改** `website/i18n/locales/ko.json` — 补全翻译
  - **修改** `website/i18n/locales/es.json` — 补全翻译
  - **修改** `website/i18n/locales/de.json` — 补全翻译
  - **修改** `website/i18n/locales/pt-BR.json` — 补全翻译
  - **修改** `website/i18n/locales/vi.json` — 补全翻译
  - **修改** `website/i18n/locales/th.json` — 补全翻译
  - **修改** `website/i18n/locales/id.json` — 补全翻译
  - **删除** 约 42 个未适配语言的 locale JSON 文件
  - **不修改** LangSwitcher.vue（自动读取 i18n.ts 的 locales 数组）

## 保留的 11 种语言及理由

| 语言 | 代码 | 理由 |
|---|---|---|
| 简体中文 | zh-CN | 核心用户群，默认语言 |
| English | en-US | 国际兜底，浏览器商店审核 |
| 繁體中文 | zh-TW | 港澳台用户 |
| 日本語 | ja | 日本电商大市场（Rakuten、Amazon JP） |
| 한국어 | ko | 韩国电商市场（Coupang） |
| Español | es | 西班牙+拉美市场（Mercado Libre） |
| Deutsch | de | 德国电商（欧洲最大电商市场） |
| Português (Brasil) | pt-BR | 巴西市场（Mercado Libre、Shopee BR） |
| Tiếng Việt | vi | 越南市场（Shopee/Lazada VN） |
| ไทย | th | 泰国市场（Shopee/Lazada TH） |
| Bahasa Indonesia | id | 印尼市场（Shopee/Lazada/Tokopedia） |

## ADDED Requirements

### Requirement: 语言列表精简
系统 SHALL 仅支持 11 种 SEO 核心语言，不再支持其余 42 种语言。

#### Scenario: 用户访问语言切换器
- **WHEN** 用户点击语言切换下拉菜单
- **THEN** 仅显示 11 种语言选项
- **AND** 不显示已删除的语言（如 ar, fa, he, hi, bn 等）

#### Scenario: 用户访问已删除语言的 URL
- **WHEN** 用户通过旧链接访问如 `/fr/` 路径
- **THEN** 系统回退到默认语言（zh-CN 或 en-US）

### Requirement: 核心语言翻译补全
9 种非中英语言的翻译文件 SHALL 补全所有空字符串值，确保页面完整显示本地化文字。

#### Scenario: 韩语用户访问首页
- **WHEN** 韩语用户访问 `/ko/` 路径
- **THEN** 所有文字均显示韩语翻译，无空白或中文回退

#### Scenario: 日语用户访问桌面客户端页面
- **WHEN** 日语用户访问 `/ja/` 桌面客户端页面
- **THEN** 优势展示区、功能介绍、教程、FAQ 等区域均显示日语

### Requirement: 删除未适配语言的 locale 文件
42 个未适配语言的 JSON 文件 SHALL 被删除。

#### Scenario: locales 目录文件数
- **WHEN** 列出 `website/i18n/locales/` 目录
- **THEN** 仅包含 11 个 JSON 文件（zh-CN, en-US, zh-TW, ja, ko, es, de, pt-BR, vi, th, id）

### Requirement: CORE_LOCALES 与保留语言一致
`CORE_LOCALES` 数组 SHALL 包含所有 11 种保留语言，确保 Sitemap 和 hreflang 覆盖所有支持语言。

#### Scenario: Sitemap 生成
- **WHEN** 构建时生成 Sitemap
- **THEN** 每个页面包含 11 个语言版本的 alternatives + x-default

## MODIFIED Requirements

### Requirement: i18n 配置精简
`i18n.ts` 的 locales 数组、localeFlagMap、CORE_LOCALES SHALL 仅包含 11 种语言。

**变更前**：locales 包含 53 种语言，CORE_LOCALES 包含 5 种
**变更后**：locales 包含 11 种语言，CORE_LOCALES 包含 11 种

## REMOVED Requirements

### Requirement: 53 种语言支持
**Reason**：绝大多数语言翻译为空，用户体验差，SEO 无价值
**Migration**：已删除语言的 URL 将回退到默认语言
