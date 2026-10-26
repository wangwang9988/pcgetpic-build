# Tasks

- [ ] Task 1: 创建 useChartLabel composable
  - [ ] SubTask 1.1: 创建 `admin-panel/src/composables/useChartLabel.ts`，导出 `showChartLabels` ref 和 `getLabelOption(dataLength)` 函数
  - [ ] SubTask 1.2: `getLabelOption` 根据 showChartLabels 状态和数据点数量返回 ECharts label 配置（>31 点时自动稀疏）

- [ ] Task 2: 优化 PluginUninstall.vue 已有双 Y 轴
  - [ ] SubTask 2.1: 为左右 Y 轴添加 `name` 标题（左: `卸载数 (次)`, 右: `使用天数 (天)`）
  - [ ] SubTask 2.2: 添加 `alignTicks: true`、右轴 `splitLine: { show: false }`
  - [ ] SubTask 2.3: 添加千分位 `axisLabel.formatter` 和 Tooltip `valueFormatter`
  - [ ] SubTask 2.4: 引入 `useChartLabel`，在趋势图卡片添加"显示数值"开关，series label 绑定 composable

- [ ] Task 3: 改造 ClientAnalytics.vue 为双 Y 轴
  - [ ] SubTask 3.1: 将 DAU/已激活活跃/未激活活跃 改为堆叠面积图共用左轴，下载文件使用右轴（yAxisIndex: 1）
  - [ ] SubTask 3.2: 配置双 Y 轴（name/alignTicks/splitLine/千分位 formatter）
  - [ ] SubTask 3.3: 引入 `useChartLabel`，在趋势图卡片添加"显示数值"开关
  - [ ] SubTask 3.4: 增强 Tooltip formatter 区分左右轴单位

- [ ] Task 4: 改造 PluginAnalytics.vue 为双 Y 轴
  - [ ] SubTask 4.1: DAU 使用左轴（面积图），下载事件使用右轴（yAxisIndex: 1）
  - [ ] SubTask 4.2: 配置双 Y 轴（name/alignTicks/splitLine/千分位 formatter）
  - [ ] SubTask 4.3: 引入 `useChartLabel`，在趋势图卡片添加"显示数值"开关
  - [ ] SubTask 4.4: 增强 Tooltip formatter 区分左右轴单位

- [ ] Task 5: 改造 PluginNewtab.vue 为双 Y 轴
  - [ ] SubTask 5.1: DAU 使用左轴（面积图），上报次数使用右轴（yAxisIndex: 1）
  - [ ] SubTask 5.2: 配置双 Y 轴（name/alignTicks/splitLine/千分位 formatter）
  - [ ] SubTask 5.3: 引入 `useChartLabel`，在趋势图卡片添加"显示数值"开关
  - [ ] SubTask 5.4: 增强 Tooltip formatter 区分左右轴单位

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 1]
- [Task 2, 3, 4, 5] 可并行执行（均依赖 Task 1 完成后）
