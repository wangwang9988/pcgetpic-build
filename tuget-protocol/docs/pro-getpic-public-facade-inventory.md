# Pro-GetPic 三线公开门面盘点

> 盘点日期：2026-08-12  
> 目标：确认 Desktop Bridge v1 可以调用的真实入口，避免协议承诺尚不存在的能力。

## 结论

| 采集线 | 当前启动/刷新入口 | 查询与结果来源 | 取消能力 | 更新事件 | v1 判断 |
|---|---|---|---|---|---|
| GetPic 专项线 | `specializedDesktopFacade.createTask/restoreTask` 创建或恢复任务 Tab，匹配页面的 WXT Content Script 自动运行 | 门面把当前资源键及商品信息收敛为 `taskId/tabId` 隔离快照 | `releaseTask` 停止监听并按策略关闭 Tab；不能中断平台脚本内部全部异步操作 | 门面收敛 `storage.onChanged` 和 Tab 状态为快照更新 | v1 门面已实现；按任务绑定页面并校验商品链接/ID 后才发布 |
| Fatkun + 猫抓通用媒体线 | `GenericMediaDesktopFacade.createTask/restoreTask/refresh`；内部复用 `startProMediaBackgroundDiscovery()` 和浅/深扫描 | 门面包装 `getGenericPageContext()` 与 `queryGenericResources()` 的完整分页读取 | Desktop Adapter 停止等待并按 `keepTabOpen` 策略关闭 Tab | 门面统一收敛 `GENERIC_MEDIA_UPDATED`、`GENERIC_IMAGES_UPDATED`、`SNIFFED_MEDIA_UPDATED` | Desktop 任务包装层已实现，按 `tabId/pageId` 隔离并使用安静窗口协调被动持续发现 |
| VDH + ImageAssistant 备用线 | `imageAssistantDesktopFacade.captureUrl/captureExistingTab` | `imageAssistantDesktopFacade.getPageContext/queryResources` | `imageAssistantDesktopFacade.cancelCapture` 取消 URL 采集 | `imageAssistantDesktopFacade.onCaptureUpdated` | 已形成 C 线唯一客户端公开门面，Bridge 不再直接访问 C 线内部模块 |

## 1. GetPic 专项线

当前专项脚本在命中平台页面后自动执行，并通过通用后台路由的 `setStorage/getStorage` 写入共享存储。结果页 `useProductStorage()` 读取以下主要键：

- 当前资源：`MainPic`、`SkuPic`、`DetailPic`、`PinglunPic`、`VideoUrls`。
- 商品上下文：`productTitle`、`productLink`、`productId`。
- 历史资源：对应的 `*All` 键和 `productLinkAll`。

现状缺口：

- 存储键是“当前结果”模型，不是按 `taskId/tabId/pageId` 隔离的任务模型。
- 没有统一的开始、完成、失败、取消或快照函数。
- 不同平台脚本保存的数据形状并不完全一致。
- 1688 登录、验证码和风控跳转已由专项门面收敛为 `INTERACTION_REQUIRED/RESOLVED`；其他专项平台仍需逐平台补充识别规则。

已在 `Pro-GetPic/tuget-client-integration/lines/a-specialized/specializedDesktopFacade.ts` 实现稳定门面：创建/恢复任务 Tab、读取当前商品快照、把存储变化收敛到 `taskId` 命名空间、校验商品链接/ID、停止监听和清理任务映射。稳定完成窗口由 `tuget-client-integration/bridge/adapters/specializedAdapter.ts` 管理。首版 `CANCEL_TASK` 对专项线只能停止 Bridge 监听并按 `keepTabOpen` 策略关闭 Tab，不能宣称能中断每个平台脚本内部的所有异步操作。

门面通过活动 `taskId/tabId` 绑定、商品页面归属校验和命名空间快照阻止不同专项任务串线；平台脚本自身仍保持独立插件原实现。

## 2. Fatkun + 猫抓通用媒体线

现有公共入口比专项线清晰：

- 后台初始化：`pro-media/background/startMediaDiscovery.ts`。
- 唯一消息路由：`pro-media/router.ts`。
- 仓库公共门面：`pro-media/library/store.ts`。
- 刷新扫描：`REFRESH_GENERIC_CAPTURE`，根据 `deep` 转换为 `SCAN_PAGE_IMAGES` 或 `SCROLL_AND_SCAN`。
- 分页查询：`QUERY_GENERIC_PAGES`、`QUERY_GENERIC_RESOURCES`，资源查询单页上限为 250。

现状缺口：

- 网络嗅探是被动持续发现，不对应一个可真正暂停/取消的任务进程。
- 当前事件表示仓库发生变化，不表示 Desktop 任务完成。
- `queryGenericResources()` 返回内部记录，需要 Adapter 转换为统一 `ResourceDto`。

以上任务包装现已由 `tuget-client-integration/lines/b-generic-media/genericMediaDesktopFacade.ts` 和 `tuget-client-integration/bridge/adapters/genericMediaAdapter.ts` 落地。浅采集使用 8 秒安静窗口和 60 秒上限，深采集使用 15 秒安静窗口和 120 秒上限；有资源时到上限可完成部分结果，无资源时返回可重试超时。所有查询按 250 项分页读取，并通过仓库稳定资源 ID、批次 ACK 与客户端去重保证重发幂等。`CANCEL_TASK` 停止 Desktop 等待并按 `keepTabOpen` 策略关闭 Tab，但不宣称能撤销已发生的网络请求。

## 3. VDH + ImageAssistant 备用线

现有接口已经覆盖大部分 Desktop 所需能力：

- 单 Tab 扫描：`IA_START_CAPTURE` → `captureImageAssistantTab()`。
- URL 批量入口：`IA_CAPTURE_URL` → `captureImageAssistantUrl()`。
- URL 取消：`IA_CANCEL_URL_CAPTURE` → `cancelImageAssistantUrlCapture()`。
- 结果查询：`IA_QUERY_RESOURCES`、`queryImageAssistantResources()`。
- 状态与事件：页面记录包含 `idle/capturing/complete/error`，写入后发送 `IA_CAPTURE_UPDATED`。

`Pro-GetPic/tuget-client-integration/lines/c-backup-one/imageAssistantDesktopFacade.ts` 已把上述内部入口收敛为 C 线唯一客户端门面。单 Tab 队列内部仍没有独立取消令牌，当前取消能力只完整覆盖 URL 采集的活动操作；Desktop Adapter 负责把 `taskId` 映射到 `operationId`，并把内部页面状态/资源记录转换为统一事件和 DTO。

## 4. 协议 v1 约束

- `START_CAPTURE` 接收一个 URL、渠道集合、浅/深采集模式和是否保留 Tab。
- `PAUSE_TASK`、`RESUME_TASK`、`CANCEL_TASK` 保留为标准命令，但必须按 `HELLO` 能力协商；没有能力时返回 `UNSUPPORTED_CAPABILITY`。
- 三条线都不得直接连接 Native Host，连接只能由 desktop 专用 Desktop Bridge 建立。
- Adapter 必须保留 `channel`、`sourceLine`、原始资源 ID、pageUrl 和最小下载请求上下文。
- 专项线首先需要建立任务隔离快照；通用线使用分页仓库；备用线复用现有 operationId/pageId。
- 专项线已对 1688 登录域名与 `_____tmd_____/punish` 真人验证页实现 `INTERACTION_REQUIRED/RESOLVED`；通用线、备用线和其他专项平台仍需补齐页面状态检测。

## 5. 下一实现动作

1. 以本盘点冻结 `@tuget/protocol` v1 草案和能力名称。
2. Pro-GetPic 增加 `desktop` 构建模式，但暂不改动三条线内部实现。
3. Desktop Bridge 三条线均已接入；下一步在持久 Browser Engine profile 中完成人工验证后的 1688 资源闭环。
4. 1688 端到端使用已落地的 `taskId/tabId` 映射和单专项任务约束，验证真实页面结果、登录/验证码提示及稳定窗口。
