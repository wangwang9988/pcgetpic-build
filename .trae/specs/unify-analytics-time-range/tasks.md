# Tasks

- [ ] Task 1: 服务端 detail 路由扩展 range 参数：为 plugin-analytics / plugin-newtab / plugin-uninstall / client-analytics 四个 admin 路由的趋势与分布接口增加 range 解析（today / yesterday / 7d / 30d / all），并保持原有 days 参数兼容。
  - [ ] SubTask 1.1: plugin-analytics 路由扩展 range 参数
  - [ ] SubTask 1.2: plugin-newtab 路由扩展 range 参数
  - [ ] SubTask 1.3: plugin-uninstall 路由扩展 range 参数
  - [ ] SubTask 1.4: client-analytics 路由扩展 range 参数

- [ ] Task 2: 前端 API 层扩展 range 参数：修改 pluginAnalytics.ts / pluginNewtab.ts / pluginUninstall.ts / clientAnalytics.ts，使 detail 接口函数可传入 `range: string`。
  - [ ] SubTask 2.1: pluginAnalytics.ts 支持 range
  - [ ] SubTask 2.2: pluginNewtab.ts 支持 range
  - [ ] SubTask 2.3: pluginUninstall.ts 支持 range
  - [ ] SubTask 2.4: clientAnalytics.ts 支持 range

- [ ] Task 3: 改造 PluginAnalytics.vue：统一 rangeOptions 为 `今天 / 昨天 / 7 天 / 30 天 / 累计`，使用字符串 range 值，切换后趋势图与分布图自动更新。

- [ ] Task 4: 改造 PluginNewtab.vue：与 PluginAnalytics.vue 保持一致的选项与刷新逻辑。

- [ ] Task 5: 改造 PluginUninstall.vue：趋势与分布图使用 range 参数，最近卸载记录保持独立分页。

- [ ] Task 6: 改造 ClientAnalytics.vue：趋势与分布图使用 range 参数，与上述页面保持一致。

- [ ] Task 7: 验证四个统计页面切换时间范围后，图表与分布数据正确刷新；服务端编译/启动无报错。

# Task Dependencies
- Task 1 必须在 Task 3/4/5/6 之前完成
- Task 2 必须在 Task 3/4/5/6 之前完成
- Task 3/4/5/6 可并行执行
- Task 7 依赖于 Task 1~6
