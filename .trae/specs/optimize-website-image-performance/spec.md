# 官网前端图片性能优化 Spec（修正版）

## Why
官网 89.7% 的图片未设置 `loading` 属性，首屏下方 67+ 个图标同步加载增加并发请求数影响 FCP；部分图片缺少 `width`/`height` 属性可能导致 CLS；2 处 PNG Logo 可通过 `<NuxtImg>` 获得 WebP 格式优化。

## What Changes
- 为首屏下方/次屏的 `<img>` 添加 `loading="lazy"`，减少首屏并发请求
- 为缺少 `width`/`height` 的图片补充声明，防止 CLS
- 将 NavBar 和 FooterSection 的 logo.png 从原生 `<img>` 升级为 `<NuxtImg>`，启用 WebP 格式转换
- SVG 图标保持原生 `<img>` 不变（`<NuxtImg>` 对 SVG 无格式转换收益，且 import 导入的 SVG 变量无法被 NuxtImg 处理）

## Impact
- Affected code: `website/app/components/` 下约 8 个 `.vue` 文件
- 预期收益：首屏并发请求数减少 50%+（次屏图标延迟加载），2 处 PNG Logo 获得 WebP 优化，CLS 指标改善

## 技术约束
- **SVG 不适合 `<NuxtImg>`**：`@nuxt/image` 的格式转换（WebP/AVIF）仅对位图（PNG/JPEG）有效，SVG 无法被转换
- **import 导入的 SVG 变量无法用 NuxtImg**：`import icon from '~/assets/icons/xxx.svg'` 后 `:src="icon"` 绑定的是已解析的模块变量，NuxtImg 无法从中反推原始路径做格式转换
- **动态路径解析场景无法用 NuxtImg**：`import.meta.glob`、`resolveIconUrl()` 等运行时动态路径，NuxtImg 无法处理
- **SVG 加 `loading="lazy"` 收益有限但成本为零**：单个体积小，但减少并发请求数对 FCP 有帮助

## ADDED Requirements

### Requirement: 次屏图片懒加载
系统 SHALL 为首屏下方/次屏的 `<img>` 标签添加 `loading="lazy"`，延迟加载不可见资源以减少首屏并发请求数。

#### Scenario: DesktopPlatformProof 平台图标
- **WHEN** 桌面客户端首页加载平台证明区域（24 个图标）
- **THEN** 所有 `<img>` 应添加 `loading="lazy"`

#### Scenario: PlatformSection 平台图标
- **WHEN** 插件页加载平台区域（35 个图标）
- **THEN** 所有 `<img>` 应添加 `loading="lazy"`

#### Scenario: DownloadSection 浏览器图标
- **WHEN** 插件页加载下载区域（8 个图标）
- **THEN** 所有 `<img>` 应添加 `loading="lazy"`

#### Scenario: FooterSection Logo
- **WHEN** 页脚加载
- **THEN** `<img>` 应添加 `loading="lazy"`

#### Scenario: StoreTutorial/OfflineTutorial 图标
- **WHEN** 教程组件加载浏览器图标
- **THEN** 所有 `<img>` 和 `<NuxtImg>` 应添加 `loading="lazy"`

#### Scenario: error.vue 平台图标
- **WHEN** 错误页加载
- **THEN** `<img>` 应添加 `loading="lazy"`

### Requirement: PNG Logo 升级为 NuxtImg
系统 SHALL 将 NavBar 和 FooterSection 的 logo.png 从原生 `<img>` 替换为 `<NuxtImg>`，以启用 WebP 格式转换。

#### Scenario: NavBar Logo
- **WHEN** NavBar 组件渲染
- **THEN** logo.png 应使用 `<NuxtImg src="/logo.png" />`（public 目录路径），保留 `loading="eager"`

#### Scenario: FooterSection Logo
- **WHEN** FooterSection 组件渲染
- **THEN** logo.png 应使用 `<NuxtImg src="/logo.png" />`，添加 `loading="lazy"`

### Requirement: 图片尺寸声明防 CLS
系统 SHALL 为缺少 `width`/`height` HTML 属性的图片补充声明，防止布局偏移。

#### Scenario: 固定尺寸图标
- **WHEN** 图片在 CSS 中有明确的固定尺寸但 HTML 属性未声明
- **THEN** 应在 `<img>` 上补充 `width` 和 `height` 属性

## MODIFIED Requirements
无

## REMOVED Requirements
无
