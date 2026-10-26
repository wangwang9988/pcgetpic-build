<template>
  <div class="platform-page">
    <!-- 面包屑导航：利于搜索引擎理解站点层级，同时提供 BreadcrumbList 结构化数据 -->
    <nav class="container breadcrumb-nav" :aria-label="t('platformLayout.breadcrumbAria')">
      <ol class="breadcrumb-list">
        <li>
          <NuxtLink :to="localePath('/')">{{ t('platformLayout.home') }}</NuxtLink>
        </li>
        <li aria-hidden="true" class="breadcrumb-sep">/</li>
        <li>
          <span class="breadcrumb-current">{{ content.badge }}</span>
        </li>
      </ol>
    </nav>

    <!-- Hero Section -->
    <section class="page-hero">
      <div class="container">
        <div class="hero-badge-pill">
          <MicrosoftStoreMark :size="13" />
          <span>WINDOWS 10 / 11</span>
          {{ content.badge }}
        </div>
        <h1>{{ content.heroTitle }}</h1>
        <p>{{ content.heroLead }}</p>

        <div class="hero-actions">
          <a
            :href="microsoftStoreUrl"
            class="btn-delivery-store"
            target="_blank"
            rel="noopener"
            @click="trackStoreClick('platform_hero')"
          >
            <div class="btn-icon-area">
              <MicrosoftStoreMark :size="20" />
            </div>
            <div class="btn-text-area">
              <span class="btn-title">{{ t('platformLayout.installBtnTitle') }}</span>
              <span class="btn-subtext">{{ t('platformLayout.installBtnSubtext') }}</span>
            </div>
          </a>
          <NuxtLink :to="localePath('/client/')" class="button button--ghost button--lg button--store-companion">
            {{ t('platformLayout.viewFeaturesBtn') }}
          </NuxtLink>
        </div>

        <p class="hero-trial-note">{{ t('platformLayout.trialNote') }}</p>
      </div>
    </section>

    <!-- 痛点分析 Section -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Pain Points</p>
          <h2>{{ content.painHeading }}</h2>
          <p>{{ content.painIntro }}</p>
        </div>

        <div class="feature-grid-3">
          <article v-for="(pain, idx) in content.pains" :key="`pain-${idx}`" class="feature-card">
            <div class="feature-icon-box pain-icon-box">
              0{{ idx + 1 }}
            </div>
            <h3>{{ pain.title }}</h3>
            <p>{{ pain.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- TuGet 解法 Section -->
    <section class="section">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">TuGet Solution</p>
          <h2>{{ content.solutionHeading }}</h2>
          <p>{{ content.solutionIntro }}</p>
        </div>

        <div class="feature-grid-3">
          <article v-for="(solution, idx) in content.solutions" :key="`solution-${idx}`" class="feature-card">
            <div class="feature-icon-box">
              0{{ idx + 1 }}
            </div>
            <h3>{{ solution.title }}</h3>
            <p>{{ solution.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 操作步骤 Section -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">How It Works</p>
          <h2>{{ content.stepHeading }}</h2>
          <p>{{ content.stepIntro }}</p>
        </div>

        <div class="workflow-grid">
          <article v-for="(step, idx) in content.steps" :key="`step-${idx}`" class="workflow-card">
            <div class="workflow-step-badge">{{ idx + 1 }}</div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="section">
      <div class="container">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Frequently Asked Questions</p>
          <h2>{{ content.faqHeading }}</h2>
        </div>

        <FaqSection :faqs="content.faqs" />
      </div>
    </section>

    <!-- 相关专题内链区：形成爬虫抓取闭环 -->
    <section class="section section--subtle">
      <div class="container" style="max-width: 960px;">
        <div class="section-heading section-heading--center">
          <p class="eyebrow">Related Guides</p>
          <h2>{{ content.relatedHeading }}</h2>
        </div>

        <div class="related-links-grid">
          <NuxtLink v-for="(link, idx) in content.related" :key="`related-${idx}`" :to="localePath(link.to)" class="related-link-card">
            <span class="related-link-label">{{ link.label }}</span>
            <span class="related-link-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 合规与知识产权免责提示 -->
    <section class="section section--compliance">
      <div class="container" style="max-width: 960px;">
        <div class="compliance-card">
          <div class="compliance-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ t('platformLayout.complianceTitle') }}</span>
          </div>
          <p class="compliance-text">
            {{ t('platformLayout.complianceBefore') }}<strong>{{ t('platformLayout.complianceHighlight') }}</strong>{{ t('platformLayout.complianceAfter') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="section">
      <div class="container">
        <CtaBanner
          :title="content.ctaTitle"
          :description="content.ctaDescription"
          :button-link="microsoftStoreUrl"
          :ghost-text="t('platformLayout.installGuideBtn')"
          ghost-link="/download/"
        />

        <div class="platform-activation-footer-tip">
          <span>{{ t('platformLayout.buyTipPrefix') }}</span>
          <NuxtLink :to="getBuyUrl()" class="activation-link">{{ t('platformLayout.buyTipLink') }}</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/components/FaqSection.vue'

export interface PlatformPain {
  title: string
  desc: string
}

export interface PlatformStep {
  title: string
  desc: string
}

export interface PlatformRelatedLink {
  label: string
  to: string
}

export interface PlatformPageContent {
  /** 页面路径（含尾斜杠），用于 canonical 与面包屑结构化数据 */
  path: string
  badge: string
  heroTitle: string
  heroLead: string
  metaTitle: string
  metaDescription: string
  keywords: string
  painHeading: string
  painIntro: string
  pains: PlatformPain[]
  solutionHeading: string
  solutionIntro: string
  solutions: PlatformPain[]
  stepHeading: string
  stepIntro: string
  steps: PlatformStep[]
  faqHeading: string
  faqs: FaqItem[]
  relatedHeading: string
  related: PlatformRelatedLink[]
  ctaTitle: string
  ctaDescription: string
}

const props = defineProps<{
  content: PlatformPageContent
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { getCanonicalUrl, buildHreflangLinks, getBuyUrl } = useSiteSeo()
const config = useRuntimeConfig()
const { microsoftStoreUrl, trackStoreClick } = useProductInstallLinks()

useSeoMeta({
  title: () => props.content.metaTitle,
  description: () => props.content.metaDescription,
  ogTitle: () => props.content.metaTitle,
  ogDescription: () => props.content.metaDescription,
  ogUrl: () => getCanonicalUrl(props.content.path),
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterTitle: () => props.content.metaTitle,
  twitterDescription: () => props.content.metaDescription,
  twitterImage: `${config.public.siteUrl}/og.png`,
})

useHead(() => ({
  meta: [{ name: 'keywords', content: props.content.keywords }],
  link: [
    { rel: 'canonical', href: getCanonicalUrl(props.content.path) },
    ...buildHreflangLinks(props.content.path),
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('platformLayout.home'),
            item: getCanonicalUrl('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: props.content.badge,
            item: getCanonicalUrl(props.content.path),
          },
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: props.content.faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: t('app.siteName'),
        alternateName: 'TuGet Desktop',
        operatingSystem: 'Windows 10, Windows 11 (64-bit)',
        applicationCategory: 'MultimediaApplication',
        url: getCanonicalUrl('/client/'),
        image: `${config.public.siteUrl}/tuget-icon.svg`,
        description: props.content.metaDescription,
      }),
    },
  ],
}))
</script>

<style scoped>
.platform-page {
  width: 100%;
}

/* 面包屑 */
.breadcrumb-nav {
  padding-top: 20px;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.breadcrumb-list a {
  color: var(--text-secondary);
  font-weight: 500;
}

.breadcrumb-list a:hover {
  color: var(--brand-primary);
}

.breadcrumb-sep {
  color: var(--border-dark);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 600;
}

/* Hero 微调 */
.platform-page .page-hero .hero-badge-pill {
  margin-inline: auto;
}

.platform-page .hero-actions {
  justify-content: center;
  margin-bottom: 16px;
}

.hero-trial-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.pain-icon-box {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

/* 相关专题内链 */
.related-links-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.related-link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.related-link-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-border);
  box-shadow: var(--shadow-sm);
}

.related-link-label {
  color: var(--text-primary);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.45;
}

.related-link-arrow {
  color: var(--brand-primary);
  font-weight: 700;
  flex-shrink: 0;
}

.platform-activation-footer-tip {
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

/* 合规与版权提示卡片：琥珀色"提示"观感，区别于品牌绿色的营销区块 */
.compliance-card {
  padding: 20px 24px;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
}

.compliance-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 4px 12px;
  background-color: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: var(--radius-full);
  color: #92400e;
  font-size: 0.8rem;
  font-weight: 700;
}

.compliance-text {
  margin: 0;
  color: #78350f;
  font-size: 0.88rem;
  line-height: 1.75;
}

.compliance-text strong {
  color: #92400e;
  font-weight: 700;
}

@media (max-width: 768px) {
  .related-links-grid {
    grid-template-columns: 1fr;
  }
}
</style>
