# Checklist

- [ ] `save_blob_to_file` Rust 命令已实现并注册到 `invoke_handler`
- [ ] `src-tauri/capabilities/default.json` 已补充新命令权限
- [ ] `package.json` 已添加 `pica`、`browser-image-compression`、`jszip`、`@vicons/ionicons5` 依赖
- [ ] `src/utils/image-toolkit/` 下核心处理模块已迁移且无浏览器插件专属 API 残留
- [ ] `src/composables/useImageToolkit.ts` 已创建并导出完整工具箱 API
- [ ] `src/components/ImageToolkitPanel.vue` 已使用 Naive UI 实现并适配暗黑主题
- [ ] `src/components/SiderPanel.vue` 已新增「图片工具箱」模式入口
- [ ] `src/App.vue` 已扩展 `activeMode` 并在内容区渲染图片工具箱
- [ ] 本地图片上传/拖拽可正确加载并显示原图信息
- [ ] 格式转换、修改尺寸、控制体积、批量重命名、电商比例五种处理功能均可正常工作
- [ ] 预览当前、下载当前、批量处理、批量导出 ZIP、批量导出功能均可正常工作
- [ ] 导出文件能正确保存到用户选择的本地目录
- [ ] `npm run typecheck` 无类型错误
- [ ] `cargo check` 无 Rust 编译错误
