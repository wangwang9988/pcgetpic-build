<template>
  <div class="container legal-document">
    <div class="legal-card">
      <p class="eyebrow">Privacy & Security</p>
      <h1>{{ t('privacyPage.title') }}</h1>
      <p class="legal-date">{{ t('privacyPage.datePrefix') }}{{ operatorName }}</p>

      <article>
        <p>
          {{ t('privacyPage.introPrefix') }}{{ operatorName }}{{ t('privacyPage.introSuffix') }}
        </p>

        <h2>{{ t('privacyPage.s1Title') }}</h2>
        <p>{{ t('privacyPage.s1Intro') }}</p>
        <ul>
          <li><strong>{{ t('privacyPage.s1Item1Strong') }}</strong> {{ t('privacyPage.s1Item1Text') }}</li>
          <li><strong>{{ t('privacyPage.s1Item2Strong') }}</strong> {{ t('privacyPage.s1Item2Text') }}</li>
          <li><strong>{{ t('privacyPage.s1Item3Strong') }}</strong> {{ t('privacyPage.s1Item3Text') }}</li>
        </ul>

        <h2>{{ t('privacyPage.s2Title') }}</h2>
        <div class="entity-badge-box" style="margin-block: 14px;">
          <strong>{{ t('privacyPage.s2BoxStrong') }}</strong> {{ t('privacyPage.s2BoxText') }}
        </div>

        <h2>{{ t('privacyPage.s3Title') }}</h2>
        <p>{{ t('privacyPage.s3Body') }}</p>

        <h2>{{ t('privacyPage.s4Title') }}</h2>
        <p>{{ t('privacyPage.s4Intro') }}</p>
        <ul>
          <li><strong>{{ t('privacyPage.s4Item1Strong') }}</strong> {{ t('privacyPage.s4Item1Text') }}</li>
          <li><strong>{{ t('privacyPage.s4Item2Strong') }}</strong> {{ t('privacyPage.s4Item2Text') }}</li>
          <li><strong>{{ t('privacyPage.s4Item3Strong') }}</strong> {{ t('privacyPage.s4Item3Text') }}</li>
          <li><strong>{{ t('privacyPage.s4Item4Strong') }}</strong> {{ t('privacyPage.s4Item4Text') }}</li>
        </ul>

        <h2>{{ t('privacyPage.s5Title') }}</h2>
        <p>{{ t('privacyPage.s5Body') }}</p>

        <h2>{{ t('privacyPage.s6Title') }}</h2>
        <p>{{ t('privacyPage.s6Before') }}<a :href="`mailto:${supportEmail}`" style="color: var(--brand-primary);">{{ supportEmail }}</a>{{ t('privacyPage.s6After') }}</p>
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
  title: () => t('privacyPage.seo.title'),
  description: () => t('privacyPage.seo.description'),
  ogTitle: () => t('privacyPage.seo.title'),
  ogDescription: () => t('privacyPage.seo.description'),
  ogUrl: () => getCanonicalUrl('/privacy/'),
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: getCanonicalUrl('/privacy/') },
    ...buildHreflangLinks('/privacy/'),
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
