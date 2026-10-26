# Checklist

- [x] `start_scraping` 在调用 `do_dispatch` 前关闭所有 `login-` 前缀窗口
- [x] 关闭登录窗口后等待 1.5 秒 Cookie 落盘
- [x] `dispatch.rs` 中不再有 Worker 创建后关闭登录窗口的代码
- [x] `cargo check` 编译通过，无错误
- [ ] 开发模式下抓取 Worker 正常弹出（回归验证）
- [ ] 安装版 exe 中抓取 Worker 正常弹出（回归验证）
- [ ] 抓取开始时登录窗口被关闭，不会同时存在大量窗口