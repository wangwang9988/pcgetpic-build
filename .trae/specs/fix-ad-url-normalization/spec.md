# 淘宝长链接清洗 Spec

## Why
淘宝/天猫广告链接携带大量跟踪参数（`ali_refid`、`ali_trackid`、`utparam` 等），导致两个问题：
1. 超长 URL 触发淘宝安全风控（滑块验证/登录重定向），Worker 卡死在"等待获取中…"
2. 前端截断显示时，不同链接前缀相同被截成相同文本，用户无法区分任务

解决思路参考插件项目的成熟方案：`tbGetHylinkTitle.js` 中只保留 `id` 参数重建干净 URL。

## What Changes

### 核心流程：**先匹配平台 → 再清洗链接**

```
用户输入链接
  → detectPlatform(url) → 判定平台
    → taobao → cleanTaobaoUrl(url) → 仅保留 ?id=xxx
    → 其他平台 → 原链接不动（暂不处理）
  → 去重 → 入队 → 抓取
```

### 代码变更
- `src/utils/platforms.ts`：新增 `cleanTaobaoUrl` + `cleanUrl` 函数（替换旧的 `normalizeUrl`）
- `src/components/LinkInput.vue`：`validLinks` 和 `normalizeInput` 改用 `cleanUrl`
- `src/stores/taskQueue.ts`：`addTasks` 改用 `cleanUrl`
- `src/components/ResultPreview.vue`：保留已有的 ID 展示优化（已实装，不动）

### 本次范围
- **仅淘宝/天猫**（`detail.tmall.com` / `item.taobao.com` / `detail.tmall.hk` / `chaoshi.detail.tmall.com`）
- 京东、拼多多等其他平台：**不处理**，保留原始链接
- 后续各平台按需参照其对应的 `*GetHylinkTitle.js` 逐一添加

## Impact
- Affected specs: 无
- Affected code:
  - [platforms.ts](file:///d:/Trae/PcGetPic/src/utils/platforms.ts) — 替换 `normalizeUrl` 为 `cleanUrl` + `cleanTaobaoUrl`
  - [LinkInput.vue](file:///d:/Trae/PcGetPic/src/components/LinkInput.vue) — 使用 `cleanUrl`
  - [taskQueue.ts](file:///d:/Trae/PcGetPic/src/stores/taskQueue.ts) — 使用 `cleanUrl`
  - [ResultPreview.vue](file:///d:/Trae/PcGetPic/src/components/ResultPreview.vue) — 不动（已实装）

---

## ADDED Requirements

### Requirement: 平台判定驱动清洗
系统 SHALL 先通过 `detectPlatform(url)` 判定链接所属平台，再调用对应平台的清洗函数。

#### Scenario: 链接判定为淘宝/天猫
- **WHEN** 链接匹配 `PLATFORM_PATTERNS.taobao` 中的任一正则
- **THEN** `detectPlatform` 返回 `'taobao'`
- **AND** 触发 `cleanTaobaoUrl(url)` 清洗

#### Scenario: 链接判定为其他平台
- **WHEN** 链接匹配京东/拼多多等非淘宝平台
- **THEN** `detectPlatform` 返回对应平台名
- **AND** 不触发清洗，原链接保留

#### Scenario: 链接无法判定平台
- **WHEN** 链接不匹配任何已知平台
- **THEN** `detectPlatform` 返回 `null`
- **AND** 不触发清洗，原链接保留

### Requirement: 淘宝链接清洗（对齐 tbGetHylinkTitle.js）
系统 SHALL 对淘宝/天猫链接执行清洗：仅保留 `id` 查询参数，丢弃所有广告跟踪参数。

清洗逻辑对齐 [tbGetHylinkTitle.js:L326-L363](file:///d:/Trae/PcGetPic/GetPic/entrypoints/modules/taobao/tbGetHylinkTitle.js#L326-L363)：
1. 按 `?` 分割得到 `baseUrl` 与 `paramsString`
2. 如果存在参数，按 `&` 分割遍历，查找 `id=` 开头的参数
3. 若找到 `id`，重建 URL 为 `${baseUrl}?id=${id}`
4. 若没找到 `id`，返回原始 URL

#### Scenario: 标准淘宝广告链接
- **WHEN** 输入 `https://detail.tmall.com/item.htm?ali_refid=a3_...&ali_trackid=...&id=1032676811553&skuId=6049035761898&...`
- **THEN** 清洗为 `https://detail.tmall.com/item.htm?id=1032676811553`

#### Scenario: 淘宝链接已有干净格式
- **WHEN** 输入 `https://detail.tmall.com/item.htm?id=1032676811553`
- **THEN** 清洗后不变（幂等）

#### Scenario: 淘宝链接缺少 id 参数
- **WHEN** 输入 `https://detail.tmall.com/item.htm?skuId=6049035761898`
- **THEN** 找不到 `id`，返回原始链接

#### Scenario: 包含 hash 片段
- **WHEN** 输入 `https://detail.tmall.com/item.htm?id=123#section`
- **THEN** `hash` 片段被丢弃，清洗为 `https://detail.tmall.com/item.htm?id=123`

### Requirement: 统一清洗入口 `cleanUrl`
系统 SHALL 提供 `cleanUrl(url)` 函数作为链接清洗的统一调度入口。

```typescript
function cleanUrl(url: string): string {
    const platform = detectPlatform(url);
    if (platform === 'taobao') {
        return cleanTaobaoUrl(url);
    }
    // 其他平台暂不处理，返回原链接
    return url;
}
```

#### Scenario: 未匹配平台
- **WHEN** `detectPlatform` 返回非 `'taobao'` 或 `null`
- **THEN** 原样返回输入 URL

### Requirement: 基于清洗后 URL 的去重
系统 SHALL 使用 `cleanUrl` 后的 URL 进行去重，确保仅广告参数不同的同一商品链接被合并。

#### Scenario: 同一商品不同广告来源
- **WHEN** 用户输入两个链接，`id` 相同但广告参数不同
- **THEN** 清洗后两链接完全相同 → 去重仅保留一个

### Requirement: 商品 ID 提取展示（已实装，保持不变）
系统 SHALL 在抓取结果未就绪时，从 URL 中提取商品 ID 进行展示。

#### Scenario: 淘宝任务等待中
- **WHEN** 任务无标题
- **THEN** 展示 `链接1: [淘宝/天猫] (ID: 1032676811553) (等待获取中...)`