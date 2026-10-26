<template>
  <div>
    <!-- Download Hero -->
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">
          <MicrosoftStoreMark :size="14" />
          {{ t('downloadPage.hero.eyebrow') }}
        </p>
        <h1>{{ t('downloadPage.hero.title') }}</h1>
        <p>
          {{ t('downloadPage.hero.lead') }}
        </p>
      </div>
    </section>

    <!-- Main TuGet Client Download Card -->
    <section class="section section--subtle" style="padding-top: 48px;">
      <div class="container" style="max-width: 860px;">
        <article class="download-card download-card--tuget">
          <div class="download-card-badge">
            <MicrosoftStoreMark :size="13" />
            <span>{{ t('downloadPage.card.badge') }}</span>
          </div>
          <div class="download-card-header">
            <img src="/tuget-icon.svg" width="56" height="56" alt="TuGet" class="brand-icon">
            <div>
              <h2 class="download-card-title">{{ t('downloadPage.card.title') }}</h2>
              <div class="download-card-meta">
                <span>{{ t('downloadPage.card.osMeta') }}</span>
                <span class="meta-dot">·</span>
                <span class="meta-tag">{{ t('downloadPage.card.tagMeta') }}</span>
              </div>
            </div>
          </div>

          <p class="download-card-desc">
            {{ t('downloadPage.card.desc') }}
          </p>

          <div class="hero-trial-note" style="margin-bottom: 24px; align-self: flex-start;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{{ t('downloadPage.card.trialNote') }}</span>
          </div>

          <ul class="trust-check-list" style="margin-bottom: 28px;">
            <li>
              <div><strong>{{ t('downloadPage.card.check1Strong') }}</strong>{{ t('downloadPage.card.check1Text') }}</div>
            </li>
            <li>
              <div><strong>{{ t('downloadPage.card.check2Strong') }}</strong>{{ t('downloadPage.card.check2Text') }}</div>
            </li>
            <li>
              <div><strong>{{ t('downloadPage.card.check3Strong') }}</strong>{{ t('downloadPage.card.check3Text') }}</div>
            </li>
            <li>
              <div><strong>{{ t('downloadPage.card.check4Strong') }}</strong>{{ t('downloadPage.card.check4Text') }}</div>
            </li>
          </ul>

          <div class="download-actions-cluster">
            <a
              :href="microsoftStoreUrl"
              class="btn-delivery-store"
              target="_blank"
              rel="noopener"
              @click="trackStoreClick('download_primary_card')"
            >
              <div class="btn-icon-area">
                <MicrosoftStoreMark :size="20" />
              </div>
              <div class="btn-text-area">
                <span class="btn-title">{{ t('downloadPage.card.installBtnTitle') }}</span>
                <span class="btn-subtext">{{ t('downloadPage.card.installBtnSub') }}</span>
              </div>
            </a>
            <NuxtLink :to="localePath('/client/')" class="button button--ghost button--lg button--store-companion">
              {{ t('downloadPage.card.featuresBtn') }}
            </NuxtLink>
          </div>

          <!-- 备用离线下载入口（弱化呈现，点击调起引导模态框） -->
          <div class="download-fallback-channel">
            <span class="fallback-tip">{{ t('downloadPage.card.fallbackTip') }}</span>
            <button
              type="button"
              class="fallback-btn"
              @click="showExeGuide = true"
            >
              {{ t('downloadPage.card.fallbackBtn') }}
            </button>
            <a
              :href="exeDownloadUrl"
              class="sr-only"
              referrerpolicy="origin-when-cross-origin"
            >{{ t('downloadPage.card.fallbackSr') }}</a>
          </div>
        </article>
      </div>
    </section>

    <!-- Installation Steps Guide -->
    <section class="section">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Installation Workflow</p>
          <h2>{{ t('downloadPage.workflow.heading') }}</h2>
          <p>{{ t('downloadPage.workflow.subheading') }}</p>
        </div>

        <div class="workflow-grid">
          <article class="workflow-card">
            <div class="workflow-step-badge">1</div>
            <div class="workflow-title-row">
              <MicrosoftStoreMark :size="16" />
              <h3>{{ t('downloadPage.workflow.s1Title') }}</h3>
            </div>
            <p>{{ t('downloadPage.workflow.s1Desc') }}</p>
          </article>

          <article class="workflow-card">
            <div class="workflow-step-badge">2</div>
            <h3>{{ t('downloadPage.workflow.s2Title') }}</h3>
            <p>{{ t('downloadPage.workflow.s2Desc') }}</p>
          </article>

          <article class="workflow-card">
            <div class="workflow-step-badge">3</div>
            <h3>{{ t('downloadPage.workflow.s3Title') }}</h3>
            <p>{{ t('downloadPage.workflow.s3Desc') }}</p>
          </article>

          <article class="workflow-card">
            <div class="workflow-step-badge">4</div>
            <h3>{{ t('downloadPage.workflow.s4Title') }}</h3>
            <p>{{ t('downloadPage.workflow.s4Desc') }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- System Requirements Section -->
    <section class="section section--subtle">
      <div class="container" style="max-width: 860px;">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">System Requirements</p>
          <h2>{{ t('downloadPage.reqs.heading') }}</h2>
          <p>{{ t('downloadPage.reqs.subheading') }}</p>
        </div>

        <div class="spec-card">
          <ul class="spec-list">
            <li><strong>{{ t('downloadPage.reqs.r1Label') }}</strong> {{ t('downloadPage.reqs.r1Val') }}</li>
            <li><strong>{{ t('downloadPage.reqs.r2Label') }}</strong> {{ t('downloadPage.reqs.r2Val') }}</li>
            <li><strong>{{ t('downloadPage.reqs.r3Label') }}</strong> {{ t('downloadPage.reqs.r3Val') }}</li>
            <li><strong>{{ t('downloadPage.reqs.r4Label') }}</strong> {{ t('downloadPage.reqs.r4Val') }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Trust Proof Strip Component -->
    <section class="section">
      <div class="container">
        <TrustProofStrip />
      </div>
    </section>

    <!-- Download FAQs Component -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Download & Setup FAQ</p>
          <h2>{{ t('downloadPage.faq.heading') }}</h2>
        </div>

        <FaqSection :faqs="downloadFaqs" />
      </div>
    </section>

    <!-- CTA Banner Component -->
    <section class="section">
      <div class="container">
        <CtaBanner
          :title="t('downloadPage.cta.title')"
          :description="t('downloadPage.cta.desc')"
          :button-text="t('downloadPage.cta.btnText')"
          :button-link="microsoftStoreUrl"
          :ghost-text="t('downloadPage.cta.ghostText')"
          ghost-link="/client/"
        />

        <div class="hero-activation-footer-tip">
          <span>{{ t('downloadPage.cta.buyTipPrefix') }}</span>
          <NuxtLink :to="getBuyUrl()" class="activation-link">{{ t('downloadPage.cta.buyTipLink') }}</NuxtLink>
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
import { ref } from 'vue'
import TrustProofStrip from '~/components/TrustProofStrip.vue'
import FaqSection from '~/components/FaqSection.vue'
import CtaBanner from '~/components/CtaBanner.vue'
import ExeDownloadGuideModal from '~/components/ExeDownloadGuideModal.vue'
import type { LocaleCode } from '~/config/i18n'
import { DOWNLOAD_FAQS } from '~/data/siteContent'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { getCanonicalUrl, buildHreflangLinks, getBuyUrl } = useSiteSeo()
const config = useRuntimeConfig()
const { microsoftStoreUrl, exeDownloadUrl, trackStoreClick } = useProductInstallLinks()
const showExeGuide = ref(false)

const downloadFaqs = computed(
  () => DOWNLOAD_FAQS[(locale.value as LocaleCode) || 'zh-CN'] || DOWNLOAD_FAQS['zh-CN']
)

useSeoMeta({
  title: () => t('downloadPage.seo.title'),
  description: () => t('downloadPage.seo.description'),
  ogTitle: () => t('downloadPage.seo.title'),
  ogDescription: () => t('downloadPage.seo.description'),
  ogUrl: () => getCanonicalUrl('/download/'),
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterTitle: () => t('downloadPage.seo.title'),
  twitterDescription: () => t('downloadPage.seo.description'),
  twitterImage: `${config.public.siteUrl}/og.png`,
})

useHead(() => ({
  meta: [{ name: 'keywords', content: t('downloadPage.seo.keywords') }],
  link: [
    { rel: 'canonical', href: getCanonicalUrl('/download/') },
    ...buildHreflangLinks('/download/'),
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: t('app.siteName'),
        alternateName: 'TuGet Desktop',
        operatingSystem: 'Windows 10, Windows 11 (64-bit)',
        applicationCategory: 'MultimediaApplication',
        url: getCanonicalUrl('/download/'),
        image: `${config.public.siteUrl}/tuget-icon.svg`,
        description: t('downloadPage.seo.description'),
      }),
    },
  ],
}))
</script>

<style scoped>
.download-card {
  padding: 40px;
  border-radius: var(--radius-xl);
  background: #ffffff;
  border: 1px solid var(--border-medium);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s ease;
}

.download-card--tuget {
  border: 1px solid rgba(5, 150, 105, 0.38);
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  box-shadow: 0 8px 30px rgba(5, 150, 105, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03);
}

.download-card-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: #0078d4;
  color: #ffffff;
  align-self: flex-start;
  margin-bottom: 16px;
  letter-spacing: 0.02em;
}

.workflow-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.workflow-title-row h3 {
  margin: 0;
}

.download-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.download-card-title {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 700;
}

.download-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.meta-tag {
  font-weight: 700;
  color: var(--brand-dark);
}

.download-card-desc {
  font-size: 0.96rem;
  color: var(--text-secondary);
  line-height: 1.65;
  margin: 0 0 20px 0;
}

.hero-trial-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: var(--brand-light);
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-full);
  color: var(--brand-dark);
  font-size: 0.84rem;
  font-weight: 500;
}

.trust-check-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trust-check-list li {
  position: relative;
  padding-left: 24px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

.trust-check-list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  top: 0;
  color: var(--brand-primary);
  font-weight: 900;
  font-size: 1rem;
}

.trust-check-list li strong {
  color: var(--text-primary);
}

.download-actions-cluster {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.download-fallback-channel {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  margin-top: 14px;
}

.fallback-tip {
  color: var(--text-muted);
}

.fallback-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
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

/* Workflow Grid */
.workflow-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.workflow-card {
  padding: 24px 20px;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-medium);
  position: relative;
}


.workflow-card h3 {
  margin: 0 0 8px 0;
  font-size: 1.02rem;
  color: var(--text-primary);
}

.workflow-card p {
  margin: 0;
  font-size: 0.86rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

/* Spec Card */
.spec-card {
  padding: 28px 24px;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-medium);
}

.spec-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.spec-list li strong {
  color: var(--text-primary);
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

@media (max-width: 860px) {
  .workflow-grid {
    grid-template-columns: 1fr;
  }
}
</style>
