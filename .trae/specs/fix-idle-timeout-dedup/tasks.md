# Tasks

- [x] Task 1: 统一 Rust 端 scrape_handler.rs 的数据变化判定标准
  - [x] 1.1: 将 `update_data_change_time(worker_id)` 调用从无条件执行改为仅在 `is_substantial` 为 true 时执行
  - [x] 1.2: 验证 `is_substantial` 判定逻辑覆盖 MainPic/DetailPic/SkuPic/VideoInfo/VideoUrls 五个 key，与前端 `lastAnyDataChangeAt` 的触发条件一致

- [x] Task 2: 为 tauri-bridge.ts 的 lastAnyDataChangeAt 增加去重保护
  - [x] 2.1: 新增 `prevAnyDataValues: Map<string, string>` 存储每个 key 的上次序列化值
  - [x] 2.2: 在 `send()` 中，对非 IMAGE_DATA_KEYS 的数据，将 value 序列化后与 prevAnyDataValues 中的旧值比对，仅当不同时才设置 `isNewSubstantialData = true` 并更新 `lastAnyDataChangeAt`
  - [x] 2.3: IMAGE_DATA_KEYS 的图片数据仍使用 `uploadedImageKeys` 做 URL 级精确去重，`isNewSubstantialData` 的判定改为：图片数据有新 URL 时为 true，否则为 false
  - [x] 2.4: 在 `resetUploadedDataFlag()` 中清空 `prevAnyDataValues`

- [x] Task 3: 修正 waitForCompletion 中图片/通用数据的优先级逻辑
  - [x] 3.1: 将 `effectiveRawChangeAt` 的计算逻辑从"有图片则忽略通用"改为"取两者中较晚的时间"
  - [x] 3.2: 更新日志输出，反映合并判定的数据源信息

- [x] Task 4: 修复 waitForCompletion 中 maxWaitMs 兜底被突破的问题
  - [x] 4.1: 增加 `hardDeadlineMs` 变量，值为 `startTime + maxWaitMs + 5000`（5 秒宽限期）
  - [x] 4.2: 当 `totalElapsed >= maxWaitMs` 且 `timeSinceLastData < 3000` 时，检查是否已超过 `hardDeadlineMs`，超过则强制完成
  - [x] 4.3: 更新日志输出，反映硬性截止时间的判定信息

- [x] Task 5: 验证 jdGetVideo/tbGetVideo 的重复发送不会绕过去重
  - [x] 5.1: 确认 Task 2 的去重机制能有效拦截 `onVideoFound` 中相同视频集合的重复 send 调用
  - [x] 5.2: 检查 taobao/tbGetVideo.ts 是否存在同样的 onVideoFound 重复发送问题

# Task Dependencies
- Task 2 和 Task 1 可并行执行（Rust 端和前端互不依赖）
- Task 3 依赖 Task 2（去重保护到位后，合并判定逻辑才有意义）
- Task 4 独立，可与 Task 3 并行
- Task 5 依赖 Task 2（验证去重效果）
