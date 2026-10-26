# Tasks

- [x] Task 1: 创建 temuGetMain.ts — Temu 主图提取模块
  - [x] SubTask 1.1: 实现共享常量（域名黑名单 `aimg.kwcdn.com`、路径黑名单、有效扩展名列表）
  - [x] SubTask 1.2: 实现 `isValidProductImageUrl()` 过滤函数（域名黑名单 + 路径黑名单 + 扩展名校验）
  - [x] SubTask 1.3: 实现 `cleanImageUrl()` 高清原图还原函数（移除 `_\d+x\d+` 尺寸后缀、`.slim.\w+` 后缀，截断到扩展名）
  - [x] SubTask 1.4: 实现 `injectMainWorldScript()` 主世界脚本注入（访问 `window.rawData`/`window.leoConfig`，从 `goods.gallery` 等字段提取主图 URL，跳过 `type === 2` 视频项，通过 `postMessage` 传回）
  - [x] SubTask 1.5: 实现 `setupMessageListener()` 监听主世界脚本回传的数据
  - [x] SubTask 1.6: 实现 `extractFromDOM()` 从 `#leftContent` 容器提取图片（background-image 样式 + img 标签 src/data-src/data-original）
  - [x] SubTask 1.7: 实现 `run()` 导出函数：整合双方案（rawData 主方案 → DOM 备用方案），带重试和 `tauriBridge.send('MainPic', ...)` 上报

- [x] Task 2: 创建 temuGetSku.ts — Temu SKU 图提取模块
  - [x] SubTask 2.1: 复用主图模块的共享常量和工具函数（`isValidProductImageUrl`、`cleanImageUrl`）
  - [x] SubTask 2.2: 实现 `extractFromDOM()` 从 `#rightContent` 容器提取图片（background-image 样式 + img 标签 src/data-src/data-original）
  - [x] SubTask 2.3: 实现 `run()` 导出函数：DOM 提取，带重试和 `tauriBridge.send('SkuPic', ...)` 上报

- [x] Task 3: 创建 temuGetDetail.ts — Temu 详情图提取模块
  - [x] SubTask 3.1: 复用主图模块的共享常量和工具函数（`isValidProductImageUrl`、`cleanImageUrl`）
  - [x] SubTask 3.2: 实现 `extractFromDOM()` 从 `#goodsDetail` 容器提取图片（background-image 样式 + img 标签 src/data-src/data-original）
  - [x] SubTask 3.3: 实现 `run()` 导出函数：DOM 提取，带重试和 `tauriBridge.send('DetailPic', ...)` 上报

- [x] Task 4: 创建 temuGetVideo.ts — Temu 视频提取模块
  - [x] SubTask 4.1: 实现 `cleanVideoUrl()` 和 `isValidVideoUrl()` 视频URL验证函数（排除 blob:/data: 协议，校验 .mp4/.m3u8/.webm/.mov 扩展名）
  - [x] SubTask 4.2: 实现 `injectVideoJsonScript()` 主世界脚本注入（从 `rawData.store.goods.gallery` 提取 `type === 2` 或含 `.mp4` 的视频项）
  - [x] SubTask 4.3: 实现 `setupMessageListener()` 监听主世界脚本回传的视频数据
  - [x] SubTask 4.4: 实现 `extractVideoFromDOM()` 从 DOM 的 `video`/`source` 标签提取视频 URL
  - [x] SubTask 4.5: 实现 MutationObserver 动态监听（检测新增 video 元素和 src 属性变化，防抖 300ms）
  - [x] SubTask 4.6: 实现 `run()` 导出函数：初始化 → 主世界注入 → MutationObserver → DOM 检测 → 定时全量检测（10 次，每秒一次）→ `tauriBridge.send('VideoUrls', ...)` 上报

- [x] Task 5: 创建 temuGetHylinkTitle.ts — Temu 标题/链接/商品ID 提取模块
  - [x] SubTask 5.1: 实现 `extractProductId()` 商品 ID 提取（`goods_id` 查询参数 → `-g-(\d+).html` 路径 → 15 位以上纯数字）
  - [x] SubTask 5.2: 实现 `cleanTitle()` 标题清理（合并空格、移除换行、移除 `| Temu`/`- Temu` 后缀）
  - [x] SubTask 5.3: 实现 `extractFromDOM()` DOM 提取（h1 → document.title → meta[og:title] → class 选择器兜底）
  - [x] SubTask 5.4: 实现 `extractFromWindowObject()` window 对象扫描（遍历含 goods/product/data/detail 关键词的全局变量，正则匹配 title/link/id）
  - [x] SubTask 5.5: 实现 `run()` 导出函数：等待动态内容 → 提取 → `tauriBridge.send` 上报 `productTitle`/`productLink`/`productId`

- [x] Task 6: 创建 index.ts — Temu 抓取脚本入口
  - [x] SubTask 6.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 6.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 6.3: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 超时保护）
  - [x] SubTask 6.4: 实现登录探针检测（`TEMU_LOGIN_SELECTORS` 暂设为空数组，依赖通用登录检测）
  - [x] SubTask 6.5: 实现验证码检测（`CAPTCHA_SELECTORS` 暂设为空数组，待实际观察确认）
  - [x] SubTask 6.6: 实现 `waitTaskCompletion()` 数据静默判定（复用 `waitForCompletion`）
  - [x] SubTask 6.7: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 7: 注册 temu 到构建脚本
  - [x] SubTask 7.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `temu` 入口

- [x] Task 8: 实现 Temu 登录策略
  - [x] SubTask 8.1: 创建 `src-tauri/src/login/temu.rs`，实现 `TemuLoginStrategy`（参考 `taobao.rs` 模式，需要 `extract_product_id()` 提取商品 ID）
  - [x] SubTask 8.2: 实现登录页检测（`temu.com/login` → `LoginRequired`）
  - [x] SubTask 8.3: 实现 `extract_product_id()`（`goods_id=(\d+)` 查询参数 → `-g-(\d+).html` 路径格式）
  - [x] SubTask 8.4: 实现 `is_still_on_platform_non_product()`（`temu.com` 域名下但非商品页）
  - [x] SubTask 8.5: 实现 `product_url_patterns()`（Temu 商品页 URL 模式）
  - [x] SubTask 8.6: 在 `src-tauri/src/login/mod.rs` 中注册 `temu::TemuLoginStrategy`

- [x] Task 9: 构建验证
  - [x] SubTask 9.1: 运行 `node scripts/build-scraper.mjs` 确认 `temu.bundle.js` 生成成功
  - [x] SubTask 9.2: 运行 `cargo check` 确认 Rust 编译通过

# Task Dependencies
- Task 1 ~ 5: 可并行开发（各模块独立）
- Task 6: 依赖 Task 1 ~ 5（入口文件导入各模块）
- Task 7: 依赖 Task 6（构建脚本需入口文件存在）
- Task 8: 独立于 Task 1 ~ 7，可并行开发
- Task 9: 依赖 Task 7 和 Task 8（最终验证）
