---
name: 插件更新提醒与官网引导方案
overview: 在 popup 和 pages 页面添加内联更新提醒，通过获取官网 version.json 比对版本号，提醒商店版用户更新到官网版（3.x.x），并引导用户只安装一个插件。功能通过特性开关控制，默认关闭。
todos:
  - id: create-update-reminder-component
    content: 创建共用组件 UpdateReminder.vue，实现版本检测和提醒显示逻辑
    status: pending
  - id: integrate-popup-reminder
    content: 在 popup/App.vue 中引入 UpdateReminder 组件
    status: pending
    dependencies:
      - create-update-reminder-component
  - id: integrate-pages-reminder
    content: 在 pages/App.vue 中引入 UpdateReminder 组件
    status: pending
    dependencies:
      - create-update-reminder-component
  - id: test-reminder-display
    content: 测试提醒显示效果，确保 UI 融入现有设计
    status: pending
    dependencies:
      - integrate-popup-reminder
      - integrate-pages-reminder
---

## 用户需求概述

为插件添加更新提醒功能，引导用户安装官网版本（具有新标签页功能，可用于盈利）。

## 核心功能

1. **版本检测**：插件访问 `https://downpictures.com/version.json` 获取最新版本号（extensionVersion字段，如 "2.0.122"），比对用户当前版本的最后一位数字（patch号），低于最新版则提醒更新
2. **版本过滤**：如果当前版本主版本号 >= 3（如 3.0.x），不提醒（已是官网版）
3. **提醒展示位置**：popup 页面和 pages 页面均显示提醒（内联提示样式，融入现有UI）
4. **提醒内容**：

- 有新版可更新，引导去官网 downpictures.com 下载
- 提醒用户只需要安装一个插件即可

5. **特性开关**：功能默认关闭（false），代码中使用 `ENABLE_UPDATE_REMINDER` 常量控制，改为 true 即可开启
6. **简化检测**：不需要实际检测用户是否安装了多个插件，只显示通用提醒文案

## 技术栈选择

- 前端框架：Vue 3（与现有项目一致）
- 网络请求：浏览器原生 fetch API
- 状态管理：Vue ref/reactived（组件级状态）
- 国际化：复用现有 i18n 方案（browser.i18n.getMessage）

## 实现方案

### 方案架构

采用共用组件 + 特性开关的设计模式：

1. 创建共用组件 `UpdateReminder.vue`，封装版本检测和提醒显示逻辑
2. 在 popup 和 pages 入口组件中引入该组件
3. 使用常量 `ENABLE_UPDATE_REMINDER` 控制功能开关

### 核心实现逻辑

#### 版本号解析与比对

```typescript
// 版本号解析：将 "2.0.122" 解析为 [major, minor, patch]
const parseVersion = (version: string): [number, number, number] => {
  const parts = version.split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
};

// 是否需要提醒
const shouldRemind = (current: string, latest: string): boolean => {
  const [currMajor, , currPatch] = parseVersion(current);
  const [latestMajor, , latestPatch] = parseVersion(latest);
  
  // 主版本号 >= 3，已是官网版，不提醒
  if (currMajor >= 3) return false;
  
  // 比对 patch 号
  return currPatch < latestPatch;
};
```

#### 网络请求

```typescript
const checkUpdate = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://downpictures.com/version.json');
    const data = await response.json();
    const latestVersion = data.extensionVersion;
    const currentVersion = browser.runtime.getManifest().version;
    
    return shouldRemind(currentVersion, latestVersion);
  } catch (error) {
    console.error('检查更新失败:', error);
    return false;
  }
};
```

#### 特性开关

在组件或配置文件中定义：

```typescript
const ENABLE_UPDATE_REMINDER = false; // 默认关闭，改为 true 开启
```

### 实现注意事项

1. **性能优化**：版本检查在组件挂载时进行，避免阻塞渲染
2. **错误处理**：网络请求失败时静默失败，不影响用户使用
3. **避免重复请求**：可考虑使用 storage 缓存检查结果（缓存时间 1 小时）
4. **UI 融入**：参考 Linkcopyright.vue 的信息栏样式，保持视觉一致性

### 架构设计

```
components/
  UpdateReminder.vue  # 共用更新提醒组件
entrypoints/
  popup/
    App.vue           # 引入 UpdateReminder
  pages/
    App.vue           # 引入 UpdateReminder
```

### 目录结构

```
d:\Trae\PcGetPic\GetPic\
├── components/
│   └── UpdateReminder.vue  # [NEW] 共用更新提醒组件
├── entrypoints/
│   ├── popup/
│   │   └── App.vue         # [MODIFY] 引入 UpdateReminder 组件
│   └── pages/
│       └── App.vue         # [MODIFY] 引入 UpdateReminder 组件
```

### 关键代码结构

```
<!-- UpdateReminder.vue 接口定义 -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const ENABLE_UPDATE_REMINDER = false; // 功能开关

const showReminder = ref(false);
const latestVersion = ref('');
const currentVersion = ref('');

// 版本解析与比对逻辑
const checkVersion = async () => { /* ... */ };

onMounted(() => {
  if (ENABLE_UPDATE_REMINDER) {
    checkVersion();
  }
});
</script>
```

## Agent Extensions

### SubAgent

- **code-explorer**
- 用途：探索现有代码结构，确保新增组件与现有代码风格一致
- 预期结果：了解 Linkcopyright.vue、Name.vue 等现有组件的样式和布局方式