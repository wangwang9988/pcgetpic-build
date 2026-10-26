# 平台标签添加测试状态后缀 Spec

## Why
除淘宝/天猫、京东、唯品会、1688 外的其余平台抓取功能尚在测试阶段，可能存在不稳定情况。需要在平台显示名称上添加测试状态后缀，让用户明确知晓这些平台可能不稳定，降低用户预期落差。

## What Changes
- 在 `PLATFORM_LABELS`（前端）和 `get_platform_label()`（Rust）中，为除 taobao/jd/vip/ali1688 外的所有平台标签添加 `(测试中)` 后缀
- 两处标签定义必须保持同步

## Impact
- Affected code:
  - `src/utils/platforms/index.ts` — `PLATFORM_LABELS` 对象
  - `src-tauri/src/utils.rs` — `get_platform_label()` 函数
- Affected UI: 所有使用 `PLATFORM_LABELS` 的组件（LinkInput、PlatformDetect、ControlBar、TaskQueue、ResultPreview）将自动显示新标签

## ADDED Requirements

### Requirement: 平台标签测试状态后缀

系统 SHALL 为非稳定平台（除 taobao/jd/vip/ali1688 外的所有平台）的显示名称添加 `(测试中)` 后缀。

#### Scenario: 稳定平台标签不变
- **WHEN** 平台为 taobao、jd、vip、ali1688
- **THEN** 标签保持原样：淘宝/天猫、京东、唯品会、1688

#### Scenario: 非稳定平台标签添加后缀
- **WHEN** 平台为除上述 4 个外的任意平台
- **THEN** 标签格式为 `{原名称}(测试中)`，如 `亚马逊(测试中)`、`拼多多(测试中)`

#### Scenario: 前后端标签同步
- **WHEN** 前端 `PLATFORM_LABELS` 和 Rust `get_platform_label()` 查询同一平台
- **THEN** 返回完全相同的标签字符串

### 具体标签映射

| 平台 key | 原标签 | 新标签 |
|---|---|---|
| taobao | 淘宝/天猫 | 淘宝/天猫（不变） |
| jd | 京东 | 京东（不变） |
| vip | 唯品会 | 唯品会（不变） |
| ali1688 | 1688 | 1688（不变） |
| pddpf | 拼多多批发 | 拼多多批发(测试中) |
| pdd | 拼多多 | 拼多多(测试中) |
| alibaba | 阿里巴巴 | 阿里巴巴(测试中) |
| aliexpress | 速卖通 | 速卖通(测试中) |
| amazon | 亚马逊 | 亚马逊(测试中) |
| ebay | eBay | eBay(测试中) |
| shein | SHEIN | SHEIN(测试中) |
| lazada | Lazada | Lazada(测试中) |
| shopee | Shopee | Shopee(测试中) |
| temu | Temu | Temu(测试中) |
| tiktok | TikTok | TikTok(测试中) |
| douyin | 抖音 | 抖音(测试中) |
| redbook | 小红书 | 小红书(测试中) |
| kuaishou | 快手 | 快手(测试中) |
| walmart | 沃尔玛 | 沃尔玛(测试中) |
| wayfair | Wayfair | Wayfair(测试中) |
| ozon | Ozon | Ozon(测试中) |
| wildberries | Wildberries | Wildberries(测试中) |
| coupang | Coupang | Coupang(测试中) |
| rakuten | 乐天 | 乐天(测试中) |
| etsy | Etsy | Etsy(测试中) |
| dhgate | 敦煌网 | 敦煌网(测试中) |
| yiwugo | 义乌购 | 义乌购(测试中) |
| vvic | 搜款网 | 搜款网(测试中) |
| bao66 | 包牛牛 | 包牛牛(测试中) |
| 17zwd | 17网 | 17网(测试中) |
| goofish | 闲鱼 | 闲鱼(测试中) |
| suning | 苏宁 | 苏宁(测试中) |
| dangdang | 当当 | 当当(测试中) |
| macys | Macy's | Macy's(测试中) |
| newegg | Newegg | Newegg(测试中) |
| made-in-china | 中国制造网 | 中国制造网(测试中) |
| mercadolibre | 美客多 | 美客多(测试中) |
| mydepot | MyDepot | MyDepot(测试中) |
| sina | 新浪/微博 | 新浪/微博(测试中) |
| yupoo | 又拍图库 | 又拍图库(测试中) |
| xz | 四季星座 | 四季星座(测试中) |
