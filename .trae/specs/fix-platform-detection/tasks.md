# Tasks

- [x] Task 1: 新增 pddpf（拼多多批发）平台到 PLATFORM_PATTERNS、PLATFORM_LABELS、PLATFORM_ICONS
  - [x] SubTask 1.1: 在 PLATFORM_PATTERNS 中添加 `pddpf: [/^https?:\/\/([a-zA-Z0-9-]+\.)*pinduoduo\.com\//]`
  - [x] SubTask 1.2: 在 PLATFORM_LABELS 中添加 `pddpf: '拼多多批发'`
  - [x] SubTask 1.3: 在 PLATFORM_ICONS 中添加 `pddpf: '📦'`

- [x] Task 2: 修复 xiaohongshu 平台 key 为 redbook，对齐参考项目命名
  - [x] SubTask 2.1: 将 PLATFORM_PATTERNS 中的 key `xiaohongshu` 改为 `redbook`
  - [x] SubTask 2.2: 将 PLATFORM_LABELS 中的 key `xiaohongshu` 改为 `redbook`，label 改为 `'小红书'`
  - [x] SubTask 2.3: 将 PLATFORM_ICONS 中的 key `xiaohongshu` 改为 `redbook`
  - [x] SubTask 2.4: 检查所有引用 `xiaohongshu` 的代码并同步更新

- [x] Task 3: 修复 walmart 平台缺少 sku.ninja 域名匹配
  - [x] SubTask 3.1: 已确认 sku.ninja 匹配已存在，无需修改

- [x] Task 4: 修复 kuaishou 的 xmmicvfxi.com 正则，支持 http 协议
  - [x] SubTask 4.1: 已确认正则已使用 https?，无需修改

- [x] Task 5: 修复 sina 平台 weibo.com 裸域名无法匹配
  - [x] SubTask 5.1: 已确认 `([a-zA-Z0-9-]+\.)*` 的 `*` 量词允许零次匹配，裸域名可匹配，无需修改

- [x] Task 6: 修复 mydepot 平台缺少裸域名匹配
  - [x] SubTask 6.1: 在 mydepot 的 PLATFORM_PATTERNS 数组中添加 `/^https?:\/\/mydepot\.com\//`

- [x] Task 7: 修复 etsy 平台正则过于宽泛，补充精确的国家级域名
  - [x] SubTask 7.1: 将 etsy 的单个宽泛正则替换为参考项目中的 24 个精确域名正则

- [x] Task 8: 调整 PLATFORM_ORDER 优先级，确保 pddpf 排在 pdd 之前
  - [x] SubTask 8.1: 确认 pddpf 在 PLATFORM_PATTERNS 中的位置排在 pdd 之前

- [x] Task 9: 运行 TypeScript 类型检查确保无编译错误
  - [x] SubTask 9.1: 运行 `npx vue-tsc --noEmit` 通过

# Task Dependencies
- [Task 2] 需要先完成再执行 [Task 9]（因为 key 变更影响其他文件引用）
- [Task 8] 依赖 [Task 1]（pddpf 必须先添加才能调整顺序）
- [Task 9] 依赖所有其他 Task 完成
