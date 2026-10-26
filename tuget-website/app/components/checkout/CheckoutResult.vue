<template>
  <div class="payment-screen-card animate-fade-in-up">
    <div class="success-icon-circle">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" stroke-width="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>

    <h2 class="payment-title">{{ t('resultTitle') }}</h2>
    <p class="payment-subtitle">
      {{ t('resultSubtitle') }} <strong>{{ email }}</strong>{{ period }}
    </p>

    <!-- Activation Code Box -->
    <div class="activation-card">
      <div class="activation-card-badge">{{ t('resultCodeBadge') }}</div>
      <div class="activation-key-text">{{ activationCode }}</div>
      <button
        type="button"
        class="button button--primary"
        style="margin-top: 14px;"
        @click="$emit('copyCode')"
      >
        <svg v-if="copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>{{ copied ? t('resultCopied') : t('resultCopy') }}</span>
      </button>
    </div>

    <div class="entity-badge-box">
      <strong>{{ t('resultHowTo') }}</strong><br>
      {{ t('resultHowToBody') }}
    </div>

    <div class="payment-actions-row">
      <NuxtLink to="/download/" class="button button--primary button--lg">
        {{ t('resultInstallGuide') }}
      </NuxtLink>
      <button type="button" class="button button--subtle button--lg" @click="$emit('buyAnother')">
        {{ t('resultBuyAnother') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCheckoutI18n } from '~/composables/useCheckoutI18n'

const { t, isEnglish } = useCheckoutI18n()

/** 句末标点：中文用全角「。」，英文用半角「. 」。 */
const period = computed(() => (isEnglish.value ? '.' : '。'))

defineProps<{
  activationCode: string
  email: string
  copied: boolean
}>()

defineEmits<{
  (e: 'copyCode'): void
  (e: 'buyAnother'): void
}>()
</script>

<style scoped>
.payment-screen-card {
  max-width: 620px;
  margin: 0 auto;
  padding: 44px 32px;
  background-color: #ffffff;
  border: 1.5px solid var(--border-medium);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.success-icon-circle {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background-color: var(--brand-light);
  border: 2px solid var(--brand-border);
  margin-bottom: 2px;
}

.payment-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
}

.payment-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
}

.payment-subtitle strong {
  color: var(--brand-dark);
}

.activation-card {
  width: 100%;
  padding: 24px;
  border-radius: var(--radius-md);
  background-color: var(--brand-light);
  border: 1.5px solid var(--brand-border);
  text-align: center;
  margin-block: 8px;
}

.activation-card-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-dark);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.activation-key-text {
  margin-top: 8px;
  padding: 12px;
  background-color: #ffffff;
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-sm);
  color: var(--brand-dark);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  word-break: break-all;
  user-select: all;
}

.entity-badge-box {
  padding: 14px;
  border-radius: var(--radius-sm);
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-light);
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.6;
  text-align: left;
  width: 100%;
}

.entity-badge-box strong {
  color: var(--text-primary);
}

.payment-actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .payment-screen-card {
    padding: 24px;
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
