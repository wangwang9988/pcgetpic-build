# @tuget/protocol

TuGet 桌面客户端、Pro-GetPic `desktop` 扩展和 Native Host 共用的通信契约。该包只定义消息、DTO、能力、错误码、desktop 公共身份和运行时校验，不实现采集、下载、授权或 UI。

## 当前状态

- npm 包版本：`0.1.0`（阶段 0 草案）。
- 信封协议主版本：`1`。
- Native Host：`com.tuget.desktop`。
- desktop 扩展 ID：`dojjjgfogfhepmnoejgaofgooohddlcm`。
- JSON Schema：`schema/protocol.schema.json`。

扩展 ID 由 desktop 专用 RSA 公钥稳定派生。仓库只保存公钥、指纹和派生 ID；私钥不得提交、复制进安装包或打印到构建日志。构建系统通过 `TUGET_DESKTOP_PRIVATE_KEY_PATH` 指向外部私钥。

## 命令

```bash
npm install
npm run typecheck
npm test
npm run pack:check
```

开发期可以用 `file:../tuget-protocol` 联调，正式可复现构建必须改用锁定版本的 Registry 包、Git tag 或不可变 tarball。

## 兼容规则

- 信封 `version` 表示协议主版本；主版本不匹配时不得启动任务。
- 新增可选字段属于兼容变更；删除字段、修改必填性或改变字段语义属于不兼容变更。
- 消息在发送前和接收后均应通过 `validateProtocolMessage()` 校验。
- Native Messaging 只发送结构化元数据，不发送图片、视频、Blob 或其他二进制文件内容。
- 命令存在于协议中不代表运行端已经实现，实际可用性必须以 `HELLO/HELLO_ACK` 的能力集合为准。

三条采集线的当前门面盘点见 [Pro-GetPic 三线公开门面盘点](docs/pro-getpic-public-facade-inventory.md)。

