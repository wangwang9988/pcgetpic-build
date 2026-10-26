# Checklist

- [x] `start_scraping` 函数中不再包含关闭登录窗口的代码（`commands.rs` 第 71-79 行已删除）
- [x] `start_scraping` 在调用 `do_dispatch` 前有 3 秒等待 WebView2 进程退出的逻辑
- [x] `do_dispatch` 首个 Worker 的基础延迟从 1500ms 改为 3000ms
- [x] `cargo check` 编译通过，无错误
- [x] 代码注释清晰说明等待原因（WebView2 进程退出 + data_directory 文件锁释放）
- [x] 前端 `startAllPlatforms()` 和 `startCurrentPlatform()` 的调用流程不受影响