# 移除 Wildberries 多余 Referer 映射 Spec

## Why
Rust 后端 `utils.rs` 的 `get_referer_for_url()` 函数中多写了 2 个 Wildberries 相关的 Referer 映射条目（`wbbasket.ru` 和 `wildberries.ru`），但参考项目 `GetPic` 明确没有对 Wildberries 做任何防盗链处理。Wildberries CDN 不做 Referer 校验，直接请求即可成功下载，这些多余条目会导致 Rust 下载层对 Wildberries 资源不必要地注入 Referer 头。

## What Changes
- 从 `src-tauri/src/utils.rs` 的 `REFERER_MAP` 中移除 `wbbasket.ru` 和 `wildberries.ru` 两条映射

## Impact
- Affected specs: `add-anti-hotlink-support`（对齐原始规格，该规格仅定义了 5 个 CDN 域名）
- Affected code: `src-tauri/src/utils.rs`（`get_referer_for_url` 函数）

## ADDED Requirements

（无新增）

## MODIFIED Requirements

### Requirement: CDN 域名 → Referer 映射表对齐参考项目
`REFERER_MAP` SHALL 严格对齐参考项目 `GetPic` 中三个防盗链平台的规则，仅保留 5 个 CDN 域名映射：

| CDN 域名 | 所需 Referer |
|:---|:---|
| `360buyimg.com` | `https://item.jd.com/` |
| `jdimg.com` | `https://item.jd.com/` |
| `sinaimg.cn` | `https://weibo.com/` |
| `weibocdn.com` | `https://weibo.com/` |
| `photo.yupoo.com` | `https://www.yupoo.com/` |

移除以下 2 条不属于参考项目的映射：
- `wbbasket.ru` → `https://www.wildberries.ru/`
- `wildberries.ru` → `https://www.wildberries.ru/`

#### Scenario: Wildberries 图片下载不注入 Referer
- **WHEN** 用户下载 `https://basket-10.wbbasket.ru/vol1455/part145533/145533362/images/big/1.jpg`
- **THEN** Rust 后端使用 URL 自身域名 `https://basket-10.wbbasket.ru/` 作为 Referer（回退逻辑），不使用 `https://www.wildberries.ru/`

#### Scenario: 京东图片下载仍正确注入 Referer
- **WHEN** 用户下载 `https://img14.360buyimg.com/n1/jfsxxx.jpg`
- **THEN** Rust 后端发送请求时 Referer 仍为 `https://item.jd.com/`（不受影响）

## REMOVED Requirements

（无移除项）
