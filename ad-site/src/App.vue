<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue';
import ProductRecommendation from './components/ProductRecommendation.vue';
import DeveloperDashboard from './components/DeveloperDashboard.vue';
import StarbookPromo from './components/StarbookPromo.vue';
const KefuPromo = defineAsyncComponent(() => import('./components/KefuPromo.vue'));

const getInitialState = () => {
  const params = new URLSearchParams(window.location.search);
  const rawType = params.get('rankType') || params.get('type');
  const mode = params.get('mode');
  const page = params.get('page');

  // 统一转为字符串并处理大小写：字母编号统一为 eX 格式
  const normalizeRankType = (value: string | null): number | string => {
    if (!value) return 1;
    // 纯数字直接返回数字类型
    const num = parseInt(value);
    if (!isNaN(num)) return num;
    // 字符串：统一转小写后，如果以 e 开头则格式化为 e+大写字母
    const lower = value.toLowerCase();
    if (/^e[a-z]$/.test(lower)) {
      return 'e' + (lower[1] as string).toUpperCase();
    }
    return value;
  };

  return {
    rankType: normalizeRankType(rawType),
    isDocsMode: mode === 'docs',
    isStarbookPromo: page === 'starbook-promo',
    isKefuPromo: page === 'kefu-promo'
  };
};

const state = ref(getInitialState());
</script>

<template>
  <div class="min-h-screen bg-transparent">
    <StarbookPromo v-if="state.isStarbookPromo" />
    <KefuPromo v-else-if="state.isKefuPromo" standalone />
    <DeveloperDashboard v-else-if="state.isDocsMode" />
    <ProductRecommendation v-else :rankType="state.rankType" width="100%" height="100vh" />
  </div>
</template>

<style>
body {
  margin: 0;
  overflow: hidden;
}
</style>
