# Tasks

## Phase 1：zh-CN + en-US 核心语言清洗（基准语言）

- [x] Task 1: 清洗 `zh-CN.json` — platformPage 命名空间残留
  - [x] 确认 `platformPage.description` / `platformPage.metaDescription` 已去"浏览器扩展"
  - [x] 确认 `platformPage.tutorialStep1~3` 已改为客户端流程
  - [x] 确认 `platformPage.faqA2~faqA5` 已改为客户端语境
  - [x] 确认 `platformPage.ctaSubtitle` 已客户端化
  - [x] 如有遗漏则修正

- [x] Task 2: 清洗 `en-US.json` — platformPage 命名空间
  - [x] `platformPage.description`：去 "extension" / "browser extension" → "desktop client"
  - [x] `platformPage.metaDescription`：同上
  - [x] `platformPage.tutorialStep1Title`："Install Extension" → "Download & Install"
  - [x] `platformPage.tutorialStep1Desc`：去 "Install the ... extension in Chrome/Firefox/Edge browser" → 客户端下载安装描述
  - [x] `platformPage.tutorialStep3Desc`：去 "Click the ... extension icon in your browser toolbar" → "The client automatically scrapes..."
  - [x] `platformPage.faqA2`："completely free" → "7-day free trial, license required after"
  - [x] `platformPage.faqA3`：去 "Click the ... extension icon" → "Paste the product link into the client"
  - [x] `platformPage.faqA4`：去 "The ... extension can directly access" → 客户端语境
  - [x] `platformPage.faqA5`：去 "the extension works properly" → 客户端语境
  - [x] `platformPage.ctaSubtitle`：补充 "batch" 等客户端价值描述

- [x] Task 3: 清洗 `zh-CN.json` + `en-US.json` — platform.descriptions 批量替换
  - [x] zh-CN：所有 `platform.descriptions.*` 中"插件支持..."/"插件自动提取..."→"客户端支持..."/"客户端自动提取..."
  - [x] en-US：所有 `platform.descriptions.*` 中 "The extension supports..."/"The extension unlocks..."→"The desktop client supports..."/"The desktop client provides..."

- [x] Task 4: 清洗 `zh-CN.json` + `en-US.json` — 其他共享区域
  - [x] `platformsIndex.seoDescription`：去 "browser extension" → "desktop client"
  - [x] `footer.desc`：去 "浏览器扩展" → 通用/客户端描述
  - [x] `seo.keywords`：追加 "desktop client" / "Windows app" / "桌面客户端" 等关键词（保留现有 extension 词）

## Phase 2：9 种非核心语言清洗

- [x] Task 5: 清洗 `zh-TW.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "擴充功能"/"外掛" → "客戶端"/"桌面客戶端"
  - [x] `platform.descriptions.*`：去 "外掛支援..."/"擴充功能..." → "客戶端支援..."
  - [x] `platformsIndex.seoDescription`：去 "瀏覽器擴充功能"
  - [x] `footer.desc`：去 "瀏覽器擴充功能"
  - [x] `seo.keywords`：追加桌面客戶端關鍵詞

- [x] Task 6: 清洗 `ja.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "拡張機能" → "デスクトップクライアント"/"クライアントアプリ"
  - [x] `platform.descriptions.*`：去 "拡張機能は..." → "デスクトップクライアントは..."
  - [x] `platformsIndex.seoDescription`：去 "ブラウザ拡張機能"
  - [x] `footer.desc`：去 "ブラウザ拡張機能"
  - [x] `seo.keywords`：追加 "デスクトップクライアント" 等关键词

- [x] Task 7: 清洗 `ko.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "확장 프로그램" → "데스크톱 클라이언트"/"클라이언트"
  - [x] `platform.descriptions.*`：去 "확장 프로그램은..." → "데스크톱 클라이언트는..."
  - [x] `platformsIndex.seoDescription`：去 "브라우저 확장 프로그램"
  - [x] `footer.desc`：去 "브라우저 확장 프로그램"
  - [x] `seo.keywords`：追加 "데스크톱 클라이언트" 等关键词

- [x] Task 8: 清洗 `es.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "extensión"/"complemento" → "cliente de escritorio"/"aplicación de escritorio"
  - [x] `platform.descriptions.*`：去 "El complemento admite..." → "El cliente de escritorio admite..."
  - [x] `platformsIndex.seoDescription`：去 "extensión de navegador"
  - [x] `footer.desc`：去 "extensión de navegador"
  - [x] `seo.keywords`：追加 "cliente de escritorio" 等关键词

- [x] Task 9: 清洗 `de.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "Erweiterung" → "Desktop-Client"/"Desktop-Anwendung"
  - [x] `platform.descriptions.*`：去 "Die Erweiterung..." → "Der Desktop-Client..."
  - [x] `platformsIndex.seoDescription`：去 "Browser-Erweiterung"
  - [x] `footer.desc`：去 "Browser-Erweiterung"
  - [x] `seo.keywords`：追加 "Desktop-Client" 等关键词

- [x] Task 10: 清洗 `pt-BR.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "extensão" → "cliente desktop"/"aplicativo desktop"
  - [x] `platform.descriptions.*`：去 "A extensão suporta..." → "O cliente desktop suporta..."
  - [x] `platformsIndex.seoDescription`：去 "extensão de navegador"
  - [x] `footer.desc`：去 "extensão de navegador"
  - [x] `seo.keywords`：追加 "cliente desktop" 等关键词

- [x] Task 11: 清洗 `vi.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "tiện ích mở rộng" → "ứng dụng máy tính"/"client máy tính"
  - [x] `platform.descriptions.*`：去旧术语 → 客户端术语
  - [x] `platformsIndex.seoDescription`：去旧术语
  - [x] `footer.desc`：去旧术语
  - [x] `seo.keywords`：追加桌面客户端关键词

- [x] Task 12: 清洗 `th.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "ส่วนขยาย" → "แอปพลิเคชันบนเดสก์ท็อป"/"ไคลเอนต์เดสก์ท็อป"
  - [x] 注意：th.json 的 platformPage 部分键仍为英文原文，需一并翻译为泰语
  - [x] `platform.descriptions.*`：去旧术语
  - [x] `platformsIndex.seoDescription`：去旧术语
  - [x] `footer.desc`：去旧术语
  - [x] `seo.keywords`：追加桌面客户端关键词

- [x] Task 13: 清洗 `id.json` — platformPage + platform.descriptions + 共享区域
  - [x] `platformPage.*`：去 "ekstensi" → "aplikasi desktop"/"klien desktop"
  - [x] `platform.descriptions.*`：去旧术语
  - [x] `platformsIndex.seoDescription`：去旧术语
  - [x] `footer.desc`：去旧术语
  - [x] `seo.keywords`：追加桌面客户端关键词

## Phase 3：组件 i18n 化

- [x] Task 14: InstallCard.vue 硬编码中文 → i18n 化
  - [x] 提取"下载 Windows 客户端"为 i18n key（`platformPage.install.downloadWindowsClient`）
  - [x] 提取"暂不支持当前系统"为 i18n key
  - [x] 提取"适用于 Windows 10/11 64位"为 i18n key
  - [x] 在 zh-CN.json 和 en-US.json 中添加对应翻译
  - [x] 在其余 9 种语言中添加对应翻译

## Phase 4：验证

- [x] Task 15: 全量验证
  - [x] 对 11 个 locale 文件执行 grep，确认 platformPage / platformsIndex / platform.descriptions / footer.desc 中无残留旧术语
  - [x] 确认 seo.keywords 中已追加桌面客户端关键词
  - [x] 确认 /extension 页面相关键（hero/download/usage/features）未被本次修改影响
  - [x] 确认 InstallCard.vue 已 i18n 化，非中文语言显示本地化文案
  - [x] 运行项目 lint 检查

# Task Dependencies

- [Task 1] [Task 2] 可并行执行（zh-CN 和 en-US 独立）
- [Task 3] 依赖 [Task 1] [Task 2]（需要确认基准语言的替换模式）
- [Task 4] 依赖 [Task 1] [Task 2]
- [Task 5~13] 依赖 [Task 3] [Task 4]（需要基准语言的替换模式作为参考）
- [Task 5~13] 可并行执行（各语言独立）
- [Task 14] 可与 Phase 2 并行执行
- [Task 15] 依赖所有前置任务完成
