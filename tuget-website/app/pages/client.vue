<template>
  <div class="client-page">
    <!-- Client Hero Component -->
    <ClientHero @open-exe-guide="showExeGuide = true" />

    <!-- Cockpit Visual Preview -->
    <section class="section section--subtle" style="padding-top: 32px; padding-bottom: 40px;">
      <div class="container" style="max-width: 1040px;">
        <div class="section-heading section-heading--center" style="margin-bottom: 24px;">
          <p class="eyebrow">Interface Preview</p>
          <h2>{{ t('clientPage.cockpit.title') }}</h2>
          <p>{{ t('clientPage.cockpit.desc') }}</p>
        </div>
        <TuGetClientMockup />
      </div>
    </section>

    <!-- Core Extraction Scenarios Component -->
    <ClientScenarios />

    <!-- Deep 6 Capabilities Component -->
    <ClientFeatures />

    <!-- 平台专题直达：场景区块内链入口，引导爬虫与用户进入长尾落地页 -->
    <section class="section" style="padding-top: 0;">
      <div class="container" style="max-width: 960px;">
        <div class="section-heading section-heading--center" style="margin-bottom: 32px;">
          <p class="eyebrow">Platform Guides</p>
          <h2>{{ t('clientPage.platforms.heading') }}</h2>
          <p>{{ t('clientPage.platforms.subheading') }}</p>
        </div>

        <div class="client-platform-links">
          <NuxtLink
            v-for="entry in clientPlatformEntries"
            :key="entry.to"
            :to="localePath(entry.to)"
            class="client-platform-link-card"
          >
            <span class="client-platform-link-name">{{ entry.name }}</span>
            <span class="client-platform-link-desc">{{ entry.desc }}</span>
            <span class="client-platform-link-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Trust Proof Strip Component -->
    <section class="section">
      <div class="container">
        <TrustProofStrip />
      </div>
    </section>

    <!-- Client FAQ Component -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Technical FAQ</p>
          <h2>{{ t('clientPage.faq.heading') }}</h2>
        </div>

        <FaqSection :faqs="clientFaqs" />
      </div>
    </section>

    <!-- Bottom CTA Component -->
    <section class="section">
      <div class="container">
        <CtaBanner
          :title="t('clientPage.cta.title')"
          :description="t('clientPage.cta.desc')"
          :button-text="t('clientPage.cta.btnText')"
          :button-link="microsoftStoreUrl"
          :ghost-text="t('clientPage.cta.ghostText')"
          ghost-link="/download/"
        />

        <div class="hero-activation-footer-tip">
          <span>{{ t('clientPage.cta.buyTipPrefix') }}</span>
          <NuxtLink :to="getBuyUrl()" class="activation-link">{{ t('clientPage.cta.buyTipLink') }}</NuxtLink>
        </div>
      </div>
    </section>

    <!-- EXE 下载引导模态框 -->
    <ExeDownloadGuideModal
      v-model="showExeGuide"
      :store-url="microsoftStoreUrl"
      :exe-url="exeDownloadUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import ClientHero from "~/components/client/ClientHero.vue"
import ClientScenarios from "~/components/client/ClientScenarios.vue"
import ClientFeatures from "~/components/client/ClientFeatures.vue"
import TuGetClientMockup from "~/components/TuGetClientMockup.vue"
import TrustProofStrip from "~/components/TrustProofStrip.vue"
import FaqSection from "~/components/FaqSection.vue"
import CtaBanner from "~/components/CtaBanner.vue"
import ExeDownloadGuideModal from "~/components/ExeDownloadGuideModal.vue"
import { useProductInstallLinks } from "~/composables/useProductInstallLinks"
import type { LocaleCode } from "~/config/i18n"
import { CLIENT_FAQS, CLIENT_PLATFORM_ENTRIES } from "~/data/siteContent"

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { getCanonicalUrl, buildHreflangLinks, getBuyUrl } = useSiteSeo()
const config = useRuntimeConfig()
const { microsoftStoreUrl, exeDownloadUrl } = useProductInstallLinks()
const showExeGuide = ref(false)

const clientPlatformEntries = computed(
  () => CLIENT_PLATFORM_ENTRIES[(locale.value as LocaleCode) || 'zh-CN'] || CLIENT_PLATFORM_ENTRIES['zh-CN']
)
const clientFaqs = computed(
  () => CLIENT_FAQS[(locale.value as LocaleCode) || 'zh-CN'] || CLIENT_FAQS['zh-CN']
)

useSeoMeta({
  title: () => t('clientPage.seo.title'),
  description: () => t('clientPage.seo.description'),
  ogTitle: () => t('clientPage.seo.title'),
  ogDescription: () => t('clientPage.seo.description'),
  ogUrl: () => getCanonicalUrl('/client/'),
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterTitle: () => t('clientPage.seo.title'),
  twitterDescription: () => t('clientPage.seo.description'),
  twitterImage: `${config.public.siteUrl}/og.png`,
})

useHead(() => ({
  meta: [{ name: "keywords", content: t('clientPage.seo.keywords') }],
  link: [
    { rel: "canonical", href: getCanonicalUrl('/client/') },
    ...buildHreflangLinks('/client/'),
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: t('app.siteName'),
        alternateName: "TuGet Desktop",
        operatingSystem: "Windows 10, Windows 11 (64-bit)",
        applicationCategory: "MultimediaApplication",
        url: getCanonicalUrl('/client/'),
        image: `${config.public.siteUrl}/tuget-icon.svg`,
        description: t('clientPage.seo.description'),
      }),
    },
  ],
}))
</script>

<style scoped>
.client-page {
  width: 100%;
}

.hero-activation-footer-tip {
  text-align: center;
  margin-top: 16px;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.activation-link {
  color: var(--brand-dark);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* 平台专题内链表 */
.client-platform-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.client-platform-link-card {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 16px;
  align-items: center;
  padding: 18px 22px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.client-platform-link-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-border);
  box-shadow: var(--shadow-sm);
}

.client-platform-link-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.client-platform-link-desc {
  grid-column: 1;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.client-platform-link-arrow {
  grid-row: 1 / span 2;
  grid-column: 2;
  color: var(--brand-primary);
  font-weight: 700;
}

@media (max-width: 768px) {
  .client-platform-links {
    grid-template-columns: 1fr;
  }
}
</style>
