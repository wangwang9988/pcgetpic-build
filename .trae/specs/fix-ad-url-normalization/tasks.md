# Tasks

## 说明
本次重构的目标：将同事的大杂烩 `normalizeUrl` 替换为更优雅的"先匹配平台 → 再清洗"架构，严格对齐 [tbGetHylinkTitle.js](file:///d:/Trae/PcGetPic/GetPic/entrypoints/modules/taobao/tbGetHylinkTitle.js#L326-L363) 的清洗逻辑。

---

- [x] Task 1: 替换 `platforms.ts` 中的 `normalizeUrl`
  - [x] 新增 `cleanTaobaoUrl(url)`：按 `?` 分割 → 遍历 `id=` 参数 → 重建 `${baseUrl}?id=${id}`（对齐 tbGetHylinkTitle.js 第 326-363 行）
  - [x] 新增 `cleanUrl(url)`：`detectPlatform` → 若 `'taobao'` 则调 `cleanTaobaoUrl`，否则返回原链接
  - [x] 移除旧的 `normalizeUrl` 函数（不再需要 jd/pdd/其他平台的清洗分支）

- [x] Task 2: 更新 `LinkInput.vue` — 使用 `cleanUrl`
  - [x] 将 `import { normalizeUrl }` 替换为 `import { cleanUrl }`
  - [x] `validLinks` computed 中 `normalizeUrl(trimmed)` → `cleanUrl(trimmed)`
  - [x] `normalizeInput` 函数中 `normalizeUrl(trimmed)` → `cleanUrl(trimmed)`

- [x] Task 3: 更新 `taskQueue.ts` — 使用 `cleanUrl`
  - [x] 将 `import { ..., normalizeUrl }` 替换为 `import { ..., cleanUrl }`
  - [x] `addTasks` 中 `normalizeUrl(u.trim())` → `cleanUrl(u.trim())`

- [x] Task 4: ResultPreview.vue — 不动（ID 展示优化已实装且正确）
  - [x] 确认 `resultTitle` 中的 ID 提取逻辑无需修改（清洗后的 URL 仍包含 `id` 参数）

- [x] Task 5: 端到端验证
  - [x] 粘贴用户提供的 4 个淘宝长链接 → 输入框显示清洗后的短链接（仅 `?id=xxx`）
  - [x] 4 个链接的 `id` 分别为 `1032676811553`、`992242121451`、`1023263828159`、`1040993703871` → 去重不丢失
  - [x] 京东链接粘贴 → 保持原样不处理
  - [x] 拼多多链接粘贴 → 保持原样不处理
  - [x] 添加队列后 `ScrapeTask.url` 为清洗后短链接
  - [x] 执行抓取 → 短链接能正常加载商品页（不触发风控）
  - [x] 结果页各任务标题可清晰区分

# Task Dependencies
- Task 2、Task 3 均依赖 Task 1
- Task 4 独立（确认即可，无需改代码）
- Task 5 依赖 Task 2、Task 3、Task 4