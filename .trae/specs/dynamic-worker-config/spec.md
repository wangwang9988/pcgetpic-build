# 动态调节并发数和静默超时功能 - 产品需求文档

## Overview
- **Summary**: 允许用户在抓取过程中动态调节并发数和静默超时时间，提升用户体验和抓取效率。
- **Purpose**: 当前在抓取过程中无法调整并发数和超时时间，用户需要停止抓取后重新配置，影响使用体验。
- **Target Users**: 所有使用本软件进行图片/视频批量下载的用户。

## Goals
- 用户可以在抓取过程中调节并发数（1-8）
- 用户可以在抓取过程中调节静默超时时间（3-120秒）
- 增加并发数时自动创建新的Worker并分配任务
- 超时时间修改即时生效到所有Worker

## Non-Goals (Out of Scope)
- 不支持在抓取过程中修改其他配置（如下载目录等）
- 不支持并发数减少时强制终止正在运行的Worker

## Background & Context
当前代码结构：
- `ControlBar.vue`: 前端控制组件，包含并发数和超时时间选择器，当前在运行时禁用
- `taskQueueStore`: Pinia状态管理，存储任务队列和Worker状态
- `worker_pool.rs`: Rust端Worker池管理
- `timeout_monitor.rs`: 超时监控，每秒检查一次
- `set_worker_count`: 设置并发数的Tauri命令
- `set_scraping_config`: 设置超时时间的Tauri命令

## Functional Requirements
- **FR-1**: 并发数选择器在抓取过程中可编辑
- **FR-2**: 超时时间选择器在抓取过程中可编辑
- **FR-3**: 增加并发数时自动触发新Worker创建并分配任务
- **FR-4**: 减少并发数时只移除空闲的Worker，不影响正在运行的任务
- **FR-5**: 超时时间修改后即时生效到所有Worker

## Non-Functional Requirements
- **NFR-1**: 并发数修改响应时间 < 1秒
- **NFR-2**: 超时时间修改响应时间 < 1秒
- **NFR-3**: 不影响现有抓取任务的稳定性

## Constraints
- **Technical**: 并发数范围 1-8，超时时间范围 3-120秒
- **Dependencies**: 依赖现有的Worker池和超时监控机制

## Assumptions
- 用户理解增加并发数可能会增加被目标网站封禁的风险
- 用户理解超时时间过短可能导致抓取不完整

## Acceptance Criteria

### AC-1: 并发数选择器在抓取过程中可编辑
- **Given**: 用户正在执行抓取任务
- **When**: 用户点击并发数选择器
- **Then**: 选择器可展开并选择新的并发数
- **Verification**: `human-judgment`

### AC-2: 增加并发数自动创建新Worker
- **Given**: 当前并发数为2，正在抓取中
- **When**: 用户将并发数改为5
- **Then**: 系统自动创建3个新Worker并分配待抓取任务
- **Verification**: `programmatic` - 检查Worker数量和任务分配情况

### AC-3: 减少并发数不影响运行中任务
- **Given**: 当前并发数为4，有4个Worker正在运行
- **When**: 用户将并发数改为2
- **Then**: 正在运行的Worker继续完成任务，空闲Worker被移除
- **Verification**: `programmatic` - 检查运行中Worker不受影响

### AC-4: 超时时间修改即时生效
- **Given**: 当前超时时间为60秒，有Worker正在运行
- **When**: 用户将超时时间改为30秒
- **Then**: 超时监控立即使用新的超时时间
- **Verification**: `programmatic` - 检查超时监控使用新时间

### AC-5: 修改后有视觉反馈
- **Given**: 用户修改并发数或超时时间
- **When**: 修改成功后
- **Then**: 显示成功提示消息
- **Verification**: `human-judgment`

## Open Questions
- [x] 是否需要通知用户修改已生效？（已决定：显示消息提示）
- [x] 超时时间是否对已运行的任务立即生效？（已决定：立即生效）
