# Checklist

## platforms.ts — 清洗函数
- [x] `cleanTaobaoUrl` 按 `?` 分割 URL，遍历 `&` 分割的参数
- [x] `cleanTaobaoUrl` 找到 `id=` 参数后重建为 `${baseUrl}?id=${id}`
- [x] `cleanTaobaoUrl` 找不到 `id` 时返回去除 hash 的原始链接
- [x] `cleanTaobaoUrl` 丢弃 hash 片段
- [x] `cleanTaobaoUrl` 幂等：对已清洗 URL 再清洗结果不变
- [x] `cleanUrl` 先调 `detectPlatform`，仅 `'taobao'` 时调 `cleanTaobaoUrl`
- [x] `cleanUrl` 对其他平台 / 未知平台返回原链接
- [x] 旧的 `normalizeUrl` 已移除

## LinkInput.vue — 使用 cleanUrl
- [x] `import { cleanUrl }` 替代了 `import { normalizeUrl }`
- [x] `validLinks` 使用 `cleanUrl` 归一化后去重
- [x] `normalizeInput` 使用 `cleanUrl` 归一化后去重
- [x] 淘宝长链接粘贴后文本框显示清洗后短链接
- [x] 同一商品不同广告来源去重生效
- [x] 非淘宝链接保持原样

## taskQueue.ts — 使用 cleanUrl
- [x] `import { ..., cleanUrl }` 替代了 `import { ..., normalizeUrl }`
- [x] `addTasks` 中 `cleanUrl` 替代了 `normalizeUrl`
- [x] 入队后的 `ScrapeTask.url` 为清洗后 URL

## ResultPreview.vue — 确认无需改动
- [x] 无标题时展示 `链接N: [平台] (ID: xxxxx) (等待获取中...)`
- [x] 清洗后 URL 仍含 `id` 参数，ID 提取不受影响

## 端到端验证
- [x] 4 个淘宝长链接 → 全部正确清洗为 `?id=xxx` 格式
- [x] 清洗后 4 个 `id` 各不相同 → 去重不丢失任何链接
- [x] 京东/拼多多链接原样保留
- [x] 短链接执行抓取 → 正常加载不卡在风控
- [x] 结果页各任务标题可区分