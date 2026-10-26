---
name: getpic-to-progetpic-sync
description: "将 GetPic（当图）按原目录和代码路径同步为 Pro-GetPic 的 A 线，同时保护 Pro 独有且彼此隔离的 B/C 线。用于“同步升级”“同步到 Pro-GetPic”“Pro-GetPic 对齐”“把 GetPic 改动同步过来”“getpic to progetpic sync”等请求。默认直接复制经审计可覆盖的纯 A 线文件，对唯一后台装配边界做语义合并，并保护 Popup、UI/CSS/HTML、新标签页、pro-runtime、pro-media 和 pro-image-assistant；Popup、视觉结构与 newtab 仅在用户明确选择具体功能后同步。覆盖 Git 基线、A/M/D/R 审计、品牌保护、三线隔离、测试与构建验证。"
---

# GetPic（当图）→ Pro-GetPic（图个吉利 / TuGet）选择性同步

## 目标与不变量

- **A 线就是 GetPic 基座**：保留 GetPic 的原始目录、文件路径、类型和处理器；不得把 A 线整体迁入 `commerce-capture/`、`a-line/` 或其他平级业务目录。
- **B/C 是 Pro 的附加隔离模块**：B 线业务归 `pro-media/`，C 线业务归 `pro-image-assistant/`；两者不得进入 GetPic/A 的消息类型、路由、仓库或采集处理器。
- 将 GetPic 视为 A 线上游功能来源，不把 Pro-GetPic 的 B/C、品牌和产品外壳当作逐文件镜像。
- Pro-GetPic 已进入独立演进阶段；目标项目中已提交和未提交的手工修改默认有效且受保护。
- 默认同步采集与下载功能语义，不默认同步界面外观或整个目录。
- 完整处理用户选定范围内的新增、修改、删除和重命名（A/M/D/R），不要只比较当前是否存在同名文件。
- 保留 Pro-GetPic 的独有功能、品牌配置、扩展标识、目标平台差异和差异化 UI。
- 对无法确认来源或删除意图的目标文件，保留文件并在结果中报告；禁止猜测后批量删除。
- 动态发现目录和文件。不要硬编码平台脚本数量、CSS 模块数量或固定组件清单。
- 审计确认是纯 A 线、目标没有必须保留的 Pro 差异时，优先按原路径直接复制文件并校验哈希；只有 Pro 装配边界、品牌/config 或用户手工分化文件需要语义合并。
- 禁止复制整个项目，或覆盖含 Pro 独有子目录/文件的整棵目录；直接复制必须以审计后的明确文件清单为单位。
- 在审计完成前不要修改目标项目；在用户未要求时不要提交、推送或拉取 Git。

## 默认同步范围与保护边界

用户只说“同步 GetPic 到 Pro-GetPic”而未指定更细范围时，默认同步以下内容：

1. **数据采集脚本**
   - `entrypoints/` 中各平台 WXT Content Script 入口。
   - `entrypoints/modules/` 及运行时实际引用的采集模块。
   - 与图片、视频、标题、链接、SKU、详情等抓取直接相关的必要类型、工具、配置、消息和测试。
   - 新增平台、平台规则、域名 matches、SPA/iframe 时序和抓取错误修复。

2. **pages 下载相关功能**
   - 动态定位当前项目中的 pages 入口、下载、批量下载、ZIP、导出、选择、预览和文件命名功能。
   - 同步选定功能所需的 composables、utils、types、消息协议、权限、测试和最小 UI 接线。
   - 从入口和 import 链建立最小依赖闭包，不依赖固定目录名或固定文件清单。

默认范围中的纯 A 线同路径文件可以在审计后直接覆盖；如果同名文件包含 Pro 装配、品牌、构建或用户手工差异，则先比较语义，再只合并 GetPic 功能变化。

### Popup：默认不再同步

- 将 Pro 的 Popup 视为独立产品界面和 Pro 所有代码。
- 默认跳过 `entrypoints/popup/` 以及只服务于 Popup 结构、样式和品牌的组件。
- 不因 GetPic Popup 改版、重排或换样式而修改 Pro Popup。
- 如果 GetPic 新功能只能通过 Popup 暴露，先说明具体功能与依赖，询问用户是否要将“这个功能”适配进 Pro Popup。
- 获得授权后只移植行为和必要状态，沿用 Pro 现有结构；禁止复制 GetPic 整个 Popup、template 或 CSS。
- 始终保留 Pro 通用媒体面板及其他 Pro 独有 Popup 能力。

### CSS、HTML 与 Vue template：默认不是同步重点

- 默认跳过纯视觉、布局、主题、间距、动画、HTML 重排和无功能影响的 template 变化。
- 只有用户明确要求同步视觉效果，或选定功能缺少最小挂载点时，才修改 UI 结构。
- 功能确需 UI 接线时，沿用 Pro 现有风格，只添加最小控件、事件和状态。
- 平台采集脚本中用于匹配目标网站的 DOM selector、HTML 解析和页面结构适配属于采集逻辑，不得因为“不默认同步 HTML”而跳过。

### 新标签页：默认跳过并按具体功能确认

- 默认不把 `official-only/newtab/` 或生成的 `entrypoints/newtab/` 纳入同步。
- 发现 GetPic 新标签页有变化时，只报告功能候选，不自动移植。
- 用户笼统要求“同步新标签页”时，先列出可独立选择的具体功能并询问要同步哪一项；没有明确选择前不得修改。
- 获得具体功能授权后，只移植该功能及最小依赖，保留 Pro 新标签页现有结构、风格、品牌和独有功能。

### Pro 独有代码：始终保护

- `pro-media/` 是 B 线通用图片、视频、媒体发现、独立命名与下载的 Pro 所有目录，不从 GetPic 覆盖。
- `pro-image-assistant/` 是 C 线的采集、消息、仓库、查询、结果页和下载业务目录，不从 GetPic 覆盖。
- `pro-runtime/` 只负责在 WXT 全局入口中启动和分流 B/C，不读取、转换或聚合任一线路数据；不从 GetPic 覆盖。
- `channels/` 与 `shared/capture/` 是 Pro 外壳/中立基础设施；A 线不得依赖 `shared/capture/`，B/C 可以共享呈现与执行原语但不得共享采集数据、仓库、消息、查询或下载决策。
- `entrypoints/general-media.content.ts` 是 Pro 独有通用媒体入口，必须保留。
- 共有文件中的 `PRO-GETPIC-ONLY` 区块必须保留，例如 `entrypoints/background.ts` 的 B/C 装配和 Pro UI 接线。
- `utils/background/messageRouter.ts` 与 `utils/background/types.ts` 属于 GetPic/A，同步后不得导入或声明 B/C 消息；B/C 只能通过 `pro-runtime/captureLines.ts` 调用各自路由守卫。
- 动态搜索其他 Pro-only 目录、标记、品牌配置和手工实现；以上路径不是穷举清单。
- GetPic 改动触及 Pro 独有接口时，只适配边界，不删除或搬回 GetPic 同步域。

## 品牌与技术标识边界

- 将源项目的用户品牌视为中文“当图”、英文“GetPic”。
- 将目标项目的用户品牌固定为中文“图个吉利”、英文“TuGet”；`Pro-GetPic` 是仓库、目录和同步流程中的技术名称，不是默认的用户品牌文案。
- 同步 manifest、国际化、UI 标题、构建变体、商店文案和其他用户可见内容时，禁止用“当图”“GetPic”或“Pro-GetPic”覆盖“图个吉利”“TuGet”。
- 不要因品牌映射自动重命名仓库目录、npm 包名、扩展 ID、密钥、存储键、消息协议、模块路径、API 字段或构建命令。这些技术标识仅在用户明确要求且完成依赖审计后修改。
- 品牌词搜索只用于发现和分类风险，禁止对命中结果做全局替换。允许技术文档、同步说明、历史记录和兼容代码继续使用 `GetPic` 或 `Pro-GetPic`。

## 第一步：确认项目与工作区状态

1. 从当前工作区定位源项目和目标项目。默认是同级 `GetPic/` 与 `Pro-GetPic/`，但必须验证路径存在；项目改名后使用实际目录名，不要全局替换文本猜测目标。
2. 读取工作区根目录、源项目和目标项目中的 `AGENTS.md`（若存在），遵守所有适用规则。
3. 分别运行只读检查：

```powershell
git -C <GetPic路径> rev-parse --show-toplevel
git -C <Pro路径> rev-parse --show-toplevel
git -C <GetPic路径> status --short
git -C <Pro路径> status --short
git -C <GetPic路径> log -10 --date=short --pretty=format:"%h %ad %s"
git -C <Pro路径> log -10 --date=short --pretty=format:"%h %ad %s"
```

4. 记录两边已有的未提交修改。它们属于用户；不得覆盖、还原或混入无关格式化。
5. 将用户明确指定的功能作为最高范围；未指定时采用“采集脚本 + pages 下载功能”的默认范围。
6. Popup、视觉结构或 newtab 只有在用户明确点名具体功能时才进入同步计划。
7. 若目标路径不明确、存在多个可能的升级版，或目标工作区有与待同步文件重叠且无法安全合并的修改，停止并向用户确认。
8. 若 Popup/newtab 的选择不清会产生不同产品结果，只暂停该部分并询问；其余明确范围可以继续审计。

## 第二步：确定同步基线

按以下优先级确定 GetPic 的同步基线：

1. 使用用户指定的源提交、标签或时间范围。
2. 使用上一次同步结果中明确记录的 GetPic 提交。
3. 从 Pro-GetPic 的同步提交信息或变更记录中寻找能够证明的源提交。
4. 无法证明基线时，在用户选定功能范围内执行当前树审计；此时可以同步新增和修改，但不得仅凭“Pro 中存在、GetPic 当前不存在”自动删除文件。

有基线时，同时审计已提交和未提交变化：

```powershell
git -C <GetPic路径> diff --name-status --find-renames <基线提交>..HEAD
git -C <GetPic路径> diff --name-status
git -C <GetPic路径> diff --cached --name-status
```

不要只依赖 `git log --since`：提交日期不能可靠表示上次同步边界。

## 第三步：围绕选定功能动态建立清单

使用 Git 和文件搜索建立两个互补清单：

- `git ls-files --cached --others --exclude-standard`：发现已跟踪及未忽略的未跟踪文件。
- `rg --files`：核对当前实际文件树，并按用户范围过滤。
- 对共同路径使用内容 diff 或 SHA-256，不能用行数或文件大小判断相同。
- 所有相对路径都以项目根目录为基准；目标路径必须是 `<Pro根目录>/<完整相对路径>`。禁止再次剥掉相对路径的第一层目录。
- 从选定入口追踪 import、消息、存储键、权限、测试和 package script，建立最小依赖闭包。
- 比较 Pro 当前内容、Git 历史、Pro-only 标记和未提交修改，不能只看 GetPic 单边变化。
- 不要为了“全量”把 Popup、所有 CSS/资源或 newtab 自动拉入范围。

将发现结果整理为审计表，至少包含：

| 字段 | 内容 |
|---|---|
| 状态 | A / M / D / R / 目标独有 / 未确定 |
| 相对路径 | 从项目根开始的完整路径 |
| 功能归属 | 采集 / pages 下载 / 直接依赖 / Popup / UI / newtab / Pro-only / 范围外 |
| GetPic 证据 | 基线 diff、当前 diff、提交或文件哈希 |
| Pro 现状 | 缺失、同内容、已手工分化、独有实现 |
| 计划动作 | 新增、语义合并、适配、删除、重命名、跳过或待用户确认 |
| 风险与验证 | 依赖引用、品牌差异、对应测试和构建方式 |

### 默认必须审计的范围

- 数据采集入口、`entrypoints/modules/` 及其直接运行依赖。
- pages 下载、ZIP、导出、命名、预览等功能及其直接运行依赖。
- 选定功能实际触及的消息、存储、权限、国际化、测试和构建配置。
- 新出现的源码目录：只有被选定功能的 import、package script、WXT 配置或构建脚本引用时才纳入。
- Pro 中与上述文件同路径的手工修改、Pro-only 标记、调用方和测试。

### 按需审计

- Popup、CSS、HTML、Vue template：只有用户明确选择具体功能，或选定功能需要最小 UI 接线时审计。
- `official-only/newtab/`：只有用户选择具体 newtab 功能后审计。
- `_locales/`、`public/`、`assets/`：只审计选定功能需要的键和资源。
- `package.json`、锁文件、manifest/config：只审计选定功能的依赖、脚本、权限和配置，同时保留 Pro 独有项。
- `.gitignore`、`.gitattributes`、`.nvmrc`：仅同步与共同开发、构建有关的规则。
- `AGENTS.md`、README、技术文档：仅在规则确实同时适用于两个项目或用户明确要求时同步。
- `ad-site/`：独立网站子项目，不随扩展源码自动同步。
- `Pro-GetPic/同步规则.md`：作为当前项目同步边界的规范入口；其中清单仍需与当前源码、Git 历史和 package scripts 交叉验证，不能用静态条目替代实际审计。

### 默认排除

- 依赖与生成物：`.git/`、`node_modules/`、`.wxt/`、`.output/`、`dist/`、`types/auto-generated/`。
- 临时和交付物：`scratch/`、`tmp/`、`deliverables/`、打包后的 `.crx`、日志和检查输出。
- Popup 纯视觉结构、全局 UI/CSS/HTML 和新标签页，除非用户明确选择具体功能。
- 独立资料：`docs/`、`fatkun/`，除非用户明确要求。
- IDE、Agent 和本地记忆目录：`.vscode/`、`.vs/`、`.trae/`、`.opencode/`、`.agents/`、`.workbuddy/` 等。
- 密钥与本机配置：`.env*`、`.crx-keys/`、`*.pem`、令牌、证书和其他凭据。即使 Git 已跟踪，也不得自动复制；只报告配置需求。

## 第四步：分类每项差异

### 新增（A）

- A 线新逻辑默认保留 GetPic 原路径，便于后续继续直接同步；只有确认属于 Pro 外壳或 B/C 的接线才进入 Pro 独有目录。
- 同步其直接依赖、类型、消息、权限、测试和必要资源；不要只复制入口文件，也不要带入无关 UI。
- 若 Pro 已有等价模块，合并到现有架构并记录路径映射，不要创建重复实现。

### 修改（M）

- 先理解 GetPic 变化解决的具体问题，再比较 Pro 是否已有不同实现。
- 对选定范围内的 `.js`、`.ts`、`.vue` 脚本逻辑做语义合并，带入 GetPic 的错误修复和功能变化，同时保留 Pro 独有分支。
- 纯 A 线文件若 Pro 没有必须保留的差异，可直接复制；Pro 已手工分化或含装配/品牌差异的共有文件禁止整文件覆盖，必须使用小补丁合并。
- 默认跳过纯 template、HTML 和 CSS 变化；功能确需控件或状态时，在 Pro 现有结构中做最小适配。
- 忽略纯缩进、空行、换行符和无功能影响的注释差异。
- 合并后重新检查 imports、exports、事件名、存储键、消息协议和类型是否成套变化。

### 删除（D）

只有同时满足以下条件才删除 Pro 对应文件：

1. Git 基线能够证明该文件曾属于 GetPic、位于用户选定范围内且被删除或被重命名。
2. Pro 没有把它扩展为独有功能。
3. 使用 `rg -n` 搜索后，没有仍需保留的 import、动态路径、配置引用或测试引用。
4. 删除不会破坏 Pro 的品牌、平台或独有工作流。

缺少任一证据时标记为“未确定”，保留并报告。涉及 Pro 手工代码时默认不删除。不要把所有 Pro-only 文件当成独有功能，也不要把所有 Pro-only 文件当成上游残留。

### 重命名（R）

- 使用 `git diff --find-renames` 识别重命名；不要把它拆成无关联的新增和删除。
- 在 Pro 中移动或等价重构文件，并更新 imports、动态加载路径、配置、测试和文档引用。
- 若旧路径承载 Pro 独有逻辑，先迁移该逻辑，再决定是否删除旧文件。

### Pro 独有文件

- 通过 GetPic 历史、Pro 提交历史、调用关系和功能用途共同确认，不能只看当前路径差集。
- 确认独有后保留，例如媒体嗅探、通用图片扫描或 Pro 专用 UI。
- `pro-media/`、`pro-image-assistant/`、`pro-runtime/`、`channels/`、`shared/`、Pro 专属 WXT 入口、Popup 差异化界面和 `PRO-GETPIC-ONLY` 区块默认视为受保护边界。
- 当 GetPic 改动触及其依赖接口时，适配独有模块以继续工作，但不要删掉独有能力。

## 第五步：按文件类型安全合并

- **路径**：始终保留完整相对路径。新增嵌套目录时同步目录结构。
- **文本源码**：使用精确补丁合并，避免整目录覆盖和无关格式化。
- **二进制资源**：按哈希比较并精确复制；确认许可证和目标引用。
- **`package.json`**：语义合并 dependencies、devDependencies 和 scripts；保留 Pro 的包名、版本策略和额外依赖。不要整文件覆盖。
- **`package-lock.json`**：在 `package.json` 合并后用目标项目现有包管理器生成或更新；不要手工拼接锁文件。若需要联网或安装依赖，按当前权限流程处理。
- **manifest/config**：只同步选定功能所需的 permissions、matches、commands、web accessible resources 和构建钩子；保留目标扩展 ID、渠道、独有权限，以及“图个吉利 / TuGet”品牌。
- **国际化**：只同步选定功能新增/变更的键并校验三种语言 JSON；保留“图个吉利 / TuGet”品牌文案，不得留下代码引用但语言包缺失的键。
- **测试**：选定功能模块、测试文件、mock、测试运行脚本和 package script 作为一个变更单元同步。
- **删除**：逐个精确删除已确认路径；删除前验证解析后的绝对路径位于 Pro 项目内。禁止对计算结果未核验的目录执行递归删除。

### 平台采集重点

- 同步平台入口、模块、matches、iframe/runAt、SPA 时序、DOM selector、网络拦截和存储消息的功能变化。
- 检查入口与其模块成套更新，禁止只复制一个文件。
- 保持 A 与 B/C 的采集、类型、消息、处理器、仓库和结果页边界，不把三套逻辑混合；B/C 之间也不得共享采集数据或采集实现。

### pages 下载重点

- 以用户可见下载能力为功能单元，追踪选择状态、数据读取、命名、单个/批量/ZIP 下载、导出和错误处理。
- GetPic 修复若依赖 UI 结构，优先在 Pro 现有 pages 页面做行为适配，不复制整页。
- 保留 TuGet 通用媒体的独立命名与下载链路；不得让 GetPic 下载逻辑覆盖 `pro-media/download/`。

### Pro 装配边界

- `entrypoints/background.ts` 是 WXT 强制共享的后台 composition root：语义合并 GetPic/A 初始化，并保留调用 `@/pro-runtime/captureLines` 的最小 `PRO-GETPIC-ONLY` 区块。
- `utils/background/messageRouter.ts` 不是三线共享路由；它必须保持 GetPic/A 原路径和消息范围。B/C 消息先由 `pro-runtime/captureLines.ts` 调用各自业务路由认领，未认领消息再交给 A 路由。
- manifest/config、package scripts、Popup 或其他单例外壳只做权限、构建、入口和显示装配，不放采集业务或跨线数据。
- 同步后保留 Pro 通用媒体/备用线入口、各自路由、测试命令和必要权限；每次用 `rg` 动态搜索 Pro imports、标记和消息，确认没有 B/C 依赖倒灌进 A 同步域。

## 第六步：获得授权后处理新标签页

只有用户明确选择具体 newtab 功能后执行本节。用户笼统要求“同步新标签页”时，先列出功能候选并询问具体选择。

- 将 `official-only/newtab/` 视为新标签页唯一真实源码。
- 将 `entrypoints/newtab/` 视为生成目录，不参与手工源码合并，也不要直接编辑。
- 只把用户选择的功能及最小依赖合并到 Pro 的 `official-only/newtab/`，保留 Pro 现有结构和样式，再运行 `npm run prepare:official` 完整重建生成目录。
- 生成脚本只会删除带 `.generated-by-prepare-build-mode` 标记的 `entrypoints/newtab/`。若目录存在但缺少标记，停止并检查，禁止强制删除。
- 若安全沙箱拦截脚本中的删除操作，按权限流程申请执行；不要退化为覆盖式 `cp`，因为覆盖复制无法清理 GetPic 已删除或重命名的旧文件。
- 需要验证商店版时运行 `npm run prepare:store`，确认 newtab 入口被安全移除。
- 不要硬编码 `styles/` 文件数量。以当前 `style.css` imports、Vue scoped style 引用和实际文件树为准，并保持既有层叠顺序。

## 第七步：分层验证

先检查 Pro 的 `package.json` scripts，避免执行会修改兄弟项目、发布文件或上传产物的命令。

### 必做

1. 重新执行选定功能范围的清单和内容比较，确认：
   - 用户选定功能的最小依赖闭包中没有未解释的 GetPic 逻辑缺失。
   - 已确认删除或重命名的旧文件没有残留。
   - Pro 手工代码、`pro-media/`、`pro-image-assistant/`、`pro-runtime/`、Pro 专属入口和所有 Pro-only 装配没有被覆盖或误删。
   - `utils/background/messageRouter.ts` 与 `utils/background/types.ts` 没有 B/C import 或消息类型；A 同步域没有导入 `pro-media/`、`pro-image-assistant/` 或 `shared/capture/`。
2. 对本次触及的用户可见品牌面定向搜索“当图”“GetPic”“Pro-GetPic”“图个吉利”“TuGet”，逐项区分品牌泄漏与合法技术引用；禁止全局替换。
3. 运行 `npm run compile`；若脚本不存在，再使用项目本地的 `vue-tsc --noEmit`。
4. 运行所有受影响功能的现有测试。
5. 再次运行 `git status --short`，区分预先存在、同步产生和验证生成的变化。

### 按变更触发

- 远程配置：`npm run test:remote-config`
- 商品结果：`npm run test:product-results`
- 链接导出：`npm run test:export-links`
- 资源打包：`npm run test:zip-resources`
- A 线架构与业务：`npm run test:commerce-capture`
- B 线架构与业务：`npm run test:pro-media`
- C 线架构与业务：`npm run test:image-assistant`
- 番茄钟或 newtab：`npm run compile:pomodoro`，并按需运行 `npm run test:pomodoro`
- 通用扩展代码：验证 store 构建
- 用户明确选择 `official-only/newtab/` 功能后：验证 official 构建和生成后的 CSS
- 样式拆分：若项目仍提供对应校验脚本，再运行该脚本；不要依赖已删除或仅存在于 `scratch/` 的工具
- Popup 未进入授权范围时，不以 Popup 视觉或结构一致作为验收标准

不要直接假定 `npm run build:official` 只构建当前项目；当前脚本可能继续执行 `sync:browser`。需要 official 构建时，先检查脚本副作用，再选择不会修改范围外项目的等价构建步骤。

### 失败处理

- 判断错误是本次同步引入、目标项目原有，还是依赖/环境问题。
- 本次引入的错误必须修复后重跑。
- 原有错误需提供基线证据和数量，不得用“与 GetPic 同等水平”笼统掩盖。
- 因权限、缺少依赖或外部服务无法完成的验证，明确记录未验证项和原因，不得宣称全部通过。

## 完成标准与交付

完成同步后报告：

1. 实际源路径、目标路径、GetPic 基线提交和同步时的 GetPic HEAD。
2. 用户授权的功能范围，以及默认跳过的 Popup、UI/CSS/HTML、newtab 等范围。
3. 已处理的 A/M/D/R 文件数量、关键路径和必要依赖。
4. 保留的 Pro 手工实现、Pro 独有边界和桥接。
5. 待用户选择的 Popup 或 newtab 功能候选。
6. `package.json`、锁文件、配置、权限、国际化和测试是否成套同步。
7. “图个吉利 / TuGet”品牌校验结果，以及保留的合法技术名称引用。
8. 执行过的验证命令、结果、未执行项和同步结束后的目标工作区状态。

把本次 GetPic HEAD 明确写入交付结果，供下次同步作为候选基线。除非用户明确要求，不要自动提交、推送或更新外部同步文档。
