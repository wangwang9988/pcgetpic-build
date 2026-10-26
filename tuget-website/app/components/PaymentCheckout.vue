<template>
  <div class="checkout-workspace">
    <div class="checkout-clean-container">
      <!-- 顶部标题 (对标 store 居中优雅 Masthead) -->
      <header class="checkout-hero-header">
        <div class="header-brand-wrap">
          <img src="/tuget-icon.svg" width="44" height="44" alt="TuGet Logo" class="header-logo">
          <div class="header-title-group">
            <div class="header-title-row">
              <h1 class="header-title">{{ t('headerTitle') }}</h1>
              <span class="header-badge">{{ t('headerBadge') }}</span>
            </div>
            <p class="header-subtitle">{{ t('headerSubtitle') }}</p>
          </div>
          <!-- 语言切换：SSR/SSG 阶段固定中文，onMounted 后才按用户偏好切换 -->
          <div class="lang-switch" role="group" aria-label="Language">
            <button
              type="button"
              class="lang-option"
              :class="{ 'lang-option-active': !isEnglish }"
              @click="setLocale('zh-CN')"
            >
              中文
            </button>
            <span class="lang-divider" aria-hidden="true">|</span>
            <button
              type="button"
              class="lang-option"
              :class="{ 'lang-option-active': isEnglish }"
              @click="setLocale('en')"
            >
              EN
            </button>
          </div>
        </div>
        <p class="header-tagline">{{ t('headerTagline') }}</p>
      </header>

      <!-- 4-Step Trust Progress Navigator -->
      <nav class="checkout-steps-nav" :aria-label="t('stepsNavLabel')">
        <div
          class="step-item"
          :class="{
            'step-item--active': pageState === 'packages',
            'step-item--done': pageState !== 'packages',
          }"
        >
          <div class="step-badge">
            <svg v-if="pageState !== 'packages'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else>1</span>
          </div>
          <span class="step-title">{{ t('stepSelect') }}</span>
        </div>

        <div class="step-connector" :class="{ 'step-connector--active': pageState !== 'packages' }" />

        <div
          class="step-item"
          :class="{
            'step-item--active': pageState === 'form',
            'step-item--done': pageState === 'payment' || pageState === 'success',
          }"
        >
          <div class="step-badge">
            <svg v-if="pageState === 'payment' || pageState === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else>2</span>
          </div>
          <span class="step-title">{{ t('stepConfirm') }}</span>
        </div>

        <div class="step-connector" :class="{ 'step-connector--active': pageState === 'payment' || pageState === 'success' }" />

        <div
          class="step-item"
          :class="{
            'step-item--active': pageState === 'payment',
            'step-item--done': pageState === 'success',
          }"
        >
          <div class="step-badge">
            <svg v-if="pageState === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else>3</span>
          </div>
          <span class="step-title">{{ t('stepPay') }}</span>
        </div>

        <div class="step-connector" :class="{ 'step-connector--active': pageState === 'success' }" />

        <div
          class="step-item"
          :class="{
            'step-item--active': pageState === 'success',
          }"
        >
          <div class="step-badge">
            <span>4</span>
          </div>
          <span class="step-title">{{ t('stepDone') }}</span>
        </div>
      </nav>

      <!-- Error notification banner -->
      <div v-if="error" class="checkout-error-banner animate-fade-in-up">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- State 1: Full-Width SaaS Pricing Matrix -->
      <CheckoutPackages
        v-if="pageState === 'packages'"
        :packages="packages"
        :loading="loadingPackages"
        :selected-package-id="selectedPackageId"
        @select="onSelectPackage"
        @proceed="onProceedToForm"
      />

      <!-- State 2: Clean Focused Order Form -->
      <CheckoutOrderForm
        v-else-if="pageState === 'form'"
        :selected-package="selectedPackage"
        :email="email"
        :coupon-code="couponCode"
        :coupon-discount="couponDiscount"
        :coupon-message="couponMessage"
        :upgrade-rebate="upgradeRebateData"
        :total-discount="totalDiscount"
        :benefit-state="benefitState"
        :is-checking-coupon="validatingCoupon"
        :agreed-to-terms="agreed"
        :is-submitting="creatingOrder || switchingToPayment"
        :final-price="payableAmount"
        :show-permanent-modal="showPermanentUpgradeModal"
        :needs-permanent-package="needsPermanentPackage"
        @update:email="email = $event"
        @update:coupon-code="couponCode = $event"
        @update:agreed-to-terms="agreed = $event"
        @update:show-permanent-modal="showPermanentUpgradeModal = $event"
        @check-coupon="validateCoupon"
        @switch-package="pageState = 'packages'"
        @switch-to-permanent="switchToPermanentPackage"
        @submit-order="handleCreateOrder"
      />

      <!-- State 3: Alipay RSA2 QR Code Payment (Official Look & Security) -->
      <CheckoutQrPay
        v-else-if="pageState === 'payment'"
        :order-data="order"
        :qr-data-url="qrDataUrl"
        :qr-render-failed="qrRenderFailed"
        :final-price="order?.amount ?? payableAmount"
        :can-use-stripe="canUseStripe"
        :hkd-amount="hkdAmount"
        :redirecting-stripe="redirectingStripe"
        @cancel-order="handleCancelPayment"
        @pay-stripe="startStripeCheckout"
      />

      <!-- State 4: Payment Success & TGTU Code Dispenser -->
      <CheckoutResult
        v-else-if="pageState === 'success'"
        :activation-code="orderStatus?.code || ''"
        :email="email"
        :copied="copied"
        @copy-code="handleCopyCode"
        @buy-another="handleResetCheckout"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue'
import CheckoutPackages from '~/components/checkout/CheckoutPackages.vue'
import { useTugetPayment } from '~/composables/useTugetPayment'
import { useCheckoutI18n } from '~/composables/useCheckoutI18n'

// 将非首屏的 Step 2 / Step 3 / Step 4 组件拆分为异步 chunk，缩减 /buy/ 首屏关键脚本体积
const loadCheckoutOrderForm = () => import('~/components/checkout/CheckoutOrderForm.vue')
const loadCheckoutQrPay = () => import('~/components/checkout/CheckoutQrPay.vue')
const CheckoutOrderForm = defineAsyncComponent(loadCheckoutOrderForm)
const CheckoutQrPay = defineAsyncComponent(loadCheckoutQrPay)
const CheckoutResult = defineAsyncComponent(() => import('~/components/checkout/CheckoutResult.vue'))

const {
  packages,
  selectedPackageId,
  selectedPackage,
  email,
  couponCode,
  couponDiscount,
  couponMessage,
  upgradeRebateData,
  totalDiscount,
  benefitState,
  agreed,
  loadingPackages,
  validatingCoupon,
  creatingOrder,
  error,
  order,
  orderStatus,
  qrDataUrl,
  qrRenderFailed,
  payableAmount,
  isPaid,
  canUseStripe,
  hkdAmount,
  redirectingStripe,
  showPermanentUpgradeModal,
  needsPermanentPackage,
  switchToPermanentPackage,
  preloadQrRenderer,
  selectPackage,
  validateCoupon,
  createOrder,
  startStripeCheckout,
  resetOrder,
} = useTugetPayment()

const { t, isEnglish, setLocale } = useCheckoutI18n()

// State machine: 'packages' -> 'form' -> 'payment' -> 'success'
const pageState = ref<'packages' | 'form' | 'payment' | 'success'>('packages')
const copied = ref(false)

/**
 * 订单已建、正在等支付组件 chunk、尚未切到支付态的那一小段。
 *
 * createOrder 返回时 composable 的 creatingOrder 已经复位（finally 先跑），
 * 若此处不再占住 submitting，表单按钮会重新变成可点，用户在这几十毫秒里
 * 再点一次就是第二笔订单。这个 flag 让按钮一直锁到页面真正切换为止。
 */
const switchingToPayment = ref(false)

onMounted(() => {
  // 首屏套餐渲染完成后，利用浏览器空闲时间静默预热 Step 2 / Step 3 异步组件，点击立即购买零延迟。
  // 这里不必再 import('qrcode')：该 chunk 已由 Nuxt 在预渲染 HTML 里以
  // <link rel="prefetch"> 声明，浏览器空闲时会自行取回，重复预热只是多一次模块求值。
  const warmup = () => {
    void loadCheckoutOrderForm()
    void loadCheckoutQrPay()
  }
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(warmup, { timeout: 1500 })
  } else if (typeof window !== 'undefined') {
    window.setTimeout(warmup, 600)
  }
})

function onSelectPackage(id: number) {
  selectPackage(id)
}

function onProceedToForm(id: number) {
  selectPackage(id)
  preloadQrRenderer()
  pageState.value = 'form'
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

/**
 * 切页时机：等订单、二维码、支付组件三者全部就绪后再切。
 *
 * 之前的实现是 watch(creatingOrder)，在请求发出的第 0 毫秒就切到支付态，
 * 用户被迫盯着屏幕正中央一个空白二维码框等网关（400~600ms）。等待本身无法消除，
 * 但可以放在表单按钮的 loading 上——那是用户已经预期「正在提交」的地方。
 *
 * 这里顺序也重要：useTugetPayment.createOrder 内部已 await 完 toDataURL，
 * 再 await 一次异步 chunk（通常已在 mount 时预热）后才切态，
 * 保证 payment 态渲染的第一帧就有真实图片，不出现占位闪烁。
 */
async function handleCreateOrder() {
  const created = await createOrder()
  if (!created) {
    // 支付订单创建失败时回到表单展示明确错误，不让用户停在空二维码页。
    if (!order.value) pageState.value = 'form'
    // 兜底：券校验被并发请求顶掉（benefitRequestVersion 冲突）这类分支只返回 false、
    // 不留任何提示，用户会看到按钮闪一下就没了。已有更具体的错误/券提示时不覆盖。
    // creatingOrder 仍为 true 说明这次 false 来自幂等守卫（另一次提交还在飞），不是失败，不弹错。
    if (!creatingOrder.value && !error.value && !couponMessage.value) error.value = t('requestFailed')
    return
  }
  if (!order.value) return
  switchingToPayment.value = true
  try {
    await loadCheckoutQrPay()
  }
  catch {
    // chunk 加载失败交由 defineAsyncComponent 自身兜底，不能阻断支付流程
  }
  pageState.value = 'payment'
  switchingToPayment.value = false
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function handleCancelPayment() {
  resetOrder()
  pageState.value = 'packages'
}

async function handleCopyCode() {
  const code = orderStatus.value?.code
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    // fallback
  }
}

function handleResetCheckout() {
  resetOrder()
  pageState.value = 'packages'
}

watch(isPaid, (paid) => {
  if (paid) {
    pageState.value = 'success'
  }
})

/**
 * 从 Stripe 跳回时的状态恢复。
 *
 * useTugetPayment.restoreFromStripeReturn() 会直接补一个占位 order，但用户是从
 * 另一个页面跳回来的，本组件的 pageState 仍停在初始的 'packages'——于是订单和
 * 轮询都在跑，界面却还显示套餐列表。这里补上跳转，让等待页/结果页真正出现。
 */
watch(order, (restored) => {
  if (restored && pageState.value === 'packages') {
    pageState.value = 'payment'
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
})
</script>

<style scoped>
.checkout-workspace {
  width: 100%;
}

.checkout-clean-container {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
}

/* 顶部标题 (对标 store 居中优雅 Masthead) */
.checkout-hero-header {
  text-align: center;
  margin: 6px auto 26px;
  padding-bottom: 20px;
}

.header-brand-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
}

/*
 * 语言切换胶囊。
 *
 * ⚠️ 这里必须按 /buy/ 的**浅色主题**写，不能照搬 store 收银台的深色样式：
 * 页面底色是 --bg-page (#f8fafc)，白字在白底上等于隐身；品牌色也要用
 * --brand-primary（翠绿 #059669）而不是 store 的紫色。
 */
.lang-switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid var(--brand-border, #e2e8f0);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.lang-option {
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #64748b; /* Slate 500，浅底上可读 */
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.lang-option:hover {
  color: #334155;
  background: #f1f5f9;
}

.lang-option-active {
  color: #ffffff;
  font-weight: 600;
  background: var(--brand-primary, #059669);
}

.lang-divider {
  color: #cbd5e1; /* Slate 300 */
  font-size: 13px;
}

.header-logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: contain;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.16);
}

.header-title-group {
  text-align: left;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.header-badge {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background-color: var(--brand-light);
  color: var(--brand-dark);
  border: 1px solid var(--brand-border);
  letter-spacing: 0.02em;
}

.header-subtitle {
  margin: 4px 0 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.header-tagline {
  margin: 8px auto 0;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .header-brand-wrap {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  .header-title-group {
    text-align: center;
  }
  .header-title {
    font-size: 1.4rem;
  }
}

/* 4 步流转指示条 (Checkout Step Navigator) */
.checkout-steps-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: 680px;
  margin: 0 auto 28px;
  padding: 10px 20px;
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-xs);
}

.step-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--bg-subtle);
  border: 1.5px solid var(--border-medium);
  color: var(--text-muted);
  font-size: 0.76rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.step-item--active {
  color: var(--brand-primary);
  font-weight: 700;
}

.step-item--active .step-badge {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
}

.step-item--done {
  color: var(--brand-dark);
}

.step-item--done .step-badge {
  background-color: var(--brand-light);
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

.step-connector {
  flex: 1;
  max-width: 48px;
  height: 2px;
  background-color: var(--border-light);
  transition: background-color 0.25s ease;
}

.step-connector--active {
  background-color: var(--brand-primary);
}

.checkout-error-banner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 18px;
  margin-bottom: 24px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: #dc2626;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: center;
}

.checkout-error-banner svg {
  flex-shrink: 0;
}

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .checkout-steps-nav {
    display: none;
  }
}
</style>
