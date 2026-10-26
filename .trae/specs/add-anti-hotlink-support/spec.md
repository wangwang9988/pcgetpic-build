# 突破防盗链支持 Spec

## Why
电商平台（京东、微博、Yupoo 等）的 CDN 启用了 HTTP Referer 防盗链机制，当前项目的图片预览和下载在这些平台上会因 403 错误而失败。现有 Rust 端 `get_referer_from_url()` 仅从图片 URL 提取域名作为 Referer（如 `https://360buyimg.com/`），但 CDN 要求的是特定页面域名（如 `https://item.jd.com/`），导致策略完全失效。前端 `ImageDisplay.vue` 和 `VideoDisplay.vue` 的 `<img>`/`<video>` 标签缺少 `referrerpolicy` 属性，WebView 发出的请求 Referer 为 `https://tauri.localhost/`，不在任何 CDN 白名单内。

## What Changes
- Rust 后端：将 `get_referer_from_url()` 替换为基于 CDN 域名映射表的 `get_referer_for_url()`，精确匹配各平台所需的 Referer
- Rust 后端：新增 `fetch_resource_as_data_url` Tauri 命令，用于前端预览防盗链图片/视频
- 前端：新增 `src/utils/antiHotlink.ts` 工具模块，提供防盗链域名识别、referrerpolicy 判断、资源代理功能
- 前端：更新 `ImageDisplay.vue`，为 `<img>` 标签添加动态 `referrerpolicy`，对防盗链域名图片使用 Rust 代理获取
- 前端：更新 `VideoDisplay.vue`，为 `<video>` 标签添加动态 `referrerpolicy`，对防盗链域名视频使用 Rust 代理获取

## Impact
- Affected specs: 图片预览流程、视频预览流程、文件下载流程
- Affected code:
  - `src-tauri/src/lib.rs`（`download_file` 命令、新增 `fetch_resource_as_data_url` 命令）
  - `src/components/ImageDisplay.vue`（`<img>` 标签 referrerpolicy、getImageSrc 代理逻辑）
  - `src/components/VideoDisplay.vue`（`<video>` 标签 referrerpolicy、getVideoSrc 代理逻辑）
  - `src/utils/antiHotlink.ts`（新增文件）

## ADDED Requirements

### Requirement: CDN 域名 → Referer 映射表
系统 SHALL 在 Rust 后端维护一份 CDN 域名到所需 Referer 的映射表，对齐参考项目 `GetPic` 中三个防盗链平台的规则：

| CDN 域名 | 所需 Referer |
|:---|:---|
| `360buyimg.com` | `https://item.jd.com/` |
| `jdimg.com` | `https://item.jd.com/` |
| `sinaimg.cn` | `https://weibo.com/` |
| `weibocdn.com` | `https://weibo.com/` |
| `photo.yupoo.com` | `https://www.yupoo.com/` |

#### Scenario: 下载京东 CDN 图片
- **WHEN** 用户下载 `https://img14.360buyimg.com/n1/jfsxxx.jpg`
- **THEN** Rust 后端发送请求时 Referer 为 `https://item.jd.com/`，下载成功

#### Scenario: 下载微博图片
- **WHEN** 用户下载 `https://wx1.sinaimg.cn/large/xxx.jpg`
- **THEN** Rust 后端发送请求时 Referer 为 `https://weibo.com/`，下载成功

#### Scenario: 下载非防盗链平台图片
- **WHEN** 用户下载 `https://img.alicdn.com/imgextra/xxx.jpg`
- **THEN** Rust 后端发送请求时 Referer 为 `https://img.alicdn.com/`（回退到 URL 自身域名），下载成功

### Requirement: Rust 资源代理命令
系统 SHALL 提供 `fetch_resource_as_data_url` Tauri 命令，用于前端预览防盗链资源：

- 接收 URL 参数
- 使用正确的 Referer（通过映射表获取）发起 HTTP 请求
- 返回 `data:{contentType};base64,{data}` 格式的 data URL
- 请求失败时返回错误信息，前端可优雅降级显示原始 URL

#### Scenario: 代理获取防盗链图片用于预览
- **WHEN** 前端调用 `fetch_resource_as_data_url("https://wx1.sinaimg.cn/large/xxx.jpg")`
- **THEN** Rust 后端使用 Referer `https://weibo.com/` 请求图片，返回 `data:image/jpeg;base64,...`

#### Scenario: 代理获取非防盗链图片
- **WHEN** 前端调用 `fetch_resource_as_data_url("https://img.alicdn.com/imgextra/xxx.jpg")`
- **THEN** Rust 后端仍正常请求并返回 data URL（映射表无匹配时回退到 URL 自身域名作为 Referer）

### Requirement: 前端防盗链工具模块
系统 SHALL 在 `src/utils/antiHotlink.ts` 中提供以下功能：

1. `isAntiHotlinkUrl(url: string): boolean` — 判断 URL 是否属于防盗链域名
2. `getReferrerPolicy(url: string): string` — 返回适合的 referrerpolicy 值（防盗链域名返回 `'no-referrer-when-downgrade'`，其他返回 `'no-referrer'`）
3. `proxyResourceUrl(url: string): Promise<string>` — 对防盗链 URL 通过 Rust 代理获取 data URL，非防盗链 URL 直接返回原 URL

#### Scenario: 识别防盗链 URL
- **WHEN** 调用 `isAntiHotlinkUrl("https://img14.360buyimg.com/n1/xxx.jpg")`
- **THEN** 返回 `true`

#### Scenario: 识别非防盗链 URL
- **WHEN** 调用 `isAntiHotlinkUrl("https://img.alicdn.com/imgextra/xxx.jpg")`
- **THEN** 返回 `false`

#### Scenario: 代理防盗链图片
- **WHEN** 调用 `proxyResourceUrl("https://wx1.sinaimg.cn/large/xxx.jpg")`
- **THEN** 返回 `data:image/jpeg;base64,...`（通过 Rust 代理获取）

#### Scenario: 代理失败优雅降级
- **WHEN** 调用 `proxyResourceUrl("https://wx1.sinaimg.cn/large/xxx.jpg")` 但 Rust 代理失败
- **THEN** 返回原始 URL（不抛出异常）

### Requirement: ImageDisplay.vue 防盗链适配
系统 SHALL 在 `ImageDisplay.vue` 中：

1. 为 `<img>` 标签动态设置 `referrerpolicy` 属性（防盗链域名使用 `no-referrer-when-downgrade`，其他使用 `no-referrer`）
2. 在 `getImageSrc()` 中集成防盗链代理：对防盗链 URL 调用 `proxyResourceUrl()` 获取 data URL
3. 代理获取期间显示加载状态，代理失败时优雅降级显示原始 URL
4. `getImageFileSize()` 对防盗链 URL 使用 Rust 代理获取文件大小（而非前端 fetch HEAD 请求）

#### Scenario: 预览京东防盗链图片
- **WHEN** 用户抓取京东商品，ImageDisplay 展示 `360buyimg.com` 域名的图片
- **THEN** 图片通过 Rust 代理获取并正常显示，不出现裂图

#### Scenario: 预览非防盗链图片
- **WHEN** 用户抓取淘宝商品，ImageDisplay 展示 `alicdn.com` 域名的图片
- **THEN** 图片直接加载（不经过代理），行为与现有逻辑一致

### Requirement: VideoDisplay.vue 防盗链适配
系统 SHALL 在 `VideoDisplay.vue` 中：

1. 为 `<video>` 标签动态设置 `referrerpolicy` 属性
2. 对防盗链域名的视频 URL 使用 Rust 代理获取 data URL 用于预览
3. 代理失败时优雅降级

#### Scenario: 预览微博防盗链视频
- **WHEN** 用户抓取微博内容，VideoDisplay 展示 `weibocdn.com` 域名的视频
- **THEN** 视频通过 Rust 代理获取并正常播放

## MODIFIED Requirements

### Requirement: Rust download_file 命令的 Referer 策略
原有 `get_referer_from_url()` 函数仅从图片 URL 提取域名作为 Referer，现修改为 `get_referer_for_url()`，优先查找 CDN 域名映射表，无匹配时回退到 URL 自身域名。

## REMOVED Requirements

（无移除项）
