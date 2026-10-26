<template>
  <div class="container legal-document">
    <div class="legal-card">
      <p class="eyebrow">Legal Terms & Policy</p>
      <h1>{{ t('termsPage.title') }}</h1>
      <p class="legal-date">{{ t('termsPage.datePrefix') }}{{ operatorName }}</p>

      <article>
        <p>{{ t('termsPage.introPrefix') }}{{ operatorName }}{{ t('termsPage.introSuffix') }}</p>
        
        <div class="entity-badge-box" style="margin-block: 16px;">
          <strong>{{ t('termsPage.noticeStrong') }}</strong> {{ t('termsPage.noticeText') }}
        </div>

        <h2>{{ t('termsPage.s1Title') }}</h2>
        <p>{{ t('termsPage.s1Body') }}</p>

        <h2>{{ t('termsPage.s2Title') }}</h2>
        <p>{{ t('termsPage.s2Body') }}</p>

        <h2>{{ t('termsPage.s3Title') }}</h2>
        <p>{{ t('termsPage.s3Body') }}</p>

        <h2>{{ t('termsPage.s4Title') }}</h2>
        <p>{{ t('termsPage.s4Body') }}</p>

        <h2>{{ t('termsPage.s5Title') }}</h2>
        <p>{{ t('termsPage.s5Before') }}<a :href="`mailto:${supportEmail}`" style="color: var(--brand-primary);">{{ supportEmail }}</a>{{ t('termsPage.s5After') }}</p>

        <h2>{{ t('termsPage.s6Title') }}</h2>
        <p>{{ t('termsPage.s6Body') }}</p>

        <h2>{{ t('termsPage.s7Title') }}</h2>
        <p>{{ t('termsPage.s7Before') }}<a :href="`mailto:${supportEmail}`" style="color: var(--brand-primary);">{{ supportEmail }}</a>{{ t('termsPage.s7After') }}</p>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { getCanonicalUrl, buildHreflangLinks } = useSiteSeo()
const config = useRuntimeConfig()
const supportEmail = config.public.supportEmail
const operatorName = config.public.operatorName

useSeoMeta({
  title: () => t('termsPage.seo.title'),
  description: () => t('termsPage.seo.description'),
  ogTitle: () => t('termsPage.seo.title'),
  ogDescription: () => t('termsPage.seo.description'),
  ogUrl: () => getCanonicalUrl('/terms/'),
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: getCanonicalUrl('/terms/') },
    ...buildHreflangLinks('/terms/'),
  ],
}))
</script>

<style scoped>
.legal-document {
  max-width: 820px;
  margin: 0 auto;
  padding: 48px 0 80px;
}

.legal-card {
  padding: 48px;
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.legal-card h1 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.legal-date {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}

.legal-card article {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.75;
}

.legal-card h2 {
  margin: 36px 0 12px 0;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 700;
}

@media (max-width: 768px) {
  .legal-card {
    padding: 24px;
  }
}
</style>
