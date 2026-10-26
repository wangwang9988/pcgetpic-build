# 修复左侧栏 NSplit 拖拽无法生效 Spec

## Why
上一轮将 NLayoutSider 替换为 NSplit 后，拖拽标识可见但实际无法拖动调整宽度。原因是 NSplit 在受控模式下的回调参数类型与代码预期不匹配，导致宽度值变为 NaN，拖拽操作无法生效。

## What Changes
- 将 NSplit 从**受控模式**（`:size`）切换为**非受控模式**（`:default-size`），消除受控模式的反馈循环问题
- 修复 `handleUpdateSize` 回调函数，正确处理像素字符串参数（如 `"350px"`）
- 简化宽度持久化逻辑：仅监听变化写入 localStorage，不再通过响应式变量反向控制组件

## Impact
- Affected code: `src/App.vue`

## ADDED Requirements

### Requirement: NSplit 非受控模式拖拽
系统 SHALL 使用 NSplit 的 `default-size` 属性（非受控模式）设置初始侧栏宽度，而非 `:size`（受控模式），以避免受控模式下的反馈循环导致拖拽失效。

#### Scenario: 初始加载恢复宽度
- **WHEN** 应用启动且 localStorage 中存在有效宽度值
- **THEN** NSplit 使用 localStorage 中的宽度值作为 `default-size`

#### Scenario: 初始加载无存储值
- **WHEN** 应用启动且 localStorage 中无宽度值
- **THEN** NSplit 使用默认宽度 340px 作为 `default-size`

### Requirement: 拖拽宽度持久化
系统 SHALL 在 NSplit 的 `@update:size` 回调中正确解析像素字符串参数，并将宽度值持久化到 localStorage。

#### Scenario: 拖拽后宽度保存
- **WHEN** 用户拖拽调整左侧栏宽度
- **THEN** 回调接收到像素字符串（如 `"350px"`），解析为数字后存入 localStorage

#### Scenario: 宽度范围约束
- **WHEN** 用户拖拽左侧栏
- **THEN** 宽度被约束在 300px ~ 600px 范围内（由 NSplit 的 `min`/`max` 属性保证）

## MODIFIED Requirements

### Requirement: 侧栏宽度调节方式
原方案使用 NLayoutSider 的 `resizable` 属性（该属性不存在），现改为使用 NSplit 组件的 `default-size` + `min`/`max` + `@update:size` 实现。

## Root Cause Analysis

### 问题 1：受控模式反馈循环
NSplit 源码中，当传入 `:size` prop 时进入受控模式。`doUpdateSize()` 虽然更新了内部 `uncontrolledSizeRef`，但 `useMergedState` 优先使用受控值（即 `props.size`）。因此回调函数必须正确更新 `size` prop，否则视觉上不会产生任何变化。

### 问题 2：回调参数类型错误
在像素模式下（`size` 为字符串如 `"340px"`），NSplit 的 `doUpdateSize()` 调用回调时传入的也是像素字符串（如 `"350px"`），而非比例数字。当前 `handleUpdateSize` 将参数当作数字比例处理：
```ts
Math.round(ratio * usableWidth)  // "350px" * number → NaN
```
导致 `siderWidth.value` 变为 NaN，`siderSize` 变为 `"NaNpx"`，布局失效。

### 问题 3：非受控模式是更优解
使用 `default-size` 让 NSplit 自行管理尺寸状态，避免受控模式的复杂反馈循环。回调仅需负责持久化，不需要反向驱动组件。
