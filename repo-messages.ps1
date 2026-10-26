$repoMessages = @{
    'client' = @{
        Title = 'docs: 优化知乎电商素材采集效率文章并新增发布规范'
        Details = @(
            '从效率困境文中移除合规自查清单等附加信息，确保正文纯净性'
            '新增知乎文章发布规则与撰写规范文档，覆盖排版格式、内容合规、发布流程等要求'
        )
    }
    'Pro-GetPic' = @{
        Title = 'feat: 引入 B/C 线深度阶段调度与跨帧采集预算分配'
        Details = @(
            '新增 bcDeepStageScheduler 实现 B/C 线深度采集的顺序协调：C 线深度任务等待同页 B 线完成后才启动，避免资源争抢'
            '新增 frameCaptureBudget 模块，将 tab 级采集预算按帧分配，替代原有固定帧数截断和页面级资源上限'
            'captureCoordinator 改为先探测各帧 usage 再按预算分配 captureBudget，跳过已无余量的帧'
            'discoveryResourceSession 支持 prepareCaptureBudget/applyCaptureBudget，允许后台按 tab 级总量重新分配每帧上限'
            'responseInspectors 和 protocol 传递 maxResponseChars 到 main-world，实现响应正文预算的帧级控制'
            '补充架构边界测试、预算单元测试和 content-runtime 测试断言'
        )
    }
    '(root)' = @{
        Title = 'chore: 更新子项目引用'
        Details = @(
            '同步 client 与 Pro-GetPic 的最新提交指针'
        )
    }
}
