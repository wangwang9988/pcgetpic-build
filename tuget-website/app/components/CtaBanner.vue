<template>
  <div class="cta-banner">
    <div class="cta-banner-content">
      <h2>{{ resolvedTitle }}</h2>
      <p>{{ resolvedDescription }}</p>
    </div>
    <div class="cta-banner-actions">
      <a
        v-if="isExternal(resolvedButtonLink)"
        :href="resolvedButtonLink"
        class="btn-delivery-store"
        target="_blank"
        rel="noopener"
        @click="handleStoreClick"
      >
        <div class="btn-icon-area">
          <MicrosoftStoreMark :size="20" />
        </div>
        <div class="btn-text-area">
          <span class="btn-title">{{ resolvedButtonText }}</span>
          <span class="btn-subtext">{{ resolvedButtonSubtext }}</span>
        </div>
      </a>
      <NuxtLink v-else :to="localePath(resolvedButtonLink)" class="btn-delivery-store">
        <div class="btn-icon-area">
          <MicrosoftStoreMark :size="20" />
        </div>
        <div class="btn-text-area">
          <span class="btn-title">{{ resolvedButtonText }}</span>
          <span class="btn-subtext">{{ resolvedButtonSubtext }}</span>
        </div>
      </NuxtLink>
      <NuxtLink v-if="resolvedGhostText && ghostLink" :to="localePath(ghostLink)" class="button button--lg button--ghost button--store-companion">
        {{ resolvedGhostText }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { microsoftStoreUrl, trackStoreClick } = useProductInstallLinks()

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    buttonText?: string
    buttonSubtext?: string
    buttonLink?: string
    ghostText?: string
    ghostLink?: string
  }>(),
  {
    title: undefined,
    description: undefined,
    buttonText: undefined,
    buttonSubtext: undefined,
    buttonLink: '',
    ghostText: undefined,
    ghostLink: '/client/',
  }
)

const resolvedTitle = computed(() => props.title ?? t('cta.defaultTitle'))
const resolvedDescription = computed(() => props.description ?? t('cta.defaultDesc'))
const resolvedButtonText = computed(() => props.buttonText ?? t('cta.defaultBtnText'))
const resolvedButtonSubtext = computed(() => props.buttonSubtext ?? t('cta.defaultBtnSubtext'))
const resolvedGhostText = computed(() => props.ghostText ?? t('cta.defaultGhostText'))
const resolvedButtonLink = computed(() => props.buttonLink || microsoftStoreUrl.value)

function isExternal(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

function handleStoreClick() {
  trackStoreClick('cta_banner')
}
</script>

<style scoped>
.cta-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 32px;
  padding: 48px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  box-shadow: var(--shadow-lg);
}

.cta-banner-content {
  max-width: 620px;
}

.cta-banner h2 {
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: clamp(1.6rem, 3.2vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.cta-banner p {
  margin: 0;
  color: #cbd5e1;
  font-size: 1.05rem;
  line-height: 1.6;
}

.cta-banner-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .cta-banner {
    padding: 24px;
    flex-direction: column;
    align-items: flex-start;
  }

  .cta-banner-actions {
    width: 100%;
  }

  .cta-banner-actions .btn-delivery-store,
  .cta-banner-actions .button {
    width: 100%;
    justify-content: center;
  }
}
</style>
