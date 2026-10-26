# Tasks

- [x] Task 1: 更新 i18n.ts 配置
  - [x] `locales` 数组精简为 11 种语言（zh-CN, en-US, zh-TW, ja, ko, es, de, pt-BR, vi, th, id）
  - [x] `CORE_LOCALES` 扩展为 11 种语言（与 locales 一致）
  - [x] `localeFlagMap` 精简为 11 种语言的映射

- [x] Task 2: 删除 42 个未适配语言的 locale JSON 文件
  - [x] 删除除 zh-CN, en-US, zh-TW, ja, ko, es, de, pt-BR, vi, th, id 之外的所有 JSON 文件（包括 ta_audit_report.json）

- [x] Task 3: 补全 zh-TW.json 翻译
  - [x] 将所有空字符串值替换为繁体中文翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 4: 补全 ja.json 翻译
  - [x] 将所有空字符串值替换为日语翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 5: 补全 ko.json 翻译
  - [x] 将所有空字符串值替换为韩语翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 6: 补全 es.json 翻译
  - [x] 将所有空字符串值替换为西班牙语翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 7: 补全 de.json 翻译
  - [x] 将所有空字符串值替换为德语翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 8: 补全 pt-BR.json 翻译
  - [x] 将所有空字符串值替换为巴西葡萄牙语翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 9: 补全 vi.json 翻译
  - [x] 将所有空字符串值替换为越南语翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 10: 补全 th.json 翻译
  - [x] 将所有空字符串值替换为泰语翻译
  - [x] 确保桌面客户端相关区域完整翻译

- [x] Task 11: 补全 id.json 翻译
  - [x] 将所有空字符串值替换为印尼语翻译
  - [x] 确保桌面客户端相关区域完整翻译

# Task Dependencies

- [Task 2] 依赖 [Task 1]（先确认保留哪些语言）
- [Task 3-11] 可全部并行执行（互不依赖）
- [Task 3-11] 依赖 [Task 1]（需要确认 i18n 数据结构已稳定）
