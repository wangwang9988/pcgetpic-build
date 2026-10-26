# Cloudflare R2 资源存储与同步拓扑架构

本文档记录 `downpictures-files` 存储桶的核心资产、各软件/插件构建路径映射、同步机制及常见排错指南。

## 1. 核心资产与参数

| 配置项 | 参数值 | 说明 |
| :--- | :--- | :--- |
| **Cloudflare 账户** | `xiangbenlang@gmail.com` | 管理后台主账户 |
| **Account ID** | `9d518a03469d1a54eed7a0955d535a12` | 用于拼装 S3 Endpoint |
| **存储桶名称** | `downpictures-files` | 位于亚太/全球自动位置 |
| **S3 API Endpoint** | `https://9d518a03469d1a54eed7a0955d535a12.r2.cloudflarestorage.com` | 走 S3 协议上传/操作 |
| **Access Key ID** | `b0d1d7953deb9f85d902f0f501acad30` | 读写权限令牌 |
| **Secret Access Key** | `5850ddfa2bb441bae26a90d9105752eba6360488e2d398771fed2b993f142f8c` | 令牌密钥 |
| **自定义公共域名** | `https://dl.webtongbu.com` | 已配置 SSL 与全球 CDN 缓存 |

## 2. 目录规划结构与产品对应关系

```text
downpictures-files (Bucket Root)
├── GetPic/                         # 当图插件 (--product dangtu)：Chrome/Edge/Firefox/360 四端离线包 (downpictures-*-mv3.zip)
├── TuGet/                          # 图个吉利插件 (--product tuget)：Chrome/Edge/Firefox/360 四端离线包 (tuget-*-mv3.zip)
├── TuGet-Client/                   # 图个吉利客户端 (--product tuget-client)：TuGet-Setup.exe (~149MB)
├── clientGetPic/                   # 当图客户端 (--product dangtu-client)：dangtu.exe (~5MB)
├── qr-code/                        # 当图二维码插件 (--product qr-code)：qr-code-*-mv3.zip
├── History/                        # 阅历插件 (--product history)：best-history-*-mv3.zip
├── OneGet/                         # 一得插件 (--product oneget)：oneget-*-mv3.zip
├── oneget-tabs/                    # 一得产品中心兼容离线包 (oneget-tabs-*-mv3.zip)
├── tuget-fullpage/                 # 图个吉利·全貌插件 (--product tuget-fullpage)：tuget-fullpage-*-mv3.zip
└── [兼容根目录直链]
    ├── chrome-mv3.zip              # 指向当图 Chrome MV3
    ├── edge-mv3.zip                # 指向当图 Edge MV3
    ├── firefox-mv3.zip             # 指向当图 Firefox MV3
    └── dangtu.exe                  # 指向当图客户端 EXE（随 --product dangtu-client 一起更新）
```

## 3. MD5 双重校验与元数据机制

### 为什么不能直接比对 ETag？
* S3/R2 协议规定：单段上传文件（<16MB）其 ETag 等于标准 MD5。
* 分段上传（Multipart Upload，如 149MB 的 `TuGet-Setup.exe`）其 ETag 计算公式为 `MD5(part1_md5 + part2_md5 + ...)-N`，不是整文件的原始 MD5。

### 优化实现方案
1. **上传阶段**：通过 boto3 的 `ExtraArgs={'Metadata': {'md5': local_md5}}` 将本地文件的原始 MD5 写入 R2 对象的 User-Defined Metadata。
2. **比对阶段**：
   - 第一级：对比 `ContentLength` 与本地字节大小，不一致则直接判定需要更新。
   - 第二级：通过 `head_object` 单次轻量请求读取 `Metadata.get('md5')`，与本地流式计算的 MD5 比对。
   - 结果：两端一致时直接跳过，零网络出站流量，校验速度达毫秒级。

## 4. 常用定向与全量维护命令

```powershell
# 1. 按产品定向同步（推荐日常单产品更新使用）
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py --product dangtu --sync-build         # 当图插件四端压缩包
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py --product dangtu-client --sync-build  # 当图客户端 dangtu.exe
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py --product tuget-client --sync-build   # 图个吉利客户端 TuGet-Setup.exe
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py --product tuget --sync-build          # 图个吉利插件四端压缩包

# 2. 指定单个构建产物路径或 R2 Key 同步
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py --file "D:\Trae\PcGetPic\TuGet-Client\src-tauri\target\release\bundle\nsis\TuGet-Setup.exe"
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py --file "D:\Trae\PcGetPic\client\src-tauri\target\release\bundle\nsis\dangtu.exe"

# 3. 试运行模式（仅查看差异，不真正上传）
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py --dry-run

# 4. 全量标准同步（对比全部差异并上传变更）
python .agents/skills/r2-downloads-sync/scripts/sync_r2_downloads.py
```
