# 迁移 ad-site 项目到 GetPic 根目录 Spec

## Why

`ad-site` 是一个独立的 Vue 3 + Vite 项目（广告/推荐内容嵌入页），当前放在 `GetPic/docs/ad-site/` 下，与 `docs/` 下的文档资源（SVG 图标、技术文档、隐私政策等）性质不同，不符合标准项目结构。

## What Changes

* 将 `GetPic/docs/ad-site/` 整个目录移动到 `GetPic/ad-site/`

* 更新 `README.md` 中的本地文件链接（`file:///d:/Trae/getPic/docs/ad-site/` → `file:///d:/Trae/getPic/ad-site/`）

* 更新 `README.md` 中的 `cd docs/ad-site` 路径提示为 `cd ad-site`

## Impact

* Affected code: `GetPic/docs/ad-site/README.md`（移动后变为 `GetPic/ad-site/README.md`）

* 不影响插件代码：插件通过 iframe 引用线上地址 `https://addp.yueding168.com/`，不引用本地路径

* 不影响 ad-site 内部代码：所有内部引用均为相对路径或 `@/` 别名

## ADDED Requirements

### Requirement: ad-site 项目目录规范化

系统 SHALL 将 ad-site 独立项目放置在 `GetPic/` 根目录下，与 `entrypoints/`、`utils/`、`components/` 等平级，而非嵌套在 `docs/` 下。

#### Scenario: 移动后项目可正常运行

* **WHEN** 执行 `cd ad-site && npm install && npm run dev`

* **THEN** 项目正常启动，开发服务器在 5188 端口运行

#### Scenario: 移动后 README 中路径正确

* **WHEN** 查看 `ad-site/README.md`

* **THEN** 所有本地文件链接指向 `ad-site/` 而非 `docs/ad-site/`

* **AND** `cd` 命令提示指向 `ad-site` 而非 `docs/ad-site`

