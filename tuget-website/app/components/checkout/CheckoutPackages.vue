<template>
  <div class="packages-view">
    <!-- Comparison Matrix Grid -->
    <div class="packages-grid">
      <template v-if="loading && packages.length === 0">
        <div
          v-for="index in 4"
          :key="`package-skeleton-${index}`"
          class="package-card package-card--loading"
          aria-hidden="true"
        >
          <span class="skeleton-line skeleton-line--title" />
          <span class="skeleton-line skeleton-line--price" />
          <span class="skeleton-line skeleton-line--meta" />
          <span class="skeleton-line" />
          <span class="skeleton-line" />
          <span class="skeleton-line skeleton-line--button" />
        </div>
      </template>
      <div
        v-for="item in packages"
        :key="item.id"
        :class="[
          'package-card',
          {
            'package-card--selected': item.id === selectedPackageId,
            'package-card--permanent': isPermanentPackage(item),
            'package-card--unselected': item.id !== selectedPackageId,
          },
        ]"
        tabindex="0"
        :aria-selected="item.id === selectedPackageId"
        @click="$emit('select', item.id)"
        @keydown.enter.space.prevent="$emit('select', item.id)"
      >
        <!-- Recommendation Ribbon Pill：后台配置了自定义角标则优先展示，未配置时保持原默认规则 -->
        <div
          v-if="getPackageBadge(item, locale)"
          class="recommend-badge-pill"
          :class="{ 'recommend-badge--blue': !isPermanentPackage(item) }"
        >
          {{ getPackageBadge(item, locale) }}
        </div>
        <div
          v-else-if="item.recommended || isPermanentPackage(item)"
          class="recommend-badge-pill"
          :class="{ 'recommend-badge--blue': !isPermanentPackage(item) }"
        >
          {{ isPermanentPackage(item) ? t('pkgBadgeBest') : t('pkgBadgeOfficial') }}
        </div>

        <!-- Selected Checkmark Badge -->
        <transition name="badge-scale">
          <div v-if="item.id === selectedPackageId" class="selected-checkmark" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="checkmark-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        </transition>

        <!-- Card Header -->
        <div class="pkg-header">
          <h3 class="pkg-name" :class="{ 'pkg-name--permanent': isPermanentPackage(item) }">
            {{ displayName(item) }}
          </h3>
        </div>

        <!-- Price Display -->
        <!--
          双轨定价：中文界面全程 ¥，英文界面全程 HK$，绝不混出两种符号。
          未配置港币价的套餐在英文界面回落到 ¥，避免出现空价格。
        -->
        <div class="pkg-price-block">
          <span v-if="originalPriceLabel(item)" class="pkg-price-original">
            {{ originalPriceLabel(item) }}
          </span>
          <span class="pkg-price-symbol">{{ priceSymbol(item) }}</span>
          <span class="pkg-price-value" :class="{ 'pkg-price-value--permanent': isPermanentPackage(item) }">
            {{ priceValueLabel(item) }}
          </span>
        </div>

        <!-- Duration & Device Meta -->
        <div class="pkg-meta-row">
          <span class="pkg-meta-item">{{ formatDurationLabel(item, locale) }}</span>
          <span class="meta-divider">|</span>
          <span class="pkg-meta-item">{{ t('devicesText') }} <strong>{{ item.max_devices }}</strong> {{ t('devices') }}</span>
        </div>

        <!-- Features Checklist (Clean & Concise) -->
        <div class="pkg-features-list">
          <div
            v-for="(feat, idx) in getPackageFeatures(item, locale)"
            :key="idx"
            class="pkg-feature-item"
            :class="{ 'pkg-feature-item--highlight': feat.highlight }"
          >
            <span class="pkg-feature-icon">
              <svg v-if="feat.highlight" viewBox="0 0 24 24" class="icon-sparkle">
                <path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="icon-check">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
            <span class="pkg-feature-text">{{ feat.name }}</span>
          </div>
        </div>

        <!-- Permanent Card Text -->
        <div v-if="isPermanentPackage(item)" class="pkg-sales-banner">
          <strong>{{ t('pkgPermanentTitle') }}</strong>{{ t('pkgPermanentDesc') }}
        </div>

        <!-- CTA Buy Button at Bottom of Card -->
        <button
          type="button"
          :class="[
            'button',
            'button--lg',
            'button--wide',
            'pkg-cta-btn',
            isPermanentPackage(item) ? 'button--gold' : 'button--primary',
          ]"
          @click.stop="$emit('proceed', item.id)"
        >
          {{ t('pkgBuyNow') }}
        </button>
      </div>
    </div>

    <!-- Dynamic Smart Tip Banner -->
    <transition name="fade-slide" mode="out-in">
      <div
        v-if="selectedPackage"
        :key="selectedPackage.id"
        class="smart-tips-container"
        :class="{ 'smart-tips-container--permanent': isPermanentPackage(selectedPackage) }"
      >
        <div class="smart-tips-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="tips-sparkle-icon">
            <path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z" />
          </svg>
        </div>
        <div class="smart-tips-text">
          <strong v-if="tipParts.tag" class="smart-tips-tag">{{ tipParts.tag }}{{ isEnglish ? ':' : '：' }}</strong><span>{{ tipParts.text }}</span>
        </div>
      </div>
    </transition>

    <!-- 核心功能网格 (对标 store 设计) -->
    <div class="features-section">
      <h2 class="features-title">{{ t('pkgFeaturesTitle') }}</h2>
      <div class="features-grid">
        <div v-for="feature in coreFeatures" :key="feature" class="feature-item">
          <span class="feature-dot" aria-hidden="true" />
          <span class="feature-text">{{ feature }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PackageInfo } from '~/types/payment'
import {
  formatPrice,
  formatDurationLabel,
  isPermanentPackage,
  getPackageFeatures,
  getPackageBadge,
  getDynamicTip,
  getCoreFeatures,
  getDisplayPriceHkd,
  getOriginalPriceHkd,
  displayPackageName,
} from '~/composables/usePackageDisplay'
import { useCheckoutI18n } from '~/composables/useCheckoutI18n'

const { t, locale, isEnglish } = useCheckoutI18n()

/** 英文界面用后端派生的英文套餐名，缺省回落到中文名 */
function displayName(pkg: PackageInfo): string {
  return displayPackageName(pkg, locale.value)
}

/** 价格符号：英文界面有港币标价时用 HK$，否则回落 ¥。 */
function priceSymbol(pkg: PackageInfo): string {
  return isEnglish.value && getDisplayPriceHkd(pkg) != null ? 'HK$' : '¥'
}

/** 现价数值：英文界面取港币标价（整元），中文取人民币标价。 */
function priceValueLabel(pkg: PackageInfo): string {
  if (isEnglish.value) {
    const hkd = getDisplayPriceHkd(pkg)
    if (hkd != null) return formatPrice(hkd)
  }
  return formatPrice(pkg.price)
}

/** 划线原价；没有原价或英文界面没配港币价时返回空串（不渲染该节点）。 */
function originalPriceLabel(pkg: PackageInfo): string {
  if (isEnglish.value) {
    const hkd = getOriginalPriceHkd(pkg)
    return hkd != null ? `HK$${formatPrice(hkd)}` : ''
  }
  return pkg.original_price && pkg.original_price > pkg.price ? `¥${formatPrice(pkg.original_price)}` : ''
}

const props = defineProps<{
  packages: PackageInfo[]
  loading: boolean
  selectedPackageId: number | null
}>()

defineEmits<{
  (e: 'select', id: number): void
  (e: 'proceed', id: number): void
}>()

// 核心功能列表 (对标 store 优雅排版)
const coreFeatures = computed(() => getCoreFeatures(locale.value))

const selectedPackage = computed(() => {
  return props.packages.find((p) => p.id === props.selectedPackageId) || props.packages[0] || null
})

const tipParts = computed(() => {
  const pkg = selectedPackage.value
  return pkg ? getDynamicTip(pkg, props.packages, locale.value) : { tag: '', text: '' }
})
</script>

<style scoped>
.packages-view {
  width: 100%;
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 24px;
  position: relative;
}

.package-card--loading {
  min-height: 430px;
  pointer-events: none;
}

.skeleton-line {
  display: block;
  width: 100%;
  height: 14px;
  margin-bottom: 18px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 45%, #eef2f7 65%);
  background-size: 240% 100%;
  animation: package-skeleton 1.2s ease-in-out infinite;
}

.skeleton-line--title {
  width: 45%;
  height: 24px;
  margin: 12px auto 30px;
}

.skeleton-line--price {
  width: 62%;
  height: 48px;
  margin: 0 auto 24px;
}

.skeleton-line--meta {
  width: 72%;
  margin: 0 auto 36px;
}

.skeleton-line--button {
  height: 48px;
  margin-top: auto;
  margin-bottom: 0;
  border-radius: var(--radius-sm);
}

@keyframes package-skeleton {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (max-width: 1180px) {
  .packages-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .packages-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.package-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 30px 18px 24px;
  background-color: #ffffff;
  border: 1.5px solid var(--border-medium);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  outline: none;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              background-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.3s ease;
}

.package-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-sm);
}

.package-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.25);
}

/* Selected State */
.package-card--selected,
.package-card--selected:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px var(--brand-primary), var(--shadow-md);
  background-color: #ffffff;
  transform: translateY(-2px);
  z-index: 2;
}

/* Permanent Card Distinctive Style */
.package-card--permanent {
  background: linear-gradient(180deg, #ffffff 0%, #fffbf5 100%);
  border-color: #f59e0b;
}

.package-card--permanent:hover,
.package-card--permanent.package-card--selected,
.package-card--permanent.package-card--selected:hover {
  transform: translateY(-2px);
  border-color: #d97706;
  box-shadow: 0 0 0 2px #d97706, 0 8px 24px -5px rgba(217, 119, 6, 0.2);
}

.package-card--unselected {
  opacity: 0.88;
}

.package-card--unselected:hover {
  opacity: 1;
}

/* Recommendation Badge Pill */
.recommend-badge-pill {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 16px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #ffffff;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.2);
  z-index: 10;
  white-space: nowrap;
  /* 角标文案改为后台可配后可能较长，超宽时省略而不是撑破卡片 */
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-badge--blue {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-dark));
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);
}

/* Selected Checkmark Badge */
.selected-checkmark {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--brand-primary);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);
  border: 2.5px solid #ffffff;
  z-index: 12;
}

.package-card--permanent .selected-checkmark {
  background-color: #d97706;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);
}

.checkmark-icon {
  width: 14px;
  height: 14px;
  fill: #ffffff;
}

/* Card Header */
.pkg-header {
  text-align: center;
  margin-bottom: 12px;
}

.pkg-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.pkg-name--permanent {
  color: #b45309;
}

/* Card Price Block */
.pkg-price-block {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  margin-bottom: 8px;
}

.pkg-price-original {
  font-size: 0.9rem;
  color: var(--text-light);
  text-decoration: line-through;
  margin-right: 6px;
  font-weight: 500;
}

.pkg-price-symbol {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--brand-dark);
}

.pkg-price-value {
  font-size: 2.6rem;
  font-weight: 900;
  color: var(--brand-dark);
  letter-spacing: -0.04em;
  line-height: 1;
}

.pkg-price-value--permanent {
  color: #b45309;
  font-size: 2.85rem;
}

/* Card Meta Row */
.pkg-meta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.84rem;
  color: var(--text-muted);
  padding-bottom: 18px;
  border-bottom: 1px dashed var(--border-light);
  margin-bottom: 20px;
}

.meta-divider {
  color: var(--border-medium);
}

/* Features Checklist */
.pkg-features-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-bottom: 16px;
  text-align: left;
  flex: 1;
}

.pkg-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 0.86rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.pkg-feature-item--highlight {
  color: var(--brand-dark);
  font-weight: 700;
}

.package-card--permanent .pkg-feature-item--highlight {
  color: #92400e;
  font-weight: 700;
}

.pkg-feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.icon-check {
  width: 15px;
  height: 15px;
  fill: var(--brand-primary);
}

.icon-sparkle {
  width: 15px;
  height: 15px;
  fill: #d97706;
}

.package-card:not(.package-card--permanent) .icon-sparkle {
  fill: var(--brand-primary);
}

/* Permanent Sales Banner */
.pkg-sales-banner {
  font-size: 0.8rem;
  font-weight: 500;
  color: #92400e;
  line-height: 1.5;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.04) 100%);
  border: 1px solid rgba(217, 119, 6, 0.2);
  border-radius: var(--radius-sm);
  margin-top: 12px;
  margin-bottom: 20px;
  text-align: left;
}

/* Card Buy CTA Button (Aligned to bottom) */
.pkg-cta-btn {
  margin-top: auto;
  font-weight: 700;
  font-size: 1rem;
  height: 48px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.pkg-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Dynamic Smart Tips Banner */
.smart-tips-container {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 860px;
  margin: 20px auto 32px;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(5, 150, 105, 0.015) 100%), #ffffff;
  border: 1px solid rgba(5, 150, 105, 0.16);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.smart-tips-container--permanent {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.07) 0%, rgba(251, 191, 36, 0.02) 100%), #ffffff;
  border-color: rgba(217, 119, 6, 0.22);
  box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06), 0 1px 2px rgba(0, 0, 0, 0.02);
}

.smart-tips-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: rgba(5, 150, 105, 0.1);
  border: 1px solid rgba(5, 150, 105, 0.18);
  flex-shrink: 0;
}

.smart-tips-container--permanent .smart-tips-icon {
  background-color: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.22);
}

.tips-sparkle-icon {
  width: 13px;
  height: 13px;
  fill: var(--brand-primary);
}

.smart-tips-container--permanent .tips-sparkle-icon {
  fill: #d97706;
}

.smart-tips-text {
  flex: 1;
  font-size: 0.88rem;
  color: var(--brand-dark);
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.smart-tips-container--permanent .smart-tips-text {
  color: #92400e;
}

.smart-tips-tag {
  font-weight: 700;
  color: var(--brand-dark);
}

.smart-tips-container--permanent .smart-tips-tag {
  color: #78350f;
}

@media (max-width: 640px) {
  .smart-tips-container {
    padding: 10px 14px;
    gap: 10px;
    margin: 16px auto 24px;
    border-radius: var(--radius-sm);
  }

  .smart-tips-text {
    font-size: 0.82rem;
    line-height: 1.45;
  }
}

/* 核心功能列表 (对标 store 优雅排版) */
.features-section {
  text-align: center;
  margin-top: 16px;
  padding-top: 36px;
  border-top: 1px dashed var(--border-medium);
}

.features-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
  letter-spacing: -0.01em;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 28px;
  max-width: 1040px;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 20px;
  }
}

@media (max-width: 520px) {
  .features-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: left;
}

.feature-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-primary);
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.16);
}

.feature-text {
  line-height: 1.4;
}

/* Animations */
.badge-scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.badge-scale-enter-from {
  transform: scale(0) rotate(-45deg);
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
