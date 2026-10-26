# 插件更新提醒与官网版引导 Spec

## Why
插件有 40 个马甲变体，用户可能从应用商店安装了马甲版本，缺少新标签页功能（官网版盈利核心）。需要检测版本落后时提醒用户更新到官网版，并引导卸载商店版，统一到官网分发渠道。

## 版本号体系说明
插件的版本号格式为 `{major}.{minor}.{build}`，通过 `switch-platform.js` 切换马甲时 `version_prefix` 决定前两位：
- **`3.0.XXX`**（或更高 major）— 官网最新版（version_prefix ≥ 3.0）
- **`2.0.XXX`** — 官网旧通用版（version_prefix = 2.0）
- **`1.X.XXX`** — 应用商店马甲版和旧通用版（version_prefix = 1.0~1.40）

简化判断规则：
- **major ≥ 3**：已是官网最新版，**不提醒**
- **major < 3**：只要 build（第三位数字）低于线上就提醒更新

## What Changes
- 新增工具函数 `utils/updateChecker.ts`：从 `https://downpictures.com/version.json` 获取最新版本号，按上述规则判断是否需要提醒
- 新增 composable `composables/useUpdateReminder.ts`：管理更新检查时机、提醒状态、功能开关
- 新增 popup 组件 `components/popupvues/UpdateReminder.vue`：在 popup 底部 Linkcopyright 上方显示更新提醒横幅
- 新增 pages 组件 `components/pagesvues/UpdateReminder.vue`：在 pages 页面顶部显示更新提醒横幅
- 修改 `entrypoints/popup/App.vue`：引入 UpdateReminder 组件
- 修改 `entrypoints/pages/App.vue`：引入 UpdateReminder 组件

## Impact
- Affected code:
  - `GetPic/utils/` — 新增 `updateChecker.ts`
  - `GetPic/composables/` — 新增 `useUpdateReminder.ts`
  - `GetPic/components/popupvues/` — 新增 `UpdateReminder.vue`
  - `GetPic/components/pagesvues/` — 新增 `UpdateReminder.vue`
  - `GetPic/entrypoints/popup/App.vue` — 引入组件
  - `GetPic/entrypoints/pages/App.vue` — 引入组件

## ADDED Requirements

### Requirement: 版本比较逻辑
系统 SHALL 从 `https://downpictures.com/version.json` 获取 `extensionVersion` 字段，按以下简化规则判断：

#### Scenario: 官网最新版（major ≥ 3）
- **WHEN** 本地版本号的 major（第一位数字）≥ 3（如 `3.0.122`）
- **THEN** 判定为已是官网最新版，**不提醒**

#### Scenario: 需要更新（major < 3 且 build 低于线上）
- **WHEN** 本地版本号 major < 3，且 build（第三位数字）< 线上 `extensionVersion` 的第三位数字
- **THEN** 判定为有更新可用，提醒用户更新到官网版
- **NOTE** 覆盖所有 `1.X.XXX` 马甲版/旧通用版和 `2.0.XXX` 官网旧版

#### Scenario: 版本号格式异常
- **WHEN** 版本号无法解析为数字
- **THEN** 静默忽略，不显示任何提示

### Requirement: 功能开关
系统 SHALL 提供全局开关控制更新提醒功能的启用状态。**当前设为 `false`（禁用）**，待用户确认后改为 `true` 即可启用。

#### Scenario: 开关为 false
- **WHEN** 功能开关 `UPDATE_REMINDER_ENABLED` 为 `false`
- **THEN** 不执行版本检查，不显示任何更新提醒

#### Scenario: 开关为 true
- **WHEN** 功能开关 `UPDATE_REMINDER_ENABLED` 为 `true`
- **THEN** 执行版本检查，根据结果决定是否显示提醒

### Requirement: 更新检查时机
系统 SHALL 在 popup/pages 页面挂载时触发一次版本检查，结果缓存在 `browser.storage.local` 中，24 小时内不重复请求远程接口。

#### Scenario: 首次打开页面
- **WHEN** 用户打开 popup 或 pages 页面，且无缓存版本信息
- **THEN** 请求 `https://downpictures.com/version.json`，缓存结果及时间戳

#### Scenario: 缓存有效期内
- **WHEN** 距上次检查不足 24 小时
- **THEN** 使用缓存结果，不发起网络请求

#### Scenario: 网络请求失败
- **WHEN** 请求 `version.json` 失败（超时/网络不可用）
- **THEN** 静默忽略，不显示任何提示，下次打开页面重试

### Requirement: Popup 页面更新提醒
系统 SHALL 在 popup 页面显示更新提醒横幅。

#### Scenario: 检测到更新
- **WHEN** 功能开关启用且有更新可用
- **THEN** 在 Linkcopyright 组件上方显示醒目的更新提醒横幅
- **AND** 横幅包含以下信息：
  - "发现新版本，请更新到官网最新版" 提示文字
  - "只需要安装一个版本即可" 提示文字
  - "前往官网更新" 按钮，点击打开 `https://downpictures.com/?source=extension-update-popup`

#### Scenario: 无更新
- **WHEN** 功能开关启用但无更新
- **THEN** 不显示更新提醒横幅

#### Scenario: 用户关闭提醒
- **WHEN** 用户点击横幅上的关闭按钮
- **THEN** 横幅隐藏，当前会话内不再显示（使用 `browser.storage.session` 记录）

### Requirement: Pages 页面更新提醒
系统 SHALL 在 pages 页面顶部显示更新提醒横幅。

#### Scenario: 检测到更新
- **WHEN** 功能开关启用且有更新可用
- **THEN** 在页面顶部（ItemsCatalog 导航栏上方）显示醒目的更新提醒横幅
- **AND** 横幅包含与 popup 相同的信息和操作按钮
- **AND** 点击 "前往官网更新" 打开 `https://downpictures.com/?source=extension-update-pages`

#### Scenario: 无更新或功能禁用
- **WHEN** 功能开关禁用或无更新
- **THEN** 不显示更新提醒横幅

### Requirement: 多插件安装分析提示
系统 SHALL 在更新提醒中包含 "只需要安装一个版本即可" 的提示，但不需要主动检测是否安装了多个插件。

#### Scenario: 关于多插件冲突
- **WHEN** 显示更新提醒时
- **THEN** 附加提示 "只需要安装一个版本即可"
- **NOTE** 经分析，同时安装多个马甲版本不会产生严重冲突（content scripts 独立注入、存储按扩展 ID 隔离），但可能造成：
  - 页面上出现多个下载按钮/悬浮窗，影响用户体验
  - 网络嗅探器重复拦截，可能导致重复下载触发
  - 右键菜单重复项
  - 因此仍建议只安装一个版本

## MODIFIED Requirements
无

## REMOVED Requirements
无
