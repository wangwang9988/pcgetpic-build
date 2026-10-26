"""
网站与后端服务一键发布脚本（宝塔面板 / 阿里云 ECS 多站点支持版）

支持目标：
  - website : 当图官网 (downpictures.com / downpictures.yueding168.com) [静态站]
  - tools   : 产品中心 (tools.yueding168.com) [静态站]
  - store   : 购买与收银台 (store.downpictures.com) [静态站]
  - tuget   : 图个吉利官网 (tuget.yueding168.com) [静态站 + SEO 守门]
  - oneget  : 一得官网 (oneget.yueding168.com) [静态站 + SEO 守门]
  - admin   : 管理后台前端 (admin.downpictures.com) [静态站]
  - ad-site : 前端广告嵌入站 (addp.yueding168.com) [静态站]
  - server  : 授权与业务后端 API (api.downpictures.com) [Node.js + PM2 + SQLite 增量安全部署]

用法：
    # 默认发布官网 (向后兼容)
    python .agents/skills/website-deploy/scripts/deploy_website.py
    # 发布指定前端站点（可加 --build 自动构建）
    python .agents/skills/website-deploy/scripts/deploy_website.py --site tools --build
    python .agents/skills/website-deploy/scripts/deploy_website.py --site store --build
    python .agents/skills/website-deploy/scripts/deploy_website.py --site tuget --build
    python .agents/skills/website-deploy/scripts/deploy_website.py --site oneget --build
    python .agents/skills/website-deploy/scripts/deploy_website.py --site admin --build
    python .agents/skills/website-deploy/scripts/deploy_website.py --site ad-site --build
    # 发布后端 API 服务（自动本地/远端双构建校验 + SQLite 在线热备 + PM2 重启探活）
    python .agents/skills/website-deploy/scripts/deploy_website.py --site server --build
    # Nginx 站点配置（vhost）：默认完全不参与部署，仅在显式要求时推送
    python .agents/skills/website-deploy/scripts/deploy_website.py --site store --nginx-only
    python .agents/skills/website-deploy/scripts/deploy_website.py --site all --build --sync-nginx

凭据：
    优先从 deploy/.server-config.json 读取，也可用环境变量 WEBSITE_DEPLOY_HOST/PORT/USER/PASSWORD 覆盖。

策略：
  【前端静态站（website / tools / store / tuget / oneget / admin）】
    备份 + 整目录原子切换（Atomic Swap），线上无感知。
  【后端 API 服务（server -> api.downpictures.com）】
    严禁整目录替换！采用「白名单打包（硬编码死锁排除 data/ 与 node_modules/）+
    SQLite 在线 .backup 热备 + 源码就地同步 + 远端编译守门 + PM2 重启与 /health 探活」。
    【Nginx 站点配置（vhost）】
    默认不参与部署（仅 nginx -s reload）。加 --sync-nginx 才把 deploy/nginx 下的配置推上线：
    备份线上原配置 -> CRLF 归一化上传 -> nginx -t 守门（不通过立即回滚）-> reload -> MD5 双向核验。
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import zipfile
from pathlib import Path

# 规避 Windows 控制台默认 GBK 编码在打印 PM2 表格（含 ↺ 等符号）或 UTF-8 日志时触发 UnicodeEncodeError
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    import paramiko
except ModuleNotFoundError:  # 延迟到真正需要连接时再报错，保证 --help / --site 解析可用
    paramiko = None

def get_repo_root() -> Path:
    curr = Path(__file__).resolve().parent
    for p in [curr] + list(curr.parents):
        if (p / 'website').is_dir() and ((p / 'deploy').is_dir() or (p / '.git').exists()):
            return p
    return Path(__file__).resolve().parents[4]

REPO_ROOT = get_repo_root()
DEFAULT_CONFIG = REPO_ROOT / 'deploy' / '.server-config.json'
WWWROOT = '/www/wwwroot'
STAMP = time.strftime('%Y%m%d-%H%M%S')

# ============================================================================
# Nginx 站点配置（vhost）同步
# ----------------------------------------------------------------------------
# 静态产物原子替换只换/www/wwwroot/<site>/ 下的文件，**不包含** Nginx 站点配置。
# 宝塔把每个站点的 vhost 配置放在 /www/server/panel/vhost/nginx/html_<站点目录名>.conf，
# 由 nginx.conf 的 http {} include。本地权威副本统一放在 deploy/nginx/，
# 通过 --sync-nginx 才会推送；未加该参数时脚本依旧只做产物部署 + nginx -s reload。
# ============================================================================
NGINX_CONF_DIR = REPO_ROOT / 'deploy' / 'nginx'
NGINX_VHOST_DIR = '/www/server/panel/vhost/nginx'

#站点 -> deploy/nginx 下的 vhost 配置文件名。
# 只有 website 的站点目录名(downpictures.yueding168.com)与主域名(downpictures.com)不同，
# 其余均可按 <站点目录名>.conf 兜底推断（见 resolve_nginx_conf）。
NGINX_CONF_MAP = {
    'website': 'downpictures.com.conf',
    'store': 'store.downpictures.com.conf',
    'admin': 'admin.downpictures.com.conf',
    'tuget': 'tuget.yueding168.com.conf',
    'oneget': 'oneget.yueding168.com.conf',
    'server': 'api.downpictures.com.conf',
}

# 站点 Profile 定义
SITE_PROFILES = {
    'website': {
        'alias': ['website', '官网', 'downpictures', 'downpictures.com', 'downpictures.yueding168.com'],
        'site_dir': 'downpictures.yueding168.com',
        'project_dir': REPO_ROOT / 'website',
        'public_dir': REPO_ROOT / 'website' / '.output' / 'public',
        'default_zip': REPO_ROOT / 'website' / '.output' / 'public-deploy.zip',
        'build_cmd': 'npm run build',
        'verify_urls': [
            'https://downpictures.com/',
            'https://www.downpictures.com/',
            'https://downpictures.yueding168.com/',
            'https://downpictures.com/platforms/',
            'https://downpictures.com/tuget/',
            'https://downpictures.com/en-US/',
            'https://downpictures.com/sitemap.xml'
        ],
        'preserve': [
            '.well-known',
            'downloads',
            'baidu_verify_codeva-qbvH0uZ2LF.html',
            'c2134ed6e9e0e1100564f547f783bf41.txt',
            'jd_root.txt',
            'dangtu-icon.png',
            '_ipx',
            '_payload.json'
        ]
    },
    'tools': {
        'alias': ['tools', '工具中心', 'tools.yueding168.com'],
        'site_dir': 'tools.yueding168.com',
        'project_dir': REPO_ROOT / 'tools',
        'public_dir': REPO_ROOT / 'tools' / '.output' / 'public',
        'default_zip': REPO_ROOT / 'tools' / '.output' / 'public-deploy.zip',
        'build_cmd': 'npm run build',
        'verify_urls': [
            'https://tools.yueding168.com/',
            'https://tools.yueding168.com/zh-TW/',
            'https://tools.yueding168.com/en-US/',
            'https://tools.yueding168.com/products/dangtu-client/',
            'https://tools.yueding168.com/sitemap.xml'
        ],
        'preserve': [
            '.well-known',
            'downloads'
        ]
    },
    'store': {
        'alias': ['store', '收银台', '商店', 'store.downpictures.com'],
        'site_dir': 'store.downpictures.com',
        'project_dir': REPO_ROOT / 'store',
        'public_dir': REPO_ROOT / 'store' / 'dist',
        'default_zip': REPO_ROOT / 'store' / 'dist-deploy.zip',
        'build_cmd': 'npm run build',
        'verify_urls': [
            'https://store.downpictures.com/'
        ],
        'preserve': [
            '.well-known'
        ]
    },
    'admin': {
        'alias': ['admin', 'admin-panel', '管理后台', '后台', 'admin.downpictures.com'],
        'site_dir': 'admin.downpictures.com',
        'project_dir': REPO_ROOT / 'admin-panel',
        'public_dir': REPO_ROOT / 'admin-panel' / 'dist',
        'default_zip': REPO_ROOT / 'admin-panel' / 'dist-deploy.zip',
        'build_cmd': 'npm run build',
        'verify_urls': [
            'https://admin.downpictures.com/'
        ],
        'preserve': [
            '.well-known',
            '.htaccess',
            '404.html'
        ]
    },
    'server': {
        'alias': ['server', 'api', '后端', '服务端', '服务器', '授权服务', 'pcgetpic-api', 'api.downpictures.com'],
        'mode': 'server',
        'site_dir': 'api.downpictures.com',
        'project_dir': REPO_ROOT / 'server',
        'public_dir': REPO_ROOT / 'server' / 'dist',
        'default_zip': REPO_ROOT / 'server' / 'dist' / 'server-deploy.zip',
        'build_cmd': 'npm run build',
        'pm2_name': 'pcgetpic-api',
        'verify_urls': [
            'https://api.downpictures.com/health'
        ],
        'preserve': [
            'data',
            'node_modules',
            '.env',
            '.well-known',
            '.user.ini'
        ]
    },
    'tuget': {
        'alias': ['tuget', '图个吉利', '图个吉利官网', 'tuget官网', 'tuget.yueding168.com'],
        'site_dir': 'tuget.yueding168.com',
        'project_dir': REPO_ROOT / 'tuget-website',
        'public_dir': REPO_ROOT / 'tuget-website' / '.output' / 'public',
        'default_zip': REPO_ROOT / 'tuget-website' / '.output' / 'public-deploy.zip',
        'build_cmd': 'npm run build',
        # 全量 13 个 SEO 关键路由：任何一个 404 都意味着专题页矩阵未真正上线，
        # 搜索引擎无法发现，必须让部署在此处直接失败而不是静默通过。
        'verify_urls': [
            'https://tuget.yueding168.com/',
            'https://tuget.yueding168.com/client/',
            'https://tuget.yueding168.com/download/',
            'https://tuget.yueding168.com/buy/',
            'https://tuget.yueding168.com/platforms/1688/',
            'https://tuget.yueding168.com/platforms/taobao/',
            'https://tuget.yueding168.com/platforms/jd/',
            'https://tuget.yueding168.com/platforms/vip/',
            'https://tuget.yueding168.com/platforms/pdd/',
            'https://tuget.yueding168.com/scenarios/media-sniffer/',
            'https://tuget.yueding168.com/solutions/ecommerce-designer/',
            'https://tuget.yueding168.com/terms/',
            'https://tuget.yueding168.com/privacy/',
            'https://tuget.yueding168.com/robots.txt',
            'https://tuget.yueding168.com/sitemap.xml',
            'https://tuget.yueding168.com/version.json'
        ],
        'preserve': [
            '.well-known',
            'downloads'
        ],
        # 站点专属 SEO 守门：静态状态码 200 不足以证明落地页真的上线了。
        # 这里额外校验 sitemap 收录数量、合规声明卡片在位、以及对抗性敏感词已清除。
        'seo_guard': (
            'c=$(curl -skL https://tuget.yueding168.com/sitemap.xml | grep -o "<loc>" | wc -l); '
            'echo "sitemap_urls=$c"; '
            '[ "$c" -ge 13 ] || { echo "!! sitemap URL 数量不足 13，专题页未进入站点地图"; exit 1; }; '
            'p=$(curl -skL https://tuget.yueding168.com/platforms/1688/); '
            'echo "$p" | grep -q "素材使用合规与版权提示" '
            '|| { echo "!! 1688 落地页缺少合规声明卡片（P0 未上线）"; exit 1; }; '
            'echo "compliance-card-ok"; '
            'if echo "$p" | grep -qE "反爬|防盗链|绕过|突破"; then '
            'echo "!! 落地页仍存在对抗性敏感词（反爬/防盗链/绕过/突破）"; exit 1; fi; '
            'echo "sensitive-words-clean"; '
            'echo "seo-guard-ok"'
        )
    },
    'oneget': {
        # 别名一律小写：resolve_site_profile 会先对 --site 参数做lower() 再比对
        'alias': ['oneget', '一得', '一得官网', 'oneget官网', 'oneget.yueding168.com'],
        'site_dir': 'oneget.yueding168.com',
        'project_dir': REPO_ROOT / 'oneget-website',
        'public_dir': REPO_ROOT / 'oneget-website' / '.output' / 'public',
        'default_zip': REPO_ROOT / 'oneget-website' / '.output' / 'public-deploy.zip',
        'build_cmd': 'npm run build',
        # 12 席平台落地页 + 6 篇教程就是本站在百度的全部收录资产。
        # 历史教训：本地代码全绿、构建产物也正确，但线上跑的还是旧版本，
        # /platforms/1688/ 与 /guides/ 直接 404、sitemap-baidu.xml 只有 2 条，
        # 等于整个落地页矩阵零收录。这里把这29 个关键 URL 全部纳入验证清单。
        'verify_urls': [
            'https://oneget.yueding168.com/',
            'https://oneget.yueding168.com/platforms/',
            'https://oneget.yueding168.com/platforms/1688/',
            'https://oneget.yueding168.com/platforms/pdd/',
            'https://oneget.yueding168.com/platforms/taobao/',
            'https://oneget.yueding168.com/platforms/jd/',
            'https://oneget.yueding168.com/platforms/amazon/',
            'https://oneget.yueding168.com/platforms/temu/',
            'https://oneget.yueding168.com/platforms/redbook/',
            'https://oneget.yueding168.com/platforms/douyin/',
            'https://oneget.yueding168.com/platforms/aliexpress/',
            'https://oneget.yueding168.com/platforms/shein/',
            'https://oneget.yueding168.com/platforms/shopee/',
            'https://oneget.yueding168.com/platforms/goofish/',
            'https://oneget.yueding168.com/guides/',
            'https://oneget.yueding168.com/guides/detail-image-stitching/',
            'https://oneget.yueding168.com/guides/ecommerce-video-download/',
            'https://oneget.yueding168.com/guides/1688-batch-image-download/',
            'https://oneget.yueding168.com/guides/pdd-material-extract/',
            'https://oneget.yueding168.com/guides/taobao-tmall-image-download/',
            'https://oneget.yueding168.com/guides/offline-extension-install/',
            'https://oneget.yueding168.com/privacy/',
            'https://oneget.yueding168.com/zh-TW/',
            'https://oneget.yueding168.com/zh-TW/platforms/',
            'https://oneget.yueding168.com/en-US/',
            'https://oneget.yueding168.com/en-US/platforms/',
            'https://oneget.yueding168.com/robots.txt',
            'https://oneget.yueding168.com/sitemap.xml',
            'https://oneget.yueding168.com/sitemap-baidu.xml'
        ],
        'preserve': [
            '.well-known',
            'downloads'
        ],
        # 站点专属 SEO 守门（oneget）。定位与 tuget 一致但判据不同：
        # oneget 的核心资产是「百度专属 Sitemap 收敛 + 落地页结构化数据 + i18n 镜像清零」，
        # 任何一项没真正上线都必须让部署失败，而不是静默通过。
        'seo_guard': (
            # 1) 百度专属 Sitemap 必须收敛到 21 条核心 URL（旧版只有 2 条 = 落地页矩阵零收录）
            'c=$(curl -skL https://oneget.yueding168.com/sitemap-baidu.xml | grep -o "<loc>" | wc -l); '
            'echo "baidu_sitemap_urls=$c"; '
            '[ "$c" -ge 21 ] || { echo "!! 百度 Sitemap仅 $c 条，落地页矩阵未上线"; exit 1; }; '
            # 2) 每条 URL 必须携带 lastmod（百度蜘蛛增量拉取依据）
            'm=$(curl -skL https://oneget.yueding168.com/sitemap-baidu.xml | grep -o "<lastmod>" | wc -l); '
            'echo "baidu_sitemap_lastmod=$m"; '
            '[ "$m" -ge 21 ] || { echo "!! 百度 Sitemap 缺少 lastmod，增量抓取会退化"; exit 1; }; '
            # 3) 国际 Sitemap 保持 6 条多语言路由，不得被简中化污染
            'g=$(curl -skL https://oneget.yueding168.com/sitemap.xml | grep -o "<loc>" | wc -l); '
            'echo "intl_sitemap_urls=$g"; '
            '[ "$g" -ge 6 ] || { echo "!! 国际 Sitemap 少于 6 条"; exit 1; }; '
            # 4) robots.txt 必须只向百度暴露 sitemap-baidu.xml
            'curl -skL https://oneget.yueding168.com/robots.txt | grep -q "sitemap-baidu.xml" '
            '|| { echo "!! robots.txt 未声明 sitemap-baidu.xml"; exit 1; }; '
            # 5) 首页 title 必须是新版核心词（旧版为"专为电商优化的素材采集浏览器插件"）
            'curl -skL https://oneget.yueding168.com/ | grep -q "电商图片下载插件" '
            '|| { echo "!! 首页仍是旧版本文案，本次SEO 改版未真正上线"; exit 1; }; '
            # 6) 落地页必须携带 FAQPage + BreadcrumbList 结构化数据
            'p=$(curl -skL https://oneget.yueding168.com/platforms/1688/); '
            'echo "$p" | grep -q "FAQPage" || { echo "!! 1688 落地页缺少 FAQPage 结构化数据"; exit 1; }; '
            'echo "$p" | grep -q "BreadcrumbList" || { echo "!! 1688 落地页缺少 BreadcrumbList"; exit 1; }; '
            # 7) 教程页必须携带 Article + BreadcrumbList
            'q=$(curl -skL https://oneget.yueding168.com/guides/detail-image-stitching/); '
            'echo "$q" | grep -q "Article" || { echo "!! 教程页缺少 Article 结构化数据"; exit 1; }; '
            'echo "$q" | grep -q "BreadcrumbList" || { echo "!! 教程页缺少 BreadcrumbList"; exit 1; }; '
            # 8) i18n 镜像页必须保持 404（defineI18nRoute(false) 的最终防线，死链清零）
            'for u in en-US/platforms/1688/ zh-TW/platforms/1688/ en-US/guides/ zh-TW/guides/ en-US/guides/detail-image-stitching/; do '
            'code=$(curl -sk -o /dev/null -w "%{http_code}" https://oneget.yueding168.com/$u); '
            'echo "mirror /$u -> $code"; '
            '[ "$code" = "404" ] || { echo "!! /$u 返回 $code，应为 404（本地化镜像页泄漏）"; exit 1; }; '
            'done; '
            'echo "mirror-isolation-ok"; '
            'echo "seo-guard-ok"'
        )
    },
    'ad-site': {
        'alias': ['ad-site', 'adsite', 'addp', '广告站', '前端广告站', '推广站', 'addp.yueding168.com'],
        'site_dir': 'addp.yueding168.com',
        'project_dir': REPO_ROOT / 'ad-site',
        'public_dir': REPO_ROOT / 'ad-site' / 'dist',
        'default_zip': REPO_ROOT / 'ad-site' / 'dist-deploy.zip',
        'build_cmd': 'npm run build',
        'verify_urls': [
            'https://addp.yueding168.com/',
            'https://addp.yueding168.com/remote-configs/getpic/rank-iframe-config.json'
        ],
        'preserve': [
            '.well-known',
            'remote-configs',
            'root.txt',
            '404.html',
            '.htaccess',
            'vite.svg'
        ]
    }
}


def resolve_site_profile(site_arg: str | None) -> dict:
    if not site_arg:
        key = 'website'
    else:
        site_clean = site_arg.strip().lower()
        key = None
        for k, p in SITE_PROFILES.items():
            if site_clean == k or site_clean in p['alias'] or site_clean == p['site_dir']:
                key = k
                break
        if not key:
            # 自定义未知站点目录回退：按REPO_ROOT 下的同名子项目推断构建目录。
            # 注意：构建产物目录与构建命令无法凭空推断，必须由调用方通过
            # --public-dir 显式指定，否则这里直接给出可执行的报错而非后续的 NoneType 崩溃。
            guessed_project = REPO_ROOT / site_arg.strip()
            fallback = {
                'key': 'custom',
                'site_dir': site_arg.strip(),
                'project_dir': guessed_project if guessed_project.is_dir() else None,
                'public_dir': None,
                'default_zip': None,
                'build_cmd': None,
                'verify_urls': [f'https://{site_arg.strip()}/'],
                'preserve': ['.well-known']
            }
            print(f'!! 未在 SITE_PROFILES 中找到站点 [{site_arg.strip()}]，'
                  f'已回退到自定义模式（站点目录 {site_arg.strip()}）。\n'
                  f'   请补充 --public-dir 与 --zip 参数指向本地构建产物。')
            return fallback
    profile = dict(SITE_PROFILES[key])
    profile['key'] = key
    return profile


def load_config(config_path: Path, profile: dict):
    """读取服务器凭据。环境变量优先于配置文件。"""
    cfg = {}
    if config_path.is_file():
        cfg = json.loads(config_path.read_text(encoding='utf-8'))
    elif not os.environ.get('WEBSITE_DEPLOY_HOST'):
        raise SystemExit(
            f'!! 未找到配置文件 {config_path}\n'
            f'   请复制 {Path(__file__).with_name("server-config.example.json")} 为该文件并填入服务器凭据，\n'
            f'   或设置环境变量 WEBSITE_DEPLOY_HOST/PORT/USER/PASSWORD。'
        )
    host = os.environ.get('WEBSITE_DEPLOY_HOST') or cfg.get('host')
    port = int(os.environ.get('WEBSITE_DEPLOY_PORT') or cfg.get('port', 22))
    user = os.environ.get('WEBSITE_DEPLOY_USER') or cfg.get('username', 'root')
    password = os.environ.get('WEBSITE_DEPLOY_PASSWORD') or cfg.get('password')
    if not (host and password):
        hint = []
        if not host:
            hint.append('缺少 host')
        if not password:
            where = '环境变量 WEBSITE_DEPLOY_PASSWORD' if config_path.is_file() else '配置/环境变量'
            state = '为空字符串' if config_path.is_file() and not password else '缺失'
            hint.append(f'缺少 root 密码（{config_path} 中 password 字段{state}）')
            hint.append(f'请填入该文件，或改用{where}传入')
        raise SystemExit('!! 服务器凭据不完整：\n   - ' + '\n   - '.join(hint))

    site_dir = profile['site_dir']
    verify_urls = profile['verify_urls']
    preserve = profile['preserve']

    return dict(
        host=host,
        port=port,
        user=user,
        password=password,
        site=site_dir,
        verify_urls=verify_urls,
        preserve=preserve
    )


def execute_build(profile: dict):
    """自动执行项目构建"""
    project_dir = profile.get('project_dir')
    build_cmd = profile.get('build_cmd')
    if not project_dir or not build_cmd:
        raise SystemExit(f"!! 站点 {profile['key']} 未配置项目目录或构建命令")
    if not project_dir.is_dir():
        raise SystemExit(f"!! 项目目录不存在: {project_dir}")
    
    print(f"== 开始为站点 [{profile['key']}] 执行自动构建: {build_cmd} ==")
    # Windows 环境使用 PowerShell / cmd 调用
    res = subprocess.run(build_cmd, cwd=str(project_dir), shell=True)
    if res.returncode != 0:
        raise SystemExit(f"!! 站点 [{profile['key']}] 构建失败 (exit {res.returncode})，终止部署")
    print(f"== 站点 [{profile['key']}] 构建完成 ==")


def build_zip(public_dir: Path, zip_path: Path) -> str:
    """把构建产物打成正斜杠路径的 zip（规避 Windows 反斜杠问题）。"""
    if not public_dir.is_dir():
        raise SystemExit(f'!! 未找到构建产物目录 {public_dir}，请先执行构建或添加 --build 参数')
    
    index_file = public_dir / 'index.html'
    if not index_file.is_file():
        raise SystemExit(f'!! 在构建产物中未找到 index.html: {index_file}')
    
    index_md5 = hashlib.md5(index_file.read_bytes()).hexdigest()
    zip_path.parent.mkdir(parents=True, exist_ok=True)

    n = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for root, _dirs, files in os.walk(public_dir):
            for f in files:
                full = Path(root) / f
                arc = full.relative_to(public_dir).as_posix()
                z.write(full, arc)
                n += 1
    size_mb = round(zip_path.stat().st_size / 1048576, 2)
    print(f'== 已打包 {n} 个文件 -> {zip_path} ({size_mb} MB)，index.html MD5: {index_md5} ==')
    return index_md5


SERVER_ALLOWED_DIRS = ('src', 'scripts', 'dist')
SERVER_ALLOWED_FILES = (
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'backup.sh',
    '.env.example',
    '.gitignore',
    '.gitattributes',
    'diag-create-order.ts',
    '后端服务部署与运维指南.md',
    'data禁止打包!!_部署前必读_!!.txt',
)
SERVER_FORBIDDEN_DIRS = {'data', 'node_modules', '.git', '.agents', '.catpaw', '.codebuddy', '.opencode', '.qoder', '.trae'}
SERVER_FORBIDDEN_SUFFIXES = ('.db', '.db-wal', '.db-shm', '.db.gz', '.sqlite', '.sqlite3', '.upload.tmp', '.zip', '.tar', '.gz')


def assert_server_arc_safe(arc: str, sync_env: bool):
    """硬编码安全锁：一旦发现任何数据库、data/、node_modules/ 或未授权 .env 进入打包队列，立即熔断。"""
    parts = Path(arc).parts
    if not parts:
        raise SystemExit(f'!! 非法归档路径: {arc}')
    top = parts[0]
    if top in SERVER_FORBIDDEN_DIRS or 'data' in parts or 'node_modules' in parts:
        raise SystemExit(f'!! [安全熔断] 严禁将 {arc} 打包上传到生产服务器（会覆盖线上数据库或原生依赖）！')
    lower_arc = arc.lower()
    if lower_arc.endswith(SERVER_FORBIDDEN_SUFFIXES):
        raise SystemExit(f'!! [安全熔断] 严禁打包数据库或压缩包文件: {arc}')
    fname = parts[-1]
    if (fname == '.env' or (fname.startswith('.env.') and fname != '.env.example')) and not sync_env:
        raise SystemExit(f'!! [安全熔断] 默认禁止打包 {arc} 覆盖线上配置（如需同步 .env 请显式加 --sync-env）')


def build_server_zip(project_dir: Path, zip_path: Path, sync_env: bool = False) -> str:
    """按严格白名单 + 禁区熔断打包 server 源码，自动将 .sh 转为 LF 换行符。"""
    if not project_dir.is_dir():
        raise SystemExit(f'!! 未找到 server 项目目录: {project_dir}')
    src_app = project_dir / 'src' / 'app.ts'
    if not src_app.is_file():
        raise SystemExit(f'!! 未找到核心入口文件: {src_app}')

    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()

    allowed_files = list(SERVER_ALLOWED_FILES)
    if sync_env:
        allowed_files.append('.env')

    n = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        # 1. 打包顶层白名单文件
        for fname in allowed_files:
            fpath = project_dir / fname
            if not fpath.is_file():
                continue
            assert_server_arc_safe(fname, sync_env)
            if fname.endswith('.sh') or fname == '.env':
                # 强制转为 LF。.sh 是防 /bin/bash^M；.env 是防行尾 \r 被拼进变量值
                # （运维常用 `source .env` 加载，CRLF 下会静默污染每一个取值）。
                # .sh 另需 +x；.env 必须保持 600 权限，不能给执行位。
                raw = fpath.read_bytes().replace(b'\r\n', b'\n')
                if fname.endswith('.sh'):
                    info = zipfile.ZipInfo(fname)
                    info.external_attr = (0o755 & 0xFFFF) << 16
                    z.writestr(info, raw, compress_type=zipfile.ZIP_DEFLATED)
                else:
                    z.writestr(fname, raw, compress_type=zipfile.ZIP_DEFLATED)
            else:
                z.write(fpath, fname)
            n += 1

        # 2. 打包白名单目录 (src / scripts / dist)
        for dname in SERVER_ALLOWED_DIRS:
            dpath = project_dir / dname
            if not dpath.is_dir():
                continue
            for root, dirs, files in os.walk(dpath):
                # 原地过滤禁止目录
                dirs[:] = [d for d in dirs if d not in SERVER_FORBIDDEN_DIRS]
                for f in files:
                    full = Path(root) / f
                    if full.resolve() == zip_path.resolve():
                        continue
                    arc = full.relative_to(project_dir).as_posix()
                    assert_server_arc_safe(arc, sync_env)
                    z.write(full, arc)
                    n += 1

    app_ts_md5 = hashlib.md5(src_app.read_bytes()).hexdigest()
    size_mb = round(zip_path.stat().st_size / 1048576, 2)
    print(f'== [server 安全白名单打包] 已打包 {n} 个文件 -> {zip_path} ({size_mb} MB)，src/app.ts MD5: {app_ts_md5} ==')
    print('   [安全确认] 已严格排除: data/ (SQLite 生产库), node_modules/, *.db*'
          + (' (已包含 .env)' if sync_env else ' (已保留线上 .env)'))
    return app_ts_md5


def require_paramiko():
    """paramiko 仅在真正建立 SSH 连接前才需要，缺失时给出可执行的修复指引。"""
    if paramiko is None:
        raise SystemExit(
            '!! 缺少 Python 依赖 paramiko，无法连接服务器。\n'
            '   请执行: python -m pip install paramiko'
        )


def make_run(ssh):
    def run(cmd, check=True, timeout=600):
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        code = stdout.channel.recv_exit_status()
        print(f'$ {cmd}')
        if out.strip():
            print(out, end='')
        if err.strip():
            print('[stderr]', err)
        if check and code != 0:
            raise SystemExit(f'!! 命令失败 (exit {code}): {cmd}')
        return out
    return run


STATIC_SOURCE_EXCLUDE_DIRS = {
    'node_modules', '.nuxt', '.output', 'dist', '.git', '.nitro', '.cache',
    '.agents', '.catpaw', '.codebuddy', '.opencode', '.qoder', '.trae', '.vscode', '.idea',
    'downloads'
}
STATIC_SOURCE_EXCLUDE_SUFFIXES = ('.zip', '.tar', '.gz', '.log', '.tmp', '.bak')
DEPLOY_STATE_FILE = '.deploy-state.json'


def compute_static_source_fingerprint(project_dir: Path | None) -> tuple[str, int]:
    """计算前端项目源码树的确定性指纹（归一化 CRLF -> LF，忽略构建产物与 node_modules）。"""
    if not project_dir or not project_dir.is_dir():
        return '', 0
    items: list[str] = []
    for root, dirs, files in os.walk(project_dir):
        dirs[:] = sorted(d for d in dirs if d not in STATIC_SOURCE_EXCLUDE_DIRS)
        for f in sorted(files):
            if f.lower().endswith(STATIC_SOURCE_EXCLUDE_SUFFIXES) or f == DEPLOY_STATE_FILE:
                continue
            full = Path(root) / f
            rel = full.relative_to(project_dir).as_posix()
            try:
                raw = full.read_bytes().replace(b'\r\n', b'\n')
            except OSError:
                continue
            f_md5 = hashlib.md5(raw).hexdigest()
            items.append(f'{rel}:{f_md5}')
    summary = hashlib.sha256('\n'.join(items).encode('utf-8')).hexdigest()
    return summary, len(items)


def collect_local_server_hashes(project_dir: Path, sync_env: bool = False) -> dict[str, str]:
    """收集本地 server 白名单源码文件的相对路径 -> MD5（统一按 LF 计算，排除 dist 编译产物以便构建前比对）。"""
    allowed_files = list(SERVER_ALLOWED_FILES)
    if sync_env:
        allowed_files.append('.env')
    result: dict[str, str] = {}
    for fname in allowed_files:
        fpath = project_dir / fname
        if fpath.is_file():
            raw = fpath.read_bytes().replace(b'\r\n', b'\n')
            result[fname] = hashlib.md5(raw).hexdigest()
    for dname in ('src', 'scripts'):
        dpath = project_dir / dname
        if not dpath.is_dir():
            continue
        for root, dirs, files in os.walk(dpath):
            dirs[:] = [d for d in dirs if d not in SERVER_FORBIDDEN_DIRS]
            for f in files:
                full = Path(root) / f
                arc = full.relative_to(project_dir).as_posix()
                raw = full.read_bytes().replace(b'\r\n', b'\n')
                result[arc] = hashlib.md5(raw).hexdigest()
    return result


def check_server_remote_diff(cfg: dict, profile: dict, sync_env: bool = False) -> dict:
    """对比本地 server 源码与服务器 /www/wwwroot/api.downpictures.com 实际运行的代码。"""
    project_dir = profile['project_dir']
    local_map = collect_local_server_hashes(project_dir, sync_env=sync_env)
    site_root = f"{WWWROOT}/{cfg['site']}"
    allowed_files = list(SERVER_ALLOWED_FILES) + (['.env'] if sync_env else [])

    remote_py = (
        "import hashlib, json, os, urllib.request\n"
        f"root = {json.dumps(site_root)}\n"
        f"allowed_files = {json.dumps(allowed_files)}\n"
        "res = {}\n"
        "for fn in allowed_files:\n"
        "    p = os.path.join(root, fn)\n"
        "    if os.path.isfile(p):\n"
        "        data = open(p, 'rb').read().replace(b'\\r\\n', b'\\n')\n"
        "        res[fn] = hashlib.md5(data).hexdigest()\n"
        "for dn in ('src', 'scripts'):\n"
        "    dp = os.path.join(root, dn)\n"
        "    if os.path.isdir(dp):\n"
        "        for r, ds, fs in os.walk(dp):\n"
        "            for f in fs:\n"
        "                fp = os.path.join(r, f)\n"
        "                rel = os.path.relpath(fp, root).replace('\\\\', '/')\n"
        "                data = open(fp, 'rb').read().replace(b'\\r\\n', b'\\n')\n"
        "                res[rel] = hashlib.md5(data).hexdigest()\n"
        "health_ok = False\n"
        "try:\n"
        "    body = urllib.request.urlopen('http://127.0.0.1:3001/health', timeout=3).read().decode('utf-8', 'ignore')\n"
        "    health_ok = '\"status\":\"ok\"' in body\n"
        "except Exception:\n"
        "    health_ok = False\n"
        "print(json.dumps({'files': res, 'health_ok': health_ok}))\n"
    )

    require_paramiko()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(cfg['host'], port=cfg['port'], username=cfg['user'], password=cfg['password'], timeout=20)
    try:
        stdin, stdout, stderr = ssh.exec_command('python3 -', timeout=30)
        stdin.write(remote_py)
        stdin.channel.shutdown_write()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        payload = json.loads(out.splitlines()[-1]) if out else {'files': {}, 'health_ok': False}
    finally:
        ssh.close()

    remote_map: dict[str, str] = payload.get('files', {})
    health_ok: bool = bool(payload.get('health_ok', False))

    added = sorted(k for k in local_map if k not in remote_map)
    removed = sorted(k for k in remote_map if k not in local_map)
    modified = sorted(k for k in local_map if k in remote_map and local_map[k] != remote_map[k])
    unchanged = len(local_map) - len(added) - len(modified)
    need_deploy = bool(added or removed or modified or not health_ok)

    print(
        f'== [远端代码预检: server] 本地源码 {len(local_map)} 个文件 vs 线上 {len(remote_map)} 个文件 | '
        f'一致: {unchanged}, 新增: {len(added)}, 修改: {len(modified)}, 删除: {len(removed)}, '
        f'线上 /health: {"正常" if health_ok else "异常"} =='
    )
    for label, items in (('新增', added), ('修改', modified), ('删除', removed)):
        if items:
            preview = ', '.join(items[:8]) + (f' ... 等共 {len(items)} 个' if len(items) > 8 else '')
            print(f'   - {label}: {preview}')

    return {
        'need_deploy': need_deploy,
        'added': added,
        'modified': modified,
        'removed': removed,
        'unchanged': unchanged,
        'health_ok': health_ok,
    }


# ============================================================================
# 生产环境变量漂移检测
# ----------------------------------------------------------------------------
# 背景：server 的 .env 默认不随发布同步（见 assert_server_arc_safe），而 Stripe 这类
# 能力缺失时是「静默降级」——代码上线了、/health 也正常，只是支付方式凭空消失，
# 日志无异常、前端不报错。历史上 Stripe 私钥漏同步过一次，导致生产收银台只剩支付宝。
#
# 基线分三层，逐层收紧，避免把「代码内置默认值」误报成漏配：
#   1. 兜底层：源码引用了、且本地 server/.env 已配置非空值，但线上没有
#            → [疑似漏同步]。这一层不依赖 .env.example，因此**忘记同步更新
#              .env.example 也能拦下来**（开发者最常见的失误就是只改了代码和
#              本地 .env，忘了把新键登记进模板）。
#   2. 基线层：.env.example 登记了、线上没有或值为空/占位符
#            → [漏配]，strict-env 时熔断。
#   3. 可选项：源码引用但本地 .env 也没配（代码有内置默认值）
#            → 仅汇总一行，不告警。
# 例外：.env.example 中用 `# @optional` 显式标记的键（如当前未使用的
# STRIPE_PUBLISH_KEY）视为「可不填」，不会被判为漏配。
# ============================================================================

# process.env.KEY 或 process.env['KEY']
ENV_KEY_RE = re.compile(r"process\.env(?:\.([A-Z0-9_]+)|\[['\"]\s*([A-Z0-9_]+)\s*['\"]\])")
# 别名回退链：process.env.A || process.env.B || ...（同组任一键存在即视为满足）
ENV_ALIAS_CHAIN_RE = re.compile(
    r"process\.env\.([A-Z0-9_]+)((?:\s*\|\|\s*process\.env\.[A-Z0-9_]+)+)"
)


def strip_ts_comments(text: str) -> str:
    """去掉 TS/JS 注释，保留字符串字面量。

    注释里常写着 process.env.XXX 的**用法示例**（如 config.ts 的字段注释），
    若不剔除会被当成真实依赖而产生误报。需正确跳过字符串内的 // （如 'https://'）。
    """
    out = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ''
        if ch == '/' and nxt == '*':
            end = text.find('*/', i + 2)
            i = n if end == -1 else end + 2
            continue
        if ch == '/' and nxt == '/':
            end = text.find('\n', i)
            i = n if end == -1 else end
            continue
        if ch in '\'"`':
            quote = ch
            j = i + 1
            while j < n:
                if text[j] == '\\':
                    j += 2
                    continue
                if text[j] == quote:
                    break
                j += 1
            out.append(text[i:min(j + 1, n)])
            i = j + 1
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def collect_env_keys(project_dir: Path) -> tuple[set[str], list[set[str]]]:
    """扫描 server 源码真实引用的环境变量。

    返回 (引用到的全部键, 别名组)。别名组来自 `process.env.A || process.env.B` 这种
    回退写法（config.ts 兼容多种历史命名），组内任一键存在即视为该需求已满足。
    """
    src_dir = project_dir / 'src'
    if not src_dir.is_dir():
        return set(), []

    keys: set[str] = set()
    alias_groups: list[set[str]] = []
    for fp in sorted(src_dir.rglob('*')):
        if fp.suffix not in ('.ts', '.js') or not fp.is_file():
            continue
        try:
            code = strip_ts_comments(fp.read_text(encoding='utf-8', errors='ignore'))
        except OSError:
            continue
        for m in ENV_KEY_RE.finditer(code):
            key = m.group(1) or m.group(2)
            if key:
                keys.add(key)
        for m in ENV_ALIAS_CHAIN_RE.finditer(code):
            group = {m.group(1)}
            group.update(re.findall(r"process\.env\.([A-Z0-9_]+)", m.group(2)))
            if len(group) > 1:
                alias_groups.append(group)
    return keys, alias_groups


def parse_env_entries(text: str) -> dict[str, str]:
    """解析 .env 文本为 {键: 原始值}（忽略空行与注释行）。"""
    entries: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        m = re.match(r'(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$', line)
        if m:
            entries[m.group(1)] = m.group(2).strip().strip('"\'')
    return entries


def parse_env_keys(text: str) -> set[str]:
    """解析 .env 文本中已定义的键名集合（忽略空行与注释行）。"""
    return set(parse_env_entries(text))


def collect_env_keys_from_file(path: Path) -> set[str]:
    """读取 .env / .env.example 类文件并解析出键名集合；文件不存在时返回空集。"""
    try:
        return parse_env_keys(path.read_text(encoding='utf-8', errors='ignore'))
    except OSError:
        return set()


def parse_optional_env_keys(text: str) -> set[str]:
    """解析 .env.example 中被 `# @optional` 标记的键。

    用于「登记在模板里但当前允许留空」的预留字段（例如走 Stripe 托管收银台时
    根本用不到的公钥）。若不区分，这类键会被误判为漏配并在 --strict-env 下熔断。
    """
    optional: set[str] = set()
    pending = False
    for line in text.replace('\r\n', '\n').split('\n'):
        s = line.strip()
        if s.startswith('#'):
            if '@optional' in s.lower():
                pending = True
            continue
        if not s:
            continue
        if pending:
            m = re.match(r'([A-Za-z_][A-Za-z0-9_]*)\s*=', s)
            if m:
                optional.add(m.group(1))
            pending = False
    return optional


# 键名命中这些片段即视为敏感，日志中绝不打印明文
SECRET_KEY_RE = re.compile(r'(KEY|SECRET|PASS|TOKEN|PWD|PRIVATE|CREDENTIAL)', re.IGNORECASE)


def mask_env_value(key: str, value: str) -> str:
    """把配置值转成**可安全打印**的形式：密钥只露头尾，非密钥可明文（过长则截断）。"""
    if value == '':
        return '(空)'
    if SECRET_KEY_RE.search(key):
        if len(value) <= 12:
            return f'(len={len(value)}, 已隐藏)'
        return f'{value[:6]}...{value[-4:]}(len={len(value)})'
    return value if len(value) <= 60 else value[:57] + '...'


def normalize_env_text(text: str) -> str:
    """归一化换行与首尾空白，用于判断「键值全同、仅格式/注释不同」。"""
    return text.replace('\r\n', '\n').replace('\r', '\n').strip()


def diff_env_entries(local_entries: dict, remote_entries: dict) -> dict:
    """按键比对本地与线上 .env，区分「值不同 / 仅本地有 / 仅线上有」。"""
    lk, rk = set(local_entries), set(remote_entries)
    return {
        'value_diff': [k for k in sorted(lk & rk) if local_entries[k] != remote_entries[k]],
        'only_local': sorted(lk - rk),
        'only_remote': sorted(rk - lk),
    }


def print_env_sync_advice(diff: dict, local_path: Path, site_root: str, backup_hint: str) -> None:
    """输出「覆盖 / 不覆盖」的理由，把判断权交回操作者——本脚本永不自动改线上 .env。"""
    print('   [决策指引] 本脚本不会自动覆盖线上 .env，同步与否由你决定：')
    if diff['only_local']:
        print('     · [仅本地有] 覆盖**安全**，不会丢失任何线上配置。'
              '通常是新增了配置项，建议加 --sync-env 同步。')
    if diff['value_diff']:
        print('     · [值不同] 必须**逐项人工确认**后决策：')
        print('         - 若本地就是要更新的生产值（例如轮换了密钥）→ 加 --sync-env 覆盖；')
        print('         - 若线上才是对的、本地被测试值或调试值污染 → **不要同步**，先修正本地。')
        print('       脚本无法替你判断谁对，因为 .env 不在 Git 中、也没有第二份真源可比对。')
    if diff['only_remote']:
        print('     · [仅线上有] 覆盖会【删除】线上这些键！'
              '除非你确认线上这些配置已不再需要，否则**不要**加 --sync-env。')
    if not (diff['only_local'] or diff['value_diff'] or diff['only_remote']):
        print('     · 键与值完全一致，仅注释/空行不同 → 无需任何处理。')
    print(f'     · 覆盖是**整体替换**语义（非合并），执行前脚本会自动备份到：{backup_hint}')
    print(f'     · 真源参考：{local_path}')


def report_env_status(
    project_dir: Path,
    site_root: str,
    cfg: dict,
    ssh=None,
    strict: bool = False,
) -> dict:
    """环境变量体检，做两件事：

      1. **生产漏配**：以 server/.env.example 为基线，找出线上缺失的键（静默降级故障源）。
      2. **本地↔线上差异**：逐键比对本地 server/.env 与生产 .env 的**值**，脱敏输出差异，
         并给出「该覆盖 / 不该覆盖」的理由，**由操作者决策**。

    全程只读，绝不修改线上任何文件。strict=True 时仅对「漏配 / 疑似漏同步」熔断——值差异
    属于人为决策，脚本无权替用户判断哪份才是对的。

    分层判定见文件头注释（兜底层 / 基线层 / 可选项）。
    刻意不按「有没有默认值」分级：`process.env.X || ''` 这类有兜底默认值的键反而最危险
    ——缺失时不抛错、不影响 /health，功能直接悄悄消失（STRIPE_SECRET_KEY 缺失导致收银台
    只剩支付宝即此例）。
    """
    source_keys, alias_groups = collect_env_keys(project_dir)
    example_path = project_dir / '.env.example'
    try:
        example_raw = example_path.read_text(encoding='utf-8', errors='ignore')
    except OSError:
        example_raw = ''
    baseline = parse_env_keys(example_raw)
    optional_keys = parse_optional_env_keys(example_raw)
    local_env_path = project_dir / '.env'
    try:
        local_raw = local_env_path.read_text(encoding='utf-8', errors='ignore')
    except OSError:
        local_raw = ''
    local_entries = parse_env_entries(local_raw)

    own_conn = False
    if ssh is None:
        require_paramiko()
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            cfg['host'], port=cfg['port'],
            username=cfg['user'], password=cfg['password'], timeout=20,
        )
        own_conn = True

    try:
        sftp = ssh.open_sftp()
        try:
            with sftp.open(f'{site_root}/.env', 'rb') as fh:
                remote_raw = fh.read().decode('utf-8', errors='ignore')
        finally:
            sftp.close()
    finally:
        if own_conn:
            ssh.close()

    remote_entries = parse_env_entries(remote_raw)
    remote_keys = set(remote_entries)

    # 别名组内任一键存在即整组满足，避免把 process.env.A || process.env.B 误报成两个缺失
    satisfied: set[str] = set()
    for group in alias_groups:
        if group & remote_keys:
            satisfied |= group

    def _unusable(k: str) -> bool:
        """键缺失、或值形同未填，都算「没配」。

        必须看值：键存在但为空串（误把 .env.example 直接复制成 .env 是最常见的踩坑方式）
        运行时与「压根没这个键」完全一样，拿不到私钥。
        """
        if k in satisfied or k in optional_keys:
            return False
        if k not in remote_entries:
            return True
        v = remote_entries[k].strip()
        # .env.example 的占位符形如 your-jwt-secret-here / your_secret，需连字符与下划线都覆盖
        return v == '' or re.match(r'your[-_]', v, re.IGNORECASE) is not None

    missing = sorted(k for k in baseline if _unusable(k))

    # 兜底层：源码引用了、且本地 .env 已配非空值，但线上没有。
    # 这层不依赖 .env.example —— 开发者「只改了代码和本地 .env、忘了登记模板」时靠它兜住。
    def _local_configured(k: str) -> bool:
        v = local_entries.get(k, '').strip()
        return v != '' and re.match(r'your[-_]', v, re.IGNORECASE) is None

    suspected = sorted(
        k for k in source_keys
        if k not in baseline and k not in remote_keys and k not in optional_keys and _local_configured(k)
    )
    unregistered = sorted(
        k for k in source_keys
        if k not in baseline and k not in remote_keys and k not in suspected
    )

    print(
        f'== [环境变量预检] .env.example 登记 {len(baseline)} 项（其中 @optional {len(optional_keys)} 项）| '
        f'生产 .env 提供 {len(remote_keys)} 项 | 源码引用 {len(source_keys)} 项 | '
        f'生产漏配 {len(missing)} 项 | 疑似漏同步 {len(suspected)} 项 =='
    )
    if suspected:
        for k in suspected:
            print(f'   [疑似漏同步] {k}：源码引用了、本地 .env 也已配置，但生产 .env 未定义'
                  f'（多半是改了代码却忘了同步生产配置，或忘了登记进 .env.example）')
        print('   [处置] 把这些键补进生产 .env 后重启 PM2，或确认线上确实不需要。')
    if missing:
        for k in missing:
            state = '未定义' if k not in remote_entries else '值为空/占位符'
            print(f'   [漏配] {k}：.env.example 要求提供，生产 .env {state}')
        print('   [影响] 缺失不会报错，而是静默降级：功能凭空消失，'
              '日志与 /health 均无异常，只能靠本检测或用户反馈发现。')
        print('   [处置] 补齐生产 .env 后重启 PM2：'
              f'\n        (备份) cp -a {site_root}/.env /www/backup/$(date +%Y%m%d-%H%M%S).env.bak'
              f'\n        (编辑) 在 {site_root}/.env 追加缺失项'
              f'\n        (生效) pm2 restart {SITE_PROFILES["server"]["pm2_name"]} --update-env')
    if not (missing or suspected):
        print('   .env.example 要求提供的配置在生产 .env 中均已就位，无漏配。')
    if unregistered:
        preview = ', '.join(unregistered[:10]) + (f' 等共 {len(unregistered)} 项' if len(unregistered) > 10 else '')
        print(f'   [可选项] 源码引用但 .env.example 与本地 .env 均未配置（代码已有内置默认值）: {preview}')

    if (missing or suspected) and strict:
        raise SystemExit(
            f'!! [环境变量熔断] 生产 .env 缺失 {len(missing) + len(suspected)} 项: '
            f'{", ".join(missing + suspected)}\n'
            '   配置未就位就发布会造成静默故障，请先补齐生产 .env，'
            '或显式加 --no-strict-env 跳过（确认这些键用其他方式注入时）。'
        )

    # ---------- 2. 本地 ↔ 线上 .env 一致性（只检测，绝不自动同步） ----------
    diff = diff_env_entries(local_entries, remote_entries)
    has_real_diff = bool(diff['value_diff'] or diff['only_local'] or diff['only_remote'])
    backup_hint = f'/www/backup/{site_root.rsplit("/", 1)[-1]}.env.pre-deploy-<时间戳>'
    print()
    print(f'== [.env 一致性比对] 本地 {local_env_path} ↔ 生产 {site_root}/.env ==')
    if not local_entries:
        print(f'   [跳过] 本地 {local_env_path} 不存在或为空，无法比对（.env 被 .gitignore，不会随 Git 分发）。')
    else:
        print(f'   本地 {len(local_entries)} 项 / 线上 {len(remote_entries)} 项')
        for k in diff['value_diff']:
            print(f'   [值不同] {k}')
            print(f'       本地 = {mask_env_value(k, local_entries[k])}')
            print(f'       线上 = {mask_env_value(k, remote_entries[k])}')
        for k in diff['only_local']:
            print(f'   [仅本地有] {k} = {mask_env_value(k, local_entries[k])}')
        for k in diff['only_remote']:
            print(f'   [仅线上有] {k} = {mask_env_value(k, remote_entries[k])}')
        if not has_real_diff:
            if normalize_env_text(local_raw) == normalize_env_text(remote_raw):
                print('   键与值完全一致，无差异。')
            else:
                print('   键与值完全一致，仅注释/空行/键顺序不同 —— 不影响运行，无需同步。')
        else:
            print_env_sync_advice(diff, local_env_path, site_root, backup_hint)

    return {
        'checked': len(baseline),
        'missing': missing,
        'suspected': suspected,
        'unregistered': unregistered,
        'optional': sorted(optional_keys),
        'env_diff': diff,
        'env_in_sync': not has_real_diff,
    }


def warn_env_overwrite_risk(
    project_dir: Path,
    site_root: str,
    cfg: dict,
    ssh=None,
    strict: bool = False,
) -> dict:
    """--sync-env 覆盖前的风险守门：线上独有的键会被**整体替换**直接删掉。

    只在显式 --sync-env 时触发。默认警告不阻断；strict-env 下熔断，须先人工处理。
    """
    try:
        local_entries = parse_env_entries(
            (project_dir / '.env').read_text(encoding='utf-8', errors='ignore'))
    except OSError:
        return {'only_remote': []}

    own_conn = ssh is None
    if own_conn:
        require_paramiko()
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(cfg['host'], port=cfg['port'],
                    username=cfg['user'], password=cfg['password'], timeout=20)
    try:
        sftp = ssh.open_sftp()
        try:
            with sftp.open(f'{site_root}/.env', 'rb') as fh:
                remote_entries = parse_env_entries(fh.read().decode('utf-8', errors='ignore'))
        finally:
            sftp.close()
    finally:
        if own_conn:
            ssh.close()

    diff = diff_env_entries(local_entries, remote_entries)
    if diff['only_remote']:
        print(f'== [覆盖风险] 本地 .env 缺少 {len(diff["only_remote"])} 个线上已有键，'
              f'--sync-env 是整体替换而非合并，**这些键将被删除**：')
        for k in diff['only_remote']:
            print(f'   - {k} = {mask_env_value(k, remote_entries[k])}')
        if strict:
            raise SystemExit(
                f'!! [环境变量熔断] --sync-env 会删除线上独有的 {len(diff["only_remote"])} 项: '
                f'{", ".join(diff["only_remote"])}\n'
                '   请先把这些键补进本地 server/.env，或加 --no-strict-env 明确承担该风险。'
            )
    return diff


def check_static_source_unchanged(cfg: dict, profile: dict, local_src_fp: str, local_src_count: int) -> bool:
    """在执行耗时的 npm run build 前，检查服务器上的 .deploy-state.json 是否与当前本地源码树指纹完全一致。"""
    if not local_src_fp:
        return False
    site_root = f"{WWWROOT}/{cfg['site']}"
    remote_py = (
        "import hashlib, json, os\n"
        f"root = {json.dumps(site_root)}\n"
        f"sp = os.path.join(root, {json.dumps(DEPLOY_STATE_FILE)})\n"
        "ip = os.path.join(root, 'index.html')\n"
        "state = json.loads(open(sp, 'rb').read().decode('utf-8', 'ignore')) if os.path.isfile(sp) else {}\n"
        "idx_md5 = hashlib.md5(open(ip, 'rb').read()).hexdigest() if os.path.isfile(ip) else ''\n"
        "print(json.dumps({'state': state, 'actual_index_md5': idx_md5}))\n"
    )
    require_paramiko()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(cfg['host'], port=cfg['port'], username=cfg['user'], password=cfg['password'], timeout=20)
    try:
        stdin, stdout, _ = ssh.exec_command('python3 -', timeout=20)
        stdin.write(remote_py)
        stdin.channel.shutdown_write()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        data = json.loads(out.splitlines()[-1]) if out else {}
    except Exception:
        return False
    finally:
        ssh.close()

    state = data.get('state') or {}
    actual_index_md5 = data.get('actual_index_md5') or ''
    if (
        state.get('source_fingerprint') == local_src_fp
        and actual_index_md5
        and state.get('index_md5') == actual_index_md5
    ):
        print(
            f'== [构建前源码预检: {profile["key"]}] 本地源码指纹 ({local_src_count} 个源码文件) 与线上最近一次发布 '
            f'({state.get("deployed_at", "未知时间")}) 完全一致，且线上 index.html 完好 ({actual_index_md5[:10]}...) =='
        )
        return True
    return False


def check_static_public_diff(
    cfg: dict,
    profile: dict,
    public_dir: Path,
    local_src_fp: str,
    local_src_count: int
) -> dict:
    """对比本地静态构建产物目录与服务器 /www/wwwroot/<site> 线上实际运行的所有静态文件。"""
    preserve_set = list(set(cfg.get('preserve', [])) | {'public.zip', '.user.ini', '.htaccess', DEPLOY_STATE_FILE})
    preserve_lookup = set(preserve_set)

    local_map: dict[str, str] = {}
    for root, dirs, files in os.walk(public_dir):
        rel_dir = Path(root).relative_to(public_dir).as_posix()
        if rel_dir == '.':
            dirs[:] = [d for d in dirs if d not in preserve_lookup]
        for f in files:
            if rel_dir == '.' and f in preserve_lookup:
                continue
            full = Path(root) / f
            arc = full.relative_to(public_dir).as_posix()
            local_map[arc] = hashlib.md5(full.read_bytes()).hexdigest()

    site_root = f"{WWWROOT}/{cfg['site']}"
    remote_py = (
        "import hashlib, json, os\n"
        f"root = {json.dumps(site_root)}\n"
        f"preserve = set({json.dumps(preserve_set)})\n"
        "res = {}\n"
        "if os.path.isdir(root):\n"
        "    for r, ds, fs in os.walk(root):\n"
        "        rel_dir = os.path.relpath(r, root).replace('\\\\', '/')\n"
        "        if rel_dir == '.':\n"
        "            ds[:] = [d for d in ds if d not in preserve]\n"
        "        for f in fs:\n"
        "            if rel_dir == '.' and f in preserve:\n"
        "                continue\n"
        "            fp = os.path.join(r, f)\n"
        "            rel = os.path.relpath(fp, root).replace('\\\\', '/')\n"
        "            try:\n"
        "                res[rel] = hashlib.md5(open(fp, 'rb').read()).hexdigest()\n"
        "            except Exception:\n"
        "                pass\n"
        "print(json.dumps(res))\n"
    )

    require_paramiko()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(cfg['host'], port=cfg['port'], username=cfg['user'], password=cfg['password'], timeout=20)
    try:
        stdin, stdout, _ = ssh.exec_command('python3 -', timeout=30)
        stdin.write(remote_py)
        stdin.channel.shutdown_write()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        remote_map: dict[str, str] = json.loads(out.splitlines()[-1]) if out else {}

        added = sorted(k for k in local_map if k not in remote_map)
        removed = sorted(k for k in remote_map if k not in local_map)
        modified = sorted(k for k in local_map if k in remote_map and local_map[k] != remote_map[k])
        unchanged = len(local_map) - len(added) - len(modified)
        need_deploy = bool(added or removed or modified)

        print(
            f'== [远端产物预检: {profile["key"]}] 本地产物 {len(local_map)} 个文件 vs 线上 {len(remote_map)} 个文件 | '
            f'一致: {unchanged}, 新增: {len(added)}, 修改: {len(modified)}, 删除: {len(removed)} =='
        )
        for label, items in (('新增', added), ('修改', modified), ('删除', removed)):
            if items:
                preview = ', '.join(items[:8]) + (f' ... 等共 {len(items)} 个' if len(items) > 8 else '')
                print(f'   - {label}: {preview}')

        # 如果线上实际文件已经与本地构建产物 100% 一致，顺手在远端写入/刷新 .deploy-state.json，方便下次构建前直接命中跳过
        if not need_deploy and local_src_fp and 'index.html' in local_map:
            state_obj = {
                'site': profile['key'],
                'source_fingerprint': local_src_fp,
                'source_file_count': local_src_count,
                'index_md5': local_map['index.html'],
                'deployed_at': STAMP,
            }
            s_cmd = f"cat > {site_root}/{DEPLOY_STATE_FILE} << 'EOF'\n{json.dumps(state_obj, indent=2)}\nEOF\nchown www:www {site_root}/{DEPLOY_STATE_FILE} 2>/dev/null || true"
            ssh.exec_command(s_cmd, timeout=10)
    finally:
        ssh.close()

    return {
        'need_deploy': need_deploy,
        'added': added,
        'modified': modified,
        'removed': removed,
        'unchanged': unchanged,
    }


def resolve_nginx_conf(profile: dict, override: Path | None = None) -> Path | None:
    """定位本地权威 vhost 配置：--nginx-conf 优先，其次按映射表，最后按 <站点目录名>.conf 兜底。"""
    if override:
        return Path(override)
    name = NGINX_CONF_MAP.get(profile.get('key'))
    if name:
        candidate = NGINX_CONF_DIR / name
        if candidate.is_file():
            return candidate
        print(f'!! 站点 [{profile.get("key")}] 期望的Nginx 配置不存在: {candidate}')
        return None
    candidate = NGINX_CONF_DIR / f"{profile['site_dir']}.conf"
    return candidate if candidate.is_file() else None


def nginx_remote_path(profile: dict) -> str:
    """宝塔为每个站点生成的 vhost 配置文件绝对路径。"""
    return f'{NGINX_VHOST_DIR}/html_{profile["site_dir"]}.conf'


def _nginx_md5(data: bytes) -> str:
    """统一按 LF 归一化后取 MD5，避免 Windows CRLF 造成的假差异。"""
    return hashlib.md5(data.replace(b'\r\n', b'\n')).hexdigest()


def check_nginx_remote_diff(cfg: dict, profile: dict, conf_path: Path) -> dict:
    """对比本地 deploy/nginx 下的 vhost 配置与服务器实际加载的站点配置（只读，不改线上）。"""
    remote_path = nginx_remote_path(profile)
    local_md5 = _nginx_md5(Path(conf_path).read_bytes())

    require_paramiko()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(cfg['host'], port=cfg['port'], username=cfg['user'], password=cfg['password'], timeout=20)
    try:
        sftp = ssh.open_sftp()
        try:
            with sftp.open(remote_path, 'rb') as fh:
                remote_raw = fh.read()
        except IOError:
            remote_raw = None
        finally:
            sftp.close()
    finally:
        ssh.close()

    remote_exists = remote_raw is not None
    remote_md5 = _nginx_md5(remote_raw) if remote_exists else ''
    changed = (not remote_exists) or (remote_md5 != local_md5)

    print(
        f'== [Nginx 配置预检: {profile["key"]}] 本地 {conf_path.name} ({local_md5[:10]}...) vs '
        f'线上 {remote_path} ({(remote_md5[:10] + "...") if remote_exists else "文件不存在"}) | '
        f'{"需要同步配置" if changed else "配置一致"} =='
    )
    return {
        'conf_path': Path(conf_path),
        'remote_path': remote_path,
        'local_md5': local_md5,
        'remote_md5': remote_md5,
        'remote_exists': remote_exists,
        'changed': changed,
    }


def sync_nginx_conf(
    cfg: dict,
    profile: dict,
    conf_path: Path,
    diff_info: dict | None = None,
    force: bool = False,
    ssh=None,
    run=None,
) -> dict:
    """
    把本地 vhost 配置推送到宝塔并热重载，失败自动回滚：
      1. 备份线上现有配置到 /www/backup/<站点>.nginx.pre-deploy-<时间戳>.conf
      2. 上传 CRLF 归一化为 LF 的副本到临时路径（nginx 对 CRLF 敏感）
      3. 覆盖正式路径后 nginx -t；语法不通过则立即还原备份并复测，绝不带病重载
      4. nginx -t 通过后 nginx -s reload，并回读线上文件 MD5 做双向核验
    """
    conf_path = Path(conf_path)
    if not conf_path.is_file():
        raise SystemExit(f'!! 本地 Nginx 配置不存在: {conf_path}')

    if diff_info is None:
        diff_info = check_nginx_remote_diff(cfg, profile, conf_path)
    if not diff_info['changed'] and not force:
        print(
            f'== [自动跳过 Nginx 同步] 站点 [{profile["key"]}] 线上 {diff_info["remote_path"]} '
            f'与本地 {conf_path.name} 完全一致，无需覆盖或重载 =='
        )
        return dict(diff_info, synced=False)

    remote_path = diff_info['remote_path']
    backup_file = f'/www/backup/{profile["site_dir"]}.nginx.pre-deploy-{STAMP}.conf'
    remote_tmp = f'/tmp/{profile["site_dir"]}.nginx.{STAMP}.conf'

    own_conn = False
    if ssh is None or run is None:
        require_paramiko()
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(cfg['host'], port=cfg['port'], username=cfg['user'], password=cfg['password'], timeout=20)
        run = make_run(ssh)
        own_conn = True

    try:
        # 1. 备份线上现有配置（不存在时如实记录，不伪造备份）
        run(
            f'mkdir -p /www/backup && if [ -f {remote_path} ]; then cp -a {remote_path} {backup_file} '
            f'&& ls -lh {backup_file}; else echo "no-existing-conf"; fi'
        )

        # 2. 上传 LF 归一化后的副本到临时路径
        payload = conf_path.read_bytes().replace(b'\r\n', b'\n')
        sftp = ssh.open_sftp()
        try:
            with sftp.open(remote_tmp, 'wb') as fh:
                fh.write(payload)
        finally:
            sftp.close()
        run(f'md5sum {remote_tmp}')

        # 3. 覆盖正式路径 -> nginx -t；语法错误立即回滚
        run(f'cp {remote_tmp} {remote_path} && chmod 644 {remote_path} && echo conf-installed')
        syntax = run(f'nginx -t 2>&1', check=False)
        if 'syntax is ok' not in syntax.lower() and 'test is successful' not in syntax.lower():
            print(syntax)
            print(f'!! nginx -t 未通过，自动回滚 {remote_path}')
            run(
                f'if [ -f {backup_file} ]; then cp -a {backup_file} {remote_path} && nginx -t && '
                f'nginx -s reload && echo conf-rolled-back; else rm -f {remote_path} && '
                f'nginx -t && echo broken-conf-removed; fi',
                check=False,
            )
            raise SystemExit(
                f'!! Nginx 配置语法错误，已回滚线上配置，站点 [{profile["key"]}] 未被改动。\n'
                f'   请检查 {conf_path} 后重试。'
            )

        # 4. 平滑重载 + 双向核验
        run('nginx -s reload && echo nginx-reloaded')
        run(f'rm -f {remote_tmp}')
        remote_after = run(f'md5sum {remote_path} | cut -d" " -f1').strip()
        if remote_after != diff_info['local_md5']:
            raise SystemExit(
                f'!! Nginx 配置 MD5 不一致\n   本地: {diff_info["local_md5"]}\n   线上: {remote_after}\n'
                f'   备份文件: {backup_file}'
            )
        print(
            f'== [Nginx 配置已同步] 站点 [{profile["key"]}] {conf_path.name} -> {remote_path}\n'
            f'   - 线上原配置备份: {backup_file}\n'
            f'   - MD5 双向核验通过，已 nginx -s reload =='
        )
        return dict(diff_info, synced=True, backup_file=backup_file)
    finally:
        if own_conn:
            ssh.close()


def deploy_server(cfg: dict, profile: dict, zip_path: Path, app_ts_md5: str, sync_env: bool = False, force_install: bool = False, strict_env: bool = False):
    """
    后端服务（api.downpictures.com）专用安全部署流：
    严禁整目录替换！保留线上 data/ 与 node_modules/，执行：
    1. SQLite 主库在线 .backup 一致性热备 + 源码 tar 备份
    2. 上传白名单 zip 到临时目录并二次校验无 data/ 污染
    3. 备份当前 src/dist/scripts 到 rollback 临时目录
    4. 就地覆盖 src/scripts/package*.json/tsconfig.json/backup.sh
    5. 按需 npm install + 强制 npm run build（若编译失败自动回滚源码且不重启 PM2）
    6. pm2 restart pcgetpic-api + 轮询验证 PM2 online 状态与 /health 接口
    """
    site = cfg['site']
    site_root = f'{WWWROOT}/{site}'
    pm2_name = profile.get('pm2_name', 'pcgetpic-api')
    tmp_dir = f'{WWWROOT}/.deploy-server-tmp-{STAMP}'
    extracted_dir = f'{tmp_dir}/extracted'
    rollback_dir = f'{tmp_dir}/rollback'
    db_backup_file = f'/www/backup/{site}.pre-deploy-{STAMP}.license.db'
    code_backup_tar = f'/www/backup/{site}.code-pre-deploy-{STAMP}.tar'

    require_paramiko()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(cfg['host'], port=cfg['port'], username=cfg['user'], password=cfg['password'], timeout=20)
    print(f'== 已连接服务器 {cfg["host"]}，目标后端目录: {site_root}，PM2 进程: {pm2_name}，开始时间: {STAMP} ==')
    run = make_run(ssh)

    try:
        # 0. 前置工具链与线上目录/数据库存在性核验
        run('which unzip tar sqlite3 node npm pm2 nginx curl && nginx -t')
        run(f'test -d {site_root} && test -f {site_root}/data/license.db && echo "live-db-present"')
        run(f'rm -rf {WWWROOT}/.deploy-server-tmp-* && mkdir -p {extracted_dir} {rollback_dir} /www/backup')

        # 1. 双保险备份：1a) SQLite 在线一致性热备 (.backup) + quick_check 校验；1b) 现有源码与配置 tar 快照
        run(
            f'sqlite3 -readonly {site_root}/data/license.db \'.timeout 10000\' ".backup \'{db_backup_file}\'" && '
            f'chk=$(sqlite3 -readonly {db_backup_file} "PRAGMA quick_check;") && '
            f'[ "$chk" = "ok" ] && ls -lh {db_backup_file}'
        )
        run(
            f'tar cf {code_backup_tar} --exclude="data" --exclude="node_modules" '
            f'--exclude="*.db*" --exclude="*.upload.tmp" -C {WWWROOT} {site} && '
            f'ls -lh {code_backup_tar}'
        )

        # 2. SFTP 上传白名单 zip 并解压到临时隔离目录
        sftp = ssh.open_sftp()
        print(f'== 上传 {zip_path} -> {tmp_dir}/server.zip ==')
        sftp.put(str(zip_path), f'{tmp_dir}/server.zip')
        sftp.close()
        run(f'unzip -q -o {tmp_dir}/server.zip -d {extracted_dir} && find {extracted_dir} -type f | wc -l')

        # 服务端二次安全断言：解压产物中绝对不能含有 data 目录、node_modules 或任何 .db 文件
        run(
            f'if [ -e {extracted_dir}/data ] || [ -e {extracted_dir}/node_modules ] || '
            f'[ -n "$(find {extracted_dir} -name \'*.db*\' -print -quit)" ]; then '
            f'echo "!! [服务端安全熔断] 解压目录中检测到数据库或禁区目录，立即中止"; exit 1; fi; '
            f'echo "server-package-verified-clean"'
        )

        # 3. 检测 package.json / package-lock.json 是否变化，并将现有代码暂存到 rollback_dir
        dep_changed_out = run(
            f'old_hash=$(md5sum {site_root}/package.json {site_root}/package-lock.json 2>/dev/null | md5sum | cut -d" " -f1); '
            f'new_hash=$(md5sum {extracted_dir}/package.json {extracted_dir}/package-lock.json 2>/dev/null | md5sum | cut -d" " -f1); '
            f'if [ "$old_hash" != "$new_hash" ]; then echo "CHANGED"; else echo "SAME"; fi'
        ).strip().splitlines()[-1]
        need_install = force_install or (dep_changed_out == 'CHANGED')
        print(f'== 依赖变更检测: {dep_changed_out} (need_install={need_install}) ==')

        run(
            f'for item in src dist scripts package.json package-lock.json tsconfig.json backup.sh .env; do '
            f'if [ -e {site_root}/$item ]; then cp -a {site_root}/$item {rollback_dir}/; fi; '
            f'done && echo "rollback-snapshot-ready"'
        )

        # 4. 就地同步代码（清理旧 src/scripts/dist 后拷入新版，确保已删除源码文件不残留；绝不动 data/ 与 node_modules/）
        env_sync_cmd = ''
        if sync_env:
            # 覆盖前必须先看清风险：--sync-env 是「整体替换」，本地缺少的线上键会被直接删掉。
            # 默认只警告让人判断；strict-env 下熔断。
            warn_env_overwrite_risk(
                profile['project_dir'], site_root, cfg, ssh=ssh, strict=strict_env
            )
            env_sync_cmd = (
                f'if [ -f {extracted_dir}/.env ]; then '
                f'cp -a {site_root}/.env /www/backup/{site}.env.pre-deploy-{STAMP} 2>/dev/null || true; '
                f'cp -a {extracted_dir}/.env {site_root}/.env; '
                f'sed -i "s/\\r$//" {site_root}/.env; chmod 600 {site_root}/.env; echo "synced .env (LF normalized, chmod 600)"; fi && '
            )
        run(
            f'{env_sync_cmd}'
            f'rm -rf {site_root}/src {site_root}/scripts {site_root}/dist && '
            f'cp -a {extracted_dir}/* {site_root}/ && '
            f'for dotf in .env.example .gitignore .gitattributes; do '
            f'if [ -f {extracted_dir}/$dotf ]; then cp -a {extracted_dir}/$dotf {site_root}/$dotf; fi; '
            f'done && '
            f'sed -i "s/\\r$//" {site_root}/backup.sh && chmod +x {site_root}/backup.sh && '
            f'echo "code-synced"'
        )

        # 5. 按需 npm install + 强制服务端 npm run build 编译守门（失败则自动还原旧代码，不重启 PM2）
        build_steps = f'cd {site_root}'
        if need_install:
            build_steps += ' && npm install'
        build_steps += ' && npm run build && test -f dist/app.js'

        stdin, stdout, stderr = ssh.exec_command(build_steps, timeout=600)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        code = stdout.channel.recv_exit_status()
        print(f'$ {build_steps}')
        if out.strip():
            print(out, end='')
        if err.strip():
            print('[stderr]', err)
        if code != 0:
            print('!! [编译守门未通过] 服务端构建失败，正在自动还原旧版代码（不重启 PM2，线上服务不受影响）...')
            run(
                f'rm -rf {site_root}/src {site_root}/dist {site_root}/scripts && '
                f'cp -a {rollback_dir}/* {site_root}/ && '
                f'if [ -f {rollback_dir}/.env ]; then cp -a {rollback_dir}/.env {site_root}/.env; fi && '
                f'echo "rollback-restored"',
                check=False
            )
            raise SystemExit(f'!! 服务端构建失败 (exit {code})，已自动还原源码并中止重启')

        # 核对远程 src/app.ts MD5
        remote_md5 = run(f'md5sum {site_root}/src/app.ts | cut -d" " -f1').strip()
        print(f'== src/app.ts MD5  本地:{app_ts_md5}  远程:{remote_md5} ==')
        if remote_md5 != app_ts_md5:
            raise SystemExit('!! 远程 src/app.ts MD5 不一致，中止重启')

        # 6. 重启 PM2 并验证进程状态与 /health 探活
        run(
            f'cd {site_root} && '
            f'(pm2 describe {pm2_name} >/dev/null 2>&1 && pm2 restart {pm2_name} || '
            f'pm2 start dist/app.js --name {pm2_name} --cwd {site_root}) && '
            f'pm2 save'
        )

        # 轮询等待服务启动监听 3001 并通过 /health 检查
        run(
            f'for i in 1 2 3 4 5 6 7 8 9 10; do '
            f'sleep 1.5; '
            f'resp=$(curl -skf http://127.0.0.1:3001/health 2>/dev/null || true); '
            f'if echo "$resp" | grep -q \'"status":"ok"\'; then '
            f'echo "local-health-ok (attempt $i): $resp"; break; '
            f'fi; '
            f'if [ "$i" -eq 10 ]; then '
            f'echo "!! PM2 重启后 127.0.0.1:3001/health 未就绪"; '
            f'pm2 logs {pm2_name} --lines 30 --nostream; exit 1; '
            f'fi; '
            f'done'
        )

        # 校验公网 HTTPS /health 与数据库文件完好
        for url in cfg['verify_urls']:
            run(f'curl -skfL -w "\\nverify {url} : %{{http_code}}\\n" {url}')

        run(f'ls -lh {site_root}/data/license.db && pm2 logs {pm2_name} --lines 15 --nostream')

        # 6.5 发布后确认：代码已就位，但生产 .env 是否跟得上本次新增的功能变量？
        # .env 默认不同步，若新增能力依赖新变量而漏配，只会在运行时静默降级。
        report_env_status(profile['project_dir'], site_root, cfg, ssh=ssh)

        # 7. 清理临时目录
        run(f'rm -rf {tmp_dir} && echo "server-deploy-cleaned"')
        print(
            f'== 后端服务 [{profile["key"]}] 部署完成 {STAMP} ==\n'
            f'   - 数据库热备快照: {db_backup_file}\n'
            f'   - 源码备份归档  : {code_backup_tar}'
        )
    finally:
        ssh.close()


def main():
    parser = argparse.ArgumentParser(
        description='多站点与后端服务统一一键发布到宝塔服务器 (支持 website / tools / store / tuget / oneget / admin / server / all)'
    )
    parser.add_argument(
        '--site',
        default='website',
        help='目标标识: website (默认), tools, store, tuget, oneget, admin (管理后台), server (后端 API), all (全部目标)'
    )
    parser.add_argument('--build', action='store_true', help='发布前自动在本地执行 npm run build（若预检发现源码未改动则自动跳过构建）')
    parser.add_argument('--check', action='store_true', help='仅对比本地与服务器线上实际运行的代码/产物差异，输出报告后退出，不执行构建或部署')
    parser.add_argument('--force', action='store_true', help='忽略远端一致性预检，即使代码未改动也强制重新构建并发布')
    parser.add_argument('--sync-env', action='store_true', help='仅对 --site server 生效：显式将本地 server/.env 同步到服务器（默认保留线上 .env）')
    parser.add_argument('--strict-env', dest='strict_env', action='store_true',
                        help='仅对 --site server 生效：源码已引用、但生产 .env 未定义的致命环境变量直接熔断中止发布（默认仅告警）')
    parser.add_argument('--no-strict-env', dest='strict_env', action='store_false',
                        help='显式关闭 --strict-env（确认线上用 PM2 环境变量注入等替代方式时使用）')
    parser.add_argument('--install', action='store_true', help='仅对 --site server 生效：强制在服务器执行 npm install（默认仅在 package*.json 变更时自动执行）')
    parser.add_argument('--sync-nginx', action='store_true', help='把 deploy/nginx 下该站点的 vhost 配置同步到宝塔并热重载（备份 + nginx -t守门 + 失败自动回滚）；产物无改动时也会单独同步配置')
    parser.add_argument('--nginx-only', action='store_true', help='只同步 Nginx vhost 配置，完全不构建、不上传产物、不重启 PM2')
    parser.add_argument('--nginx-conf', type=Path, help='覆盖 --sync-nginx / --nginx-only 使用的本地 vhost 配置路径（默认按站点自动匹配 deploy/nginx/*.conf）')
    parser.add_argument('--config', type=Path, default=DEFAULT_CONFIG, help='凭据配置文件路径')
    parser.add_argument('--public-dir', type=Path, help='覆盖指定本地构建产物目录')
    parser.add_argument('--zip', type=Path, help='覆盖指定本地打包输出路径')
    parser.set_defaults(strict_env=False)
    args = parser.parse_args()

    if args.site.strip().lower() in ('all', '全部', '所有'):
        for key in SITE_PROFILES:
            run_single_target(key, args)
        return 0
    return run_single_target(args.site, args)


def run_single_target(site_name: str, args) -> int:
    profile = resolve_site_profile(site_name)
    mode = profile.get('mode', 'static')
    print("=" * 65)
    print(f"[*] 准备处理目标: [{profile['key']}] (模式: {mode}) -> 宝塔目录: {profile['site_dir']}")
    print("=" * 65)

    cfg = load_config(args.config, profile)
    zip_path = args.zip or profile.get('default_zip')

    # Nginx vhost 配置预检：仅在显式要求配置同步或 --check 时才连服务器比对，
    # 保持默认部署路径零额外开销。配置与产物相互独立——产物一致不代表配置已上线。
    nginx_conf = resolve_nginx_conf(profile, args.nginx_conf)
    nginx_diff = None
    if nginx_conf and (args.check or args.sync_nginx or args.nginx_only):
        nginx_diff = check_nginx_remote_diff(cfg, profile, nginx_conf)
    elif nginx_conf:
        # 零成本提醒：本地存在该站点的 vhost 配置，但本次既没要求检查也没要求同步。
        # 不为此额外建立 SSH 连接，只明确告知「配置不会随发布上线」，避免静默漏推。
        print(
            f'>> [提示] 本地存在 Nginx 站点配置 {nginx_conf.relative_to(REPO_ROOT)}，'
            f'本次发布不会同步它（默认只发产物）。\n'
            f'   如需同时上线配置：追加 --sync-nginx；只想先看差异：追加 --check；只推配置：--nginx-only。'
        )
    elif (args.sync_nginx or args.nginx_only):
        print(
            f'!! 站点 [{profile["key"]}] 在 {NGINX_CONF_DIR} 下没有对应的 Nginx 配置，已跳过配置同步。\n'
            f'   如需托管该站点配置，请放入 {profile["site_dir"]}.conf 后重试（或用 --nginx-conf 指定路径）。'
        )

    def sync_nginx_if_requested(ssh=None, run=None):
        """产物无改动时依然允许把 vhost 配置单独推上线（配置变更与产物变更相互独立）。"""
        if not args.sync_nginx or nginx_conf is None:
            return None
        return sync_nginx_conf(cfg, profile, nginx_conf, diff_info=nginx_diff, force=args.force, ssh=ssh, run=run)

    # 仅同步 Nginx 配置，完全不触碰构建产物与PM2
    if args.nginx_only:
        if nginx_conf is None:
            raise SystemExit(f'!! --nginx-only 需要本地存在 {profile["site_dir"]}.conf 或 --nginx-conf 指定路径')
        if args.check:
            status = '需要同步配置' if (nginx_diff and nginx_diff['changed']) else '配置一致，无需同步'
            print(f'== [--check 检查结论] [{profile["key"]}] Nginx 配置: {status} ==')
            return 0
        sync_nginx_conf(cfg, profile, nginx_conf, diff_info=nginx_diff, force=args.force)
        print(f'== 仅 Nginx 配置同步完成（站点 [{profile["key"]}] 的静态产物与后端代码均未改动）==')
        return 0

    # 分支 A：后端 API 服务（Node.js + PM2 + SQLite 安全增量发布，绝不走整目录替换）
    if mode == 'server':
        if not zip_path:
            raise SystemExit("!! server 模式未配置 zip 输出路径")
        # 「代码是否要发」与「配置是否跟得上代码」是两个独立问题，后者与 --force 无关，
        # 因此放在差异预检之外无条件执行。--check 下作为只读体检报告输出。
        env_drift = report_env_status(
            profile['project_dir'], f"{WWWROOT}/{cfg['site']}", cfg, strict=args.strict_env
        )
        if not args.force or args.check:
            diff_info = check_server_remote_diff(cfg, profile, sync_env=args.sync_env)
            if args.check:
                status_str = '需要发布更新' if diff_info['need_deploy'] else '与线上完全一致，无需发布'
                if nginx_diff and nginx_diff['changed']:
                    status_str += f'；Nginx 配置待同步（{nginx_diff["conf_path"].name}）'
                if env_drift['missing'] or env_drift.get('suspected'):
                    n = len(env_drift['missing']) + len(env_drift.get('suspected', []))
                    names = env_drift['missing'] + env_drift.get('suspected', [])
                    status_str += f'；生产环境变量缺失 {n} 个（{", ".join(names)}）'
                d = env_drift.get('env_diff') or {}
                if not env_drift.get('env_in_sync', True):
                    bits = []
                    if d.get('value_diff'):
                        bits.append(f'值不同 {len(d["value_diff"])} 项')
                    if d.get('only_local'):
                        bits.append(f'仅本地有 {len(d["only_local"])} 项')
                    if d.get('only_remote'):
                        bits.append(f'仅线上有 {len(d["only_remote"])} 项')
                    status_str += '；本地 .env 与线上不一致（' + '，'.join(bits) + '，需人工决策是否 --sync-env）'
                print(f'== [--check 检查结论] [{profile["key"]}]: {status_str} ==')
                return 0
            if not diff_info['need_deploy']:
                print(
                    f'== [自动跳过发布] 线上 [{profile["key"]}] 实际运行的代码与本地完全一致 '
                    f'({diff_info["unchanged"]} 个源码文件 0 差异，且 /health 正常)，无需重复构建或重启 PM2！\n'
                    f'   (如需强制重发，请添加 --force 参数) =='
                )
                sync_nginx_if_requested()
                return 0
        if args.build:
            execute_build(profile)
        app_ts_md5 = build_server_zip(profile['project_dir'], zip_path, sync_env=args.sync_env)
        deploy_server(cfg, profile, zip_path, app_ts_md5, sync_env=args.sync_env,
                      force_install=args.install, strict_env=args.strict_env)
        sync_nginx_if_requested()
        return 0

    # 分支 B：前端静态站点（整目录备份 + 原子切换）
    public_dir = args.public_dir or profile.get('public_dir')
    if not public_dir or not zip_path:
        raise SystemExit(f"!! 站点 {profile['key']} 未指定 public-dir 或 zip 输出路径")

    local_src_fp, local_src_count = compute_static_source_fingerprint(profile.get('project_dir'))

    # B1. 构建前源码树指纹预检：若自上次发布以来源码未改且线上 index.html 完好，连 npm run build 都直接省掉！
    if not args.force and check_static_source_unchanged(cfg, profile, local_src_fp, local_src_count):
        if args.check:
            suffix = '；Nginx 配置待同步' if (nginx_diff and nginx_diff['changed']) else ''
            print(f'== [--check 检查结论] [{profile["key"]}]: 本地源码与线上一致，无需发布{suffix} ==')
        else:
            print(
                f'== [自动跳过发布] 站点 [{profile["key"]}] 开发期间未做任何修改，线上版本已是最新，'
                f'已跳过构建与发布！\n   (如需强制重发，请添加 --force 参数) =='
            )
        sync_nginx_if_requested()
        return 0

    if args.check and not (public_dir / 'index.html').is_file():
        print(
            f'== [--check 检查结论] [{profile["key"]}]: 本地尚无有效构建产物 ({public_dir}/index.html 不存在)，'
            f'且源码指纹尚未在服务器登记；如确认有改动请执行 --build 发布 =='
        )
        return 0

    if args.build and not args.check:
        execute_build(profile)
        # 重新计算构建完成后的源码树指纹（部分站点的 prebuild/generate-urls 脚本会刷新源码目录文件）
        local_src_fp, local_src_count = compute_static_source_fingerprint(profile.get('project_dir'))

    # B2. 构建后产物全量比对：对比本地 public_dir 与服务器线上实际静态文件
    if not args.force or args.check:
        pub_diff = check_static_public_diff(cfg, profile, public_dir, local_src_fp, local_src_count)
        if args.check:
            status_str = '需要发布更新' if pub_diff['need_deploy'] else '与线上完全一致，无需发布'
            if nginx_diff and nginx_diff['changed']:
                status_str += f'；Nginx 配置待同步（{nginx_diff["conf_path"].name}）'
            print(f'== [--check 检查结论] [{profile["key"]}]: {status_str} ==')
            return 0
        if not pub_diff['need_deploy']:
            print(
                f'== [自动跳过发布] 线上 [{profile["key"]}] 实际运行的静态文件与本地构建产物 100% 一致 '
                f'({pub_diff["unchanged"]} 个文件 0 差异)，无需上传或切换目录！\n'
                f'   (已同步登记源码指纹，下次运行连 --build 都将直接秒跳过；如需强制重发请加 --force) =='
            )
            sync_nginx_if_requested()
            return 0

    site = cfg['site']
    new_root = f'{WWWROOT}/{site}.new'
    old_root = f'{WWWROOT}/{site}.old-{STAMP}'
    tmp_dir = f'{WWWROOT}/.deploy-tmp-{STAMP}'

    index_md5 = build_zip(public_dir, zip_path)

    require_paramiko()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(cfg['host'], port=cfg['port'], username=cfg['user'], password=cfg['password'], timeout=20)
    print(f'== 已连接服务器 {cfg["host"]}，目标站点目录: {site}，开始时间: {STAMP} ==')
    run = make_run(ssh)

    # 0. 前置检查 + 清理上次失败运行的残留
    run('which unzip tar nginx curl && nginx -t')
    run(f'rm -rf {new_root} {WWWROOT}/.deploy-tmp-* && echo stale-cleaned')

    # 1. 整站备份（tar 不压缩，秒级完成）
    run(f'mkdir -p /www/backup && tar cf /www/backup/{site}.pre-deploy-{STAMP}.tar -C {WWWROOT} {site} '
        f'&& ls -lh /www/backup/{site}.pre-deploy-{STAMP}.tar')

    # 2. 上传新构建 zip
    sftp = ssh.open_sftp()
    try:
        sftp.mkdir(tmp_dir)
    except IOError:
        pass
    print(f'== 上传 {zip_path} -> {tmp_dir}/public.zip ==')
    sftp.put(str(zip_path), f'{tmp_dir}/public.zip')
    sftp.close()
    run(f'unzip -t {tmp_dir}/public.zip | tail -2')

    # 3. 解压到全新目录
    run(f'rm -rf {new_root} && mkdir -p {new_root} && unzip -q -o {tmp_dir}/public.zip -d {new_root} '
        f'&& find {new_root} -type f | wc -l')

    # 4. 迁移保留项 + 放入新版 public.zip + 写入 .deploy-state.json 源码指纹
    migrate = ' && '.join(
        f'if [ -e {WWWROOT}/{site}/{item} ]; then cp -a {WWWROOT}/{site}/{item} {new_root}/{item}; '
        f'echo "kept: {item}"; else echo "skip(absent): {item}"; fi'
        for item in cfg['preserve']
    )
    state_obj = {
        'site': profile['key'],
        'source_fingerprint': local_src_fp,
        'source_file_count': local_src_count,
        'index_md5': index_md5,
        'deployed_at': STAMP,
    }
    state_json_str = json.dumps(state_obj, indent=2)
    run(
        migrate
        + f' && cp {tmp_dir}/public.zip {new_root}/public.zip'
        + f" && cat > {new_root}/{DEPLOY_STATE_FILE} << 'EOF'\n{state_json_str}\nEOF"
    )

    # 5. 权限修正
    run(f'chown -R www:www {new_root} && find {new_root} -type d -exec chmod 755 {{}} \\; '
        f'&& find {new_root} -type f -exec chmod 644 {{}} \\; && echo perms-ok')

    # 6. 原子切换
    run(f'mv {WWWROOT}/{site} {old_root} && mv {new_root} {WWWROOT}/{site} && echo swapped')

    # 7. Nginx 语法检查并平滑重载
    run('nginx -t && nginx -s reload && echo reloaded')

    # 7b. 若要求同步 vhost 配置，则在验证 URL 之前推上线（配置会影响路由/缓存头，先同步再验证）
    sync_nginx_if_requested(ssh=ssh, run=run)

    # 8. 线上验证
    for url in cfg['verify_urls']:
        run(f'curl -skfL -o /dev/null -w "verify {url} : %{{http_code}}\\n" {url}')
    
    # 真实 404 测试
    run(f'curl -skL -o /dev/null -w "404page     : %{{http_code}}\\n" https://{site}/no-such-page-xyz/',
        check=False)

    remote_md5 = run(f'md5sum {WWWROOT}/{site}/index.html | cut -d" " -f1').strip()
    print(f'== index.html MD5  本地:{index_md5}  远程:{remote_md5} ==')
    if remote_md5 != index_md5:
        raise SystemExit('!! index.html MD5 不一致，保留 .old 目录供回滚，请人工检查')

    # 附加检查
    run(f'curl -skfL https://{site}/version.json || true')
    run(f'ls {WWWROOT}/{site}/.well-known/acme-challenge/ 2>/dev/null | head -3; '
        f'ls {WWWROOT}/{site}/downloads/ 2>/dev/null | head -5 || true')

    # 站点专属 SEO 守门检查（仅配置了 seo_guard 的站点执行）。
    # 失败时直接抛错并终止，保留 .old 目录与 tar 备份供人工回滚——这正是设计意图：
    # SEO 关键资产（专题页矩阵 / 合规声明 / 敏感词）没真正上线时，宁可部署"失败"也不要静默通过。
    seo_guard = profile.get('seo_guard')
    if seo_guard:
        run(seo_guard)

    # 9. 清理临时与旧目录
    run(f'chattr -i {old_root}/.user.ini 2>/dev/null; rm -rf {old_root} {tmp_dir} && echo cleaned')
    ssh.close()
    print(f'== 站点 [{profile["key"]}] 部署完成 {STAMP}，备份文件：/www/backup/{site}.pre-deploy-{STAMP}.tar ==')


if __name__ == '__main__':
    sys.exit(main())
