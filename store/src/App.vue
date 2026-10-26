<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <Home />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import Home from './views/home/Home.vue'

// ==========================================
// ⚠️ 变更约束说明：
// 此处的色彩参数为 Naive UI 专用的组件覆盖色。
// 当您修改 CSS 变量（如修改 global.css 中的 --color-primary ）时，
// 必须手动在此处同步修改对应颜色值，以保证 UI 框架与全局样式色彩一致。
// ==========================================
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0071e3',          // 对应 --color-primary
    primaryColorHover: '#0077ed',     // 对应 --color-primary-hover
    primaryColorPressed: '#0062cc',   // 对应 --color-primary-pressed
    primaryColorSuppl: 'rgba(0, 113, 227, 0.12)', // 对应 --color-primary-suppl
  }
}
</script>
