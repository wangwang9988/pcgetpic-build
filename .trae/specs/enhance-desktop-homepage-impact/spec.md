# 桌面客户端首页文案与设计升级

> 核心问题：Hero 区只有纯文字+按钮，缺乏视觉冲击力；文案平淡无力；平台覆盖优势（40+ 平台）未在首页展示；DesktopCompare 和 DesktopFeatures 内容高度重复。

## Why

1. **Hero 区太素**：只有标题、副标题、两个按钮，没有平台标识、没有数据亮点，缺乏吸引力
2. **文案缺乏冲击力**：标题"电商图片批量下载商用级工具"是空洞的功能描述，"商用级"没有具体支撑；副标题罗列技术参数（多线程、千级链接），用户感知不到"这对我有什么好处"
3. **平台覆盖优势被浪费**：PlatformSection 的平台网格设计清晰直观，但客户端首页完全没有体现这个核心卖点
4. **内容重复**：DesktopCompare 和 DesktopFeatures 都是 6 项图标+标题+描述的 3×2 网格，内容高度相似
5. **CTA 层级不合理**：首屏就让用户"获取激活码"（付费），转化门槛太高；".exe"技术参数不该出现在 CTA 里

## What Changes

### 1. DesktopHero 升级 — 数据亮点 + 平台标识条 + 文案重写

* **徽章**：从纯版本号改为版本号+价值锚点（如 `v{version} 全新发布 · 支持 40+ 电商平台`）

* **标题**：从功能描述式改为结果驱动式（如"批量下载商品图片和视频，不再一条条手动保存"）

* **新增数据亮点行**：3 个关键量化数据（40+ 平台 / 4x 并发 / 1000+ 链接），大号数字+小号标签

* **副标题**：先说"哪些平台"→ 再说"抓取什么"→ 最后说"不占浏览器"

* **CTA 重新分级**：主按钮"免费下载 Windows 客户端"（加"免费"、去".exe"）；次按钮"查看支持平台"（替代"获取激活码"，降低首屏付费压力）

* **新增平台标识条**：CTA 下方水平排列 8\~10 个主流平台 Logo + "+30 更多平台"链接

* **辅助说明**：按钮下方增加"适用于 Windows 10/11 · 可免费试用"

### 2. 新增 DesktopPlatformProof — 平台覆盖展示区（借鉴 PlatformSection）

* 紧随 Hero 之后，作为第二屏

* 借鉴 PlatformSection 的视觉模式（glass-card + auto-fit 网格 + 48px 图标 + 悬停上浮），但用客户端语境

* 新增顶部数据条：40+ 平台 / 6 类场景 / 主图·SKU·详情图·视频 / 本地分类保存

* 展示 16\~20 个核心平台（P0/P1 优先），保留"查看全部支持的平台"按钮

* 每个平台卡片可点击跳转到平台详情页（与 PlatformSection 一致）

### 3. 合并 DesktopCompare + DesktopFeatures → DesktopAdvantages

* 移除 DesktopCompare 和 DesktopFeatures 两个独立组件

* 创建新的 DesktopAdvantages 组件，精选 5 项核心优势（去重后）

* 采用差异化布局：前 2 项大卡片突出核心优势，后 3 项小卡片横排补充

* 每项优势用结果驱动+具体数字的文案风格，不用技术术语

* **不提及插件版**，不拉踩免费产品，正面陈述客户端能力

### 4. DesktopTutorial 精简 — 从 5 步压缩为 3 步

* 步骤 1：下载安装

* 步骤 2：粘贴链接

* 步骤 3：自动下载

* 激活授权步骤移到 FAQ 和下载区说明，不在上手流程中抢主线

### 5. 全局文案升级

* DesktopDownload：标题和副标题突出"为什么下载"

* DesktopFAQ：新增 2 个高转化问题（"能先试试吗？" / "下载的是高清原图吗？"）

* 所有文案从"功能描述"改为"结果描述"：用具体数字代替模糊描述，用场景代替功能列表，用用户语言代替技术术语

### 6. 首页区块顺序调整

```
改版前:
  DesktopHero → DesktopCompare → DesktopFeatures → DesktopTutorial → DesktopDownload → DesktopFAQ

改版后:
  DesktopHero（含数据亮点+平台标识条）→ DesktopPlatformProof → DesktopAdvantages → DesktopTutorial → DesktopDownload → DesktopFAQ
```

## Impact

* Affected specs: `redesign-website-for-desktop-client`、`refine-desktop-homepage-style`、`refine-desktop-compare-section`

* Affected code:

  * **修改** `website/app/components/DesktopHero.vue` — 新增数据亮点 + 平台标识条 + 文案升级 + CTA 重分级

  * **新建** `website/app/components/DesktopPlatformProof.vue` — 平台覆盖展示区（借鉴 PlatformSection）

  * **删除** `website/app/components/DesktopCompare.vue` — 合并到新组件

  * **删除** `website/app/components/DesktopFeatures.vue` — 合并到新组件

  * **新建** `website/app/components/DesktopAdvantages.vue` — 合并后的优势展示

  * **修改** `website/app/components/DesktopTutorial.vue` — 从 5 步精简为 3 步

  * **修改** `website/app/components/DesktopDownload.vue` — 文案升级

  * **修改** `website/app/components/DesktopFAQ.vue` — 新增 2 个高转化问题

  * **修改** `website/app/pages/index.vue` — 组件引用更新

  * **修改** `website/i18n/locales/zh-CN.json` — 大量文案更新

  * **修改** `website/i18n/locales/en-US.json` — 大量文案更新

***

## ADDED Requirements

### Requirement: DesktopHero — 文案升级

DesktopHero 的文案 SHALL 从功能描述式改为结果驱动式。

#### Scenario: 徽章文案

* **WHEN** 页面加载

* **THEN** 徽章显示版本号 + 价值锚点（如 `v{version} 全新发布 · 支持 40+ 电商平台`）

* **AND** 不使用 emoji 前缀

#### Scenario: 标题文案

* **WHEN** 页面加载

* **THEN** 标题直击用户痛点或展示具体结果（如"批量下载商品图片和视频，不再一条条手动保存"）

* **AND** 不使用空洞形容词（如"商用级""极速""专业"）

#### Scenario: 副标题文案

* **WHEN** 页面加载

* **THEN** 副标题按"哪些平台 → 抓取什么 → 核心差异"的顺序组织

* **AND** 包含具体平台名和素材类型

* **AND** "不占浏览器"作为核心差异放在末尾收尾

#### Scenario: CTA 按钮

* **WHEN** 页面加载

* **THEN** 主按钮文案为"免费下载 Windows 客户端"（含"免费"、无".exe"）

* **AND** 次按钮文案为"查看支持平台"（非"获取激活码"）

* **AND** 按钮下方有辅助说明"适用于 Windows 10/11 · 可免费试用"

### Requirement: DesktopHero — 数据亮点行

DesktopHero SHALL 在副标题下方展示 3 个关键量化数据。

#### Scenario: 数据亮点展示

* **WHEN** 页面加载

* **THEN** 在副标题与 CTA 之间看到 3 个数据亮点

* **AND** 每个亮点由大号数字 + 小号标签组成（如"40+" + "电商平台"、"4x" + "并发加速"、"1000+" + "链接排队"）

* **AND** 3 个亮点水平居中排列，间距均匀

#### Scenario: 移动端数据亮点

* **WHEN** 视口宽度 ≤ 768px

* **THEN** 3 个数据亮点仍水平排列，字号适当缩小

### Requirement: DesktopHero — 平台标识条

DesktopHero SHALL 在 CTA 按钮下方展示一排主流平台 Logo。

#### Scenario: 桌面端平台标识条

* **WHEN** 用户在桌面端查看 Hero 区

* **THEN** 在辅助说明下方看到一排水平排列的平台 Logo（8\~10 个主流平台）

* **AND** 最右侧显示"+30 更多平台"文字链接，点击跳转 `/platforms`

* **AND** Logo 整体居中，与上方内容有适当间距

#### Scenario: 移动端平台标识条

* **WHEN** 用户在移动端查看 Hero 区

* **THEN** 平台 Logo 横向排列，可左右滑动查看

* **AND** "+30 更多平台"链接在最右侧

### Requirement: DesktopPlatformProof — 平台覆盖展示区

系统 SHALL 在 Hero 之后新增一个平台覆盖展示区，借鉴 PlatformSection 的视觉模式。

#### Scenario: 平台展示区内容

* **WHEN** 用户滚动到第二屏

* **THEN** 看到标题"一个客户端，覆盖主流电商与内容平台"

* **AND** 看到副标题描述覆盖范围

* **AND** 看到顶部数据条（4 项：40+ 平台 / 6 类场景 / 主图·SKU·详情图·视频 / 本地分类保存）

* **AND** 看到平台图标网格（16\~20 个核心平台）

* **AND** 底部有"查看全部支持的平台"按钮，跳转 `/platforms`

#### Scenario: 视觉对齐 PlatformSection

* **WHEN** 用户查看平台展示区

* **THEN** 网格列参数与 PlatformSection 一致（`repeat(auto-fit, minmax(140px, 1fr))`）

* **AND** 卡片使用 `glass-card` 类

* **AND** 图标尺寸 48px，悬停上浮效果 `translateY(-4px)`

* **AND** 每个平台卡片可点击跳转到 `/platforms/{slug}`

#### Scenario: 移动端平台展示

* **WHEN** 视口宽度 ≤ 768px

* **THEN** 平台网格自适应为更少列数

* **AND** 数据条水平排列但字号缩小

### Requirement: DesktopAdvantages — 合并优势展示

系统 SHALL 将 DesktopCompare 和 DesktopFeatures 合并为一个 DesktopAdvantages 组件。

#### Scenario: 优势项精选

* **WHEN** 用户查看优势展示区

* **THEN** 看到 5 项精选优势，无内容重复

* **AND** 每项优势使用结果驱动+具体数字的文案（如"4 个窗口并行，100 条链接 10 分钟搞定"）

* **AND** 不使用技术术语（Worker → 窗口，Cookie → 登录状态，探路者 → 真人浏览节奏）

* **AND** 不提及插件版，不拉踩免费产品

#### Scenario: 差异化布局

* **WHEN** 用户在桌面端查看优势展示区

* **THEN** 前 2 项采用大卡片布局（图标+标题+描述），突出核心优势

* **AND** 后 3 项采用小卡片横排，补充次要优势

* **AND** 整体视觉层次分明

#### Scenario: 移动端布局

* **WHEN** 视口宽度 ≤ 768px

* **THEN** 所有卡片纵向堆叠

### Requirement: DesktopTutorial — 精简为 3 步

DesktopTutorial SHALL 从 5 步压缩为 3 步。

#### Scenario: 教程步骤

* **WHEN** 用户查看教程区

* **THEN** 看到 3 步：下载安装 → 粘贴链接 → 自动下载

* **AND** 每步描述以动词开头，简洁明了

* **AND** 激活授权步骤不在教程中出现

### Requirement: 全局文案升级

所有首页组件的文案 SHALL 更具体、更有说服力。

#### Scenario: 文案风格原则

* **WHEN** 用户阅读首页任何文案

* **THEN** 用具体数字代替模糊描述（"40+ 平台"而非"多种平台"）

* **AND** 用场景代替功能列表（"把链接粘贴进来"而非"支持批量导入"）

* **AND** 用用户语言代替技术术语（"像真人一样操作"而非"仿人机行为设计"）

* **AND** 用正面表达代替反面表达（"遇到验证码会提醒你"而非"避免无效抓取"）

#### Scenario: DesktopDownload 文案

* **WHEN** 用户查看下载区

* **THEN** 标题突出"为什么下载"而非"这是什么"

* **AND** 副标题不限定"每天"和"团队"，扩大用户范围

#### Scenario: DesktopFAQ 新增问题

* **WHEN** 用户查看 FAQ

* **THEN** 包含新增问题"能先试试吗？"，回答强调可免费试用

* **AND** 包含新增问题"下载的是高清原图吗？"，回答强调自动提取最高分辨率

## MODIFIED Requirements

### Requirement: 首页区块顺序

首页区块顺序 SHALL 从 6 区块调整为 6 区块（内容重组）。

**变更前**：DesktopHero → DesktopCompare → DesktopFeatures → DesktopTutorial → DesktopDownload → DesktopFAQ
**变更后**：DesktopHero（含数据亮点+平台标识条）→ DesktopPlatformProof → DesktopAdvantages → DesktopTutorial → DesktopDownload → DesktopFAQ

### Requirement: DesktopHero 组件结构

DesktopHero 组件 SHALL 包含数据亮点和平台标识条。

**变更前**：徽章 + 标题 + 副标题 + 2 个 CTA 按钮
**变更后**：徽章 + 标题 + 副标题 + 数据亮点行 + CTA 按钮（重分级）+ 辅助说明 + 平台标识条

## REMOVED Requirements

### Requirement: DesktopCompare 独立组件

**Reason**：与 DesktopFeatures 内容高度重复，合并为 DesktopAdvantages
**Migration**：DesktopCompare 的优势数据整合到 DesktopAdvantages，i18n key 迁移到 `desktopAdvantages`

### Requirement: DesktopFeatures 独立组件

**Reason**：与 DesktopCompare 内容高度重复，合并为 DesktopAdvantages
**Migration**：DesktopFeatures 的功能数据整合到 DesktopAdvantages，i18n key 迁移到 `desktopAdvantages`

***

## 非功能性要求

1. **保持苹果风格**：居中布局、黑白灰+少量蓝、Glassmorphism 卡片，不做 3D 透视、复杂动画、orb 装饰等过度设计
2. **平台 Logo 复用**：直接复用 PlatformSection 已导入的 SVG 图标资源，不重复创建
3. **不贬低插件**：所有文案正面陈述客户端能力，不通过拉踩插件来衬托
4. **响应式**：所有新增布局遵循现有响应式断点（768px / 640px）
5. **多语言**：新增/修改的 i18n key 在 zh-CN + en-US 中定义，其他语言空 key fallback
6. **无外部依赖**：不引入新的 UI 库，使用现有 Element Plus 图标和项目组件

