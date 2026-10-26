# 图个吉利官网 (tuget-website)

`tuget-website` 是 `https://tuget.yueding168.com` 的独立 Nuxt 4 SSG 工程，统一承载：

- **TuGet（图个吉利）客户端 (TuGet Desktop)** 官方介绍、特性展示与架构解析；
- `/client/` 客户端功能场景详解与三通道技术规格；
- `/download/` 微软商店（Microsoft Store）官方安装指南；
- `/buy/` 官方授权套餐、支付宝直连支付与即时发卡全流程；
- `/terms/` 与 `/privacy/` 用户购买协议、合规条款与数据边界声明；
- **电商平台与场景专题落地页群**：`/platforms/1688/`、`/platforms/taobao/`、`/platforms/jd/`、`/platforms/vip/`、`/platforms/pdd/`、`/scenarios/media-sniffer/`、`/solutions/ecommerce-designer/`，承接长尾搜索流量；
- 百度搜索资源平台收录推送与结构化数据基建。

## 本地开发与生产打包

### 1. 本地开发

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

默认开发地址为 `http://127.0.0.1:3020`，`/api/v1` 会代理到 `NUXT_API_TARGET`。

### 2. 生产打包与上线部署

```powershell
# 执行全量生产打包（自动完成：Nuxt SSG 静态生成 + 百度收录 URL 清单生成 + 自动化 ZIP 压缩归档）
npm run build

# （可选）在本地快速预览生产静态站点
npm run preview
```

**上线发布产物说明：**
- **服务器部署压缩包**：`.output/public.zip`（构建流程已全自动生成 ZIP 压缩包，直接上传至云服务器解压即用）
- **静态资源根目录**：`.output/public/`（包含编译优化后的 HTML、CSS、JS、静态资源与 `urls.txt`，直接托管在 Nginx 静态站点根路径）

环境切换约定如下：

| 运行方式 | 浏览器请求地址 | 实际授权服务 |
|---|---|---|
| `npm run dev` | 同源 `/api/v1` | Nuxt 代理到 `NUXT_API_TARGET`，默认 `http://127.0.0.1:3001` |
| 生产静态站 | 同源 `/api/v1` | Nginx 代理到线上 `server`，浏览器不暴露内网端口 |

如生产环境使用独立 API 域名，也可在构建流水线设置
`NUXT_PUBLIC_API_BASE=https://api.yueding168.com/api/v1`；同域反代是默认推荐方式。

## 安装入口配置

安装地址不写死在页面中，也不把安装包提交到官网仓库。请在执行生产构建前配置：

- `NUXT_PUBLIC_MICROSOFT_STORE_URL`：TuGet Desktop 的 Microsoft Store 地址。默认使用预置的 TuGet 客户端专属商店地址（`https://apps.microsoft.com/detail/9N5Q5LHZ5R8H`）。如需自定义或调整，可在构建前通过环境变量覆盖。
由于官网是静态生成站点，正式填写或更换地址后需要重新执行 `npm run build` 并发布静态产物。

页脚、用户协议和隐私政策中的运营主体及备案号可通过
`NUXT_PUBLIC_OPERATOR_NAME`、`NUXT_PUBLIC_ICP_NUMBER` 配置；默认值与现有备案信息一致。

## 百度 SEO 与收录工具

本项目针对百度等搜索引擎进行了深度优化：
1. **单一 `zh-CN` 架构**：无多语言稀释，100% 聚焦国内中文搜索意图；
2. **实质性内容深度**：全站拒绝薄营销页面，提供真实的 Chrome 独立引擎原理、三路采集解析与高频业务场景 FAQ；
3. **结构化数据**：各页面均集成 Schema.org `WebSite`、`SoftwareApplication`、`FAQPage`、`Product` 与 `BreadcrumbList`；
4. **URL 生成与百度主动推送**：
   - 生成 URL 列表：`npm run generate:urls`（输出到 `public/urls.txt`）
   - 预览待推送列表：`node ./scripts/baidu-push.mjs --dry-run`
   - 正式推送到百度：`$env:BAIDU_PUSH_TOKEN = "你的准入密钥"; npm run push:baidu`
   - 新站首发（配额防御）：`$env:BAIDU_PUSH_TOKEN = "你的准入密钥"; npm run push:baidu -- --top`
     （百度新站普通收录 API 通常仅 10 条/日，`--top` 模式仅推送首页、客户端与
     1688/淘宝/京东/视频嗅探共 6 个核心路由，避免一次性提交 13 条触发 over quota；
     其余页面留待次日或站点权重提升后全量推送）

## 谷歌 / 必应收录基建

1. **Google Search Console（GSC）**：
   - 在 `.env` 中配置 `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION`（GSC 后台「设置 → 所有权验证 → HTML 标记」中 `content` 的值），构建后全站输出 `<meta name="google-site-verification">` 标签；
   - 在 GSC 后台验证域名后，提交 `https://tuget.yueding168.com/sitemap.xml`（已由 `@nuxtjs/sitemap` 自动包含全部 13 个页面）；
2. **Bing 站长工具与 IndexNow**：
   - 在 `.env` 中配置 `NUXT_PUBLIC_BING_SITE_VERIFICATION`（`msvalidate.01` 的 `content` 值），构建后输出验证标签；
   - IndexNow 密钥已预置（`public/b3a82f4c9d1e4a7f8c2d5e6a9b0c3d4e.txt`），随静态产物发布后密钥校验自动生效；
   - 发布上线后执行即时推送（Bing / Yandex 分钟级感知）：
     ```powershell
     npm run push:indexnow
     ```
   - 一键推送百度 + IndexNow：
     ```powershell
     npm run push:all
     ```
3. **反向链接与生态导流**：当图官网（`downpictures.com`）页脚与 TuGet 专页正文、产品中心（`tools.yueding168.com`）首页卡片与页脚产品栏，均已提供指向本站的链接。

## 接口约定

购买页不会硬编码套餐或价格，而是调用统一授权服务：

- `GET /api/v1/payment/packages?product=tuget`
- `POST /api/v1/payment/validate-coupon`，请求体固定带 `product: "tuget"`
- `POST /api/v1/payment/create-order`，请求体固定带 `product: "tuget"`
- `GET /api/v1/payment/order-status?order_no=...`

生产环境建议由同一域名反向代理 `/api/` 到授权服务，使前端产物不包含服务器地址：

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

完整的静态站与 API 同域部署模板见 `deploy/nginx.conf.example`。复制到服务器前，
需要按实际环境确认站点根目录、证书路径和授权服务监听地址，并先执行 `nginx -t`。

## 构建与发布

```powershell
npm run typecheck
npm run build
```

构建完成后，静态产物位于 `.output/public/`，同时自动打包为 `.output/public.zip`。发布前确认：

1. 检查服务端初始化的 `tuget` 建议套餐，并在管理后台确认正式定价；
2. 配置 TuGet Desktop 的 Microsoft Store 地址；
3. 将站点 `/api/` 反代到 `server`；
4. 在支付宝开放平台补充 `tuget.yueding168.com` 站点信息；
5. 完成 DNS、HTTPS、备案信息和生产支付冒烟验证；
6. 登录百度搜索资源平台执行抓取诊断与普通收录推送。

