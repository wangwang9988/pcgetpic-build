<template>
  <section class="section">
    <div class="container">
      <div class="section-heading section-heading--center">
        <p class="eyebrow">Core Extraction Scenarios</p>
        <h2>{{ t('clientPage.scenarios.heading') }}</h2>
        <p>
          {{ t('clientPage.scenarios.subheading') }}
        </p>
      </div>

      <div class="feature-grid-3">
        <article class="feature-card">
          <div class="feature-icon-box" style="background-color: #ecfdf5; color: #065f46; border-color: #a7f3d0;">
            01
          </div>
          <div style="margin-bottom: 6px;">
            <span class="pipeline-badge pipeline-badge--green">{{ t('clientPage.scenarios.s1Badge') }}</span>
          </div>
          <h3>{{ t('clientPage.scenarios.s1Title') }}</h3>
          <p>
            {{ t('clientPage.scenarios.s1Desc') }}
          </p>
          <div class="pipeline-tags">
            <span>{{ t('clientPage.scenarios.s1Tag1') }}</span>
            <span>{{ t('clientPage.scenarios.s1Tag2') }}</span>
            <span>{{ t('clientPage.scenarios.s1Tag3') }}</span>
          </div>
        </article>

        <article class="feature-card">
          <div class="feature-icon-box" style="background-color: #eff6ff; color: #1e40af; border-color: #bfdbfe;">
            02
          </div>
          <div style="margin-bottom: 6px;">
            <span class="pipeline-badge pipeline-badge--blue">{{ t('clientPage.scenarios.s2Badge') }}</span>
          </div>
          <h3>{{ t('clientPage.scenarios.s2Title') }}</h3>
          <p>
            {{ t('clientPage.scenarios.s2Desc') }}
          </p>
          <div class="pipeline-tags">
            <span>{{ t('clientPage.scenarios.s2Tag1') }}</span>
            <span>{{ t('clientPage.scenarios.s2Tag2') }}</span>
            <span>{{ t('clientPage.scenarios.s2Tag3') }}</span>
          </div>
        </article>

        <article class="feature-card">
          <div class="feature-icon-box" style="background-color: #fffbeb; color: #92400e; border-color: #fde68a;">
            03
          </div>
          <div style="margin-bottom: 6px;">
            <span class="pipeline-badge pipeline-badge--amber">{{ t('clientPage.scenarios.s3Badge') }}</span>
          </div>
          <h3>{{ t('clientPage.scenarios.s3Title') }}</h3>
          <p>
            {{ t('clientPage.scenarios.s3Desc') }}
          </p>
          <div class="pipeline-tags">
            <span>{{ t('clientPage.scenarios.s3Tag1') }}</span>
            <span>{{ t('clientPage.scenarios.s3Tag2') }}</span>
            <span>{{ t('clientPage.scenarios.s3Tag3') }}</span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n()
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

.pipeline-badge {
  font-weight: 700;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.pipeline-badge--green {
  background: rgba(5, 150, 105, 0.12);
  color: #059669;
}

.pipeline-badge--blue {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.pipeline-badge--amber {
  background: rgba(217, 119, 6, 0.12);
  color: #d97706;
}

.pipeline-tags {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pipeline-tags span {
  font-size: 0.72rem;
  padding: 3px 8px;
  background: var(--bg-body);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  color: var(--text-secondary);
}

@media (max-width: 860px) {
  .feature-grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
