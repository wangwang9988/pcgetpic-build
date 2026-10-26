<template>
  <div>
    <!-- Hero Section -->
    <section class="hero">
      <div class="container hero-container-single">
        <div class="hero-top-block">
          <div class="hero-badge-pill">
            <MicrosoftStoreMark :size="13" />
            <span>WINDOWS 10 / 11</span>
            {{ t('home.hero.badgeStore') }}
          </div>
          <h1 class="hero-title">
            {{ t('home.hero.titleLine1') }}<br>
            <span class="highlight">{{ t('home.hero.titleHighlight') }}</span>
          </h1>
          <p class="hero-lead">
            {{ t('home.hero.lead') }}
          </p>

          <div class="hero-actions">
            <a
              :href="microsoftStoreUrl"
              class="btn-delivery-store"
              target="_blank"
              rel="noopener"
              @click="trackStoreClick('home_hero')"
            >
              <div class="btn-icon-area">
                <MicrosoftStoreMark :size="20" />
              </div>
              <div class="btn-text-area">
                <span class="btn-title">{{ t('home.hero.installBtnTitle') }}</span>
                <span class="btn-subtext">{{ t('home.hero.installBtnSub') }}</span>
              </div>
            </a>
            <NuxtLink :to="localePath('/client/')" class="button button--ghost button--lg button--store-companion">
              {{ t('home.hero.viewFeaturesBtn') }}
            </NuxtLink>
          </div>

          <!-- 备用离线渠道提示（轻量优雅，保留入口同时弱化呈现） -->
          <div class="hero-fallback-channel">
            <span class="fallback-tip">{{ t('home.hero.fallbackTip') }}</span>
            <button
              type="button"
              class="fallback-btn"
              @click="showExeGuide = true"
            >
              {{ t('home.hero.fallbackBtn') }}
            </button>
            <a
              :href="exeDownloadUrl"
              class="sr-only"
              referrerpolicy="origin-when-cross-origin"
            >{{ t('home.hero.fallbackSr') }}</a>
          </div>

          <!-- Free Trial Policy Banner -->
          <div class="hero-trial-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{{ t('home.hero.trialNote') }}</span>
          </div>

          <!-- Trust Bar -->
          <div class="hero-trust-bar">
            <span class="hero-trust-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ t('home.hero.trust1') }}
            </span>
            <span class="hero-trust-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ t('home.hero.trust2') }}
            </span>
            <span class="hero-trust-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ t('home.hero.trust3') }}
            </span>
            <span class="hero-trust-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ t('home.hero.trust4') }}
            </span>
          </div>
        </div>

        <!-- Workbench Mockup Section -->
        <div id="demo" class="hero-cockpit-block">
          <div class="cockpit-intro-header">
            <p class="eyebrow">Interface Preview</p>
            <h2 class="cockpit-intro-title">{{ t('home.hero.cockpitTitle') }}</h2>
            <p class="cockpit-intro-desc">
              {{ t('home.hero.cockpitDesc') }}
            </p>
          </div>
          <TuGetClientMockup />
        </div>
      </div>
    </section>

    <!-- Scenarios Section -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Core Scenarios</p>
          <h2>{{ t('home.scenarios.heading') }}</h2>
          <p>{{ t('home.scenarios.subheading') }}</p>
        </div>

        <div class="feature-grid-3">
          <article class="feature-card">
            <div class="feature-icon-box" style="background-color: #ecfdf5; color: #065f46; border-color: #a7f3d0;">
              01
            </div>
            <h3>{{ t('home.scenarios.c1Title') }}</h3>
            <p>
              {{ t('home.scenarios.c1Before') }}<NuxtLink :to="localePath('/platforms/1688/')">{{ t('home.scenarios.c1Link1688') }}</NuxtLink>{{ t('home.scenarios.c1Sep1') }}<NuxtLink :to="localePath('/platforms/taobao/')">{{ t('home.scenarios.c1LinkTaobao') }}</NuxtLink>{{ t('home.scenarios.c1Sep2') }}<NuxtLink :to="localePath('/platforms/jd/')">{{ t('home.scenarios.c1LinkJd') }}</NuxtLink>{{ t('home.scenarios.c1Sep3') }}<NuxtLink :to="localePath('/platforms/vip/')">{{ t('home.scenarios.c1LinkVip') }}</NuxtLink>{{ t('home.scenarios.c1And') }}<NuxtLink :to="localePath('/platforms/pdd/')">{{ t('home.scenarios.c1LinkPdd') }}</NuxtLink>{{ t('home.scenarios.c1After') }}
            </p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-box" style="background-color: #eff6ff; color: #1e40af; border-color: #bfdbfe;">
              02
            </div>
            <h3>{{ t('home.scenarios.c2Title') }}</h3>
            <p>
              {{ t('home.scenarios.c2Before') }}<NuxtLink :to="localePath('/scenarios/media-sniffer/')">{{ t('home.scenarios.c2LinkMedia') }}</NuxtLink>{{ t('home.scenarios.c2After') }}
            </p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-box" style="background-color: #fffbeb; color: #92400e; border-color: #fde68a;">
              03
            </div>
            <h3>{{ t('home.scenarios.c3Title') }}</h3>
            <p>
              {{ t('home.scenarios.c3Before') }}<NuxtLink :to="localePath('/solutions/ecommerce-designer/')">{{ t('home.scenarios.c3LinkDesigner') }}</NuxtLink>{{ t('home.scenarios.c3After') }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- Platform Landing Matrix Section（首页权重向长尾专题页传递） -->
    <section class="section">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Platform Guides</p>
          <h2>{{ t('home.platforms.heading') }}</h2>
          <p>{{ t('home.platforms.subheading') }}</p>
        </div>

        <div class="platform-entry-grid">
          <NuxtLink
            v-for="entry in platformEntries"
            :key="entry.to"
            :to="localePath(entry.to)"
            class="platform-entry-card"
          >
            <div class="platform-entry-head">
              <span class="platform-entry-name">{{ entry.name }}</span>
              <span class="platform-entry-arrow" aria-hidden="true">→</span>
            </div>
            <p>{{ entry.desc }}</p>
            <div class="chip-group">
              <span v-for="kw in entry.keywords" :key="kw" class="chip">{{ kw }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 4-step Workflow Section -->
    <section class="section">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Streamlined Workflow</p>
          <h2>{{ t('home.workflow.heading') }}</h2>
          <p>{{ t('home.workflow.subheading') }}</p>
        </div>

        <div class="workflow-grid">
          <article class="workflow-card">
            <div class="workflow-step-badge">1</div>
            <h3>{{ t('home.workflow.s1Title') }}</h3>
            <p>{{ t('home.workflow.s1Desc') }}</p>
          </article>

          <article class="workflow-card">
            <div class="workflow-step-badge">2</div>
            <h3>{{ t('home.workflow.s2Title') }}</h3>
            <p>{{ t('home.workflow.s2Desc') }}</p>
          </article>

          <article class="workflow-card">
            <div class="workflow-step-badge">3</div>
            <h3>{{ t('home.workflow.s3Title') }}</h3>
            <p>{{ t('home.workflow.s3Desc') }}</p>
          </article>

          <article class="workflow-card">
            <div class="workflow-step-badge">4</div>
            <h3>{{ t('home.workflow.s4Title') }}</h3>
            <p>{{ t('home.workflow.s4Desc') }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Trust Proof Strip Component -->
    <section class="section section--subtle">
      <div class="container">
        <TrustProofStrip />
      </div>
    </section>

    <!-- Scope, System Specs & Data Boundary -->
    <section class="section">
      <div class="container" style="max-width: 960px;">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Specifications & Data Boundary</p>
          <h2>{{ t('home.specs.heading') }}</h2>
          <p>{{ t('home.specs.subheading') }}</p>
        </div>

        <div class="spec-boundary-grid">
          <div class="spec-card">
            <h3>{{ t('home.specs.sysTitle') }}</h3>
            <ul class="spec-list">
              <li><strong>{{ t('home.specs.sys1Label') }}</strong> {{ t('home.specs.sys1Val') }}</li>
              <li><strong>{{ t('home.specs.sys2Label') }}</strong> {{ t('home.specs.sys2Val') }}</li>
              <li><strong>{{ t('home.specs.sys3Label') }}</strong> <span style="display: inline-flex; align-items: center; gap: 6px;"><MicrosoftStoreMark :size="13" /> {{ t('home.specs.sys3Val') }}</span></li>
              <li><strong>{{ t('home.specs.sys4Label') }}</strong> {{ t('home.specs.sys4Val') }}</li>
            </ul>
          </div>

          <div class="spec-card">
            <h3>{{ t('home.specs.dataTitle') }}</h3>
            <ul class="spec-list">
              <li><strong>{{ t('home.specs.data1Label') }}</strong> {{ t('home.specs.data1Val') }}</li>
              <li><strong>{{ t('home.specs.data2Label') }}</strong> {{ t('home.specs.data2Val') }}</li>
              <li><strong>{{ t('home.specs.data3Label') }}</strong> {{ t('home.specs.data3Val') }}</li>
              <li><strong>{{ t('home.specs.data4Label') }}</strong> {{ t('home.specs.data4Val') }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section Component -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Frequently Asked Questions</p>
          <h2>{{ t('home.faq.heading') }}</h2>
          <p>{{ t('home.faq.subheading') }}</p>
        </div>

        <FaqSection :faqs="faqs" />
      </div>
    </section>

    <!-- Bottom CTA Component -->
    <section class="section">
      <div class="container">
        <CtaBanner
          :title="t('home.cta.title')"
          :description="t('home.cta.desc')"
          :button-text="t('home.cta.btnText')"
          :button-link="microsoftStoreUrl"
          :ghost-text="t('home.cta.ghostText')"
          ghost-link="/client/"
        />

        <div class="hero-activation-footer-tip">
          <span>{{ t('home.cta.buyTipPrefix') }}</span>
          <NuxtLink :to="getBuyUrl()" class="activation-link">{{ t('home.cta.buyTipLink') }}</NuxtLink>
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
import TuGetClientMockup from '~/components/TuGetClientMockup.vue'
import ExeDownloadGuideModal from '~/components/ExeDownloadGuideModal.vue'
import type { LocaleCode } from '~/config/i18n'
import { HOME_FAQS, HOME_PLATFORM_ENTRIES } from '~/data/siteContent'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { getCanonicalUrl, buildHreflangLinks, getBuyUrl } = useSiteSeo()
const config = useRuntimeConfig()
const { microsoftStoreUrl, exeDownloadUrl, trackStoreClick } = useProductInstallLinks()
const showExeGuide = ref(false)

const platformEntries = computed(
  () => HOME_PLATFORM_ENTRIES[(locale.value as LocaleCode) || 'zh-CN'] || HOME_PLATFORM_ENTRIES['zh-CN']
)
const faqs = computed(
  () => HOME_FAQS[(locale.value as LocaleCode) || 'zh-CN'] || HOME_FAQS['zh-CN']
)

useSeoMeta({
  title: () => t('home.seo.title'),
  description: () => t('home.seo.description'),
  ogTitle: () => t('home.seo.title'),
  ogDescription: () => t('home.seo.description'),
  ogUrl: () => getCanonicalUrl('/'),
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterTitle: () => t('home.seo.title'),
  twitterDescription: () => t('home.seo.description'),
  twitterImage: `${config.public.siteUrl}/og.png`,
})

useHead(() => ({
  meta: [{ name: 'keywords', content: t('home.seo.keywords') }],
  link: [
    { rel: 'canonical', href: getCanonicalUrl('/') },
    ...buildHreflangLinks('/'),
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: t('home.seo.websiteName'),
        url: getCanonicalUrl('/'),
        description: t('home.seo.description'),
        inLanguage: locale.value || 'zh-CN',
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: t('home.seo.appName'),
        alternateName: 'TuGet Desktop',
        operatingSystem: 'Windows 10, Windows 11 (64-bit)',
        applicationCategory: 'MultimediaApplication',
        url: getCanonicalUrl('/client/'),
        image: `${config.public.siteUrl}/tuget-icon.svg`,
        description: t('home.seo.appDesc'),
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.value.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }),
    },
  ],
}))
</script>

<style scoped>
/* Hero Layout */
.hero-container-single {
  max-width: 1060px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
}

.hero-top-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 920px;
  width: 100%;
}

.hero-title {
  margin: 0 0 18px 0;
  color: var(--text-primary);
  font-size: clamp(2.2rem, 4vw, 3.2rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.hero-lead {
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  font-size: 1.08rem;
  line-height: 1.68;
  max-width: 840px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 12px;
}

.hero-fallback-channel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.85rem;
  margin-bottom: 18px;
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
  margin-bottom: 24px;
}

.hero-trust-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  color: var(--text-muted);
  font-size: 0.84rem;
  width: 100%;
  max-width: 880px;
}

.hero-trust-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
}

.hero-trust-item svg {
  color: var(--brand-primary);
}

/* Cockpit Visual Showcase Block */
.hero-cockpit-block {
  width: 100%;
  max-width: 1040px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
}

.cockpit-intro-header {
  text-align: center;
  margin-bottom: 24px;
  max-width: 720px;
}

.cockpit-intro-title {
  font-size: clamp(1.4rem, 2.5vw, 1.85rem);
  font-weight: 700;
  color: var(--text-primary);
  margin: 6px 0 10px;
  letter-spacing: -0.025em;
}

.cockpit-intro-desc {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* Feature Grid */
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.feature-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.92rem;
  border: 1px solid transparent;
  margin-bottom: 16px;
}

.feature-card h3 {
  margin: 0 0 10px 0;
  font-size: 1.12rem;
  color: var(--text-primary);
}

.feature-card p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 场景卡正文内链：首页权重向长尾专题页传递，样式与站内链接保持一致 */
.feature-card p a {
  color: var(--brand-hover);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.feature-card p a:hover {
  color: var(--brand-dark);
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

/* Platform Entry Grid */
.platform-entry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.platform-entry-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-medium);
  box-shadow: var(--shadow-xs);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.platform-entry-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-border);
  box-shadow: var(--shadow-sm);
}

.platform-entry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.platform-entry-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.platform-entry-arrow {
  color: var(--brand-primary);
  font-weight: 700;
  flex-shrink: 0;
}

.platform-entry-card p {
  margin: 0 0 4px 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.platform-entry-card .chip-group {
  margin-top: auto;
  padding-top: 12px;
}

.platform-entry-card .chip {
  font-size: 0.76rem;
  padding: 4px 10px;
}

/* Spec & Boundary Grid */
.spec-boundary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.spec-card {
  padding: 28px 24px;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-medium);
}

.spec-card h3 {
  margin: 0 0 16px 0;
  font-size: 1.15rem;
  color: var(--text-primary);
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

/* Activation tip at bottom */
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
  .feature-grid-3,
  .workflow-grid,
  .spec-boundary-grid,
  .platform-entry-grid {
    grid-template-columns: 1fr;
  }
}
</style>

