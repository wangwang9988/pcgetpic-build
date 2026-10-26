# 自动导入外部浏览器 Cookie Spec

## Why

当前 1688 平台的用户操作流程是：先点击"一键预登录"打开浏览器 → 在浏览器中登录 → 再手动点击"✅ 已完成登录"导入 Cookie。用户希望简化最后一步：点击"开始抓取"按钮时，如果外部浏览器登录已在等待确认（`externalLoginPending`），自动触发 Cookie 导入，无需用户手动点击"✅ 已完成登录"。

## What Changes

- 修改 `ControlBar.vue` 的 `checkPreLoginGate()` 逻辑：当检测到平台处于 `externalLoginPending` 状态时，自动调用 `confirmExternalLogin()` 导入 Cookie，不再弹出对话框
- 不移除 PlatformDetect.vue 中现有的手动登录按钮（保留作为备选入口）

## Impact

- Affected code:
  - `src/components/ControlBar.vue` — `checkPreLoginGate()` 增加自动 Cookie 导入逻辑
- Affected specs: `fix-1688-external-chrome-login`
- 不影响非外部浏览器登录平台（淘宝、京东等）的现有流程

## ADDED Requirements

### Requirement: 抓取启动时自动导入外部浏览器 Cookie

系统 SHALL 在用户点击"开始抓取当前平台"或"全部平台依次抓取"时，自动检测目标平台是否处于外部浏览器登录等待确认状态（`isExternalLoginPending`）。如果是，自动调用 `confirmExternalLogin()` 导入 Cookie，无需用户手动点击"✅ 已完成登录"。

#### Scenario: 用户已通过"一键预登录"打开浏览器并完成登录，点击"开始抓取当前平台"
- **GIVEN** 用户已点击"一键预登录"，1688 的 `externalLoginPending` 为 true
- **WHEN** 用户点击"开始抓取当前平台"
- **THEN** 系统自动调用 `confirmExternalLogin('ali1688')` 导入 Cookie
- **THEN** 导入成功后自动继续抓取流程
- **THEN** 显示导入成功提示

#### Scenario: 用户已通过"一键预登录"打开浏览器，但尚未在浏览器中完成登录
- **GIVEN** 用户已点击"一键预登录"，1688 的 `externalLoginPending` 为 true，但用户尚未在浏览器中完成登录
- **WHEN** 用户点击"开始抓取当前平台"
- **THEN** 系统自动调用 `confirmExternalLogin('ali1688')` 尝试导入 Cookie
- **THEN** 导入失败时显示错误提示，不启动抓取
- **THEN** 用户可以在浏览器中完成登录后重试

#### Scenario: 全部平台依次抓取，包含 1688（已预登录等待确认）和淘宝（未登录）
- **WHEN** 用户点击"全部平台依次抓取"，1688 处于 `externalLoginPending` 状态，淘宝未登录
- **THEN** 系统自动导入 1688 Cookie
- **THEN** 对淘宝仍显示原有预登录对话框

#### Scenario: 非 1688 平台未登录，且不在 `externalLoginPending` 状态
- **WHEN** 用户点击"开始抓取当前平台"，且当前平台为淘宝且未登录
- **THEN** 保持现有行为：显示预登录对话框
- **THEN** 不自动触发 Cookie 导入

### Requirement: 保留手动登录入口

系统 SHALL 保留 PlatformDetect.vue 中的"🌐 浏览器登录"和"✅ 已完成登录"按钮，作为用户主动预登录的备选入口。

## MODIFIED Requirements

### Requirement: 预登录门控逻辑增强

原有的 `checkPreLoginGate()` 仅弹出对话框询问用户是否已登录，现需增加对 `externalLoginPending` 状态平台的自动 Cookie 导入：

1. 检测未登录平台中是否有处于 `externalLoginPending` 状态的平台
2. 如果有，自动调用 `confirmExternalLogin()` 导入 Cookie（不打开浏览器，不弹对话框）
3. 导入成功后继续原有流程（对非 `externalLoginPending` 的未登录平台仍显示原有对话框）
4. 导入失败时显示错误提示，不启动抓取
