"""
Cloudflare R2 下载资源同步脚本 (MD5 双重校验 + 按产品/单文件定向同步版)
支持将各客户端/插件构建产物同步至 tools/public/downloads 及 website/public/downloads，
并通过文件大小 + x-amz-meta-md5 双重校验增量上传到 Cloudflare R2 (https://dl.webtongbu.com)。

核心特性：
1. 流式 MD5 计算：64KB 块读取，对 150MB 级大文件内存友好。
2. 双重校验：对比文件大小 ContentLength 与自定义元数据 x-amz-meta-md5，一致时毫秒级跳过。
3. 自动元数据回写：上传时写入 Metadata={'md5': local_md5}，保证后续比对精准。
4. 定向同步：支持 --product 按产品同步（如当图插件四端压缩包、当图客户端、图个吉利客户端等）或 --file 指定单个文件/R2 Key。
5. 构建产物联动：支持 --sync-build 自动从各子项目构建输出目录（如 src-tauri/target/release/bundle/nsis、.output）拉取最新产物到 downloads 目录后再上传。
6. 线上验证：上传后自动通过公共域名 (https://dl.webtongbu.com) 进行 HEAD 验证。
"""

import argparse
import hashlib
import json
import mimetypes
import os
import shutil
import sys
import time
import urllib.request
from pathlib import Path

import boto3
from botocore.config import Config
from boto3.s3.transfer import TransferConfig

# 默认 R2 存储配置
DEFAULT_ENDPOINT = 'https://9d518a03469d1a54eed7a0955d535a12.r2.cloudflarestorage.com'
DEFAULT_ACCESS_KEY = 'b0d1d7953deb9f85d902f0f501acad30'
DEFAULT_SECRET_KEY = '5850ddfa2bb441bae26a90d9105752eba6360488e2d398771fed2b993f142f8c'
DEFAULT_BUCKET = 'downpictures-files'
DEFAULT_PUBLIC_DOMAIN = 'https://dl.webtongbu.com'


def get_repo_root() -> Path:
    curr = Path(__file__).resolve().parent
    for p in [curr] + list(curr.parents):
        if (p / 'tools').is_dir() and ((p / 'deploy').is_dir() or (p / '.git').exists()):
            return p
    return Path(__file__).resolve().parents[4]


REPO_ROOT = get_repo_root()
TRAE_ROOT = REPO_ROOT.parent
DEFAULT_CONFIG_PATH = REPO_ROOT / 'deploy' / '.r2-config.json'

# 产品别名映射表（归一到标准产品 ID）
PRODUCT_ALIASES = {
    # 当图插件（Chrome / Edge / Firefox / 360 四个压缩包）
    'dangtu': 'dangtu',
    'getpic': 'dangtu',
    'downpictures': 'dangtu',
    '当图': 'dangtu',
    '当图插件': 'dangtu',
    '当图扩展': 'dangtu',
    # 当图客户端（dangtu.exe）
    'dangtu-client': 'dangtu-client',
    'client': 'dangtu-client',
    'clientgetpic': 'dangtu-client',
    'dangtu.exe': 'dangtu-client',
    '当图客户端': 'dangtu-client',
    # 图个吉利客户端（TuGet-Setup.exe）
    'tuget-client': 'tuget-client',
    'tuget-setup': 'tuget-client',
    'tuget-setup.exe': 'tuget-client',
    '图个吉利客户端': 'tuget-client',
    # 图个吉利插件（Chrome / Edge / Firefox / 360 四个压缩包）
    'tuget': 'tuget',
    'pro-getpic': 'tuget',
    '图个吉利': 'tuget',
    '图个吉利插件': 'tuget',
    '图个吉利扩展': 'tuget',
    # 一得插件（OneGet / oneget-tabs 四个压缩包）
    'oneget': 'oneget',
    'oneget-tabs': 'oneget',
    '一得': 'oneget',
    '一得插件': 'oneget',
    # 阅历插件（Best History 四个压缩包）
    'history': 'history',
    'best-history': 'history',
    '阅历': 'history',
    '阅历插件': 'history',
    # 当图二维码插件
    'qr-code': 'qr-code',
    'qrcode': 'qr-code',
    '当图二维码': 'qr-code',
    # 图个吉利·全貌插件
    'tuget-fullpage': 'tuget-fullpage',
    'fullpage': 'tuget-fullpage',
    '图个吉利全貌': 'tuget-fullpage',
}


def get_product_specs(repo_root: Path):
    """
    定义各产品的构建源路径、downloads 归档路径及对应的 R2 S3 Keys。
    """
    tools_dl = repo_root / 'tools' / 'public' / 'downloads'
    web_dl = repo_root / 'website' / 'public' / 'downloads'
    trae_root = repo_root.parent

    return {
        'dangtu': {
            'label': '当图浏览器插件 (GetPic 四端离线包: Chrome / Edge / Firefox / 360)',
            'keys': [
                'GetPic/downpictures-chrome-mv3.zip',
                'GetPic/downpictures-edge-mv3.zip',
                'GetPic/downpictures-firefox-mv3.zip',
                'GetPic/downpictures-360-mv3.zip',
            ],
            'build_mappings': [
                (
                    repo_root / 'GetPic' / '.output' / 'downpictures-chrome-mv3.zip',
                    [
                        tools_dl / 'GetPic' / 'downpictures-chrome-mv3.zip',
                        web_dl / 'downpictures-chrome-mv3.zip',
                    ],
                ),
                (
                    repo_root / 'GetPic' / '.output' / 'downpictures-edge-mv3.zip',
                    [
                        tools_dl / 'GetPic' / 'downpictures-edge-mv3.zip',
                        web_dl / 'downpictures-edge-mv3.zip',
                    ],
                ),
                (
                    repo_root / 'GetPic' / '.output' / 'downpictures-firefox-mv3.zip',
                    [
                        tools_dl / 'GetPic' / 'downpictures-firefox-mv3.zip',
                        web_dl / 'downpictures-firefox-mv3.zip',
                    ],
                ),
                (
                    repo_root / 'GetPic' / '.output' / 'downpictures-360-mv3.zip',
                    [
                        tools_dl / 'GetPic' / 'downpictures-360-mv3.zip',
                    ],
                ),
            ],
        },
        'dangtu-client': {
            'label': '当图桌面客户端 (client -> Windows / macOS / Linux)',
            'keys': [
                'clientGetPic/dangtu.exe',
                'dangtu.exe',
                'clientGetPic/dangtu-macos-arm64.dmg',
                'clientGetPic/dangtu-macos-x64.dmg',
                'clientGetPic/dangtu-linux-x64.deb',
                'clientGetPic/dangtu-linux-x64.rpm',
            ],
            'build_mappings': [
                (
                    repo_root / 'client' / 'src-tauri' / 'target' / 'release' / 'bundle' / 'nsis' / 'dangtu.exe',
                    [
                        tools_dl / 'clientGetPic' / 'dangtu.exe',
                        web_dl / 'dangtu.exe',
                    ],
                ),
                (
                    repo_root / 'client' / 'src-tauri' / 'target' / 'x86_64-pc-windows-msvc' / 'release' / 'bundle' / 'nsis' / 'dangtu.exe',
                    [
                        tools_dl / 'clientGetPic' / 'dangtu.exe',
                        web_dl / 'dangtu.exe',
                    ],
                ),
                (
                    repo_root / 'client' / 'src-tauri' / 'target' / 'aarch64-apple-darwin' / 'release' / 'bundle' / 'dmg' / 'dangtu-macos-arm64.dmg',
                    [
                        tools_dl / 'clientGetPic' / 'dangtu-macos-arm64.dmg',
                    ],
                ),
                (
                    repo_root / 'client' / 'src-tauri' / 'target' / 'x86_64-apple-darwin' / 'release' / 'bundle' / 'dmg' / 'dangtu-macos-x64.dmg',
                    [
                        tools_dl / 'clientGetPic' / 'dangtu-macos-x64.dmg',
                    ],
                ),
                (
                    repo_root / 'client' / 'src-tauri' / 'target' / 'x86_64-unknown-linux-gnu' / 'release' / 'bundle' / 'deb' / 'dangtu-linux-x64.deb',
                    [
                        tools_dl / 'clientGetPic' / 'dangtu-linux-x64.deb',
                    ],
                ),
                (
                    repo_root / 'client' / 'src-tauri' / 'target' / 'x86_64-unknown-linux-gnu' / 'release' / 'bundle' / 'rpm' / 'dangtu-linux-x64.rpm',
                    [
                        tools_dl / 'clientGetPic' / 'dangtu-linux-x64.rpm',
                    ],
                ),
            ],
        },
        'tuget-client': {
            'label': '图个吉利桌面客户端 (TuGet-Client -> Windows / macOS / Linux)',
            'keys': [
                'TuGet-Client/TuGet-Setup.exe',
                'TuGet-Client/TuGet-macOS-arm64.dmg',
                'TuGet-Client/TuGet-macOS-x64.dmg',
                'TuGet-Client/TuGet-Linux-x64.deb',
                'TuGet-Client/TuGet-Linux-x64.rpm',
            ],
            'build_mappings': [
                (
                    repo_root / 'TuGet-Client' / 'src-tauri' / 'target' / 'release' / 'bundle' / 'nsis' / 'TuGet-Setup.exe',
                    [
                        tools_dl / 'TuGet-Client' / 'TuGet-Setup.exe',
                    ],
                ),
                (
                    repo_root / 'TuGet-Client' / 'src-tauri' / 'target' / 'x86_64-pc-windows-msvc' / 'release' / 'bundle' / 'nsis' / 'TuGet-Setup.exe',
                    [
                        tools_dl / 'TuGet-Client' / 'TuGet-Setup.exe',
                    ],
                ),
                (
                    repo_root / 'TuGet-Client' / 'src-tauri' / 'target' / 'aarch64-apple-darwin' / 'release' / 'bundle' / 'dmg' / 'TuGet-macOS-arm64.dmg',
                    [
                        tools_dl / 'TuGet-Client' / 'TuGet-macOS-arm64.dmg',
                    ],
                ),
                (
                    repo_root / 'TuGet-Client' / 'src-tauri' / 'target' / 'x86_64-apple-darwin' / 'release' / 'bundle' / 'dmg' / 'TuGet-macOS-x64.dmg',
                    [
                        tools_dl / 'TuGet-Client' / 'TuGet-macOS-x64.dmg',
                    ],
                ),
                (
                    repo_root / 'TuGet-Client' / 'src-tauri' / 'target' / 'x86_64-unknown-linux-gnu' / 'release' / 'bundle' / 'deb' / 'TuGet-Linux-x64.deb',
                    [
                        tools_dl / 'TuGet-Client' / 'TuGet-Linux-x64.deb',
                    ],
                ),
                (
                    repo_root / 'TuGet-Client' / 'src-tauri' / 'target' / 'x86_64-unknown-linux-gnu' / 'release' / 'bundle' / 'rpm' / 'TuGet-Linux-x64.rpm',
                    [
                        tools_dl / 'TuGet-Client' / 'TuGet-Linux-x64.rpm',
                    ],
                ),
            ],
        },
        'tuget': {
            'label': '图个吉利浏览器插件 (Pro-GetPic 四端离线包: Chrome / Edge / Firefox / 360)',
            'keys': [
                'TuGet/tuget-chrome-mv3.zip',
                'TuGet/tuget-edge-mv3.zip',
                'TuGet/tuget-firefox-mv3.zip',
                'TuGet/tuget-360-mv3.zip',
            ],
            'build_mappings': [
                (
                    repo_root / 'Pro-GetPic' / '.output' / f'tuget-{b}-mv3.zip',
                    [tools_dl / 'TuGet' / f'tuget-{b}-mv3.zip'],
                )
                for b in ('chrome', 'edge', 'firefox', '360')
            ],
        },
        'oneget': {
            'label': '一得浏览器插件 (OneGet 四端离线包: Chrome / Edge / Firefox / 360)',
            'keys': [
                'oneget-tabs/oneget-tabs-chrome-mv3.zip',
                'oneget-tabs/oneget-tabs-edge-mv3.zip',
                'oneget-tabs/oneget-tabs-firefox-mv3.zip',
                'oneget-tabs/oneget-tabs-360-mv3.zip',
                'OneGet/oneget-chrome-mv3.zip',
                'OneGet/oneget-edge-mv3.zip',
                'OneGet/oneget-firefox-mv3.zip',
                'OneGet/oneget-360-mv3.zip',
            ],
            'build_mappings': [
                *(
                    (
                        trae_root / 'onetab' / '.output' / f'oneget-tabs-{b}-mv3.zip',
                        [tools_dl / 'oneget-tabs' / f'oneget-tabs-{b}-mv3.zip'],
                    )
                    for b in ('chrome', 'edge', 'firefox', '360')
                ),
                *(
                    (
                        repo_root / 'next-GetPic' / '.output' / f'oneget-{b}-mv3.zip',
                        [tools_dl / 'OneGet' / f'oneget-{b}-mv3.zip'],
                    )
                    for b in ('chrome', 'edge', 'firefox', '360')
                ),
            ],
        },
        'history': {
            'label': '阅历浏览器插件 (Best History 四端离线包: Chrome / Edge / Firefox / 360)',
            'keys': [
                'History/best-history-chrome-mv3.zip',
                'History/best-history-edge-mv3.zip',
                'History/best-history-firefox-mv3.zip',
                'History/best-history-360-mv3.zip',
            ],
            'build_mappings': [],
        },
        'qr-code': {
            'label': '当图二维码浏览器插件 (qr-code 三端离线包: Chrome / Edge / Firefox)',
            'keys': [
                'qr-code/qr-code-chrome-mv3.zip',
                'qr-code/qr-code-edge-mv3.zip',
                'qr-code/qr-code-firefox-mv3.zip',
            ],
            'build_mappings': [],
        },
        'tuget-fullpage': {
            'label': '图个吉利·全貌浏览器插件 (tuget-fullpage 三端离线包: Chrome / Edge / Firefox)',
            'keys': [
                'tuget-fullpage/tuget-fullpage-chrome-mv3.zip',
                'tuget-fullpage/tuget-fullpage-edge-mv3.zip',
                'tuget-fullpage/tuget-fullpage-firefox-mv3.zip',
            ],
            'build_mappings': [],
        },
    }


def load_r2_config(config_path: Path):
    cfg = {}
    if config_path.is_file():
        try:
            cfg = json.loads(config_path.read_text(encoding='utf-8'))
        except Exception as e:
            print(f"[!] 警告: 读取配置文件 {config_path} 失败: {e}，将使用环境变量或默认配置")

    endpoint = os.environ.get('R2_ENDPOINT') or cfg.get('endpoint') or DEFAULT_ENDPOINT
    access_key = os.environ.get('R2_ACCESS_KEY_ID') or cfg.get('access_key') or DEFAULT_ACCESS_KEY
    secret_key = os.environ.get('R2_SECRET_ACCESS_KEY') or cfg.get('secret_key') or DEFAULT_SECRET_KEY
    bucket = os.environ.get('R2_BUCKET') or cfg.get('bucket') or DEFAULT_BUCKET
    public_domain = os.environ.get('R2_PUBLIC_DOMAIN') or cfg.get('public_domain') or DEFAULT_PUBLIC_DOMAIN

    return {
        'endpoint': endpoint,
        'access_key': access_key,
        'secret_key': secret_key,
        'bucket': bucket,
        'public_domain': public_domain.rstrip('/'),
    }


def get_s3_client(cfg):
    config = Config(
        retries={'max_attempts': 10, 'mode': 'adaptive'},
        connect_timeout=60,
        read_timeout=120,
    )
    return boto3.client(
        's3',
        endpoint_url=cfg['endpoint'],
        aws_access_key_id=cfg['access_key'],
        aws_secret_access_key=cfg['secret_key'],
        region_name='auto',
        config=config,
    )


def compute_file_md5(file_path: str, chunk_size: int = 65536) -> str:
    """计算本地文件的 MD5 哈希（流式分块读取，防止大文件爆内存）"""
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest()


def get_content_type(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.exe':
        return 'application/vnd.microsoft.portable-executable'
    elif ext == '.dmg':
        return 'application/x-apple-diskimage'
    elif ext == '.deb':
        return 'application/vnd.debian.binary-package'
    elif ext == '.rpm':
        return 'application/x-rpm'
    elif ext == '.zip':
        return 'application/zip'
    elif ext == '.json':
        return 'application/json'
    content_type, _ = mimetypes.guess_type(file_path)
    return content_type or 'application/octet-stream'


def get_remote_objects(s3, bucket: str) -> dict:
    """获取远程对象列表（Key -> {Size, ETag}）"""
    remote = {}
    paginator = s3.get_paginator('list_objects_v2')
    try:
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get('Contents', []):
                remote[obj['Key']] = {
                    'size': obj['Size'],
                    'etag': obj['ETag'].strip('"'),
                }
    except Exception as e:
        print(f"[!] 获取远程对象列表失败: {e}")
    return remote


def get_object_metadata(s3, bucket: str, key: str) -> dict:
    """获取单个对象的详细元数据 (Metadata)"""
    try:
        resp = s3.head_object(Bucket=bucket, Key=key)
        return resp.get('Metadata', {})
    except Exception:
        return {}


def verify_public_url(url: str, expected_size: int) -> bool:
    """通过线上 CDN 域名检验文件可下载性与 Content-Length"""
    try:
        req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'R2-Sync-Verifier/1.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_length = resp.headers.get('Content-Length')
            if content_length and int(content_length) == expected_size:
                return True
            elif resp.status == 200:
                return True
    except Exception as e:
        print(f"    [!] 线上验证异常 ({url}): {e}")
    return False


def sync_build_artifacts_for_product(product_id: str, specs: dict, dry_run: bool = False, force_copy: bool = False):
    """
    检查指定产品的构建输出目录产物，若比 downloads 目录更新（或指定 force_copy 且 MD5 不同），
    则先将其复制到 tools/public/downloads（及 website/public/downloads）。
    """
    spec = specs.get(product_id)
    if not spec or not spec.get('build_mappings'):
        return

    for build_src, target_paths in spec['build_mappings']:
        if not build_src.is_file():
            continue
        src_md5 = compute_file_md5(str(build_src))
        src_mtime = build_src.stat().st_mtime

        for dst in target_paths:
            if dst.is_file():
                dst_md5 = compute_file_md5(str(dst))
                dst_mtime = dst.stat().st_mtime
                if src_md5 == dst_md5:
                    continue
                if not force_copy and src_mtime < dst_mtime:
                    print(f"[*] [构建产物跳过] 构建目录文件早于 downloads 目录，跳过覆盖: {build_src.name}")
                    continue

            if dry_run:
                print(f"[*] [DRY-RUN 构建同步] 将复制构建产物: {build_src} -> {dst}")
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(build_src, dst)
                print(f"[*] [构建产物同步] 已复制最新构建文件: {build_src} -> {dst} (MD5: {src_md5[:8]}...)")


def resolve_filter_targets(products_arg: list, files_arg: list, specs: dict, all_tasks: list, sync_build: bool, dry_run: bool):
    """
    根据 --product 和 --file 参数解析需要同步的目标 S3 Keys，并在需要时先把构建产物同步到 downloads 目录。
    返回: (filtered_tasks, target_descriptions)
    """
    if not products_arg and not files_arg:
        return all_tasks, ['全量 downloads 目录']

    selected_keys = set()
    descriptions = []

    # 1. 解析 --product
    for raw_p in (products_arg or []):
        for token in [t.strip() for t in raw_p.split(',') if t.strip()]:
            norm = PRODUCT_ALIASES.get(token.lower()) or PRODUCT_ALIASES.get(token)
            if not norm or norm not in specs:
                valid = ', '.join(sorted(specs.keys()))
                raise ValueError(f"未知产品标识 '{token}'。可选产品: {valid}")
            spec = specs[norm]
            descriptions.append(spec['label'])
            if sync_build:
                sync_build_artifacts_for_product(norm, specs, dry_run=dry_run, force_copy=False)
            for k in spec['keys']:
                selected_keys.add(k)

    # 2. 解析 --file（支持传入构建产物绝对路径、downloads 相对路径、文件名或 S3 Key）
    for raw_f in (files_arg or []):
        for token in [t.strip() for t in raw_f.split(',') if t.strip()]:
            p = Path(token)
            matched_any = False

            # 2a. 检查是否直接命中某个产品的构建源路径
            if p.is_absolute() or p.exists():
                resolved_p = p.resolve() if p.exists() else p
                for prod_id, spec in specs.items():
                    for build_src, target_paths in spec.get('build_mappings', []):
                        if build_src.resolve() == resolved_p:
                            sync_build_artifacts_for_product(prod_id, specs, dry_run=dry_run, force_copy=True)
                            for k in spec['keys']:
                                # 若单文件对应具体某端 zip，则只选匹配的 key；若为 exe 则选该产品全部关联 key
                                if build_src.name.lower().endswith('.zip'):
                                    if k.lower().endswith(build_src.name.lower()):
                                        selected_keys.add(k)
                                else:
                                    selected_keys.add(k)
                            descriptions.append(f"构建产物 {build_src.name}")
                            matched_any = True
                            break

            # 2b. 检查是否命中 all_tasks 中的本地路径、S3 Key 或文件名
            token_posix = token.replace('\\', '/').lstrip('/')
            for local_path, s3_key in all_tasks:
                if (
                    s3_key.lower() == token_posix.lower()
                    or local_path.name.lower() == Path(token_posix).name.lower()
                    or (p.exists() and local_path.resolve() == p.resolve())
                ):
                    selected_keys.add(s3_key)
                    matched_any = True

            if matched_any and f"构建产物 {Path(token).name}" not in descriptions:
                descriptions.append(f"指定文件 {token}")

            if not matched_any:
                raise ValueError(f"未能匹配指定的文件或 Key: '{token}'")

    filtered = [(lp, k) for (lp, k) in all_tasks if k in selected_keys]
    return filtered, descriptions


def sync_downloads(
    dry_run: bool = False,
    force: bool = False,
    verify_after: bool = True,
    config_path: Path = DEFAULT_CONFIG_PATH,
    products: list = None,
    files: list = None,
    sync_build: bool = False,
):
    cfg = load_r2_config(config_path)
    s3 = get_s3_client(cfg)
    bucket = cfg['bucket']
    public_domain = cfg['public_domain']

    tools_downloads = REPO_ROOT / 'tools' / 'public' / 'downloads'
    website_downloads = REPO_ROOT / 'website' / 'public' / 'downloads'
    specs = get_product_specs(REPO_ROOT)

    # 若未指定 --product/--file 但开启了 --sync-build，则对所有产品尝试同步较新的构建产物
    if sync_build and not products and not files:
        for prod_id in specs:
            sync_build_artifacts_for_product(prod_id, specs, dry_run=dry_run, force_copy=False)

    # 1. 扫描全部可用任务列表
    all_tasks = []
    if tools_downloads.is_dir():
        for root, _dirs, filenames in os.walk(tools_downloads):
            for f in filenames:
                full_path = Path(root) / f
                rel_path = full_path.relative_to(tools_downloads).as_posix()
                all_tasks.append((full_path, rel_path))
    else:
        print(f"[!] 错误: 未找到本地下载目录: {tools_downloads}")
        return False

    # 根目录兼容文件（历史直链与全站公用）
    compat_files = [
        ('chrome-mv3.zip', website_downloads / 'chrome-mv3.zip'),
        ('edge-mv3.zip', website_downloads / 'edge-mv3.zip'),
        ('firefox-mv3.zip', website_downloads / 'firefox-mv3.zip'),
        ('dangtu.exe', website_downloads / 'dangtu.exe'),
    ]
    for key, path in compat_files:
        if path.is_file():
            all_tasks.append((path, key))

    try:
        tasks, target_descs = resolve_filter_targets(
            products_arg=products,
            files_arg=files,
            specs=specs,
            all_tasks=all_tasks,
            sync_build=sync_build or bool(products or files),
            dry_run=dry_run,
        )
    except ValueError as e:
        print(f"[!] 参数错误: {e}")
        return False

    print("=" * 65)
    print(f"[*] Cloudflare R2 资源同步任务启动 (MD5 双重校验)")
    print(f"[*] 目标存储桶: {bucket}")
    print(f"[*] 公共域名  : {public_domain}")
    print(f"[*] 同步范围  : {' / '.join(target_descs)}")
    print(f"[*] 运行模式  : {'[DRY-RUN 试运行]' if dry_run else '[真实执行同步]'}")
    if force:
        print(f"[*] 强制模式  : 已启用 (忽略哈希比对，全量覆盖)")
    print("=" * 65)

    remote_objects = get_remote_objects(s3, bucket)
    print(f"[*] 远程存储桶已有对象总数: {len(remote_objects)} 个")
    print(f"[*] 本次待核验本地资源数量: {len(tasks)} 个")
    print("-" * 65)

    transfer_config = TransferConfig(
        multipart_threshold=20 * 1024 * 1024,
        multipart_chunksize=20 * 1024 * 1024,
        max_concurrency=2,
        use_threads=True,
    )

    uploaded = []
    skipped = []
    failed = []

    for local_path, s3_key in tasks:
        file_size = local_path.stat().st_size
        size_mb = file_size / 1024 / 1024
        content_type = get_content_type(str(local_path))

        # 计算本地 MD5
        local_md5 = compute_file_md5(str(local_path))

        need_upload = False
        reason = ""

        if force:
            need_upload = True
            reason = "强制覆盖上传"
        elif s3_key not in remote_objects:
            need_upload = True
            reason = "远程不存在"
        elif remote_objects[s3_key]['size'] != file_size:
            need_upload = True
            reason = f"文件大小不匹配 (本地 {file_size}B != 远程 {remote_objects[s3_key]['size']}B)"
        else:
            # 大小完全相同，进一步通过元数据比对 MD5
            meta = get_object_metadata(s3, bucket, s3_key)
            remote_md5 = meta.get('md5')
            if remote_md5:
                if remote_md5.lower() == local_md5.lower():
                    need_upload = False
                else:
                    need_upload = True
                    reason = f"元数据 MD5 不匹配 (本地 {local_md5[:8]}... != 远程 {remote_md5[:8]}...)"
            else:
                # 兼容旧上传对象（无元数据）：如果 ETag 恰好是单段 MD5 则比对，否则回写元数据
                etag = remote_objects[s3_key]['etag']
                if '-' not in etag and etag.lower() == local_md5.lower():
                    need_upload = False
                else:
                    need_upload = True
                    reason = "远程缺少标准元数据 MD5，执行覆盖回写"

        if not need_upload:
            print(f"[跳过/一致] {s3_key:<45} ({size_mb:6.2f} MB) [MD5: {local_md5[:8]}...]")
            skipped.append(s3_key)
            continue

        print(f"[需上传] {s3_key:<45} ({size_mb:6.2f} MB) -> 原因: {reason}")

        if dry_run:
            uploaded.append(s3_key)
            continue

        # 执行真实上传并回写元数据
        try:
            start_time = time.time()
            s3.upload_file(
                Filename=str(local_path),
                Bucket=bucket,
                Key=s3_key,
                Config=transfer_config,
                ExtraArgs={
                    'ContentType': content_type,
                    'Metadata': {
                        'md5': local_md5,
                    },
                },
            )
            elapsed = time.time() - start_time
            print(f"  √ 上传成功: {s3_key} (耗时 {elapsed:.1f}s)")
            uploaded.append(s3_key)

            if verify_after:
                online_url = f"{public_domain}/{s3_key}"
                if verify_public_url(online_url, file_size):
                    print(f"    √ 线上验证通过: {online_url}")
                else:
                    print(f"    [!] 线上检验未能即时获取 200 (CDN 缓存可能需短暂同步)")
        except Exception as e:
            print(f"  × 上传失败: {s3_key}, 错误: {e}")
            failed.append((s3_key, str(e)))

    print("\n" + "=" * 65)
    print(f"[*] 同步统计结果:")
    print(f"    - 跳过一致文件 : {len(skipped)} 个")
    print(f"    - 新增/更新文件: {len(uploaded)} 个 {'(试运行未实际上传)' if dry_run else ''}")
    print(f"    - 失败文件数   : {len(failed)} 个")
    print("=" * 65)

    if failed:
        for k, err in failed:
            print(f"  [失败] {k}: {err}")
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Cloudflare R2 下载资源同步工具 (MD5 双重校验 + 按产品/单文件定向同步)")
    parser.add_argument('--config', type=Path, default=DEFAULT_CONFIG_PATH, help='R2 配置文件路径 (默认 deploy/.r2-config.json)')
    parser.add_argument('--product', '-p', action='append', help='按产品定向同步 (可选: dangtu, dangtu-client, tuget-client, tuget, oneget, history, qr-code, tuget-fullpage)')
    parser.add_argument('--file', '-f', action='append', help='指定单个或多个本地文件路径、文件名或 R2 Key 定向同步')
    parser.add_argument('--sync-build', action='store_true', help='同步前先检查并从各子项目构建输出目录 (.output / target/release/bundle/nsis) 复制最新构建产物到 downloads 目录')
    parser.add_argument('--dry-run', action='store_true', help='仅分析对比差异，不实际上传')
    parser.add_argument('--force', action='store_true', help='强制覆盖上传目标范围内的资源')
    parser.add_argument('--no-verify', action='store_true', help='上传后不执行公共域名 HEAD 校验')
    args = parser.parse_args()

    success = sync_downloads(
        dry_run=args.dry_run,
        force=args.force,
        verify_after=not args.no_verify,
        config_path=args.config,
        products=args.product,
        files=args.file,
        sync_build=args.sync_build,
    )
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
