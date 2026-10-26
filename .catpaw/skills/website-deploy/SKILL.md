---
name: website-deploy
description: 构建并发布当图官网（website）、产品中心（tools）、购买收银台（store）、图个吉利官网（tuget）、一得官网（oneget）、管理后台前端（admin / admin-panel）、前端广告站（ad-site / addp）以及授权后端服务（server / api）到宝塔面板服务器（阿里云 ECS 139.196.170.245）。当用户表达"把改过的发布一下"、"发布所有改过的网站"、"按需发布全部"、"发布当图官网"、"部署当图官网"、"更新当图官网"、"发布官网"、"部署官网"、"发布tools"、"部署tools"、"发布工具站"、"更新tools"、"发布store"、"部署store"、"部署收银台"、"发布前端"、"重新发布网站"、"强制重新发布"、"把网站更新到服务器"、"发布图个吉利官网"、"部署图个吉利"、"发布tuget"、"部署tuget"、"发布图个吉利网站"、"发布一得官网"、"部署一得"、"发布oneget"、"部署oneget"、"发布一得网站"、"发布admin"、"部署admin"、"发布管理后台"、"部署后台"、"发布ad-site"、"部署ad-site"、"发布广告站"、"发布前端广告站"、"部署广告站"、"发布addp"、"发布server"、"部署server"、"发布后端"、"部署后端"、"发布服务器"、"更新服务器代码"、"发布api"、"检查哪些网站需要发布"、"检查哪些项目需要更新"、"对比线上代码差异"等意图时触发本技能。支持远端代码实时比对预检（未修改自动跳过构建与发布）、前端静态站整站原子切换与后端 Node.js/PM2/SQLite 安全增量部署，覆盖预检 → 备份 → 部署 → 编译/SEO 守门 → 线上验证 → 自动回滚全流程。
---

# 网站与后端服务统一发布（website-deploy）

将本地前端静态站点与后端 API 服务发布到宝塔服务器（ECS `139.196.170.245`）。全程脚本化：
- **前端静态站**（`website` / `tools` / `store` / `tuget` / `oneget` / `admin` / `ad-site`）：tar 备份 + 整目录原子切换 + 自动验证，线上无感知。
- **后端 API 服务**（`server`）：**严禁整目录替换！** 采用白名单打包（硬编码死锁排除 `data/` 与 `node_modules/`）+ SQLite 在线 `.backup` 热备 + 源码就地同步 + 远端 TypeScript 编译守门 + PM2 重启与 `/health` 探活。

## 支持目标与映射

| 目标标识 (`--site`) | 部署模式 | 目标域名 / 别名 | 本地源码目录 | 构建产物 / 入口 | 宝塔服务器目录 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`website`** (默认) | 静态原子切换 | `downpictures.com`<br>`www.downpictures.com` | `website/` | `website/.output/public` | `/www/wwwroot/downpictures.yueding168.com` |
| **`tools`** | 静态原子切换 | `tools.yueding168.com` | `tools/` | `tools/.output/public` | `/www/wwwroot/tools.yueding168.com` |
| **`store`** | 静态原子切换 | `store.downpictures.com` | `store/` | `store/dist` | `/www/wwwroot/store.downpictures.com` |
| **`tuget`** | 静态原子切换 + SEO 守门 | `tuget.yueding168.com` | `tuget-website/` | `tuget-website/.output/public` | `/www/wwwroot/tuget.yueding168.com` |
| **`oneget`** | 静态原子切换 + SEO 守门 | `oneget.yueding168.com` | `oneget-website/` | `oneget-website/.output/public` | `/www/wwwroot/oneget.yueding168.com` |
| **`admin`** | 静态原子切换 | `admin.downpictures.com` | `admin-panel/` | `admin-panel/dist` | `/www/wwwroot/admin.downpictures.com` |
| **`ad-site`** | 静态原子切换 | `addp.yueding168.com` | `ad-site/` | `ad-site/dist` | `/www/wwwroot/addp.yueding168.com` |
| **`server`** | **后端增量安全部署 + PM2** | `api.downpictures.com`<br>PM2: `pcgetpic-api` | `server/` | `src/app.ts` $\rightarrow$ `dist/app.js` | `/www/wwwroot/api.downpictures.com` |

> - `tuget`（图个吉利官网）与 `oneget`（一得官网）额外启用了 **SEO 守门检查**，详见下文「SEO 守门」。
> - `server`（后端 API 服务）包含线上真实 SQLite 生产数据库（`data/license.db`），脚本走独立的 `deploy_server` 安全分支，详见下文「后端 API 服务（`server`）安全发布策略」。

## 服务器凭据

> 由项目所有者明确要求集中登记于此，供后续维护直接取用，无需每次追问。
> 权威来源：`D:\Trae\vpn\docs\Stripe审核站点部署与阿里云宝塔运维手册_wzjfa.md`（2026-10-14 归档，已实测验证通过）。

| 项目 | 值 |
| :--- | :--- |
| 阿里云 ECS | `139.196.170.245:22`（华东2 上海，`ecs.e-c1m1.large` 2C2G，Alibaba Cloud Linux 3.2104） |
| 实例 ID | `i-uf61fy70wsjyohrmuhlk` |
| SSH 账号 / 密码 | `root` / `554cca80!!` |
| 宝塔面板入口 | `https://139.196.170.245:8888/0c420c8c`（**必须带安全入口后缀**） |
| 宝塔账号 / 密码 | `user` / `baota0V1ljD2` |
| 宝塔 API 密钥 | `1bEFIVDJqURA8Eco4g2cc9CFMWc5uzFh` |
| Nginx | 1.26.1（宝塔管理），配置目录 `/www/server/panel/vhost/nginx/` |
| 站点配置目录 | `/www/server/panel/vhost/nginx/html_<站点目录名>.conf` |
| 错误日志 | `/www/wwwlogs/<站点目录名>.error.log` |
| Google Search Console 服务账号 | `downpictures@trusty-splice-485215-n8.iam.gserviceaccount.com`（GCP 项目：`trusty-splice-485215-n8` / `262108457604`，已授权 `downpictures.com`、`tools.yueding168.com`、`oneget.yueding168.com`、`store.downpictures.com`、`www.yueding168.com`、`yueding168.com` 等站点 Owner） |
| Google 服务账号 JSON 密钥 | `deploy/.gsc-service-account.json`（纳入 Git 版本库多机同步，调用脚本：`website/scripts/google-seo.mjs`） |
| 百度普通收录 API 准入密钥 | `hrJ79Pus0aLcD26I`（全站通用，`site` 参数须传不带协议的裸域名） |

**取回与重置**

- 忘记入口或密码：SSH 登录后执行 `bt default`，会即时打印当前入口与账号密码；`bt` 菜单选 `5` 可改面板密码。
- 忘记 root 密码：阿里云 ECS 控制台 → 实例列表 → 「重置密码」→「重启」，新密码立即生效。
- **凭据落盘位置**：`deploy/.server-config.json`（`.gitignore:33` 已排除，不会进版本库）。脚本自动读取，一般无需手动干预。

## 前置检查

1. 确认待发布的子模块源码已处于最新状态（如 `git -C tools status`、`git -C server status`）。
2. 确认 paramiko 可用：`python -c "import paramiko"`；若报 `ModuleNotFoundError`，执行 `python -m pip install paramiko`。
3. 确认凭据配置文件存在：`deploy/.server-config.json`（已被 `.gitignore` 忽略）。该文件仅读取 `host` / `port` / `username` / `password` 四个字段；站点目录、验证 URL 与保留项一律以代码内的 `SITE_PROFILES` 为准，配置文件里写的同名字段**不生效**（避免两处配置漂移）。已知可用凭据见上文「服务器凭据」。
4. 发布 `tuget` 前，确认 `tuget-website/.env` 存在且含站长验证码（`NUXT_PUBLIC_BING_SITE_VERIFICATION` 等）。这些 meta 是**构建期注入**的，缺 `.env` 会导致线上缺失验证标签且必须重新构建才能补上。
5. 发布 `oneget` 前，建议先跑 `oneget-website` 的 `npm run check`（typecheck + eslint + 16 项自动化测试）。该站有 16 项 SEO 门禁测试，`--build` 内部的 `nuxt generate` 会执行 `pregenerate` 清空 `.output`，构建失败会直接终止部署，不会污染线上。
6. 发布 `server` 前，建议加 `--build` 先在本地通过 `tsc` 编译检查；默认**不覆盖**线上 `/www/wwwroot/api.downpictures.com/.env`，若确需将本地 `server/.env` 同步到生产环境，需显式追加 `--sync-env` 参数。
7. 发布 `server` 时**必须盯住脚本输出的「环境变量预检」与「.env 一致性比对」两段**。因 `.env` 默认不同步，新增功能依赖的环境变量若漏配**不会报错、不会影响 `/health`，只会静默降级**（历史故障：Stripe 私钥漏同步，生产收银台点击 EN 只剩支付宝，日志与 `/health` 全程正常，只能靠用户反馈发现）。脚本每次发布前与发布后各查一次，输出三类结论：
   - **疑似漏同步**：源码引用了、且本地 `server/.env` 已配非空值，但线上没有。这一层**不依赖 `.env.example`**，因此「只改了代码和本地 `.env`、忘了登记模板」这种最常见的失误也能兜住。`--strict-env` 下熔断。
   - **生产漏配**：以 `server/.env.example` 为基线比对线上 `.env`，报出缺失或值为空/占位符的项。`--strict-env` 下熔断。
   - **可选项**：源码引用但 `.env.example` 与本地 `.env` 都没配（代码已有内置默认值），仅汇总一行，不告警。

   > 模板里**允许留空的预留字段**请在注释中加 `# @optional`（如当前未使用的 `STRIPE_PUBLISH_KEY`），否则会被判为漏配并在 `--strict-env` 下熔断。

   同时还会逐键比对 `server/.env` 与生产 `.env` 的**值**（密钥类字段脱敏，只显示头尾与长度），区分「值不同 / 仅本地有 / 仅线上有 / 仅注释不同」：

   **脚本只检测、绝不自动覆盖线上 `.env`**，差异出现时输出决策指引，由你判断：
   | 差异类型 | 结论 |
   | :--- | :--- |
   | 仅注释/空行不同 | 无需处理 |
   | 仅本地有 | 覆盖**安全**，不丢线上配置，通常是新加了配置项，建议 `--sync-env` |
   | 值不同 | 必须人工逐项确认：本地是要更新的生产值就覆盖；线上才是对的则**不要同步** |
   | 仅线上有 | 覆盖会【删除】线上这些键，确认不再需要才能 `--sync-env` |

   `--sync-env` 是**整体替换而非合并**，执行前脚本会自动备份线上 `.env` 到 `/www/backup/api.downpictures.com.env.pre-deploy-<时间戳>`，并在覆盖前打印「哪些线上键将被删除」。上传与落盘时会把 `.env` 的 CRLF 归一化为 LF 并置 `chmod 600`（防 Windows 编辑残留的 `\r` 被拼进变量值）。加 `--strict-env` 可让删除风险直接熔断。另需注意：`--site server --check --sync-env` 会把 `.env` 纳入 MD5 比对，**注释或键顺序变化也会报「修改」**，判断是否真需要发布请以按值的比对结论为准。

## 发布流程

### 方式零：仅检查哪些站点/服务与线上不一致（只对比汇报，不构建、不发布）

脚本内置**远端代码/产物实时比对预检**。不确定哪些项目在开发期间做过修改、是否需要更新线上时，可先执行 `--check`：

```powershell
# 1. 不确定哪些项目改过、哪些没改过时，一键体检全部 7 个目标（只对比汇报，不构建不发布）：
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site all --check

# 2. 单独检查某个目标（如 server 后端源码）与线上实际运行代码是否有差异：
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site server --check
```

> **自动跳过机制（默认开启）**：即使直接执行下面的发布命令，脚本也会在构建/上传前自动对比线上实际文件与源码指纹——**若开发期间未做任何修改（0 处差异），脚本会自动跳过耗时的 `npm run build`、跳过上传备份与 PM2 重启**。若确需强制重发，追加 `--force` 参数即可。
>
> `--check` 现在还会额外输出**Nginx 站点配置**（vhost）与线上的差异，见下文「Nginx 站点配置同步」。

### 方式一：一键自动构建并按需发布（推荐）

通过添加 `--build` 参数，脚本将先预检远端差异（若检测到线上已是最新会自动跳过；有改动才自动进入对应子目录执行 `npm run build` 并无缝发布到宝塔服务器）：

```powershell
# 0. 【最常用】当用户说“把改过的发布一下”时：一键遍历全部 7 个目标，未修改的自动秒跳过，有修改的自动构建并发布
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site all --build

# 1. 自动构建并发布工具中心 (tools.yueding168.com)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site tools --build

# 2. 自动构建并发布当图官网 (downpictures.com)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site website --build

# 3. 自动构建并发布收银台 (store.downpictures.com)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site store --build

# 4. 自动构建并发布图个吉利官网 (tuget.yueding168.com)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site tuget --build

# 5. 自动构建并发布一得官网 (oneget.yueding168.com)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site oneget --build

# 6. 自动构建并发布管理后台前端 (admin.downpictures.com)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site admin --build

# 6b. 自动构建并发布前端广告站 (addp.yueding168.com)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site ad-site --build

# 7. 自动构建并发布后端 API 服务 (api.downpictures.com + PM2 重启)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site server --build

# 7b. 发布后端 API 服务并同步本地 .env / 强制重装依赖（可选）
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site server --build --sync-env --install

# 9. 【Nginx 配置】只同步 vhost 配置，不构建、不上传产物、不重启 PM2
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site store --nginx-only

# 10. 【Nginx 配置】发布时顺带同步 vhost 配置（产物无改动也会单独同步配置）
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site tuget --build --sync-nginx

# 8. 如果线上代码一致但仍想忽略预检强制重新构建并发布，追加 --force 即可：
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site website --build --force
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site server --build --force
```

### 方式二：手动构建后发布

若您已在本地各子项目目录下手动完成了构建（如测试了本地 preview 或自检通过）：

```powershell
# 1. 发布当图官网 (默认)
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py

# 2. 发布工具中心
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site tools

# 3. 发布收银台
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site store

# 4. 发布图个吉利官网
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site tuget

# 5. 发布一得官网
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site oneget

# 6. 发布管理后台前端
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site admin

# 6b. 发布前端广告站
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site ad-site

# 7. 发布后端 API 服务
python D:\Trae\PcGetPic\.agents\skills\website-deploy\scripts\deploy_website.py --site server
```

## 前端静态站自动化策略（备份 + 原子切换）

针对静态站（`website` / `tools` / `store` / `tuget` / `oneget` / `admin` / `ad-site`），脚本自动完成以下步骤：
1. **秒级 tar 备份**：在服务器 `/www/backup/<site>.pre-deploy-<时间戳>.tar` 完整备份现有生产目录。
2. **正斜杠规范打包**：规避 Windows 下 zip 反斜杠引发的 Linux 解压异常。
3. **SFTP 上传与解压**：解压到 `<site>.new` 临时全新目录。
4. **保留项无损迁移**：从旧目录无损复制 `.well-known`、历史 `downloads`、百度站长及平台验证文件。
5. **宝塔权限修正**：执行 `chown -R www:www`，目录赋 755，文件赋 644。
6. **原子软切换**：执行 `mv <site> <site>.old` 及 `mv <site>.new <site>`，实现访客零中断秒级切换。
7. **平滑重载与验证**：`nginx -t && nginx -s reload` 并执行线上真实 HTTP 状态码与 MD5 双向核验。

## Nginx 站点配置同步（`--sync-nginx` / `--nginx-only`）

静态产物原子替换只换 `/www/wwwroot/<site>/` 下的文件，**不包含 Nginx 站点配置**；宝塔把每个站点的 vhost 配置放在 `/www/server/panel/vhost/nginx/html_<站点目录名>.conf`，由 `nginx.conf` 的 `http {}` include。本地权威副本统一在 `deploy/nginx/`，脚本默认**不碰**它，只有显式加参数才推送。

| `--site` | 本地配置 | 线上路径 |
| :--- | :--- | :--- |
| `website` | `deploy/nginx/downpictures.com.conf` | `.../html_downpictures.yueding168.com.conf` |
| `tools` | *（暂无本地配置，自动跳过）* | `.../html_tools.yueding168.com.conf` |
| `store` | `deploy/nginx/store.downpictures.com.conf` | `.../html_store.downpictures.com.conf` |
| `tuget` | `deploy/nginx/tuget.yueding168.com.conf` | `.../html_tuget.yueding168.com.conf` |
| `oneget` | `deploy/nginx/oneget.yueding168.com.conf` | `.../html_oneget.yueding168.com.conf` |
| `admin` | `deploy/nginx/admin.downpictures.com.conf` | `.../html_admin.downpictures.com.conf` |
| `server` | `deploy/nginx/api.downpictures.com.conf` | `.../html_api.downpictures.com.conf` |

> 未在映射表中的站点按 `<站点目录名>.conf` 兜底查找（例如把 `tools.yueding168.com.conf` 放进 `deploy/nginx/` 即自动生效），也可用 `--nginx-conf <路径>` 显式指定。

**三个参数**

| 参数 | 作用 |
| :--- | :--- |
| `--sync-nginx` | 随发布流程同步配置；**产物一致而配置有差异时也会单独把配置推上线**（两者相互独立） |
| `--nginx-only` | 只同步配置，完全不构建、不上传产物、不重启 PM2 |
| `--nginx-conf` | 覆盖自动匹配的本地配置路径 |

**差异预检**：加 `--check`（或任一同步参数）时，脚本会按 LF 归一化后比对本地与线上 MD5，输出「需要同步配置 / 配置一致」；`--check` 的结论行会追加 `Nginx 配置待同步（文件名）`。

**默认不会同步，也不会检查**。不加参数直接发布时，脚本只发产物，但会打印一行零成本提醒（不额外建立 SSH 连接）：

```
>> [提示] 本地存在 Nginx 站点配置 deploy/nginx/store.downpictures.com.conf，本次发布不会同步它（默认只发产物）。
   如需同时上线配置：追加 --sync-nginx；只想先看差异：追加 --check；只推配置：--nginx-only。
```

| 执行方式 | 检查产物差异 | 检查配置差异 | 同步配置到线上 |
| :--- | :--- | :--- | :--- |
| `--site store --build`（最常见的「发布网站」） | ✅ | ❌（仅提示本地有配置） | ❌ |
| `--site store --check` | ✅ | ✅ | ❌ |
| `--site store --build --sync-nginx` | ✅ | ✅ | ✅ 仅在有差异且 `nginx -t` 通过时 |
| `--site store --nginx-only` | ❌ | ✅ | ✅ |
| `--site all --build` | ✅ 7站 | ❌（逐站提示） | ❌ |

> **因此改了 `deploy/nginx/*.conf` 后必须显式加 `--sync-nginx` 或 `--nginx-only`**，否则配置只在本地生效；技能执行者（AI）应主动检查 `git status deploy/nginx`，发现配置有改动时默认带上 `--sync-nginx`。

**同步流程（5 步，失败自动回滚）**

1. 备份线上现有配置到 `/www/backup/<站点目录名>.nginx.pre-deploy-<时间戳>.conf`（线上原本没有该文件时如实记录，不伪造备份）；
2. 上传前把 CRLF 归一化为 LF（nginx 对 CRLF 敏感，会直接报未知指令）；
3. 覆盖正式路径后执行 `nginx -t`：**语法不通过立即从备份还原并复测，绝不带病重载**，站点内容完全不受影响；
4. `nginx -t` 通过后 `nginx -s reload`；
5. 回读线上文件做 MD5 双向核验，不一致直接报错并给出备份路径。

**注意事项**

- `store` 的配置含 `proxy_cache_path ... keys_zone=store_packages_cache:1m`，必须位于 `server {}` 之外（宝塔把 vhost 文件 include 进 `http {}`，所以成立），且 `keys_zone` 名不得与其他站点重名。
- 以后台「宝塔面板 → 网站 → 配置文件」手工保存会覆盖脚本刚推上去的内容。**以 `deploy/nginx/` 为唯一权威**，面板只用于查看。
- 证书与 `proxy_ssl_*` 等由宝塔自动续签维护的段落若出现在本地副本中，会在同步时被覆盖；如需保留请先合并进 `deploy/nginx/` 再发布。

## 后端 API 服务（`server`）安全发布策略

后端目录 `/www/wwwroot/api.downpictures.com` 包含线上正在读写的 SQLite 生产数据库（`data/license.db`、归档库及 `-wal`/`-shm`）和 Linux C++ 原生编译依赖（`node_modules/`）。**严禁执行整目录替换**，`--site server` 走独立的 7 步安全发布流：

1. **白名单打包 + 禁区硬编码熔断（`build_server_zip`）**：
   - 仅打包 `src/`、`scripts/`、`dist/` 以及顶层配置文件（`package.json`、`package-lock.json`、`tsconfig.json`、`backup.sh` 等）。
   - **代码级死锁**：任何条目若命中 `data/`、`node_modules/`、`*.db*`，或未加 `--sync-env` 时的 `.env`，直接熔断退出；同时将 `backup.sh` 自动转为 LF 换行符。
2. **线上双保险备份（SQLite 在线热备 + 源码归档）**：
   - 使用 `sqlite3 -readonly .../data/license.db ".backup '/www/backup/api.downpictures.com.pre-deploy-<时间戳>.license.db'"` 生成事务级一致性热备并校验 `PRAGMA quick_check = ok`；
   - 将除 `data/`、`node_modules/` 外的现有服务端代码打包至 `/www/backup/api.downpictures.com.code-pre-deploy-<时间戳>.tar`。
3. **SFTP 上传与服务端二次禁区校验**：解压到临时目录并再次断言不存在 `data/`、`node_modules/` 或 `*.db*`。
4. **依赖变更检测与就地源码同步**：
   - 自动比对远端与新版 `package.json` / `package-lock.json` 的哈希，按需触发 `npm install`（也可通过 `--install` 强制触发）；
   - 将现有 `src/`、`dist/`、`scripts/` 暂存到 rollback 目录后，清理旧源码子目录并拷入新版代码（确保已删除的 `.ts` 文件不会残留），**全程不触碰 `data/` 与 `node_modules/`**。
5. **远端 TypeScript 编译守门与自动回滚**：
   - 在服务器执行 `npm run build` 生成 `dist/app.js`（同时兼容 PM2 `tsx src/app.ts` 与 `node dist/app.js` 两种启动形态）。
   - **若编译失败，脚本自动从 rollback 目录还原旧版代码且不重启 PM2**，保证线上服务零中断。
6. **PM2 重启与 `/health` 轮询探活**：
   - 执行 `pm2 restart pcgetpic-api && pm2 save`；
   - 轮询 `http://127.0.0.1:3001/health` 与 `https://api.downpictures.com/health` 直至返回 `{"status":"ok"}`，并打印最新 15 行 PM2 日志。

## SEO 守门（`tuget` / `oneget` 专属）

静态状态码 200 不足以证明落地页真的上线了——历史教训是本地代码全部写完、构建产物也正确，但线上跑的还是旧版本，`/platforms/1688/` 直接 404，sitemap 只有 6 条，专题页矩阵等于零收录。

因此 `tuget` 与 `oneget` profile 额外配置了 `seo_guard`，在原子切换与 MD5 核验**之后**、清理临时目录**之前**执行，任一项不通过即中止并保留 `.old` 目录与 tar 备份：

### `tuget` 守门项

| 守门项 | 判定标准 |
| :--- | :--- |
| sitemap 收录量 | `sitemap.xml` 中 `<loc>` 数量 ≥ 13 |
| 合规声明卡片 | `/platforms/1688/` 页面含「素材使用合规与版权提示」 |
| 对抗性敏感词 | 落地页不得出现「反爬 / 防盗链 / 绕过 / 突破」 |

同时 `tuget` 的 `verify_urls` 覆盖全部 15 个关键 URL（13 个页面 + `robots.txt` + `sitemap.xml`），任一 404 即部署失败。

### `oneget` 守门项

一得官网的核心资产是「百度专属 Sitemap 收敛 + 落地页结构化数据 + i18n 镜像清零」，判据与 `tuget` 不同，共 8 项：

| 守门项 | 判定标准 |
| :--- | :--- |
| 百度 Sitemap 收录量 | `sitemap-baidu.xml` 中 `<loc>` ≥ 21（旧版仅 2 条 = 落地页矩阵零收录） |
| 百度 Sitemap lastmod | `<lastmod>` 数量 ≥ 21（缺失会导致百度增量抓取退化） |
| 国际 Sitemap 收录量 | `sitemap.xml` 中 `<loc>` ≥ 6 |
| robots 声明 | `robots.txt` 必须包含 `sitemap-baidu.xml` |
| 版本新鲜度 | 首页必须含新版核心词「电商图片下载插件」（旧版为「专为电商优化的素材采集浏览器插件」） |
| 落地页结构化数据 | `/platforms/1688/` 必须含 `FAQPage` + `BreadcrumbList` |
| 教程页结构化数据 | `/guides/detail-image-stitching/` 必须含 `Article` + `BreadcrumbList` |
| i18n 镜像隔离 | `/en-US/` 与 `/zh-TW/` 下的平台落地页、教程页必须返回 404 |

`oneget` 的 `verify_urls` 覆盖 29 个关键 URL（首页 + 平台聚合 + 12 席落地页 + 教程中心 + 6 篇教程 + 隐私页 + 4 个多语言页 + `robots.txt` + `sitemap.xml` + `sitemap-baidu.xml`），任一 404 即部署失败。

其他站点未配置 `seo_guard`，跳过该步骤。

## 回滚

- **静态站点**：部署前服务器必生成 `/www/backup/<site>.pre-deploy-<时间戳>.tar`。
- **后端服务（`server`）**：部署前服务器必生成 `/www/backup/api.downpictures.com.pre-deploy-<时间戳>.license.db`（SQLite 主库快照）与 `/www/backup/api.downpictures.com.code-pre-deploy-<时间戳>.tar`（代码与配置归档）。
- 详细回滚步骤见 `references/server-topology.md` 第四节。

## 实战踩坑

- **严禁把 `server/data/` 打包上传**：本地 `server/data/license.db` 是测试库，一旦上传会覆盖线上真实订单与激活码数据！`deploy_website.py` 已在本地打包与远端解压两侧内置硬编码熔断。
- **Windows 控制台 GBK 编码与 PM2 特殊字符**：`pm2 list` 输出含 `↺`（`\u21ba`）等 Unicode 制表符，Windows 默认 GBK 终端直接 `print()` 会触发 `UnicodeEncodeError`，脚本已在入口调用 `sys.stdout.reconfigure(encoding='utf-8', errors='replace')`。
- **Shell 脚本 CRLF 换行符**：Windows 下的 `server/backup.sh` 若以 CRLF 上传会导致 Linux 计划任务报 `/bin/bash^M: bad interpreter`，脚本打包与部署时已自动转为 LF 并赋予 `+x` 权限。
- **zip 反斜杠路径**：Windows 下生成的 zip 条目包含反斜杠会导致 Linux unzip 返回 exit 1——脚本内部已自动化打包为标准正斜杠 zip。
- **`.user.ini` immutable**：宝塔给站点根目录的 `.user.ini` 带 `chattr +i`，脚本已自动处理 `chattr -i` 再清理旧目录。
- **404 真实性**：静态站 nginx 配置为 `try_files $uri $uri/ =404`，未知 URL 返回 404 为正常保护（`admin` 等 SPA 路由回退 `/index.html` 返回 200 亦属预期）。
- **构建期注入的 meta**：`tuget-website` 的 Bing/Google 站长验证码、IndexNow 密钥均由 `nuxt.config.ts` 在**构建时**写进 HTML。修改 `.env` 后必须重新 `npm run build` 并再次部署，否则线上不会变化。
- **`--build` 与手动构建等价**：`tuget-website` 的 `npm run build` 已包含 `nuxt generate` + `generate-urls` + `package:public`，脚本自身的正斜杠 zip 打包独立执行，二者不冲突。
- **别名必须全小写**：`resolve_site_profile()` 会先对 `--site` 参数做 `.lower()` 再比对 `alias` 列表，因此 `alias` 中不能出现大写字母（写 `'OneGet'` 永远匹配不上，应写 `'oneget'`）。
- **Nginx 配置默认不托管，现已可托管**：`deploy/nginx/*.conf` 是本地权威副本。历史上脚本只做产物替换、不管 vhost；现在用 `--sync-nginx` / `--nginx-only` 推送，脚本负责备份、`nginx -t` 守门与失败回滚。加这两个参数前请先确认本地副本内容正确，尤其是 `proxy_cache_path` 这类 http 级指令的位置。
- **`oneget` 的 Nginx 配置不在子仓库**：`deploy/nginx/oneget.yueding168.com.conf` 位于**根仓库**，而非 `oneget-website/` 内。若线上 `/platforms/{id}/` 返回 404 但产物中确实存在 `index.html`，说明是 Nginx 侧问题（检查宝塔「伪静态」是否为空、`try_files` 是否回退首页）——现在可直接 `--site oneget --nginx-only` 由脚本同步并热重载，无需手工粘贴。
- **IDE 内批量删除保护**：部分 IDE（如 CodeBuddy）会拦截对 `node_modules/.cache/nuxt/.nuxt/dist` 等目录的单次批量删除，导致 `nuxt generate` 以 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 中断。遇到时先手动清空 `oneget-website/node_modules/.cache/nuxt/.nuxt/dist` 再重跑构建，这是环境限制而非代码缺陷。
- **凭据为空字符串的坑**：`deploy/.server-config.json` 的 `password` 若为 `""`，脚本会以 `!! 服务器凭据不完整` 明确报错；SSH 密钥认证（`id_ed25519`）在宝塔默认配置下不可用，必须提供 root 密码。
- **`.env` 漏配是静默故障**：`server` 的 `.env` 默认不随发布同步（需 `--sync-env`），而后端大量能力写成「`process.env.X || ''`」的形式——缺变量时不抛错、不影响 `/health`，功能直接消失（Stripe 私钥漏配 → 收银台只剩支付宝）。脚本已内置发布前后两次「环境变量预检」，分三层判定（详见「发布前检查」第 7 条），既能抓 `.env.example` 已登记而线上缺失的键，也能在**忘记更新 `.env.example`** 时靠「本地已配置但线上缺失」兜住。`.env.example` 中允许留空的预留字段必须加 `# @optional`，否则会被误判为漏配。
- **`.env` 的 CRLF 与权限**：Windows 下编辑 `server/.env` 易存成 CRLF，运维若用 `source .env` 加载，行尾 `\r` 会拼进每个变量值造成隐蔽故障。脚本在 `--sync-env` 打包、远端落盘两处均已归一化为 LF，并将线上 `.env` 置为 `chmod 600`。
- **本地改了 `.env` 不会自动上线**：`.env` 被 `.gitignore`，且默认不随发布推送。脚本会**只读**比对本地与线上并脱敏列出差异，但绝不自动覆盖——因为 `.env` 没有第二份真源，脚本无权替你判断哪份才对。是否 `--sync-env` 必须人工决策，理由见上文「发布前检查」第 7 条的差异对照表。

