<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const { locale, t } = useI18n()

useHead({
  titleTemplate: title => title ? `${title} · ${t('app.siteName')}` : t('app.defaultTitle'),
  htmlAttrs: {
    lang: () => locale.value || 'zh-CN',
  },
})

useSeoMeta({
  ogType: 'website',
  ogSiteName: () => t('app.siteName'),
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterCard: 'summary_large_image',
  twitterImage: `${config.public.siteUrl}/og.png`,
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: t('app.siteName'),
        legalName: config.public.operatorName,
        url: config.public.siteUrl,
        logo: `${config.public.siteUrl}/tuget-icon.png`,
        email: config.public.supportEmail,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: config.public.supportEmail,
          availableLanguage: ['Chinese', 'zh-CN', 'zh-TW', 'English', 'en-US'],
        },
      }),
    },
  ],
})
</script>
