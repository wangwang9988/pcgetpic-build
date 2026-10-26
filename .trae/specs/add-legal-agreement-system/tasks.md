# Tasks

- [x] Task 1: 重写 UserAgreementDialog.vue 协议内容
  - [x] 1.1: 基于 docs/软件协议 V4.0 版本（KwNpM.md）和授权方案文档，编写完整的用户协议文本，包含：定义条款、软件性质声明、授权许可、用户声明与保证、禁止行为、用户责任原则、知识产权、风险披露、免责声明、责任限制、赔偿条款、隐私与数据处理、未成年人保护、协议修改与终止、争议解决、一般条款
  - [x] 1.2: 将协议内容替换到 UserAgreementDialog.vue 中，保持现有弹窗结构不变
  - [x] 1.3: 将弹窗标题改为"法律信息"，保持 NModal preset="card" 结构

- [x] Task 2: 移除状态栏用户协议按钮，添加三级菜单入口
  - [x] 2.1: 从 StatusBar.vue 中移除"用户协议"按钮和 UserAgreementDialog 引用
  - [x] 2.2: 在 DownloadSettings.vue 底部添加"关于"子区域，包含"法律信息"文字链接
  - [x] 2.3: 在 DownloadSettings.vue 中引入 UserAgreementDialog，点击"法律信息"时调用 open()

- [x] Task 3: 创建 FirstLaunchAgreement.vue 首次安装告知弹窗
  - [x] 3.1: 创建 FirstLaunchAgreement.vue 组件，实现低视觉干扰的告知弹窗（约400px宽，半透明毛玻璃风格）
  - [x] 3.2: 弹窗内容为简短告知文字 + "查看完整协议"可点击区域
  - [x] 3.3: 实现 mask-closable，点击遮罩关闭弹窗并标记 localStorage
  - [x] 3.4: 点击弹窗内部区域时打开完整 UserAgreementDialog

- [x] Task 4: 在 App.vue 中集成首次安装弹窗逻辑
  - [x] 4.1: 引入 FirstLaunchAgreement 组件
  - [x] 4.2: 在 onMounted 中检查 localStorage `downpictures_agreement_seen` 标记
  - [x] 4.3: 若无标记，延迟显示首次安装告知弹窗（在授权检查完成后）

# Task Dependencies
- Task 2 depends on Task 1 (需要 UserAgreementDialog 已更新)
- Task 3 depends on Task 1 (需要 UserAgreementDialog 可供首次弹窗调用)
- Task 4 depends on Task 3 (需要 FirstLaunchAgreement 组件已创建)
