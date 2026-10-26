<template>
  <section class="section section--subtle">
    <div class="container">
      <div class="section-heading section-heading--center">
        <p class="eyebrow">Engineered for Batch Workflows</p>
        <h2>{{ t('clientPage.features.heading') }}</h2>
        <p>{{ t('clientPage.features.subheading') }}</p>
      </div>

      <div class="feature-grid-3">
        <article v-for="feat in coreFeatures" :key="feat.num" class="feature-card">
          <div class="feature-icon-box">{{ feat.num }}</div>
          <h3>{{ feat.title }}</h3>
          <p>{{ feat.desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LocaleCode } from '~/config/i18n'
import { CLIENT_CORE_FEATURES } from '~/data/siteContent'

const { t, locale } = useI18n()
const coreFeatures = computed(() => CLIENT_CORE_FEATURES[(locale.value as LocaleCode) || 'zh-CN'] || CLIENT_CORE_FEATURES['zh-CN'])
</script>

<style scoped>
.feature-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  padding: 28px 24px;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-medium);
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.feature-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  border: 1px solid var(--border-medium);
  margin-bottom: 14px;
  background-color: var(--bg-body);
  color: var(--text-secondary);
}

@media (max-width: 860px) {
  .feature-grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
