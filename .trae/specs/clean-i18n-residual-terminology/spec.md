# 多语言文案残留冲突清理 Spec

## Why

官网平台页（`/platforms`、`/platforms/[slug]`）已转向推广桌面客户端，但仅 `zh-CN.json` 做了部分清洗，其余 10 种语言文件中仍大量残留 `extension`、`plugin`、`chrome store`、`浏览器插件`、`拡張機能`、`Erweiterung`、`extensão` 等旧术语。这导致：
- 非中文用户看到"安装浏览器扩展"等与实际产品（桌面客户端）不符的文案，产生不信任
- Google 抓取英文/日文/韩文等站点时关键词与页面实际内容不一致，削弱 SEO 权重

## What Changes

### 1. platformPage 命名空间 — 全 11 语言清洗
- `description` / `metaDescription`：去"浏览器扩展"→"桌面客户端"
- `tutorialStep1Title` / `tutorialStep1Desc`："安装扩展"→"下载安装"
- `tutorialStep3Desc`："点击扩展图标"→"自动抓取"
- `faqA2` / `faqA3` / `faqA4` / `faqA5`：插件语境→客户端语境
- `ctaSubtitle`：补充"批量"等客户端价值描述

### 2. platform.descriptions — 全 11 语言批量替换
- 每个平台描述末尾的"插件支持..."/"The extension supports..."/"拡張機能は..."/"Erweiterung unterstützt..."等统一改为"客户端支持..."/"The desktop client supports..."等对应语言表述

### 3. platformsIndex 命名空间 — 全 11 语言清洗
- `seoDescription`：去"Free browser extension"→"Free desktop client"

### 4. footer.desc — 全 11 语言清洗
- "浏览器扩展"→通用/客户端描述

### 5. seo.keywords — 补充桌面客户端关键词
- 在各语言的 `seo.keywords` 中补充"desktop client"/"桌面客户端"/"Windows app"等强相关词汇
- **注意**：`seo.keywords` 被全局和 `/extension` 页面共用，不能删除扩展相关词，只能追加桌面客户端词

### 6. desktopHero.btnPlugin — 检查是否需要调整
- 桌面首页出现"了解浏览器插件"按钮，需确认是否仍需保留此入口

### 7. InstallCard.vue 硬编码中文 — i18n 化
- 当前 InstallCard 组件文本全部硬编码中文，非中文用户看到中文按钮文案
- 需将硬编码文本提取为 i18n key

## 不修改的区域

以下区域属于 `/extension` 浏览器插件页面，**不在本次修改范围**：
- `hero.*` — 插件页 Hero
- `download.*` — 插件下载区域
- `usage.*` — 插件使用教程
- `features.*` — 插件功能介绍
- `nav.extension` — 导航栏"浏览器插件"标签（正确指向 /extension 页面）

## Impact

- **Affected specs**: `switch-platform-pages-to-desktop-client`（i18n 部分重叠，本 spec 更聚焦多语言清洗）、`trim-languages-and-translate`（翻译补全重叠）
- **Affected code**:
  - `website/i18n/locales/` 下全部 11 个 JSON 文件
  - `website/app/components/platform/InstallCard.vue`（硬编码中文→i18n）
  - 可能涉及 `website/app/components/DesktopHero.vue`（btnPlugin 检查）

---

## ADDED Requirements

### Requirement: platformPage 多语言文案客户端化
系统 SHALL 将所有 11 种语言的 `platformPage` 命名空间下的文案从插件语境切换到客户端语境。

#### Scenario: 英文用户访问平台详情页
- **WHEN** 英文用户访问 `/en/platforms/taobao`
- **THEN** `platformPage.description` 不包含 "extension" 或 "browser extension" 字样
- **AND** `platformPage.tutorialStep1Title` 为 "Download & Install"（非 "Install Extension"）
- **AND** `platformPage.faqA2` 提及 "free trial" 和 "license"（非 "completely free"）

#### Scenario: 日文用户访问平台详情页
- **WHEN** 日文用户访问 `/ja/platforms/amazon`
- **THEN** `platformPage.tutorialStep1Desc` 描述下载客户端安装包（非安装浏览器拡張機能）
- **AND** `platformPage.faqA3` 描述粘贴链接到客户端（非点击拡張機能アイコン）

#### Scenario: 其他语言用户访问平台详情页
- **WHEN** 任意语言用户访问对应语言的平台详情页
- **THEN** 教程步骤描述客户端操作流程（下载安装→粘贴链接→自动抓取）
- **AND** FAQ 回答反映客户端使用方式（非浏览器插件操作）
- **AND** 描述文字中不再出现该语言的"扩展"/"插件"等旧术语

### Requirement: platform.descriptions 多语言去插件化
系统 SHALL 将所有 11 种语言中每个平台描述末尾的"插件支持..."/"The extension supports..."等表述改为"客户端支持..."/"The desktop client supports..."等对应表述。

#### Scenario: 英文用户阅读平台描述
- **WHEN** 英文用户阅读任意平台描述
- **THEN** 描述中不包含 "The extension supports" / "The extension unlocks" 等表述
- **AND** 替换为 "The desktop client supports" / "The desktop client provides" 等

#### Scenario: 繁体中文用户阅读平台描述
- **WHEN** 繁體中文用户阅读任意平台描述
- **THEN** 描述中不包含 "外掛支援" / "擴充功能" 等表述
- **AND** 替换为 "客戶端支援" / "桌面客戶端" 等

### Requirement: platformsIndex 多语言 SEO 描述客户端化
系统 SHALL 将所有 11 种语言的 `platformsIndex.seoDescription` 从"浏览器扩展"描述改为"桌面客户端"描述。

#### Scenario: 搜索引擎抓取平台列表页
- **WHEN** 爬虫访问任意语言的 `/platforms` 页面
- **THEN** meta description 中不包含 "browser extension" / "浏览器扩展" 等旧术语

### Requirement: footer.desc 多语言客户端化
系统 SHALL 将所有 11 种语言的 `footer.desc` 从"浏览器扩展"描述改为通用/客户端描述。

#### Scenario: 用户查看页脚
- **WHEN** 用户在任意页面查看页脚
- **THEN** 页脚描述不自称"浏览器扩展"，而是通用产品描述或"桌面客户端"

### Requirement: seo.keywords 补充桌面客户端关键词
系统 SHALL 在各语言的 `seo.keywords` 中追加桌面客户端相关关键词，同时保留现有扩展相关词（因 `/extension` 页面仍需）。

#### Scenario: 搜索引擎抓取任意页面
- **WHEN** 爬虫读取 `seo.keywords`
- **THEN** 关键词中包含 "desktop client" / "Windows app" / "桌面客户端" 等桌面端相关词
- **AND** 仍保留 "extension" / "plugin" 等词（供 /extension 页面 SEO 使用）

### Requirement: InstallCard.vue 硬编码中文 i18n 化
系统 SHALL 将 InstallCard 组件中的硬编码中文文本提取为 i18n key，确保非中文用户看到本地化按钮文案。

#### Scenario: 英文用户查看平台详情页 InstallCard
- **WHEN** 英文用户查看平台详情页的下载卡片
- **THEN** 按钮文案显示英文（如 "Download Windows Client"），而非硬编码中文"下载 Windows 客户端"
- **AND** 系统要求提示也显示为英文

## MODIFIED Requirements

### Requirement: platformPage i18n 文案（扩展至全语言）
原 `switch-platform-pages-to-desktop-client` spec 的 i18n 文案修改范围从 zh-CN + en-US 扩展至全部 11 种语言。

**变更前**：仅 zh-CN 和 en-US 的 platformPage 文案已客户端化
**变更后**：全部 11 种语言的 platformPage 文案客户端化

### Requirement: platform.descriptions（扩展至全语言）
原 spec 仅覆盖 zh-CN 和 en-US 的平台描述替换。

**变更前**：仅 zh-CN 和 en-US 的平台描述去插件化
**变更后**：全部 11 种语言的平台描述去插件化

## REMOVED Requirements

无删除项。
