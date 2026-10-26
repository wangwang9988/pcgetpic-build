# Tasks

- [x] Task 1: 提取通用 `waitForCompletion` 到 `shared/utils.ts`
  - [x] 将 `waitForCompletion` 和 `enforceMinStay` 从 `taobao/index.ts` 移至 `shared/utils.ts`
  - [x] 参数化超时常数：`imageDataIdleMs`、`domStableMs`、`maxWaitMs`、`minStayMs`
  - [x] 导出 `CompletionOptions` 接口

- [x] Task 2: 优化完成判定时间常数 + 引用共享函数
  - [x] `taobao/index.ts` 引用 `shared/utils.ts` 的通用 `waitForCompletion`
  - [x] 图片静默超时 10s → 7s，最大等待 20s → 15s

- [x] Task 3: 提升滚动速度
  - [x] `shared/utils.ts` 中 `simulateScroll` 的随机间隔改为 `200 + Math.random() * 200`

- [x] Task 4: index.ts 支持模块可选 cleanup
  - [x] 声明 `ModuleFn` 类型，模块可返回 void 或 cleanup 函数
  - [x] `runModulesOnIdle` 收集 cleanup，在判定完成后统一调用

# Task Dependencies
- Task 2 依赖 Task 1
- Task 4 依赖 Task 1、2
- Task 3 无依赖

# 已回退
- ~~Task 3 (原): 优化 tbGetMain 重试参数~~ — 回退，这类提取脚本不应修改
- ~~Task 4 (原): tbGetSku 返回 cleanup~~ — 回退，tbGetSku 是成熟脚本，MutationObserver 在页面关闭时由 GC 自动回收