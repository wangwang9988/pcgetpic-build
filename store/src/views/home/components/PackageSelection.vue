<template>
  <div class="state-packages animate-fade-in-up">
    <!-- 顶部标题 -->
    <header class="header">
      <div class="header-top">
        <div class="logo-area">
          <img class="logo-image" src="/logo.png" alt="当图logo" />
          <div class="title-group">
            <div class="title-row">
              <h1 class="title">{{ t('brandTitle') }}</h1>
              <span class="version-badge">v2.4.0</span>
            </div>
            <p class="subtitle">{{ t('brandSubtitle') }}</p>
          </div>
        </div>
      </div>
      <p class="tagline">{{ t('brandNote') }}</p>

      <!-- 客户端下载入口 -->
      <div class="header-download-bar">
        <span class="header-download-label">{{ t('downloadClient') }}</span>
        <a
          :href="MICROSOFT_STORE_URL"
          target="_blank"
          rel="noopener"
          referrerpolicy="origin"
          class="dl-btn dl-btn--store"
        >
          <MicrosoftStoreMark :size="16" />
          <span>{{ t('microsoftStore') }}</span>
          <span class="dl-btn-tag">{{ t('storeRecommended') }}</span>
        </a>

        <span class="dl-divider"></span>

        <!-- 备用离线渠道提示（轻量优雅，保留入口同时弱化呈现） -->
        <div class="header-fallback-channel">
          <span class="fallback-tip">{{ t('exeFallbackTitle') }}</span>
          <button
            type="button"
            class="fallback-btn"
            @click="showExeGuide = true"
          >
            {{ t('exeDownloadLink') }}
          </button>
          <a
            :href="CLIENT_DOWNLOAD_URL"
            class="sr-only"
            referrerpolicy="origin-when-cross-origin"
          >{{ t('exeFallbackDesc') }}</a>
        </div>
      </div>
    </header>

    <!-- EXE 下载引导弹窗：引导用户在线安装 -->
    <ExeDownloadGuideModal
      v-model="showExeGuide"
      :store-url="MICROSOFT_STORE_URL"
      @download-exe="handleExeDownload"
    />

    <!-- 升级抵扣券倒计时横幅 -->
    <transition name="slide-down">
      <div v-if="couponInfo.has_active_coupon" class="coupon-banner">
        <span class="coupon-banner-icon">🎁</span>
        <span class="coupon-banner-text">
          {{ t('couponBannerPrefix') }} {{ selectedCouponAmount }} {{ t('couponBannerMid') }}
          <span class="coupon-countdown" :class="{ 'coupon-countdown--urgent': couponRemainingHours < 12 }">
            {{ formatCouponCountdown(couponRemainingMs, locale) }}
          </span>
        </span>
      </div>
    </transition>

    <!-- 套餐卡片（数据未就绪时展示等高 4 卡脉冲骨架屏，消除版面跳动与白屏感） -->
    <div
      v-if="loading && packages.length === 0"
      class="packages-grid"
      aria-busy="true"
    >
      <div
        v-for="idx in 4"
        :key="'skeleton-' + idx"
        class="package-card glass-card package-card--skeleton"
      >
        <div class="skeleton-block skeleton-title"></div>
        <div class="skeleton-block skeleton-price"></div>
        <div class="skeleton-block skeleton-meta"></div>
        <div class="skeleton-features">
          <div v-for="line in 4" :key="line" class="skeleton-block skeleton-line"></div>
        </div>
        <div class="skeleton-block skeleton-btn"></div>
      </div>
    </div>

    <div
      v-else-if="packages.length === 0"
      class="packages-empty glass-card"
      role="alert"
    >
      <p class="packages-empty-text">{{ t('loadPackagesRetry') }}</p>
      <n-button type="primary" size="medium" @click="emit('retry')">
        {{ isEnglish ? 'Retry' : '????' }}
      </n-button>
    </div>

    <div
      v-else
      class="packages-grid"
      :class="{ 'packages-grid--has-selection': selectedPackageId !== null }"
    >
      <div
        v-for="pkg in packages"
        :key="pkg.id"
        class="package-card glass-card"
        :class="{
          'package-card--permanent': pkg.recommended,
          'package-card--selected': selectedPackageId === pkg.id,
          'package-card--unselected': selectedPackageId !== null && selectedPackageId !== pkg.id
        }"
        @click="selectedPackageId = pkg.id"
      >
        <!-- 推荐标签：后台配置了自定义角标则优先展示，未配置时保持原有默认规则 -->
        <div
          v-if="getPackageBadge(pkg, locale)"
          class="recommend-badge-pill"
          :class="{ 'recommend-badge--blue': !pkg.recommended }"
        >{{ getPackageBadge(pkg, locale) }}</div>
        <div v-else-if="pkg.recommended" class="recommend-badge-pill">{{ t('bestValue') }}</div>
        <div v-else-if="pkg.duration_type === 3" class="recommend-badge-pill recommend-badge--blue">{{ t('recommendedPlan') }}</div>

        <!-- 选中态对勾徽章 -->
        <transition name="badge-scale">
          <div v-if="selectedPackageId === pkg.id" class="selected-checkmark">
            <svg viewBox="0 0 24 24" class="checkmark-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        </transition>

        <div class="package-name" :class="{ 'package-name--permanent': pkg.recommended }">{{ displayName(pkg) }}</div>
        <div class="package-price">
          <!--
            币种双轨：英文界面全程显示港币 HK$，中文界面全程显示人民币 ¥。
            港币价取自后端下发的 price_hkd，并在未配置时自动回落到人民币，
            避免英文卡片出现空白价格。
          -->
          <span v-if="priceOriginalLabel(pkg)" class="price-original">{{ priceOriginalLabel(pkg) }}</span>
          <span class="price-symbol">{{ priceSymbol }}</span>
          <span class="price-value" :class="{ 'price-value--permanent': pkg.recommended }">{{ priceValueLabel(pkg) }}</span>
        </div>
        <!-- 抵扣后价格提示 -->
        <div v-if="couponInfo.has_active_coupon && isCouponAllowedForPkg(pkg)" class="price-discount-hint">
          🎁 {{ isEnglish ? t('autoDiscountedEn') + formatHkd(getAppliedDiscountHkd(pkg, selectedCouponAmount)) : t('autoDiscounted') + selectedCouponAmount + t('yuanUnit') }}
        </div>
        <div class="package-meta">
          <span class="meta-item">{{ formatDuration(pkg, locale) }}</span>
          <span class="meta-divider">|</span>
          <span class="meta-item">{{ pkg.max_devices }} {{ t('devices') }}</span>
        </div>

        <!-- 权益清单列表 -->
        <div class="package-features-list">
          <div
            v-for="(feat, idx) in getPackageFeatures(pkg, locale)"
            :key="idx"
            class="package-feature-item"
            :class="{ 'package-feature-item--highlight': feat.highlight }"
          >
            <span class="feature-item-icon">
              <svg v-if="feat.highlight" viewBox="0 0 24 24" class="icon-sparkle">
                <path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="icon-check">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
            <span class="feature-item-text">{{ feat.name }}</span>
          </div>
        </div>

        <!-- 永久卡算账文案 -->
        <div v-if="pkg.recommended" class="package-sales-text">
          💥 <strong>{{ t('permanentBannerTitle') }}</strong>{{ t('permanentBannerBody') }}
        </div>

        <!-- 永久卡限时倒计时 -->
        <PermanentCountdown
          v-if="pkg.recommended"
          :formatted-time="countdownFormatted"
          :is-urgent="countdownIsUrgent"
        />

        <n-button
          :type="selectedPackageId === pkg.id ? (pkg.recommended ? 'warning' : 'primary') : 'default'"
          block
          size="large"
          class="buy-btn"
          @click.stop="handleSelectPackage(pkg)"
        >
          {{ selectedPackageId === pkg.id ? t('buyNow') : t('choosePlan') }}
        </n-button>
      </div>
    </div>

    <!-- 动态提示区域 -->
    <transition name="fade-slide">
      <div v-if="selectedPackage" class="smart-tips-container glass-card">
        <div class="tip-icon">✨</div>
        <div class="tip-text">{{ getDynamicTips(selectedPackage, locale) }}</div>
      </div>
    </transition>

    <!-- 功能列表 -->
    <div class="features-section">
      <h2 class="features-title">{{ t('featuresTitle') }}</h2>
      <div class="features-grid">
        <div v-for="feature in features" :key="feature" class="feature-item">
          <span class="feature-dot"></span>
          <span>{{ feature }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, defineAsyncComponent } from 'vue'
import { NButton } from 'naive-ui'
import { CLIENT_DOWNLOAD_URL, MICROSOFT_STORE_URL } from '@/config'
import type { PackageInfo, CouponStatusData } from '@/api'
import {
  usePackageDisplay,
  formatPrice,
  formatDuration,
  formatCouponCountdown,
  isCouponAllowedForPkg,
  getPackageFeatures,
  getPackageBadge,
  displayPackageName,
  getDisplayPriceHkd,
  getOriginalPriceHkd,
  getAppliedDiscountHkd,
} from '../composables/usePackageDisplay'
import { useLocale, t, tBenefit, type BenefitKey } from '@/i18n'
import { useDailyCountdown } from '../composables/useDailyCountdown'
import PermanentCountdown from './PermanentCountdown.vue'
import MicrosoftStoreMark from './MicrosoftStoreMark.vue'

const ExeDownloadGuideModal = defineAsyncComponent(() => import('./ExeDownloadGuideModal.vue'))

/** 响应式 locale：切换语言时模板会重新求值 */
const locale = useLocale()
const isEnglish = computed(() => locale.value === 'en')

/** 币种符号：英文界面 HK$，中文界面 ¥ */
const priceSymbol = computed(() => (isEnglish.value ? 'HK$' : '¥'))

function formatHkd(v: number): string {
  return v.toFixed(2).replace(/\.00$/, '')
}

/** 卡片现价。英文界面优先港币标价，未配置则回落人民币。 */
function priceValueLabel(pkg: PackageInfo): string {
  if (isEnglish.value) {
    const hkd = getDisplayPriceHkd(pkg)
    if (hkd != null) return formatHkd(hkd)
  }
  return formatPrice(getDisplayPrice(pkg))
}

/**
 * 卡片划线原价。
 *
 * 返回的是**自带币种符号的完整标签**（模板里它独立渲染，不拼 priceSymbol），
 * 所以港币分支必须自己带上 HK$，否则英文卡片会只剩一个裸数字。
 * 港币按同比例折算并向上取整到整港币元。
 */
function priceOriginalLabel(pkg: PackageInfo): string {
  if (!pkg.original_price) return ''
  if (isEnglish.value) {
    const hkd = getOriginalPriceHkd(pkg)
    if (hkd != null) return `HK$${formatHkd(hkd)}`
  }
  return `¥${formatPrice(pkg.original_price)}`
}

/** 英文界面用后端派生的英文套餐名 */
function displayName(pkg: PackageInfo): string {
  return displayPackageName(pkg, locale.value)
}

const props = defineProps<{
  packages: PackageInfo[]
  loading?: boolean
  selectedPackageId: number | null
  couponInfo: CouponStatusData
  selectedCouponCode: string | null
  couponRemainingMs: number
  couponRemainingHours: number
}>()

const emit = defineEmits<{
  (e: 'update:selectedPackageId', id: number | null): void
  (e: 'update:selectedCouponCode', code: string | null): void
  (e: 'select', pkg: PackageInfo): void
  (e: 'retry'): void
}>()

/**
 * 核心功能列表。
 *
 * 存的是 BenefitKey 而不是最终文案：语言切换时 computed 会重跑并调 tBenefit()
 * 取当前语言，模板绑的是 computed 本身，所以点「EN」能立刻整列刷新。
 */
const FEATURE_KEYS: BenefitKey[] = [
  'batchImages',
  'platformSupport',
  'batchVideo',
  'originalQuality',
  'skuImages',
  'parallelFetch',
  'autoReferrer',
  'multiDevice',
]

const features = computed(() => FEATURE_KEYS.map((key) => tBenefit(key)))

// 双向绑定 selectedPackageId
const selectedPackageId = computed({
  get: () => props.selectedPackageId,
  set: (val: number | null) => emit('update:selectedPackageId', val),
})

const selectedPackage = computed(() => {
  return props.packages.find((p) => p.id === props.selectedPackageId) ?? null
})

// 套餐展示逻辑（抵扣券计算、价格展示、智能提示）
const { selectedCouponAmount, getDisplayPrice, getDynamicTips } = usePackageDisplay(props)

// 永久卡每日倒计时
const { formatted: countdownFormatted, isUrgent: countdownIsUrgent } = useDailyCountdown()

function handleSelectPackage(pkg: PackageInfo) {
  selectedPackageId.value = pkg.id
  emit('select', pkg)
}

// ========== EXE 下载引导 ==========
const showExeGuide = ref(false)

/** 用户确认仍要下载 EXE */
function handleExeDownload() {
  window.open(CLIENT_DOWNLOAD_URL, '_blank', 'noopener')
}
</script>

<style scoped>
/* ========== 状态 1：套餐展示 ========== */
.header {
  text-align: center;
  margin-bottom: 32px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 113, 227, 0.08);
  color: #0071e3;
  border: 1px solid rgba(0, 113, 227, 0.16);
  letter-spacing: 0.3px;
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.logo-image {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: contain;
  flex-shrink: 0;
}

.title-group { text-align: left; }

.title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.tagline {
  font-size: 15px;
  color: var(--text-placeholder);
  margin-top: 8px;
}

/* ========== Header 下载入口 ========== */
.header-download-bar {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 6px 8px 6px 16px;
  background: rgba(0, 113, 227, 0.04);
  border: 1px solid rgba(0, 113, 227, 0.12);
  border-radius: 999px;
}

.header-download-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.dl-btn-icon {
  flex-shrink: 0;
}

.dl-btn--store {
  background: #0071e3;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.25);
}

.dl-btn--store:hover {
  background: #0062c4;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.35);
}

.dl-btn-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.5px;
}

.dl-divider {
  width: 1px;
  height: 14px;
  background: rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.header-fallback-channel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.fallback-tip {
  color: var(--text-secondary);
}

.fallback-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.fallback-btn:hover {
  color: var(--color-primary);
}

@media (max-width: 640px) {
  .header-download-bar {
    flex-direction: column;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 16px;
  }

  .dl-divider {
    display: none;
  }

  .header-fallback-channel {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* ========== 抵扣券倒计时横幅 ========== */
.coupon-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #FFF8F0, #FFF2E5);
  border: 2px solid #FF9500;
  border-radius: 12px;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(255, 149, 0, 0.2); }
  50% { box-shadow: 0 0 20px rgba(255, 149, 0, 0.4); }
}

.coupon-banner-icon { font-size: 20px; }

.coupon-banner-text {
  font-size: 15px;
  color: #1d1d1f;
  font-weight: 500;
}

.coupon-countdown {
  font-weight: 800;
  color: #FF6B00;
  font-variant-numeric: tabular-nums;
  font-size: 16px;
}

.coupon-countdown--urgent {
  color: #FF3B30;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ========== 套餐卡片网格（自适应任意数量套餐） ========== */
.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 48px;
  position: relative;
}

@media (max-width: 900px) {
  .packages-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
}

@media (max-width: 560px) {
  .packages-grid { grid-template-columns: 1fr; }
}

.package-card {
  display: flex;
  flex-direction: column;
  padding: 28px 20px;
  text-align: center;
  position: relative;
  overflow: visible;
  cursor: pointer;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.4s ease;
}

.package-card:hover {
  transform: translateY(-6px);
  border-color: var(--border-color-hover);
  box-shadow: var(--shadow-card-hover);
}

/* 永久卡特殊样式 */
.package-card--permanent {
  background: linear-gradient(135deg, #FFFBF5 0%, #FFF5E8 100%);
  border-color: #FF9500;
  box-shadow: 0 4px 24px rgba(255, 149, 0, 0.15);
}

.package-card--permanent:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 36px rgba(255, 149, 0, 0.25);
  border-color: #FF6B00;
}

.package-card--selected {
  transform: scale(1.04) translateY(-6px);
  border-color: var(--color-primary);
  z-index: 5;
}

.package-card--permanent.package-card--selected {
  transform: scale(1.04) translateY(-8px);
  border-color: #FF6B00;
  box-shadow: 0 12px 40px rgba(255, 149, 0, 0.3);
}

.package-card--selected:hover {
  transform: scale(1.04) translateY(-6px);
}

.package-card--permanent.package-card--selected:hover {
  transform: scale(1.04) translateY(-8px);
}

.package-card--unselected {
  opacity: 0.65;
  transform: scale(0.97);
}

.package-card--unselected:hover {
  opacity: 0.85;
  transform: scale(0.99) translateY(-4px);
}

/* 推荐徽章 */
.recommend-badge-pill {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #FF9500, #FF6B00);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(255, 149, 0, 0.3);
  letter-spacing: 0.5px;
  z-index: 10;
  white-space: nowrap;
  /* 角标文案改为后台可配后可能较长，超宽时省略而不是撑破卡片 */
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-badge--blue {
  background: var(--color-primary-gradient);
  box-shadow: 0 4px 8px var(--color-primary-glow);
}

/* 选中对勾徽章 */
.selected-checkmark {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #FF9500, #FF6B00);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(255, 149, 0, 0.3);
  border: 2px solid var(--bg-pure-white);
  z-index: 12;
}

.package-card:not(.package-card--permanent) .selected-checkmark {
  background: var(--color-primary-gradient);
  box-shadow: 0 4px 10px var(--color-primary-glow);
}

.checkmark-icon { width: 14px; height: 14px; fill: #fff; }

.package-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.package-name--permanent { color: #FF6B00; }

.package-price {
  margin-bottom: 6px;
  color: var(--text-primary);
  position: relative;
}

.price-original {
  font-size: 14px;
  color: #86868b;
  text-decoration: line-through;
  margin-right: 6px;
  vertical-align: middle;
}

.price-symbol {
  font-size: 18px;
  font-weight: 600;
  vertical-align: top;
  line-height: 1.4;
}

.price-value {
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -1px;
}

.price-value--permanent {
  font-size: 42px;
  color: #FF6B00;
  font-weight: 900;
}

.price-discount-hint {
  font-size: 12px;
  color: #FF9500;
  font-weight: 600;
  margin-bottom: 8px;
}

.package-meta {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.meta-divider {
  margin: 0 8px;
  color: var(--divider-color);
}

/* 权益清单样式 */
.package-features-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 24px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-color);
  text-align: left;
}

.package-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.package-feature-item--highlight {
  font-weight: 600;
  color: #FF6B00;
}

.package-card:not(.package-card--permanent) .package-feature-item--highlight {
  color: var(--color-primary);
}

.feature-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  flex-shrink: 0;
}

.icon-check {
  width: 14px;
  height: 14px;
  fill: #34c759;
}

.icon-sparkle {
  width: 14px;
  height: 14px;
  fill: #FF9500;
}

.package-card:not(.package-card--permanent) .icon-sparkle {
  fill: var(--color-primary);
}

.package-sales-text {
  font-size: 12px;
  font-weight: 700;
  color: #FF6B00;
  line-height: 1.5;
  margin-bottom: 16px;
  padding: 8px 10px;
  background: rgba(255, 149, 0, 0.08);
  border-radius: 6px;
  border-left: 3px solid #FF9500;
  text-align: left;
}

.buy-btn { margin-top: auto; }

/* 智能提示容器 */
.smart-tips-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -16px auto 32px;
  padding: 14px 20px;
  max-width: 1000px;
  border-left: 4px solid var(--color-primary);
  background: rgba(0, 113, 227, 0.04);
  border-radius: 8px;
  text-align: left;
}

.tip-icon { font-size: 16px; }

.tip-text {
  font-size: 13.5px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* 功能列表 */
.features-section { text-align: center; }

.features-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 24px;
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 700px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-muted);
  text-align: left;
}

.feature-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}

/* ========== 过渡动画 ========== */
.badge-scale-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.badge-scale-enter-from { transform: scale(0) rotate(-45deg); opacity: 0; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(-10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(10px); }

.slide-down-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-down-enter-from { opacity: 0; transform: translateY(-20px); }

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========== 首屏脉冲骨架屏 ========== */
.package-card--skeleton {
  pointer-events: none;
  min-height: 410px;
}

.skeleton-block {
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.08) 50%, rgba(0, 0, 0, 0.04) 75%);
  background-size: 200% 100%;
  animation: skeletonPulse 1.4s ease-in-out infinite;
}

.skeleton-title {
  width: 48%;
  height: 22px;
  margin: 6px auto 18px;
}

.skeleton-price {
  width: 62%;
  height: 44px;
  margin: 0 auto 14px;
}

.skeleton-meta {
  width: 55%;
  height: 16px;
  margin: 0 auto 22px;
}

.skeleton-features {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
  padding-top: 14px;
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
}

.skeleton-line {
  width: 100%;
  height: 14px;
}

.skeleton-btn {
  width: 100%;
  height: 40px;
  margin-top: auto;
  border-radius: 10px;
}

@keyframes skeletonPulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
