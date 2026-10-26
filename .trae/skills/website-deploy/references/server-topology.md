# 服务器拓扑与多站点运维参考

> 配套 skill：`website-deploy`。本文档记录宝塔服务器资产、支持发布的各站点结构、保留项与回滚方法。
> 敏感凭据存放于 `deploy/.server-config.json`（已被 .gitignore 忽略）。

## 一、服务器资产

| 项目 | 值 |
| :--- | :--- |
| 厂商 / 地域 | 阿里云 ECS，华东 2（上海） |
| 公网 IP | `139.196.170.245` |
| 规格 / 系统 | ecs.e-c1m1.large（2C2G）/ Alibaba Cloud Linux 3 |
| SSH | `root@139.196.170.245:22` |
| 宝塔面板 | `https://139.196.170.245:8888/<安全入口>`（SSH 执行 `bt default` 可查） |
| Nginx | 1.26.1（宝塔管理），配置目录 `/www/server/panel/vhost/nginx/` |
| 磁盘 | 40G，部署前确认余量（整站 tar 备份约 480MB） |

## 二、支持站点与服务拓扑矩阵

| 目标标识 | 部署模式 | 生产域名 / 进程 | 宝塔站点根目录 | 本地项目 | 构建命令 | 产物 / 入口 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`website`** | 静态原子切换 | `downpictures.com`<br>`www.downpictures.com` | `/www/wwwroot/downpictures.yueding168.com` | `website/` | `npm run build` | `.output/public` |
| **`tools`** | 静态原子切换 | `tools.yueding168.com` | `/www/wwwroot/tools.yueding168.com` | `tools/` | `npm run build` | `.output/public` |
| **`store`** | 静态原子切换 | `store.downpictures.com` | `/www/wwwroot/store.downpictures.com` | `store/` | `npm run build` | `dist` |
| **`tuget`** | 静态原子切换 + SEO 守门 | `tuget.yueding168.com` | `/www/wwwroot/tuget.yueding168.com` | `tuget-website/` | `npm run build` | `.output/public` |
| **`oneget`** | 静态原子切换 + SEO 守门 | `oneget.yueding168.com` | `/www/wwwroot/oneget.yueding168.com` | `oneget-website/` | `npm run build` | `.output/public` |
| **`admin`** | 静态原子切换 | `admin.downpictures.com` | `/www/wwwroot/admin.downpictures.com` | `admin-panel/` | `npm run build` | `dist` |
| **`server`** | 后端安全增量 + PM2 | `api.downpictures.com`<br>PM2: `pcgetpic-api` (`:3001`) | `/www/wwwroot/api.downpictures.com` | `server/` | `npm run build` | `src/app.ts` $\rightarrow$ `dist/app.js` |

### 1. 官网站点（website）
- **站点目录名**：`downpictures.yueding168.com`
- **server_name**：`www.downpictures.com downpictures.yueding168.com downpictures.com`
- **Nginx 基线配置**：`deploy/nginx/downpictures.com.conf`
- **验证 URLs**：
  - `https://downpictures.com/`
  - `https://www.downpictures.com/`
  - `https://downpictures.com/platforms/`
  - `https://downpictures.com/tuget/`
  - `https://downpictures.com/en-US/`
  - `https://downpictures.com/sitemap.xml`
- **保留项**：`.well-known`、`downloads`、百度站长验证、平台 txt、京东验证、旧图标、缓存等。

### 2. 产品中心站点（tools）
- **站点目录名**：`tools.yueding168.com`
- **server_name**：`tools.yueding168.com`
- **验证 URLs**：
  - `https://tools.yueding168.com/`
  - `https://tools.yueding168.com/zh-TW/`
  - `https://tools.yueding168.com/en-US/`
  - `https://tools.yueding168.com/dangtu-client/`
  - `https://tools.yueding168.com/sitemap.xml`
- **保留项**：`.well-known`、`downloads`（若有）

### 3. 收银台与购买站点（store）
- **站点目录名**：`store.downpictures.com`
- **server_name**：`store.downpictures.com`
- **Nginx 基线配置**：`deploy/nginx/store.downpictures.com.conf`
- **验证 URLs**：
  - `https://store.downpictures.com/`
- **保留项**：`.well-known`

### 4. 图个吉利官网（tuget）
- **站点目录名**：`tuget.yueding168.com`
- **server_name**：`tuget.yueding168.com`
- **Nginx 基线配置**：`deploy/nginx/tuget.yueding168.com.conf`（本地另有副本 `tuget-website/deploy/nginx.conf.example`）
- **本地项目**：`tuget-website/`（Nuxt 4 静态生成站，13 个 SEO 路由）
- **验证 URLs**（15 个，任一 404 即部署失败）：
  - `https://tuget.yueding168.com/`
  - `https://tuget.yueding168.com/client/`
  - `https://tuget.yueding168.com/download/`
  - `https://tuget.yueding168.com/buy/`
  - `https://tuget.yueding168.com/platforms/1688/`
  - `https://tuget.yueding168.com/platforms/taobao/`
  - `https://tuget.yueding168.com/platforms/jd/`
  - `https://tuget.yueding168.com/platforms/vip/`
  - `https://tuget.yueding168.com/platforms/pdd/`
  - `https://tuget.yueding168.com/scenarios/media-sniffer/`
  - `https://tuget.yueding168.com/solutions/ecommerce-designer/`
  - `https://tuget.yueding168.com/terms/`
  - `https://tuget.yueding168.com/privacy/`
  - `https://tuget.yueding168.com/robots.txt`
  - `https://tuget.yueding168.com/sitemap.xml`
- **保留项**：`.well-known`、`downloads`
- **Nginx 特殊项**：`/api/` 反向代理到 `127.0.0.1:3001`（授权服务），整目录原子切换不影响该配置；`.user.ini` 由宝塔自动生成，脚本已处理。
- **SEO 守门检查**（本脚本独有，`seo_guard`）：
  1. `sitemap.xml` 中 `<loc>` 数量 ≥ 13；
  2. `/platforms/1688/` 含「素材使用合规与版权提示」合规卡片；
  3. 落地页不含「反爬 / 防盗链 / 绕过 / 突破」等对抗性敏感词。

  任一项失败即中止部署并保留 `.old` 目录与 tar 备份。这三项对应「百度/Google 收录」与「E-E-A-T 合规」两项不可逆风险资产，必须在切换后立刻验证，不能靠人工后续补查。
- **构建期注入项**：`NUXT_PUBLIC_BING_SITE_VERIFICATION`、`NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION`、`NUXT_PUBLIC_INDEXNOW_KEY` 均由 `nuxt.config.ts` 在构建时写入 HTML，改 `.env` 后必须重新 `npm run build` + 重新部署。

### 5. 一得官网（oneget）
- **站点目录名**：`oneget.yueding168.com`
- **server_name**：`oneget.yueding168.com`
- **Nginx 基线配置**：`deploy/nginx/oneget.yueding168.com.conf`（**位于根仓库，不在 `oneget-website/` 内**；本脚本只做静态产物原子替换，不托管 Nginx 配置）
- **本地项目**：`oneget-website/`（Nuxt 4 纯静态生成站，30 个物理 HTML：首页 + 隐私页 + 平台聚合 + 12 席落地页 + 教程中心 + 6 篇教程 + 繁体/英文 6 页 + 200/404）
- **验证 URLs**（29 个，任一 404 即部署失败）：
  - `https://oneget.yueding168.com/`
  - `https://oneget.yueding168.com/platforms/`
  - 12 席落地页：`/platforms/{1688,pdd,taobao,jd,amazon,temu,redbook,douyin,aliexpress,shein,shopee,goofish}/`
  - `https://oneget.yueding168.com/guides/`
  - 6 篇教程：`/guides/{detail-image-stitching,ecommerce-video-download,1688-batch-image-download,pdd-material-extract,taobao-tmall-image-download,offline-extension-install}/`
  - `https://oneget.yueding168.com/privacy/`
  - 多语言：`/zh-TW/`、`/zh-TW/platforms/`、`/en-US/`、`/en-US/platforms/`
  - `https://oneget.yueding168.com/robots.txt`
  - `https://oneget.yueding168.com/sitemap.xml`
  - `https://oneget.yueding168.com/sitemap-baidu.xml`
- **保留项**：`.well-known`、`downloads`
- **Nginx 特殊项**：
  - 未知路径 `try_files $uri $uri/ $uri/index.html =404`，**禁止回退首页**（避免软 404 稀释收录质量）；
  - `error_page 404 /404.html`（构建产物含 Nuxt 生成的 `404.html`）；
  - `/sitemap-baidu.xml` 单独设`expires 1h` 短缓存，便于扩充落地页后及时让 Baiduspider 发现增量；
  - `applicable-device=pc,mobile` + `baidu-site-verification` 由 `nuxt.config.ts` 在**构建期注入**，无需服务器侧验证文件。
- **SEO 守门检查**（`seo_guard`，8 项）：
  1. `sitemap-baidu.xml` 中 `<loc>` ≥ 21；
  2. `sitemap-baidu.xml` 中 `<lastmod>` ≥ 21；
  3. `sitemap.xml` 中 `<loc>` ≥ 6；
  4. `robots.txt` 含 `sitemap-baidu.xml`；
  5. 首页含新版核心词「电商图片下载插件」（旧版为「专为电商优化的素材采集浏览器插件」）；
  6. `/platforms/1688/` 含 `FAQPage` + `BreadcrumbList` 结构化数据；
  7. `/guides/detail-image-stitching/` 含 `Article` + `BreadcrumbList`；
  8. `/en-US/` 与 `/zh-TW/` 下的平台落地页、教程页必须返回 404（i18n 镜像隔离）。

  任一项失败即中止部署并保留 `.old` 目录与 tar 备份。
- **上线后动作**（不在脚本范围内）：配置 `BAIDU_PUSH_TOKEN` 后执行 `npm run baidu:push`；或在百度搜索资源平台提交 `https://oneget.yueding168.com/sitemap-baidu.xml`。注意百度新站主动推送限额通常为 10 条/天，需分批推送。

### 6. 管理后台前端（admin）
- **站点目录名**：`admin.downpictures.com`
- **server_name**：`admin.downpictures.com`
- **Nginx 基线配置**：`deploy/nginx/admin.downpictures.com.conf`
- **本地项目**：`admin-panel/`（Vue 3 + Vite + Naive UI 单页应用）
- **验证 URLs**：
  - `https://admin.downpictures.com/`
- **保留项**：`.well-known`、`.htaccess`、`404.html`
- **Nginx 特殊项**：
  - `/api` 反向代理至本地 `127.0.0.1:3001`；
  - `/_protected-backups/` 为 `internal` 别名指向 `/www/backup/pcgetpic-db/`，供管理员受控下载数据库备份；
  - `/` 为 `try_files $uri $uri/ /index.html`（SPA History 路由支持）。

### 7. 授权与业务后端 API 服务（server）
- **站点目录名**：`api.downpictures.com`
- **server_name**：`api.downpictures.com`
- **Nginx 基线配置**：`deploy/nginx/api.downpictures.com.conf`（全站反代至 `127.0.0.1:3001`）
- **PM2 守护进程**：`pcgetpic-api`
- **本地项目**：`server/`（Node.js + Express + TypeScript + `better-sqlite3`）
- **验证 URLs**：
  - `http://127.0.0.1:3001/health`（本地回环探活）
  - `https://api.downpictures.com/health`（公网 HTTPS 探活，返回 `{"status":"ok",...}`）
- **禁区与保留项（严禁覆盖）**：
  - `data/`（含生产主库 `license.db`、历史统计归档库 `license.db.analytics-archive.db`、工单图片 `feedback-images/` 以及运行态 `-wal`/`-shm`）；
  - `node_modules/`（含 Linux 原生编译的 `better-sqlite3`、`bcrypt`）；
  - `.env`（生产环境密钥与支付宝/Stripe/SMTP 配置，默认保留线上版本，仅在显式传 `--sync-env` 时备份后更新）。

## 三、部署形态与保留项机制

- **前端静态站**：整目录原子替换（Atomic Swap），非增量文件覆盖。
  1. 服务器端将旧站点整站打包到 `/www/backup/<site>.pre-deploy-<时间戳>.tar`。
  2. 新构建压缩包在服务器上解压到 `<site>.new` 临时目录。
  3. 脚本自动将旧目录中定义的保留项（如 SSL 证书验证 `.well-known`、历史 `downloads`）复制迁移到 `<site>.new`。
  4. 权限统一修正为 `www:www`（目录 755，文件 644）。
  5. 快速原子重命名：`mv <site> <site>.old`，`mv <site>.new <site>`。
  6. 平滑重载 Nginx，发起冒烟验证。
- **后端 API 服务（`server`）**：白名单源码就地更新 + 编译守门 + PM2 重启（不动 `data/` 与 `node_modules/`）。
  1. 使用 `sqlite3 .backup` 在线生成 `/www/backup/api.downpictures.com.pre-deploy-<时间戳>.license.db` 一致性快照并校验 `quick_check = ok`；同时将现有源码与 `.env` 归档至 `/www/backup/api.downpictures.com.code-pre-deploy-<时间戳>.tar`。
  2. 本地按白名单打包（硬编码死锁排除 `data/`、`node_modules/`、`*.db*`），上传至临时目录并二次验证无禁区文件。
  3. 替换 `src/`、`scripts/`、`dist/` 及 `package*.json`、`tsconfig.json`、`backup.sh`。
  4. 按需 `npm install`，并执行 `npm run build`；若构建失败自动还原旧版代码且不重启 PM2。
  5. 执行 `pm2 restart pcgetpic-api && pm2 save`，轮询 `/health` 直至 `{"status":"ok"}`。

## 四、回滚流程

### 1. 前端静态站点回滚

每次部署前服务器均在 `/www/backup/` 自动生成快照备份：

```bash
# 假设需要回滚的站点目录为 <site>，例如 tools.yueding168.com 或 admin.downpictures.com
# 1. 移走异常的生产目录
mv /www/wwwroot/<site> /www/wwwroot/<site>.broken

# 2. 从备份快照恢复
mkdir -p /www/wwwroot/<site>
tar xf /www/backup/<site>.pre-deploy-<时间戳>.tar -C /www/wwwroot

# 3. 修正权限并重载 Nginx
chown -R www:www /www/wwwroot/<site>
nginx -t && nginx -s reload
```

### 2. 后端 API 服务（`server`）代码回滚

每次发布 `server` 前，服务器均在 `/www/backup/` 生成源码归档与主库一致性快照：

```bash
# 1. 从部署前的源码快照还原代码与配置（绝不覆盖 data/ 数据库目录）
cd /www/wwwroot
tar xf /www/backup/api.downpictures.com.code-pre-deploy-<时间戳>.tar --exclude='data' --exclude='node_modules'

# 2. 重新编译并重启 PM2
cd /www/wwwroot/api.downpictures.com
npm run build
pm2 restart pcgetpic-api
curl -sk https://api.downpictures.com/health
```

