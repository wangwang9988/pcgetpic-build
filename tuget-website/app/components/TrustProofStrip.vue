<template>
  <div class="trust-proof-strip" :aria-label="t('trustProof.ariaLabel')">
    <div class="trust-proof-item">
      <strong>{{ t('trustProof.item1Title') }}</strong>
      <span>{{ t('trustProof.item1Desc') }}</span>
    </div>
    <div class="trust-proof-item">
      <strong>{{ t('trustProof.item2Title') }}</strong>
      <span>{{ t('trustProof.item2Desc') }}</span>
    </div>
    <div class="trust-proof-item">
      <strong>{{ t('trustProof.item3Title') }}</strong>
      <span>{{ t('trustProof.item3Desc') }}</span>
    </div>
    <div class="trust-proof-item">
      <strong>{{ t('trustProof.item4Title') }}</strong>
      <span>{{ t('trustProof.item4Desc') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>

<style scoped>
.trust-proof-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background-color: var(--border-light);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-xs);
}

.trust-proof-item {
  padding: 28px 24px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trust-proof-item strong {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.trust-proof-item span {
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.45;
}

@media (max-width: 1024px) {
  .trust-proof-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .trust-proof-strip {
    grid-template-columns: 1fr;
  }
}
</style>
