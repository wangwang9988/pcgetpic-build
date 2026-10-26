# Checklist — 授权系统残余问题修复

## verify_before_operation 更新防时间回拨记录
- [x] `verify_before_operation` 验证通过后更新 `max_history_time` 为当前时间
- [x] 长期运行不重启时，防时间回拨精度随操作持续更新

## check-revoke 和 deactivate 接口速率限制
- [x] `/api/v1/check-revoke` 添加了速率限制
- [x] `/api/v1/deactivate` 添加了速率限制
- [x] 同一 IP 每 15 分钟最多 30 次请求
- [x] 超出限制返回 429 Too Many Requests
