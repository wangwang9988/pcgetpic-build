# 官网改版 V3：桌面客户端首页 + 插件页降级

> 核心策略：**首页完全重做为桌面客户端专属页，现有插件页整体迁移至 `/extension` 路由，不做任何修改。** 这是让付费产品获得最大曝光、同时零风险保护现有插件资产的最优方案。

## Why

当图桌面客户端是唯一的付费产品（收入来源），浏览器插件是免费产品（无收入）。当前官网 100% 展示插件，客户端完全没有曝光入口。如果继续主推免费插件，项目无法良性运转。

必须让每个访问 `downpictures.com` 的用户第一眼看到的是能产生收入的桌面客户端，而不是免费的浏览器插件。

## 路由策略

```
改版前:
  /                    → 插件首页（现有）

改版后:
  /                    → 桌面客户端首页（全新）
  /extension           → 插件首页（现有页面原封不动迁移）
  /platforms/[slug]    → 平台详情页（保持不变）
  /platforms           → 平台列表页（保持不变）
```

**关键决策：插件现有页面一行代码都不改。** 直接在路由层面把插件页面整体迁移到 `/extension`，所有功能、SEO、多语言保持不变。

## 产品定位

| 维度 | 桌面客户端 (EXE) — 主推 | 浏览器插件 — 辅助 |
|------|------------------------|-------------------|
| 首页位置 | `/` 独占展示 | `/extension` 次级入口 |
| 定位 | 商用专业版，电商卖家生产力工具 | 免费体验版，个人轻度使用 |
| 价格 | 付费授权 | 免费 |
| CTA | 「下载 Windows 客户端」「获取激活码」 | 仅导航栏文字链接 |

## What Changes

### 全新桌面客户端首页 `/`
- 全新的 Hero section：大标题、产品截图/示意、EXE 下载按钮、激活码购买入口
- 版本对比表：客户端 vs 插件的 6 项差距（并发能力、批量链接、后台运行、防封机制、文件管理、技术支持）
- 客户端核心功能：6 个优势卡片
- 客户端使用教程：5 步快速上手
- 常见问题 FAQ
- 下载区：EXE 下载 + 系统要求 + 版本号

### 插件页迁移 `/extension`
- 现有 `app/pages/index.vue` → `app/pages/extension.vue`
- 内容、组件、SEO schema **完全不变**
- 保留原有 `#hero`、`#features`、`#download`、`#usage` 锚点

### 导航栏
- 「当图客户端」→ `/`（首页，主推）
- 「浏览器插件」→ `/extension`（免费版，低调文字链接）
- 「支持平台」→ `/platforms`（保持不变）
- 「购买授权」→ `store.downpictures.com`（醒目按钮）

### SEO
- `/` → 聚焦 `DesktopApplication`，关键词围绕"桌面客户端""Windows图片下载软件"
- `/extension` → 保留原有 `BrowserExtension` schema 和 SEO，不受影响
- sitemap 新增 `/extension` 路由

### i18n
- 新增 ~40 个 key 用于桌面客户端首页（zh-CN + en-US 定义，其他 52 种语言空 key fallback）
- 插件页 i18n key **不做任何修改**

---

## Impact

- Affected specs: 无现有 spec 冲突
- Affected code:
  - **新建** `website/app/pages/index.vue` — 桌面客户端首页（全新）
  - **重命名** `website/app/pages/index.vue` → `website/app/pages/extension.vue`（原插件页）
  - **新建** `website/app/components/DesktopHero.vue` — 客户端 Hero
  - **新建** `website/app/components/DesktopCompare.vue` — 版本对比表
  - **新建** `website/app/components/DesktopFeatures.vue` — 客户端功能卡片
  - **新建** `website/app/components/DesktopTutorial.vue` — 客户端教程
  - **新建** `website/app/components/DesktopFAQ.vue` — 客户端 FAQ
  - **新建** `website/app/components/DesktopDownload.vue` — 客户端下载区
  - **修改** `website/app/components/NavBar.vue` — 导航重构
  - **修改** `website/app/components/FooterSection.vue` — 新增客户端链接
  - **新建** `website/public/client-version.json` — 客户端版本信息
  - **修改** `website/i18n/locales/zh-CN.json` — 新增 ~40 个 key
  - **修改** `website/i18n/locales/en-US.json` — 新增 ~40 个 key
  - **修改** `website/nuxt.config.ts` — sitemap 新增 `/extension`
  - **不修改** — 现有所有插件相关组件（HeroSection/FeatureSection/DownloadSection/UsageSection/PlatformSection 等）

---

## ADDED Requirements

### Requirement: 桌面客户端首页 `/`
系统 SHALL 提供一个全新的、专为桌面客户端设计的首页。

#### Scenario: 用户首次访问
- **WHEN** 用户访问 `downpictures.com/`
- **THEN** 看到桌面客户端专属首页，包含以下区块（从上到下）：

```
1. DesktopHero       — 大标题 + 产品截图 + 「下载 Windows 客户端」按钮 + 「获取激活码」按钮
2. DesktopCompare    — 客户端 vs 插件 6 项对比表
3. DesktopFeatures   — 客户端 6 个核心功能卡片
4. DesktopTutorial   — 5 步快速上手教程
5. DesktopDownload   — EXE 下载区（版本号 + 系统要求）
6. DesktopFAQ        — 7 个常见问题
```

### Requirement: DesktopHero — 客户端首屏
系统 SHALL 展示桌面客户端的品牌、定位和 CTA。

#### Scenario: 首屏内容
- **WHEN** 页面加载
- **THEN** 显示标题「当图客户端 — 电商图片批量下载商用级工具」
- **AND** 副标题描述客户端核心价值（多线程并发、千级链接排队、免开浏览器后台下载）
- **AND** 主按钮「下载 Windows 客户端 (.exe)」
- **AND** 副按钮「获取激活码 / 查看价格」
- **AND** 版本号从 `client-version.json` 读取

### Requirement: DesktopCompare — 版本对比表
系统 SHALL 以对比表形式展示客户端相对于免费插件的优势。

#### Scenario: 对比表内容
- **WHEN** 用户滚动到对比区域
- **THEN** 看到 6 项对比：多线程并发、批量链接量、后台运行、防封机制、文件管理、技术支持
- **AND** 每项明确标注插件端 ❌ 和客户端 🚀 的差异
- **AND** 视觉上客户端列高亮突出

### Requirement: DesktopFeatures — 客户端功能卡片
系统 SHALL 展示客户端 6 个核心功能。

#### Scenario: 功能卡片
- **WHEN** 用户查看功能区域
- **THEN** 看到 6 个 Glassmorphism 卡片：多 Worker 并发抓取、智能 Cookie 共享、验证码自动感知、仿人机行为设计、智能分类存储、低内存原生框架

### Requirement: DesktopTutorial — 客户端教程
系统 SHALL 展示客户端快速上手步骤。

#### Scenario: 教程步骤
- **WHEN** 用户查看教程区域
- **THEN** 看到 5 步教程：下载安装 → 激活授权 → 粘贴链接 → 开始抓取 → 导出结果

### Requirement: DesktopDownload — 客户端下载区
系统 SHALL 提供客户端 EXE 下载入口。

#### Scenario: 下载区
- **WHEN** 用户滚动到下载区
- **THEN** 看到 Windows EXE 下载按钮
- **AND** 显示版本号、文件大小（如有）、系统要求（Windows 10/11 64位）
- **AND** 下载链接从 `client-version.json` 读取

### Requirement: DesktopFAQ — 常见问题
系统 SHALL 提供客户端相关常见问题解答。

#### Scenario: FAQ
- **WHEN** 用户查看 FAQ
- **THEN** 看到 7 个 FAQ：系统要求、Mac 支持、授权购买、试用政策、支持平台、封号风险、与插件区别
- **AND** 使用折叠面板交互

### Requirement: 插件页迁移 `/extension`
系统 SHALL 将现有插件首页整体迁移到 `/extension` 路由。

#### Scenario: 访问插件页
- **WHEN** 用户访问 `/extension`
- **THEN** 看到与改版前 `/` 完全相同的插件介绍页
- **AND** 所有 section（Hero/Features/Download/Usage/Platforms）、浏览器检测、下载入口均保持不变
- **AND** 原有 `#hero`、`#features`、`#download`、`#usage` 锚点可正常使用（但导航链接需更新为 `/extension#xxx`）

### Requirement: 导航栏重构
系统 SHALL 重构导航栏以匹配新的路由结构。

#### Scenario: 导航栏链接
- **WHEN** 页面加载
- **THEN** 导航栏左侧 Logo 链接指向 `/`
- **AND** 「当图客户端」→ `/`（首页，主推）
- **AND** 「浏览器插件」→ `/extension`（免费版，文字链接）
- **AND** 「支持平台」→ `/platforms`（保持不变）
- **AND** 右侧醒目按钮「购买授权」→ `store.downpictures.com`（外链或 store 子站）

#### Scenario: 当前所在页面高亮
- **WHEN** 用户在 `/` 页面
- **THEN** 「当图客户端」导航项高亮
- **WHEN** 用户在 `/extension` 页面
- **THEN** 「浏览器插件」导航项高亮

### Requirement: SEO — 桌面客户端首页
系统 SHALL 为桌面客户端首页提供独立的 SEO 元数据。

#### Scenario: Schema 和 Meta
- **WHEN** 搜索引擎爬取 `/`
- **THEN** JSON-LD 包含 `DesktopApplication` schema，`operatingSystem: 'Windows 10, Windows 11'`
- **AND** `<title>` 为"当图客户端 - 电商图片批量下载工具 | Windows 桌面版"
- **AND** `<meta description>` 聚焦桌面客户端功能
- **AND** `<meta keywords>` 包含"桌面客户端""Windows 下载""电商图片批量下载软件"等

### Requirement: SEO — 插件页保持不变
系统 SHALL 保留插件页原有的 SEO 配置。

#### Scenario: 搜索引擎爬取 `/extension`
- **WHEN** 爬虫访问 `/extension`
- **THEN** JSON-LD 保留原有 `BrowserExtension` schema
- **AND** `<title>` 和 `<meta>` 与改版前一致
- **AND** canonical URL 指向 `/extension`

### Requirement: 版本配置文件
系统 SHALL 使用独立 JSON 文件管理客户端版本信息。

#### Scenario: 版本读取
- **WHEN** 桌面客户端相关组件需要版本号
- **THEN** 从 `GET /client-version.json` 获取 `{ version, releaseDate, downloadUrl, minOS }`
- **AND** 下载 URL 初始为占位链接，EXE 准备就绪后替换

---

## MODIFIED Requirements

### Requirement: 导航栏
NavBar 从原有"单产品导航"改为"桌面客户端为主 + 插件为辅"的双入口导航。

### Requirement: 页脚
Footer 新增客户端相关链接（下载客户端、客户端教程、购买授权），保留现有链接。

### Requirement: Sitemap
`nuxt.config.ts` sitemap 新增 `/extension` 路由，首页 `/` 的 SEO 信息更新为桌面端。

---

## REMOVED Requirements

无。插件页所有功能完整保留，仅路由变更。

---

## 非功能性要求

1. **插件页零改动**：`extension.vue` 是现有 `index.vue` 的完整复制（仅文件名变更），内部代码一行不改
2. **响应式**：桌面客户端首页所有新增组件遵循现有 Glassmorphism 风格和响应式断点
3. **多语言**：桌面客户端首页的 i18n key 在 zh-CN + en-US 中定义，其他 52 种语言空 key fallback 到中文
4. **性能**：桌面客户端首页的组件按需加载，不影响首屏性能
5. **版本配置**：客户端下载链接和版本号从 `client-version.json` 读取，非硬编码
6. **购买链接外置**：「获取激活码」按钮链接到 `store.downpictures.com`，从配置文件读取，方便后续修改

---

## 风险提示

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 现有插件 SEO 排名波动 | `/` → `/extension` 可能短期影响 | 添加 301 重定向（如有 SSR）、更新 canonical |
| 客户端 EXE 下载链接未就绪 | 用户点击下载失败 | 先使用占位链接，准备好后替换 `client-version.json` |
| 新首页需写全新代码 | 工作量较大 | 复用现有 Glassmorphism 样式和组件模式，加快开发 |
| 52 种语言翻译缺失 | 非中文页面显示不完整 | 利用 `i18n-fallback.ts` 回退到中文，后续逐步补充 |