# TuGet Native Host

`tuget-native-host.exe` 是 Pro-GetPic desktop 扩展与 TuGet 桌面客户端之间的纯通信桥。它不采集网页、不下载文件、不执行 Shell，也不读写业务数据。

```text
Pro-GetPic desktop
  ⇅ Chrome Native Messaging（4 字节小端长度 + JSON UTF-8）
tuget-native-host.exe
  ⇅ Windows Named Pipe（同样的长度前缀 JSON 帧）
TuGet-Client / 测试接收端
```

## 固定身份

- Native Host：`com.tuget.desktop`
- desktop 扩展 ID：`dojjjgfogfhepmnoejgaofgooohddlcm`
- allowed origin：`chrome-extension://dojjjgfogfhepmnoejgaofgooohddlcm/`
- 协议版本：v1
- 默认 Named Pipe：`\\.\pipe\tuget.desktop.v1`

Manifest 的 `allowed_origins` 只包含 desktop 固定扩展 ID。Host 还会校验 Chromium 传入的扩展 origin，作为第二层防护。

## 消息边界

- 扩展 → Host：最大 64 MiB，只接受 `@tuget/protocol` 定义的 Engine Event。
- 客户端 → Host → 扩展：最大 1 MiB，只接受 Client Command。
- 两个方向都先解析 JSON，再使用共享的 Draft 2020-12 Schema 完整校验。
- stdout 只写 Native Messaging 帧；所有诊断信息写入 stderr。
- Named Pipe 离线时最多缓存 32 条、合计 16 MiB，超过即退出，防止无界内存增长。

构建脚本直接读取相邻 `tuget-protocol/schema/protocol.schema.json` 并嵌入二进制，因此协议包仍是唯一事实来源。若工作区布局不同，可通过 `TUGET_PROTOCOL_SCHEMA` 指定 Schema 文件。

## Named Pipe 角色

Native Host 是 Named Pipe 客户端，TuGet-Client 是服务端。这样 Named Pipe 的生命周期、当前用户 ACL、一次性会话挑战和授权状态都由桌面客户端掌控。

测试接收端不代表最终客户端安全实现。正式 TuGet-Client 创建服务端时必须：

- 使用 `first_pipe_instance` 防止同名服务端抢占。
- 将 ACL 限制为当前登录用户和必要的 SYSTEM 身份。
- 每次客户端启动使用新的 `\\.\pipe\tuget.desktop.<随机会话>` 名称和挑战随机数。
- 启动 Browser Engine 时通过 `TUGET_NATIVE_PIPE` 把本次管道名传给 Chromium 子进程。

`TUGET_NATIVE_PIPE` 只允许 `\\.\pipe\tuget.desktop.*` 命名空间，不能指向文件、网络路径或其他产品的管道。

## 构建和测试

```powershell
cd D:\Trae\PcGetPic\tuget-native-host
cargo fmt -- --check
cargo test
cargo clippy --all-targets -- -D warnings
cargo build --release
```

主要测试覆盖：

- 小端 uint32 长度前缀和 UTF-8 字节长度。
- 非法 JSON、Schema 不匹配和消息方向错误。
- Host → 扩展超过 1 MiB，以及读取端在分配内存前拒绝超长帧。
- Native Messaging stdin 正常关闭时进程退出。
- Named Pipe 延迟出现、断开后重连、双向消息传输。

## 开发注册

TuGet 完整开发启动现在使用独立的 `com.tuget.desktop.dev`，并同时注册 Chrome/Chromium。手动管理开发项时，给下列命令加 `-HostName com.tuget.desktop.dev`。脚本保留生产 Host 默认值，以兼容现有协议 E2E 脚本；安装了生产客户端时不要用默认值覆盖生产项。开发客户端本身也会在启动时恢复开发注册。

先构建 debug 二进制：

```powershell
cargo build --bins
```

注册、检查和注销 Chrome 当前用户范围的 Native Host：

```powershell
.\scripts\register-dev.ps1 -Browser Chrome
.\scripts\check-dev.ps1 -Browser Chrome
.\scripts\unregister-dev.ps1 -Browser Chrome
```

也支持 `Chromium` 和 `Edge`。脚本只写入当前用户下精确的 `com.tuget.desktop` 注册项：

```text
HKCU\Software\Google\Chrome\NativeMessagingHosts\com.tuget.desktop
HKCU\Software\Chromium\NativeMessagingHosts\com.tuget.desktop
HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.tuget.desktop
```

开发注册脚本根据实际 exe 绝对路径生成 `.generated/com.tuget.desktop.json`。正式安装包必须由安装程序生成安装后绝对路径，不能复用开发机路径。

## 完整端到端测试

以下脚本会临时注册 Native Host、启动 Named Pipe 命令行接收端、加载固定 ID 的最小测试扩展，并在 `finally` 中关闭隔离 Chromium、注销测试注册：

```powershell
.\scripts\test-e2e.ps1
```

验证流：

```text
HELLO
  → 测试服务端主动断开第一条 Named Pipe
  → Host 自动重连
  → HEARTBEAT
  ← HELLO_ACK
  → ENGINE_READY
```

测试使用 `browser/chromium/chrome.exe` 和独立 `.cache` profile，不访问用户现有浏览器 Profile。如果系统中已经注册 `com.tuget.desktop`，脚本会拒绝覆盖，要求先人工确认现有注册。

## 配置

| 环境变量 | 默认值 | 说明 |
|---|---:|---|
| `TUGET_NATIVE_PIPE` | `\\.\pipe\tuget.desktop.v1` | 会话管道名，只允许 TuGet 命名空间 |
| `TUGET_PIPE_CONNECT_TIMEOUT_MS` | `15000` | 初次连接或重连总超时 |
| `TUGET_PIPE_RETRY_DELAY_MS` | `100` | 管道不存在或繁忙时的重试间隔 |
| `TUGET_PIPE_WRITE_TIMEOUT_MS` | `5000` | 单帧写入超时 |
| `TUGET_PROTOCOL_SCHEMA` | 相邻协议包 Schema | 非标准工作区布局下的构建输入 |

客户端未启动或管道持续离线超过超时时间时，Host 会退出；扩展后续由 `connectNative()` 重连逻辑重新启动 Host。Desktop Bridge Adapter 的连接管理属于阶段 3，不在本项目中实现。
