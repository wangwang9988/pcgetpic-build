# 平台页面全面转向桌面客户端推广

## Why

首页改版已完成（`/` 主推桌面客户端，`/extension` 保留插件页），但平台相关页面（`/platforms` 列表页和 `/platforms/[slug]` 详情页）仍 100% 围绕浏览器插件设计：

- 下载链接指向 Chrome Web Store
- 教程教用户"点击浏览器工具栏插件图标"
- FAQ 宣称"完全免费"
- SEO Schema 标记为 `BrowserExtension`
- 40+ 平台描述文字中遍布"插件"字样

这些页面是 SEO 流量的重要入口（用户搜索"淘宝图片下载""亚马逊图片下载"等长尾词时会进入），继续主推免费插件会浪费高意向流量。必须将平台页面同步转向桌面客户端推广。

## What Changes

### 1. 平台列表页 `/platforms` — CTA 区域
- CTA 下载按钮从 Chrome Web Store 链接 → 客户端下载链接（从 `client-version.json` 读取）
- 按钮文案从"立即安装" → "下载 Windows 客户端"
- CTA 标题/副标题文案从插件语境改为客户端语境

### 2. 平台详情页 `/platforms/[slug]` — 核心改造
- **InstallCard 区域**：移除浏览器检测和扩展安装卡片，替换为客户端下载卡片
- **CTA 区域**：移除"离线安装包"和"商店安装"双按钮，替换为"下载客户端"单按钮
- **Tutorial**：4 步插件流程 → 3 步客户端流程
- **SEO Schema**：`BrowserExtension` → `DesktopApplication`，`operatingSystem` 改为 `Windows 10, Windows 11`
- **Fallback SSR 内容**：所有 `chromewebstore.google.com` 硬编码链接改为客户端下载链接

### 3. 平台详情组件改造

#### InstallCard.vue（完全重写）
- **移除**：浏览器 UA 检测、浏览器图标展示、ZIP 离线包下载、`CrxTipModal` 弹窗
- **新增**：操作系统检测（Windows/macOS/Other）、客户端下载按钮、系统要求提示
- 视觉风格保持 Glassmorphism，与现有设计一致

#### CTA.vue（完全重写）
- **移除**：`downloadCrx` ZIP 下载逻辑、浏览器检测、双按钮（离线+商店）
- **新增**：单一"下载 Windows 客户端"主按钮、"获取激活码"次按钮
- 下载链接从 `client-version.json` 读取

#### Tutorial.vue（调整）
- 4 步 → 3 步（客户端流程更简洁）
- 步骤内容通过 i18n 更新，组件代码结构基本不变（只改步骤数组长度从 4→3）

### 4. i18n 文案全面改写

#### platformPage 命名空间（zh-CN + en-US）
| key | 当前（插件导向） | 改为（客户端导向） |
|---|---|---|
| `title` | 保留结构 | 保持 |
| `description` | "使用当图插件...免费浏览器扩展" | "使用当图桌面客户端...批量下载工具" |
| `metaDescription` | "浏览器扩展" | "Windows 桌面客户端" |
| `tutorialStep1Title` | "安装插件" | "下载安装" |
| `tutorialStep1Desc` | "在Chrome/Firefox/Edge浏览器中安装当图图片下载插件" | "下载当图桌面客户端安装包，双击运行完成安装" |
| `tutorialStep2Title` | "打开页面" | "粘贴链接" |
| `tutorialStep2Desc` | "访问{platform}商品页面" | "将{platform}商品链接粘贴到客户端输入框，可一次粘贴多条" |
| `tutorialStep3Title` | "点击图标" | "自动抓取" |
| `tutorialStep3Desc` | "点击浏览器工具栏中的当图插件图标" | "客户端自动打开内置窗口抓取图片和视频，无需手动浏览" |
| `tutorialStep4Title` | "选择下载" | **移除**（第4步删除） |
| `tutorialStep4Desc` | "选择要下载的图片类型..." | **移除** |
| `faqA2` | "完全免费使用，无需注册" | "提供 7 天免费试用，试用结束后需购买授权码继续使用" |
| `faqA3` | "点击当图插件图标..." | "将商品链接粘贴到客户端，点击开始即可自动抓取所有高清原图" |
| `faqA4` | "不需要登录任何账号" | "大多数平台无需登录即可抓取公开页面；部分平台（如淘宝、1688）内置登录窗口，按提示操作即可" |
| `ctaTitle` | "立即开始使用当图" | 保持 |
| `ctaSubtitle` | "在{platform}平台高效下载..." | "在{platform}平台高效批量下载商品图片和视频资源" |

#### 40+ 平台描述文字
每个平台 `platform.descriptions.{slug}` 中末尾的"插件支持..."统一改为"客户端支持..."，保持其余描述不变。

#### nav / footer / hero 相关（检查是否需要调整）
- `footer.desc`: "一款专为电商平台用户设计的浏览器扩展..." → 双产品通用描述或客户端描述
- `hero.desc`（extension 页用的 key，不在本次修改范围，但确认不冲突）

### 5. 其他语言 i18n
- 向 52 种非核心语言的 locale JSON 文件添加新增的 `platformPage` key（值为空字符串，fallback 到中文）
- 修改的已有 key 在其他语言中同步更新（如果已有翻译则覆盖为空，等待后续翻译）

## Impact

- **Affected specs**: `redesign-website-for-desktop-client`（首页已完成，本次补充平台页）
- **Affected code**:
  - `website/app/pages/platforms/index.vue`
  - `website/app/pages/platforms/[slug].vue`
  - `website/app/components/platform/InstallCard.vue`
  - `website/app/components/platform/CTA.vue`
  - `website/app/components/platform/Tutorial.vue`
  - `website/i18n/locales/zh-CN.json`
  - `website/i18n/locales/en-US.json`
  - 52 种其他语言 locale 文件

---

## ADDED Requirements

### Requirement: 平台列表页 CTA 改客户端导向
系统 SHALL 将 `/platforms` 页面底部 CTA 区域的下载入口从插件商店改为客户端下载。

#### Scenario: 用户访问平台列表页
- **WHEN** 用户滚动到 `/platforms` 页面底部 CTA 区域
- **THEN** 看到标题和副标题描述客户端价值（不再提及浏览器扩展）
- **AND** 主按钮链接到客户端下载地址（从 `client-version.json` 读取 `downloadUrl`）
- **AND** 按钮文案为"下载 Windows 客户端"

### Requirement: InstallCard 改为客户端下载卡片
系统 SHALL 将平台详情页的浏览器检测安装卡片替换为客户端下载卡片。

#### Scenario: 用户访问平台详情页
- **WHEN** 用户进入任意 `/platforms/{slug}` 页面
- **THEN** 在 Hero 下方看到客户端下载卡片（非浏览器检测卡片）
- **AND** 卡片展示 Windows 客户端下载按钮
- **AND** 卡片下方显示系统要求提示（"适用于 Windows 10/11 64位"）
- **AND** 不再检测浏览器 UA、不再展示浏览器图标、不再提供 ZIP 离线包下载

### Requirement: CTA 区域改为客户端下载
系统 SHALL 将平台详情页底部 CTA 从扩展安装双按钮改为客户端下载按钮。

#### Scenario: 用户滚动到平台详情页底部
- **WHEN** 用户查看 CTA 区域
- **THEN** 主按钮为"下载 Windows 客户端"（链接从 `client-version.json` 读取）
- **AND** 次按钮为"获取激活码"（链接到 `storeUrl`）
- **AND** 不再出现"离线安装包"或"添加至 Chrome"相关按钮和文案

### Requirement: Tutorial 改为 3 步客户端流程
系统 SHALL 将平台详情页教程从 4 步插件流程改为 3 步客户端流程。

#### Scenario: 用户查看教程区域
- **WHEN** 用户查看教程区
- **THEN** 看到 3 个步骤：
  1. 下载安装 — 下载客户端安装包并安装
  2. 粘贴链接 — 将商品链接粘贴到客户端
  3. 自动抓取 — 客户端自动抓取并分类保存
- **AND** 不再出现"点击浏览器工具栏图标"等插件专属操作

### Requirement: SEO Schema 改为 DesktopApplication
系统 SHALL 将平台详情页的 JSON-LD Schema 从浏览器扩展改为桌面应用程序。

#### Scenario: 搜索引擎爬取平台详情页
- **WHEN** 爬虫访问 `/platforms/{slug}`
- **THEN** `applicationCategory` 为 `DesktopApplication`
- **AND** `operatingSystem` 为 `Windows 10, Windows 11`
- **AND** `downloadUrl` 指向客户端下载链接（非 Chrome Web Store）
- **AND** `offers` 价格信息如实反映客户端定价策略（或移除免费标价）

### Requirement: FAQ 文案客户端化
系统 SHALL 改写平台详情页 FAQ 答案，从插件语境切换到客户端语境。

#### Scenario: 用户查看 FAQ
- **WHEN** 用户阅读"是否免费"问题
- **THEN** 回答提到"7 天免费试用"和"购买授权码"
- **WHEN** 用户阅读"如何批量下载"问题
- **THEN** 回答描述"粘贴链接到客户端"的操作流程
- **WHEN** 用户阅读"是否需要登录"问题
- **THEN** 回答区分"公开页面免登录"和"部分平台内置登录窗口"

### Requirement: 40+ 平台描述去插件化
系统 SHALL 将所有平台描述文字中的"插件"字样替换为"客户端"或"桌面客户端"。

#### Scenario: 用户阅读任意平台描述
- **WHEN** 用户查看任意平台（如淘宝、亚马逊、SHEIN 等）的描述文字
- **THEN** 文字中不再出现"插件"字样
- **AND" 插件支持..."改为"客户端支持..."""
- **AND** 描述整体通顺自然，保持原有信息量

## MODIFIED Requirements

### Requirement: platformPage i18n 文案
`platformPage` 命名空间下的多个 key 从插件描述改为客户端描述。

**变更前**：教程描述插件安装流程、FAQ 宣称完全免费、描述自称浏览器扩展
**变更后**：教程描述客户端操作流程、FAQ 说明试用+付费模式、描述自称桌面客户端

### Requirement: 平台详情页 SSR Fallback
`[slug].vue` 中 `ClientOnly` 的 fallback 模板硬编码了 Chrome Web Store 链接。

**变更前**：fallback 渲染 Chrome Web Store 安装按钮
**变更后**：fallback 渲染客户端下载按钮（链接从 `client-version.json` 读取的静态占位，或统一客户端下载链接）

## REMOVED Requirements

### Requirement: 浏览器扩展离线安装包下载
**Reason**：平台页全面转向客户端，不再需要 ZIP 离线包和 CrxTipModal 弹窗
**Migration**：`CrxTipModal` 组件保留（`/extension` 页面可能仍使用），但平台页不再引用

### Requirement: 浏览器检测与多浏览器商店链接
**Reason**：客户端是单一 EXE 文件，无需检测浏览器类型或提供 Chrome/Edge/Firefox/360 多个商店入口
**Migration**：浏览器检测逻辑从平台页组件中移除，保留在 `/extension` 页面相关组件中

---

## 非功能性要求

1. **视觉一致**：所有修改的组件保持现有 Glassmorphism 风格和响应式断点
2. **链接配置化**：客户端下载链接和 Store 链接统一从 `client-version.json` 读取，非硬编码
3. **多语言 fallback**：新增/修改的 i18n key 在 zh-CN + en-US 中定义，其他语言空 key fallback 到中文
4. **extension 页面零影响**：`/extension` 页面及其所有组件不受本次修改影响
5. **SEO 无断档**：Schema 切换过程中确保结构化数据始终有效，不产生解析错误
