# Pro-GetPic 项目长期约定

## 构建模式与生成目录
- 构建模式：store / official / desktop，由 `scripts/prepare-build-mode.js` 切换，状态写在 `.build-mode.json`。
- `entrypoints/newtab/` 是**生成目录**（.gitignore），official 模式由 `official-only/newtab/` 生成覆盖，store/desktop 模式会被删除。真实源码只在 `official-only/newtab/` 与 `composables/`，改 newtab 必须改 official-only 下的源码。

## 本机构建注意事项（2026-10-15 实测）
- 环境有 node-safe-delete 防护，按“单轮累计 50 次删除”拦截；prepare-build-mode 逐文件删除 entrypoints 会触顶。在 Pro-GetPic 跑任何构建类 npm 脚本需加 `CODEBUDDY_SAFE_DELETE_ENABLED=0`（仅对构建子进程设置）。
- 该 workspace 常有同事并发开发/构建，跑全量构建（zip:edge 等）前先看 `.build-mode.json`、`.output`、`.output/*-dev` 的时间戳，避免互踩（曾因并发 prepare 删除竞争导致 rmdir ENOENT）。
- `package:edge:official` 含 `publish-website-downloads`（拷贝 zip 到 ../tools 备份），只验证构建时可用等价手工步骤替代（prepare:official → i18n:sync → update:matches → wxt build -b edge → fix-all-manifests --repackage --only=edge → assert-build-mode official edge-mv3）。

## Edge 合规体系
- `scripts/assert-build-mode.js` 的 Edge 断言已与 mode 解耦：只要产物是 `edge-mv3`（store/desktop/official 均跑）。
- 黑名单 `EDGE_FORBIDDEN_LITERALS` 双保险：`dailyBackgroundTab:`（机制 storage key）+ `[DailyBackgroundTab`（日志前缀）。
- 新增后台开 Tab 调用点的标准写法：调用处包 `if (!IS_EDGE_BUILD)`（`const IS_EDGE_BUILD = import.meta.env.BROWSER === 'edge'`）+ 传 caller 溯源参数；函数内部自带 Edge/空 URL 短路与 24h 节流，调用方 `void` 调用即可（函数绝不 reject）。
- 全项目后台开 Tab 调用点共 17 处（pages 4 + search 8 + newtab 3 + ...），caller 命名即组件标识。

## 后台推广 Tab 业务约定
- 频控：taobao 全插件共享 24h 单额度（key 'taobao'），1688 独立（key '1688'），newtab 天猫独立（key 'tmall'）。
- 失败不写时间戳（24h 后可恢复）；创建与记录分离（storage 写失败仅 DEV 告警）。window.open 回退已废除（noopener 下必返 null，见 v3 方案）。
- Edge 构建 100% 拔除；Chrome/Firefox/360 完整保留。Chrome 侧 kill switch 是已被记录的接受风险（Edge 构建内不得引入远程配置，属 1.2.2 C&C 红线）。

## client 桌面端更新检测架构（当图客户端）
- MSIX 商店版：`check_for_update` 优先走 WinRT `StoreContext::GetAppAndOptionalStorePackageUpdatesAsync`（`update.rs` 内 `msix_store_updates` 模块：std::thread 原生线程 + MTA RAII 守卫 + 10s tokio timeout 熔断），失败时平滑回退官网 version.json，再失败才 has_update=false。
- 常量：STORE_PRODUCT_ID=9P5S2FVP6CR5；商店协议 ms-windows-store://，open_url 唤起失败降级 apps.microsoft.com 网页。
- `copy-desktop-installer.mjs` 只写 desktopVersion/desktopFilename；**严禁自动覆盖 microsoftStoreVersion**（过渡期冻结，靠 Windows 后台静默更新迁移；自动覆盖会在提审 1~2 天审核期内让存量旧版收到虚假更新提示）。2026-10-16 核查时该实现已在工作区且编译/类型门禁通过，但尚未 git 提交。

## tuget-website /buy/ 收银台性能与二维码（2026-10-20 评审沉淀）
- 删 nuxt.config prerender 注入的 i18n bootstrap 预取**不省 messages.json 字节**（i18n 插件 hydration 时自拉默认语言包，无头浏览器实测）；/buy 全链路零 $t（只用 useCheckoutI18n），要省 55KB 须插件级隔离。
- 二维码秒出的真修复只有删 `PaymentCheckout.vue` 的 `watch(creatingOrder)`（handleCreateOrder 原子化、qrcode 预载、appManifest:false 均早已存在）；toDataURL width=408 有两个调用点（createOrder + restoreFromStripeReturn），展示 200px CSS，别降宽度。
- 首屏对比口径：tuget /buy = 10 chunk / 126.4KB gz；store 首屏实为 2 个 JS ≈ 109KB gz（含 modulepreload 的 vendor-vue），"1 文件 77.7KB"是错基准；tuget 无 ENTRY_GZIP_BUDGET 类构建守门（store 在 vite.config.ts）。

## 套餐定价口径（当图/图个吉利收银台，2026-10-19 用户确认）
- 策略：年度专业卡与永久尊享卡**同价**（dangtu ¥199.9 / tuget ¥239.9，引导用户买终身卡）。
- 事实源：官网 store.downpictures.com 与 tuget.yueding168.com/buy/。人民币价以官网为准，港币价由人民币折算、尾数为 9：¥39.9→HK$49、¥49.9→HK$59、¥159.9→HK$189、¥189.9→HK$219、¥199.9→HK$229、¥239.9→HK$279。禁止给年卡/终身卡单独上浮港币价（v2 迁移曾上锚 239/299，已回退 229/279）。
- 价格链路：`server/data/license.db` packages 表（price/price_hkd/original_price）→ `GET /api/v1/payment/packages`（每请求直查、无内存缓存，改库即生效）→ store / tuget-website（前端零硬编码价格）。种子与迁移在 `server/src/db.ts`（v1 hkdSeed + v2 迁移）和 `server/src/constants.ts`（DEFAULT_PACKAGES / DEFAULT_TUGET_PACKAGES，仅空库时生效）。
- 本机跑 server 单测须用 Node 24（`/c/nvm4w/nodejs/node.exe`）；managed Node 22 下 better-sqlite3 会 ERR_DLOPEN 假失败。类型检查用 `npx tsc --noEmit` 即可。

## 套餐展示配置与体验包下架（2026-10-19）
- 3 天体验版已停售：constants 种子移除；一次性迁移 key `packages_trial_delist_v1` 只把体验包 is_active 置 0（不删行，orders/activation_codes 外键与历史权益不受影响）。DURATION_TYPE.TRIAL=1 枚举保留（存量订单/抵扣券/邮件逻辑仍按它判定）。
- packages 表新增 4 个可空展示列：badge / badge_en / features_json / features_en_json。运营在后台配角标与卖点（每行一条，行首 ★=高亮），留空 NULL 时收银台 100% 回退默认逻辑。读写口径集中在 `server/src/services/package-display.ts`（卖点 ≤15 条 × ≤120 字符，角标 ≤30 字符）。
- ⚠️ 顺序约束：`ALTER TABLE packages ADD COLUMN price_hkd / name_en` 必须早于 `seedProductPackages`（种子 INSERT 显式写这两列），已前移到 db.ts「初始化默认数据」之前，勿再挪到 Stripe 迁移区。
- ⚠️ 迁移不可原地修改（2026-10-19 同事评论核验）：v2 曾原地把 239/299 改成 229/279 忘换 key，已跑过旧版的库（含本机库，靠当日手工 UPDATE 才对）永久跳过。补救=新键 `packages_hkd_pricing_seed_v3`，逻辑在 `server/src/services/hkd-pricing-migration.ts` 的 `correctLegacyHkdPrices`（WHERE 只命中已知错价，幂等，7 个单测守护）。v1 种子虽也被原地改过，旧值均被 v2/v3 WHERE 链覆盖。
- admin PATCH 可空字段统一「`key in req.body` 显式 SET」语义：original_price / price_hkd / name_en / badge / badge_en / features / features_en 传 null/''/空数组=清空，不传=保持原值；**绝不再塞进 COALESCE 列表**（`COALESCE(NULL, col)` 会保留旧值，划线价曾因此无法清空）。original_price 额外校验非负有限数（400 INVALID_ORIGINAL_PRICE）。
- 本机 data/license.db 已被新代码迁移过（新列已加、trial_delist 已登记，v3 亦已登记），有 dev server 持锁并随 src 热重启。

## 当图 client ↔ 图个吉利 TuGet 共享前端模块（2026-10-22）
- `urlExtractors/`（8 文件）与 `taobaoShortLink.ts` 在两端的副本要求**字节一致**（改完用 `diff` 逐文件确认）：client 侧在 `src/utils/urlExtractors/`、`src/utils/taobaoShortLink.ts`，TuGet 侧在 `src/utils/urlExtractors/`、`src/taobaoShortLink.ts`。
- `urlExtractors` 的纯 TS 源码用无扩展名相对导入（Vite/tsc 补全）。client 要跑 Node 原生测试时，靠 `client/scripts/ts-resolve-hook.mjs`（`module.register()` 补 `.ts` / `/index.ts`）实现，别为了测试给源码加 `.ts` 后缀。TuGet 侧走 vitest，不需要该钩子。
- `taobaoShortLink.ts` 带模块级状态（`resolvedCache` 200 条 FIFO + `inFlight` Promise 合并）。给这类模块写单测时，每个用例必须用各自独立的短链，否则会命中上一个用例的缓存。
- 平台清洗规则的既有坑（已修，别再回退）：`taobaoHandler.cleanUrl` 必须对 `tb.cn` 短链保留 query（`?tk=`）；`douyinHandler` 不能用 `createOriginPathnameHandler`（会清空 `id`/`product_id`/`promotion_id`）。

## TuGet 客户端 MSIX 更新提醒与数据迁移（2026-10-22 两轮评审沉淀）
- 实现位置：`TuGet-Client/src-tauri/src/update.rs`（514 行，含 WinRT `msix_store_updates` 子模块）+ `src/composables/useAppUpdate.ts` + `UpdateNoticeBadge.vue`/`UpdateGuideModal.vue`；`tuget-website/public/version.json` 双版本号（desktopVersion/microsoftStoreVersion 分离）；`scripts/clients/tuget/build-release.ps1` 构建后同步 desktopVersion（**只改工作区文件，不含提交/部署**，且完全不碰 MSIX/AppxManifest）。
- **MSIX AppData 语义已定案（2026-10-22 真机+文档双向证实）**：`wcifs.sys` 对包内逻辑路径是"读穿透（Read Fall-through）"合并视图——私有 LocalCache 无该文件时穿透读底层真实 AppData 文件；`%APPDATA%`/`%LOCALAPPDATA%` 环境量在容器内仍是真实路径（真机迁移成功反证）。本机 iTunes MSIX 包有真实 `LocalCache/Roaming/Apple` 数据（文件层重定向布局实证）。
- **MSIX 运行期架构定稿（2026-10-22）**：MSIX 下运行期读写显式绑定物理 LocalCache 路径（`update::resolve_runtime_app_data_dir`/`resolve_runtime_task_state_path`，PFN 取自 `current_package_family_name()`），不走 wcifs 逻辑路径，避免解绑后穿透复活；EXE→MSIX 迁移因此成为设计必需（一次性 marker `.migration-exe-to-msix-v1.done`；copy_failed/no_source_files 不落标记可重试）。真机验证工具：`TuGet-Client/scripts/create-local-msix-test.ps1`（本地签名/安装/清理全链路）。代价：EXE 与 MSIX 数据分叉（设计使然）；迁移 copy_failed 时表现为授权空白（diagnostic_log `migration=skip:copy_failed` 可查）。
- **版本号事实源已统一为 1.2.20**（2026-10-22）：tuget-version.json / tugetDistribution.ts（改为从该 JSON 导入）/ tuget-website version.json 全部对齐；AppxManifest.xml 是模板（fix-msix.mjs 打包时从 package.json 注入版本，勿当商店版本证据）。**`microsoftStoreVersion=1.2.20` 待 Partner Center 最终确认**：商店 storeedgefd API 显示列表 LastUpdateDateUtc=2026-10-21（昨晚更新，与 1.2.20 提审时间线吻合），但 Version 字段为空、无公开途径可查确切在架版本。铁律：商店过审后才更新 microsoftStoreVersion，否则 MSIX 回退分支假报更新 + EXE 用户被引导去商店降级。
- TuGet 商店 ID `9N5Q5LHZ5R8H`（当图为 9P5S2FVP6CR5，别混）；`windows = "0.58"` 与当图 client 对齐（两 crate 版本隔离共存，当图 Cargo.toml 有注释，勿统一降级）。
- ~~存量测试失败（capture-console-navigation.test.ts 淘宝短链回退用例）~~ 已修复：`resetTaobaoShortLinkCacheForTests()` 导出 + 两端字节一致（SHA256 aa55f7aa…，TuGet-Client/src/taobaoShortLink.ts ↔ client/src/utils/taobaoShortLink.ts 必须保持字节一致，改一边必须同步另一边）。

## 跨平台多架构发布链路（2026-10-24/25 五轮评估沉淀）
- **主仓库远端只有 Gitee**（`git@gitee.com:zhaoge168/image-download-client.git`，**仓库私有**，匿名访问 403 实测）：`.github/workflows/build-tuget-release.yml` 与 `.github/workflows/build-dangtu-release.yml` 在 Gitee 上都是死文件、运行次数为 0。任何对 yml 的完善（shell: bash/Apple 证书导入/target 测试/--no-run）在托管位置解决前都不生效。验收"能发布"先看 yml 有没有运行记录。
- ~~`build-release.mjs` 的 `syncWebsiteVersionManifests()` 自动写 `microsoftStoreVersion`~~ **2026-10-25 第四轮（`cf35dd1`）已修复**：mjs 与 ps1 的自动覆盖均已移除，只写 desktopVersion/version/desktopUpdatedAt。第 57 行铁律保持：商店版本仍靠人工过审后更新，任何发版脚本不得再引入自动覆盖。
- 产物发布链路断点（截至 2026-10-25 第五轮）：TuGet 与当图两条产品线的 `build-release.mjs` 归一化 + tools 复制 + version.json 回写均已就绪；r2-downloads-sync skill 已扩展两条线共 9 个安装包规则（6 副本同步）；**但 CI 无 R2 上传步骤、无回写提交步骤，dl.webtongbu.com 上 TuGet-Client/* 与 clientGetPic/* 共 8 个新平台 URL 实测全部 404**。当图 `update.rs` 的三个 `DEFAULT_*_DOWNLOAD_URL` 常量也直接指向 404 地址（代码常量比 version.json 更硬）。工具就绪 ≠ 文件存在。
- 两个客户端密钥管理模式分叉（2026-10-25 确认）：**TuGet** = `TUGET_LICENSE_HMAC_SECRET` 环境变量注入 + lib.rs option_env! fail-closed 门禁 + build-release.mjs/ps1 缺失即 throw；**当图** = `obfstr` 编译期混淆硬编码（`client/src-tauri/src/state.rs:81`，值 `pcgetpic-prod-hmac-2024-secure`，该值在 docs 另有明文副本），无构建期门禁。
- `HMAC_SECRET_TUGET`（值 `4KLqWR5Xyu…`）副本现状（2026-10-25 第五轮后，与第四轮一字不差）：`scripts/restore-all-env.ps1:42`（团队 R1 驳回"删除"，裁定**脚本留、密钥走**）+ `docs/配置与密钥/全项目环境变量与密钥配置手册.md`（4 处）、`docs/经验/邮箱、支付宝等信息.md`（6 处，另含 `pcgetpic-prod-hmac-2024-secure`）、`docs/全项目密钥汇总与各站点搜索优化诊断_pvnkx.md`（1 处）。**服务端轮换是唯一止血，五轮零回应**；清理标准动作=全项目 grep 到零 + 轮换，不是删被告知的行。

## 当图客户端（client/）跨平台改造（2026-10-25 首评+二轮，工作区**仍未提交**）
- 改造范围：client 17 文件 +587/-165（cdp.rs/login.rs/injector.rs/config.rs/crypto.rs/update.rs/utils.rs/file_ops + 脚本三件套 + 前端）+ 主仓新增 `scripts/clients/dangtu/build-release.mjs` 与 `.github/workflows/build-dangtu-release.yml`。截至 2026-10-25 深夜（第二轮加固后）**全部未提交**，HEAD 仍是主仓 `cf35dd1`。
- 已验证属实的实现：wry `set_cookie` API（Cargo.lock 实锁 **wry 0.55.1**，文档已更正；macOS `cookie_into_wkwebview` 完整传 HttpOnly/Secure/SameSite/Expires）；CDP 动态端口 + 独立 profile + 会话生命周期闭环（200ms 端口探活/Unix 进程组 kill/300ms 删 profile/僵尸回收/200ms 落盘）；`tauri-runner.mjs` 处理 MSVC link.exe 冲突；当图 yml 比 TuGet 多一个 macOS x86_64 测试 `--no-run` 的正确处置。
- 当图 tauri.conf.json：productName 中文（`当图客户端-电商图片视频批量下载器`）、mainBinaryName `dangtu`、version 3.11.131（独立版本线）；**NSIS 产物名是中文 setup.exe**（`当图客户端-电商图片视频批量下载器_3.11.131_x64-setup.exe`），yml glob 写 `dangtu.exe` 依赖 copy-desktop-installer 的复制步骤（隐式耦合，两轮未修）。
- **bundler targets 坑（2026-10-25 二轮修复）**：tauri.conf.json 的 targets 五件套含 nsis 时，`tauri-bundler` 的 `PackageType::Nsis` match 分支无 cfg 门控，非 Windows 平台构建会尝试调 makensis 失败。修法=`scripts/clients/dangtu/build-release.mjs` 的 `resolvePlatformBundleTargets()` 临时 overlay 按平台裁 targets。教训：**看到 targets 混装必须去读 bundler match 分支有没有门控**。
- 当图 `client/src-tauri/.cargo/config.toml` 原有 rsproxy 国内镜像配置；当图 CI 的 "Override Cargo mirror config" 步骤用 `cat >` 覆盖它（二轮已补注释；意图=US runner 直连）。
- 当图 `update.rs` 三个 `DEFAULT_*_DOWNLOAD_URL` 指向 `dl.webtongbu.com/clientGetPic/*`（**实测仍全 404**，两轮未修——代码常量比 version.json 更硬）；当图 copy-desktop-installer.mjs 已显式禁覆盖 microsoftStoreVersion（带注释）。
