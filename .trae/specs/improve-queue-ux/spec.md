# 队列输入与结果预览交互优化 规范

## Why
当前队列输入和结果预览存在两个明显的用户体验问题：1) 添加链接到队列后输入框被强制清空，用户无法继续编辑或追加链接；2) 开始抓取后结果预览只显示已实际抓取到数据的链接，而非所有待抓取的链接，用户无法直观了解整体抓取进度。

## What Changes
- **LinkInput.vue**: 移除 `addToQueue()` 中 `rawText.value = ''` 的清空逻辑，保留输入内容
- **ControlBar.vue**: 在 `startCurrentPlatform()` 和 `startAllPlatforms()` 中，抓取启动时预先为所有待抓取任务初始化 scrapeResult 存储条目
- **ResultPreview.vue**: 无需修改代码，但需验证其能正确展示预初始化的空白结果条目，并随抓取进度实时更新

## Impact
- Affected specs: 无现有 spec 受影响
- Affected code: `src/components/LinkInput.vue` (移除一行), `src/components/ControlBar.vue` (新增预初始化逻辑)

## MODIFIED Requirements

### Requirement: 添加到队列不清空输入
`LinkInput.vue` 的 `addToQueue()` 函数在将链接添加到 `taskQueueStore` 后，**不得**清空 `rawText` 输入内容。

#### Scenario: 用户点击"添加到队列"
- **GIVEN** 用户在输入框中粘贴了多个商品链接
- **WHEN** 用户点击"添加到队列"按钮
- **THEN** 链接被成功添加到任务队列
- **AND** 输入框中的内容保持不变，用户可继续编辑或追加链接

#### Scenario: 用户连续多次添加链接
- **GIVEN** 用户已添加一批链接到队列
- **WHEN** 用户修改输入框中的链接后再次点击"添加到队列"
- **THEN** 新链接被追加到队列中（去重）
- **AND** 输入框中的内容保持不变

### Requirement: 抓取开始后预初始化所有待抓取结果条目
当用户点击"开始抓取当前平台"或"全部平台依次抓取"后，系统**必须**在启动抓取前，为所有待抓取的任务在 `scrapeResultStore` 中预先创建空的结果条目。

#### Scenario: 抓取当前平台
- **GIVEN** 用户选择了"淘宝"平台，队列中有 5 个淘宝 pending 任务
- **WHEN** 用户点击"开始抓取当前平台"
- **THEN** 5 个任务的空结果条目被预先初始化到 `scrapeResultStore`
- **AND** `ResultPreview` 组件立即显示 5 个折叠面板条目，标题显示为"等待获取中..."
- **AND** 随着抓取进度，各条目内的图片/视频数据实时更新

#### Scenario: 全部平台依次抓取
- **GIVEN** 队列中有 3 个淘宝任务和 2 个京东任务，均为 pending
- **WHEN** 用户点击"全部平台依次抓取"
- **THEN** 5 个任务的空结果条目被预先初始化
- **AND** `ResultPreview` 组件立即显示 5 个条目

#### Scenario: 停止后重新抓取
- **GIVEN** 之前已启动一次抓取并停止
- **WHEN** 用户再次点击"开始抓取"
- **THEN** 当前 pending 的任务应在 `scrapeResultStore` 中被覆盖/重新初始化为空状态
- **AND** ResultPreview 显示更新后的待抓取条目列表