<template>
  <section class="page-hero client-hero">
    <div class="container">
      <p class="eyebrow">
        <MicrosoftStoreMark :size="14" />
        {{ t('clientPage.hero.eyebrow') }}
      </p>
      <h1>{{ t('clientPage.hero.title') }}</h1>
      <p>
        {{ t('clientPage.hero.lead') }}
      </p>
      <div class="hero-actions">
        <a
          :href="microsoftStoreUrl"
          class="btn-delivery-store"
          target="_blank"
          rel="noopener"
          @click="trackStoreClick('client_hero')"
        >
          <div class="btn-icon-area">
            <MicrosoftStoreMark :size="20" />
          </div>
          <div class="btn-text-area">
            <span class="btn-title">{{ t('clientPage.hero.installBtnTitle') }}</span>
            <span class="btn-subtext">{{ t('clientPage.hero.installBtnSub') }}</span>
          </div>
        </a>
        <NuxtLink :to="localePath('/download/')" class="button button--ghost button--lg button--store-companion">
          {{ t('clientPage.hero.guideBtn') }}
        </NuxtLink>
      </div>

      <!-- 备用离线下载渠道（紧贴主按钮下方，轻量不抢眼，但清晰可见） -->
      <div class="hero-fallback-channel">
        <span class="fallback-tip">{{ t('clientPage.hero.fallbackTip') }}</span>
        <button
          type="button"
          class="fallback-btn"
          @click="emit('open-exe-guide')"
        >
          {{ t('clientPage.hero.fallbackBtn') }}
        </button>
        <a
          :href="exeDownloadUrl"
          class="sr-only"
          referrerpolicy="origin-when-cross-origin"
        >{{ t('clientPage.hero.fallbackSr') }}</a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import MicrosoftStoreMark from "~/components/MicrosoftStoreMark.vue"
import { useProductInstallLinks } from "~/composables/useProductInstallLinks"

const { t } = useI18n()
const localePath = useLocalePath()

const emit = defineEmits<{
  'open-exe-guide': []
}>()

const { microsoftStoreUrl, exeDownloadUrl, trackStoreClick } = useProductInstallLinks()
</script>

<style scoped>
.client-hero {
  padding-bottom: 32px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 20px;
}

.hero-fallback-channel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.82rem;
  margin-top: 4px;
}

.fallback-tip {
  color: var(--text-muted);
}

.fallback-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.fallback-btn:hover {
  color: #0078d4;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
