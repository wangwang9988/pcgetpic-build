# Tasks

- [x] Task 1: 修改 `platform_resolver.rs` 的 `use_external_browser_login()` 方法
  - [x] 将匹配逻辑从 `matches!(self, Platform::Ali1688)` 改为排除法：仅 Taobao/Jd/Vip 返回 false，其余已知平台返回 true，Unknown 返回 false
- [x] Task 2: 修改 `platform_resolver.rs` 的 `external_login_url()` 方法
  - [x] 为所有使用外部浏览器登录的平台添加登录页 URL（无独立登录页的使用主页 URL）
- [x] Task 3: 修改 `commands.rs` 的 `is_external_browser_login` 命令
  - [x] 补全所有平台字符串到 Platform 枚举的映射（当前仅映射 ali1688，其余映射为 Unknown 导致判断错误）
- [x] Task 4: 修改 `PlatformDetect.vue` 的 `handlePreLogin` 提示文案
  - [x] 将硬编码的"1688 登录"改为动态平台名称（使用 PLATFORM_LABELS 查找）
- [x] Task 5: 修改 `commands.rs` 的 `confirm_external_login` 域名过滤
  - [x] 补全所有平台的域名过滤器（当前仅支持 ali1688，其余平台会返回"不支持外部浏览器登录"错误）
  - [x] 更新注释文档，移除硬编码的"1688"描述

# Task Dependencies
- Task 2 依赖 Task 1（登录 URL 仅对 use_external_browser_login 返回 true 的平台有意义）
- Task 3 依赖 Task 1（需要与新的判定逻辑一致）
- Task 4 独立
- Task 5 依赖 Task 1（域名过滤需覆盖所有外部浏览器登录平台）
