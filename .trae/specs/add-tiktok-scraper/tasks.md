# Tasks

- [x] Task 1: 创建 tkGetMain.ts — TikTok 主图提取模块
  - [x] SubTask 1.1: 实现 `parseRouterData()` 通用函数，解析 `__MODERN_ROUTER_DATA__` script 标签，返回 `loaderData` 对象
  - [x] SubTask 1.2: 实现 `extractMainImagesFromRouterData()` 从 loaderData 三策略提取主图：策略1 `page_config.components_map` → 策略2 直接 `components_map` → 策略3 旧结构 `component_data`，查找 `product_info` 组件的 `product_base.images[].url_list[0]`
  - [x] SubTask 1.3: 实现 `extractImagesFromDOM()` 从 DOM 选择器（`.slick-slider-container img`、`.w-66.h-66 img`、`img.cursor-zoom-in`）提取主图
  - [x] SubTask 1.4: 实现 `gatherAllImages()` 合并 JSON + DOM 双来源图片，使用 `deduplicateUrls()` 去重
  - [x] SubTask 1.5: 实现 `run()` 导出函数：初始空上报 → 提取 → 重试（MAX_RETRIES=100, RETRY_INTERVAL=500ms）→ 额外抓取（3轮）→ `tauriBridge.send('MainPic', ...)` 上报。使用共享 `sleep`，不定义本地 sleep

- [x] Task 2: 创建 tkGetSku.ts — TikTok SKU 图提取模块
  - [x] SubTask 2.1: 实现 `extractSkuImagesFromRouterData()` 从 loaderData 三策略提取 SKU 图：查找 `product_info` 组件的 `sale_props`，遍历 `has_image === true` 的属性组，提取 `sale_prop_values[].image.url_list[0]`
  - [x] SubTask 2.2: 实现 `extractSkuImagesFromDOM()` 从 DOM 选择器（`div.overflow-x-auto.flex-wrap > div > img`、`img[width='68'][height='68']`、`div.cursor-pointer > img`）提取 SKU 图
  - [x] SubTask 2.3: 实现 MutationObserver 精确监听：对 SKU 容器精确挂载 Observer（非 document.body），监听 `childList`/`subtree`/`attributes`（`src`、`data-src`），图片数量增加时防抖后重新扫描上报
  - [x] SubTask 2.4: 实现轮询兜底：首轮无结果时启动定时轮询，获取到结果后停止轮询
  - [x] SubTask 2.5: 实现 `run()` 导出函数：初始空上报 → JSON 主方案 → DOM 备用方案 → MutationObserver + 轮询兜底 → 返回清理函数（同时清理 Observer 和定时器）。使用共享 `sleep`

- [x] Task 3: 创建 tkGetDetail.ts — TikTok 详情图提取模块
  - [x] SubTask 3.1: 实现 `extractFromDescDetail()` 解析 `desc_detail` JSON 字符串，提取 `type === "image"` 项的 `image.url_list[0]`
  - [x] SubTask 3.2: 实现 `extractDetailImagesFromRouterData()` 从 loaderData 三策略提取详情图：查找 `product_info` 组件的 `product_base.desc_detail`
  - [x] SubTask 3.3: 实现 `extractDetailImagesFromDOM()` 从 DOM 选择器（`div[class^="expandableSection"] div[class^="sectionContent"] img`、`div[class^="sectionContent"] img.w-full`）提取详情图
  - [x] SubTask 3.4: 实现多轮提取：EXTRACTION_PASSES=3，间隔 PASS_DELAY_MS=1000，每轮合并去重后增量上报
  - [x] SubTask 3.5: 实现 MutationObserver 持续监听：监听详情容器，发现新图片时增量上报
  - [x] SubTask 3.6: 实现 `run()` 导出函数：初始空上报 → JSON 主方案 → DOM 备用方案 → 多轮提取 → MutationObserver 持续监听。使用共享 `sleep`

- [x] Task 4: 创建 tkGetVideo.ts — TikTok 视频提取模块
  - [x] SubTask 4.1: 实现视频 URL 去重机制（`normalizeVideoUrl` + `isVideoDuplicate`），双重去重（原始 URL 集合 + 归一化视频 ID 集合）
  - [x] SubTask 4.2: 实现 TikTok 视频 CDN 识别（`isTikTokVideoUrl`）：域名特征（tiktokcdn-us.com、tiktokcdn.com、tiktokv.com、ttcdn-us.com）+ 路径特征（/video/、mime_type=video、video_mp4）
  - [x] SubTask 4.3: 实现视频分类函数（`isLikelyMainVideo`/`isMainVideoUrl`），TikTok 商品页视频默认视为主图视频，过滤广告/评论/UGC/头像
  - [x] SubTask 4.4: 实现 `extractVideosFromModernRouterData()` 从 `__MODERN_ROUTER_DATA__` 提取 `product_base.video` 及递归搜索 `product_info` 对象
  - [x] SubTask 4.5: 实现 `extractVideosFromDOMElements()` 从 `video` 标签和 `source` 子元素提取 TikTok CDN 视频
  - [x] SubTask 4.6: 实现 XHR/Fetch 拦截 + TikTok 视频 URL 正则匹配（`tiktokcdn.*\/video\/`）+ 传统格式匹配
  - [x] SubTask 4.7: 实现 Performance API 增量监控（游标增量检测 + requestAnimationFrame 持续轮询）
  - [x] SubTask 4.8: 实现 MutationObserver 动态监听（监听 `video` 和 `script` 标签新增）
  - [x] SubTask 4.9: 实现延时梯度扫描：1s/3s/5s/10s 延时执行全量视频检测（提取页面内嵌 JSON + 检查 window 全局变量 + 扫描视频容器 DOM），首次执行时模拟用户交互触发懒加载
  - [x] SubTask 4.10: 实现视频增量上报：采用"先读后写"策略（`tauriBridge.get('VideoUrls')` → 去重追加 → `tauriBridge.send('VideoUrls', ...)`）
  - [x] SubTask 4.11: 实现 `run()` 导出函数：初始化 → 拦截注册 → Performance API 监控 → DOMContentLoaded 后 MutationObserver + 延时梯度扫描。使用共享 `sleep`

- [x] Task 5: 创建 tkGetHylinkTitle.ts — TikTok 标题/链接/商品ID/访问时间 提取模块
  - [x] SubTask 5.1: 实现标题提取（`.mainTitle--R75fTcZL` DOM 优先 → `head title` 回退 → `__MODERN_ROUTER_DATA__` 的 `product_base.title` 补充）
  - [x] SubTask 5.2: 实现商品 ID 提取（从 `tiktok.com/shop/pdp/` URL 路径段反向查找纯数字段）
  - [x] SubTask 5.3: 实现清洁链接生成（`origin + pathname` 格式）
  - [x] SubTask 5.4: 实现访问时间生成（`YYYY-MM-DD HH:mm` 格式）
  - [x] SubTask 5.5: 实现 `run()` 导出函数：初始空上报（productTitle/productLink/productId）→ 等待动态内容 → 提取 → `tauriBridge.send` 上报四个字段（productTitle/productLink/productId/visitTime）。使用共享 `sleep`

- [x] Task 6: 创建 index.ts — TikTok 抓取脚本入口
  - [x] SubTask 6.1: 实现 iframe 防护（`if (window !== window.top) return`）
  - [x] SubTask 6.2: 实现视频模块立即启动（document_start 阶段）
  - [x] SubTask 6.3: 实现 DOMContentLoaded 后启动其余模块（后台并行 + 超时保护）
  - [x] SubTask 6.4: 实现登录探针检测（`TIKTOK_LOGIN_SELECTORS`：`.login-container`、`.login-form`、`.login-wrapper`、`[class*="login"]`、`.passport-login`）
  - [x] SubTask 6.5: 实现验证码检测（`CAPTCHA_SELECTORS`：`.captcha-verify-container`、`#captcha-verify-image`、`.verify-bar-close`，节流上限 3 次）
  - [x] SubTask 6.6: 实现 `waitTaskCompletion()` 数据静默判定（复用 `waitForCompletion`）
  - [x] SubTask 6.7: 实现异常处理（有数据 → completeTask / 无数据 → failTask）

- [x] Task 7: 注册 tiktok 到构建脚本
  - [x] SubTask 7.1: 在 `scripts/build-scraper.mjs` 的 `PLATFORMS` 对象中添加 `tiktok` 入口

- [x] Task 8: 实现 TikTok 登录策略
  - [x] SubTask 8.1: 创建 `src-tauri/src/login/tiktok.rs`，自定义实现 `TiktokLoginStrategy`（参考 `taobao.rs` 模式，不使用 `DefaultLoginStrategy`，因为需要 `extract_product_id`）
  - [x] SubTask 8.2: 实现登录页检测（`login.tiktok`、`passport.tiktok`、`accounts.tiktok`、`/login` → `LoginRequired`；`/login` 非登录页 → `LoginIntermediate`；`captcha`、`verify` → `Captcha`）
  - [x] SubTask 8.3: 实现 `extract_product_id()`（正则：`/shop/pdp/(\d+)`）
  - [x] SubTask 8.4: 实现 `is_still_on_platform_non_product()`（`tiktok.com` 域名下但非 `/shop/pdp/` 商品页）
  - [x] SubTask 8.5: 实现 `login_cookie_names()`（`sessionid`、`sid_tt`、`sid_guard`）
  - [x] SubTask 8.6: 实现 `captcha_selectors()`（`.captcha-verify-container`、`#captcha-verify-image`、`.verify-bar-close`）
  - [x] SubTask 8.7: 在 `src-tauri/src/login/mod.rs` 中注册 `tiktok::TiktokLoginStrategy`

- [x] Task 9: 构建验证
  - [x] SubTask 9.1: 运行 `node scripts/build-scraper.mjs` 确认 `tiktok.bundle.js` 生成成功
  - [x] SubTask 9.2: 运行 `cargo check` 确认 Rust 编译通过

# Task Dependencies
- Task 1 ~ 5: 可并行开发（各模块独立）
- Task 6: 依赖 Task 1 ~ 5（入口文件导入各模块）
- Task 7: 依赖 Task 6（构建脚本需入口文件存在）
- Task 8: 独立于 Task 1 ~ 7，可并行开发
- Task 9: 依赖 Task 7 和 Task 8（最终验证）
