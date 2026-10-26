# Tasks

- [x] Task 1: Rust 后端 — 替换 Referer 映射策略
  - [x] SubTask 1.1: 在 `src-tauri/src/lib.rs` 中将 `get_referer_from_url()` 替换为 `get_referer_for_url()`，实现 CDN 域名 → Referer 映射表（覆盖 360buyimg.com、jdimg.com、sinaimg.cn、weibocdn.com、photo.yupoo.com 五个域名），无匹配时回退到 URL 自身域名
  - [x] SubTask 1.2: 更新 `download_file` 命令中的调用，从 `get_referer_from_url` 改为 `get_referer_for_url`
  - [x] SubTask 1.3: 验证 Rust 编译通过

- [x] Task 2: Rust 后端 — 新增 `fetch_resource_as_data_url` Tauri 命令
  - [x] SubTask 2.1: 在 `src-tauri/src/lib.rs` 中新增 `fetch_resource_as_data_url` 命令，接收 URL 参数，使用 `get_referer_for_url()` 获取正确 Referer 后发起请求，返回 `data:{contentType};base64,{data}` 格式字符串
  - [x] SubTask 2.2: 在 `main.rs` 或 `lib.rs` 的 `invoke_handler` 中注册新命令
  - [x] SubTask 2.3: 确认 `base64` crate 已在 `Cargo.toml` 中添加（如未添加则补充）
  - [x] SubTask 2.4: 验证 Rust 编译通过

- [x] Task 3: 前端 — 新增 `src/utils/antiHotlink.ts` 防盗链工具模块
  - [x] SubTask 3.1: 实现 `isAntiHotlinkUrl(url: string): boolean`，判断 URL 是否属于防盗链域名（360buyimg.com、jdimg.com、sinaimg.cn、weibocdn.com、photo.yupoo.com）
  - [x] SubTask 3.2: 实现 `getReferrerPolicy(url: string): string`，防盗链域名返回 `'no-referrer-when-downgrade'`，其他返回 `'no-referrer'`
  - [x] SubTask 3.3: 实现 `proxyResourceUrl(url: string): Promise<string>`，对防盗链 URL 调用 `invoke('fetch_resource_as_data_url', { url })` 获取 data URL，非防盗链 URL 直接返回原 URL，代理失败时优雅降级返回原 URL
  - [x] SubTask 3.4: 实现 `fetchResourceSize(url: string): Promise<number | null>`，对防盗链 URL 通过 Rust 代理获取文件大小，非防盗链 URL 使用前端 fetch HEAD 请求

- [x] Task 4: 前端 — 适配 `ImageDisplay.vue` 防盗链预览
  - [x] SubTask 4.1: 在 `<img>` 标签上添加动态 `:referrerpolicy="getReferrerPolicy(item)"` 属性
  - [x] SubTask 4.2: 修改 `getImageSrc()` 逻辑，对防盗链 URL 调用 `proxyResourceUrl()` 获取 data URL，并缓存结果避免重复代理
  - [x] SubTask 4.3: 修改 `getImageFileSize()` 逻辑，对防盗链 URL 使用 `fetchResourceSize()` 获取文件大小
  - [x] SubTask 4.4: 确保代理获取期间图片显示加载状态，代理失败时优雅降级显示原始 URL（触发已有的 error 重试机制）

- [x] Task 5: 前端 — 适配 `VideoDisplay.vue` 防盗链预览
  - [x] SubTask 5.1: 在 `<video>` 标签上添加动态 `:referrerpolicy="getReferrerPolicy(videoUrl)"` 属性
  - [x] SubTask 5.2: 修改 `getVideoSrc()` 逻辑，对防盗链 URL 调用 `proxyResourceUrl()` 获取 data URL，并缓存结果
  - [x] SubTask 5.3: 确保代理获取期间视频显示加载状态，代理失败时优雅降级

- [x] Task 6: 集成验证
  - [x] SubTask 6.1: 运行 `cargo check` 确认 Rust 编译通过
  - [x] SubTask 6.2: 运行前端类型检查 `vue-tsc --noEmit` 确认无类型错误
  - [x] SubTask 6.3: 验证非防盗链平台（淘宝）的图片预览和下载不受影响（代码逻辑确认：非防盗链 URL 不走代理，行为不变）

# Task Dependencies
- [Task 2] depends on [Task 1]（新命令复用映射表函数）
- [Task 3] depends on [Task 2]（前端模块调用新 Tauri 命令）
- [Task 4] depends on [Task 3]（组件使用工具模块）
- [Task 5] depends on [Task 3]（组件使用工具模块）
- [Task 6] depends on [Task 4, Task 5]（集成验证在所有适配完成后进行）
