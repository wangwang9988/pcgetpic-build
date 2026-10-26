<template>
  <div class="order-form-view">
    <div class="order-form-card animate-fade-in-up">
      <div class="order-form-header">
        <h2>{{ t('formTitle') }}</h2>
        <p>{{ t('formTagline') }}</p>
      </div>

      <!-- Selected Plan Summary Pill Row -->
      <div v-if="selectedPackage" class="selected-plan-pill-row">
        <div class="selected-plan-left">
          <span class="selected-plan-label">{{ t('selectedPlan') }}</span>
          <span class="selected-plan-name">{{ displayName(selectedPackage) }}</span>
          <span class="selected-plan-desc">({{ formatDurationLabel(selectedPackage, locale) }} · {{ selectedPackage.max_devices }} {{ t('devices') }})</span>
        </div>
        <button
          v-if="selectedPackage && !isPermanentPackage(selectedPackage)"
          type="button"
          class="switch-pkg-btn"
          :disabled="isSubmitting"
          @click="$emit('switchPackage')"
        >
          {{ t('switchPlan') }}
        </button>
      </div>

      <form class="clean-order-form" @submit.prevent="$emit('submitOrder')">
        <!-- Email Input -->
        <div class="form-item">
          <label for="order-email-input" class="form-label">
            <span>{{ t('emailLabel') }} <strong style="color: #ef4444;">*</strong></span>
            <small>{{ t('emailHint') }}</small>
          </label>
          <!-- 提交中锁定：请求飞渡期间改邮箱会让建单参数与本页显示不一致 -->
          <input
            id="order-email-input"
            type="email"
            :value="email"
            class="form-input"
            :placeholder="t('emailPlaceholderFull')"
            :disabled="isSubmitting"
            required
            autocomplete="email"
            @input="$emit('update:email', ($event.target as HTMLInputElement).value)"
          >
          <span class="form-helper">{{ t('emailHelper') }}</span>
        </div>

        <!-- Collapsible Coupon / Legacy Upgrade Area -->
        <div class="coupon-collapsible-area">
          <!-- 提交中不展开/收起：销毁券输入框会触发 blur → 再发一次券校验 → 顶掉正在飞的建单校验 -->
          <div class="coupon-toggle-btn" @click="!isSubmitting && (showCouponInput = !showCouponInput)">
            <span class="coupon-arrow">{{ showCouponInput ? '▼' : '▶' }}</span>
            <span class="coupon-toggle-text">{{ t('couponToggle') }}</span>
            <span v-if="totalDiscount > 0" class="coupon-applied-tag" :class="{ 'coupon-applied-tag--floor': upgradeRebate?.floor_applied }">
              {{ t('discountAppliedPrefix') }}{{ discountLabel }}
              <template v-if="upgradeRebate?.floor_applied"> · {{ t('floorApplied') }}</template>
            </span>
          </div>

          <!--
            折叠状态下的券错误必须仍然可见。
            券提示原本只渲染在展开面板内（v-if="showCouponInput"），用户折叠后提交失败时
            既看不到券的具体错误、又因为 couponMessage 非空而不触发上层通用兜底横幅，
            形成一条静默失败路径。这里在折叠时把错误提示挪到折叠行下方。
          -->
          <span
            v-if="!showCouponInput && couponMessage && benefitState === 'error'"
            class="coupon-feedback coupon-feedback--error coupon-feedback--collapsed"
          >
            {{ couponMessage }}
          </span>

          <transition name="fade-slide">
            <div v-if="showCouponInput" class="coupon-expand-box">
              <div class="coupon-input-group">
                <input
                  type="text"
                  :value="couponCode"
                  class="form-input"
                  :placeholder="t('couponPlaceholderLegacy')"
                  :disabled="isSubmitting"
                  autocomplete="off"
                  spellcheck="false"
                  @input="$emit('update:couponCode', ($event.target as HTMLInputElement).value)"
                  @blur="$emit('checkCoupon')"
                  @keydown.enter.prevent="$emit('checkCoupon')"
                >
                <button
                  type="button"
                  class="button button--ghost"
                  :disabled="!couponCode || isCheckingCoupon || isSubmitting"
                  @click="$emit('checkCoupon')"
                >
                  {{ isCheckingCoupon ? t('couponChecking') : t('couponApply') }}
                </button>
              </div>
              <div v-if="needsPermanentPackage" class="permanent-inline-card animate-fade-in-up">
                <div class="permanent-inline-header">
                  <span class="permanent-inline-icon">👑</span>
                  <div class="permanent-inline-info">
                    <strong>{{ t('permanentUpgradeTitle') }}{{ colon }}</strong>
                    <p>{{ t('permanentUpgradeDesc') }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="permanent-inline-btn"
                  :disabled="isSubmitting"
                  @click="$emit('switchToPermanent')"
                >
                  {{ t('switchToPermanentApply') }}
                </button>
              </div>

              <span
                v-else-if="couponMessage"
                class="coupon-feedback"
                :class="`coupon-feedback--${benefitState}`"
              >
                {{ couponMessage }}
              </span>
              <span v-if="upgradeRebate" class="upgrade-revoke-notice">{{ t('upgradeRevokeNotice') }}</span>
              <span class="form-helper">{{ t('benefitHelper') }}</span>
            </div>
          </transition>
        </div>

        <!-- Terms Agreement -->
        <div class="form-item">
          <label class="agreement-checkbox-label">
            <input
              type="checkbox"
              :checked="agreedToTerms"
              :disabled="isSubmitting"
              required
              @change="$emit('update:agreedToTerms', ($event.target as HTMLInputElement).checked)"
            >
            <span>
              {{ t('agreeBody') }}
              <NuxtLink to="/terms/" target="_blank" style="color: var(--brand-primary); text-decoration: underline;">{{ t('termsLink') }}</NuxtLink>
              {{ t('agreeAnd') }}
              <NuxtLink to="/privacy/" target="_blank" style="color: var(--brand-primary); text-decoration: underline;">{{ t('privacyLink') }}</NuxtLink>
            </span>
          </label>
        </div>

        <!-- Price Summary Bar -->
        <!--
          双轨定价：中文界面全程 ¥，英文界面全程 HK$。
          港币金额用 getPayableHkd(pkg, finalPrice) 就地计算，公式与后端
          computeOrderHkdMinor 一致，因此这里显示的 HK$ 与 Step 3 后端返回的
          amount_hkd 分毫不差（不额外透传 prop，避免建单后 props 变陈旧）。
        -->
        <div class="form-price-summary-bar">
          <div class="price-summary-left">
            <span v-if="selectedPackage && totalDiscount > 0" class="price-original">{{ originalPriceLabel }}</span>
            <span v-if="totalDiscount > 0" class="price-discount">
              {{ upgradeRebate ? t('discountLabelUpgrade') : t('discountLabelCoupon') }} −{{ discountLabel }}
              <em v-if="upgradeRebate?.floor_applied">{{ t('floorAppliedShort') }}</em>
            </span>
            <span>{{ t('payableAmount') }}</span>
            <strong>{{ t('zeroFee') }}</strong>
          </div>
          <div class="price-summary-amount">
            <small>{{ payableSymbol }}</small>{{ payableValueLabel }}
          </div>
        </div>

        <!-- Submit Alipay Button -->
        <button
          type="submit"
          class="button button--lg button--alipay button--wide"
          :disabled="isSubmitting || !agreedToTerms"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span v-if="isSubmitting">{{ t('submitting') }}</span>
          <span v-else>{{ isEnglish ? t('submitPayEn') : t('submitPay') }}</span>
        </button>

        <p v-if="!isEnglish && canPayHkd" class="stripe-step-hint">
          {{ t('stripeStepHint') }}
        </p>

        <!-- Back Link Button -->
        <div v-if="selectedPackage && !isPermanentPackage(selectedPackage)" style="text-align: center;">
          <!--
            提交中必须禁用：建单已在飞，此刻切回套餐页不会取消请求，
            请求成功后 watch(order) 又会把用户从套餐页拽回支付页。
          -->
          <button type="button" class="back-link-btn" :disabled="isSubmitting" @click="$emit('switchPackage')">
            {{ t('backToPlans') }}
          </button>
        </div>

        <!-- Trust & Security Bar -->
        <div class="security-trust-bar">
          <div class="security-trust-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {{ t('trustDirectSign') }}
          </div>
          <div class="security-trust-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {{ t('trustRsa2') }}
          </div>
          <div class="security-trust-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            {{ t('trustAutoCard') }}
          </div>
          <div class="security-trust-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ t('trustInvoice') }}
          </div>
        </div>
      </form>
    </div>

    <!-- Permanent Upgrade Guide Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showPermanentModal"
          class="permanent-modal-overlay"
          @click.self="$emit('update:showPermanentModal', false)"
        >
          <div class="permanent-modal-container animate-modal-scale" role="dialog" aria-modal="true" aria-labelledby="modal-permanent-title">
            <button
              type="button"
              class="modal-close-btn"
              :aria-label="t('closeLabel')"
              @click="$emit('update:showPermanentModal', false)"
            >
              ✕
            </button>

            <div class="permanent-modal-header">
              <div class="modal-crown-badge">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" fill="#f59e0b" stroke="#d97706" />
                </svg>
              </div>
              <h3 id="modal-permanent-title">{{ t('permanentModalTitle') }}</h3>
              <p class="modal-subtitle">{{ t('permanentModalSubtitle') }}</p>
            </div>

            <div class="permanent-modal-body">
              <div class="modal-benefit-box">
                <div class="benefit-box-title">
                  <span>{{ t('permanentModalIntro') }}</span>
                </div>
                <ul class="benefit-points-list">
                  <li>
                    <span class="point-icon">✓</span>
                    <span><strong>{{ t('permanentItem1Title') }}</strong>{{ colon }}{{ t('permanentItem1Body') }}</span>
                  </li>
                  <li>
                    <span class="point-icon">✓</span>
                    <span><strong>{{ t('permanentItem2Title') }}</strong>{{ colon }}{{ t('permanentItem2Body') }}</span>
                  </li>
                  <li>
                    <span class="point-icon">✓</span>
                    <span><strong>{{ t('permanentItem3Title') }}</strong>{{ colon }}{{ t('permanentItem3Body') }}</span>
                  </li>
                  <li>
                    <span class="point-icon">✓</span>
                    <span><strong>{{ t('permanentItem4Title') }}</strong>{{ colon }}{{ t('permanentItem4Body') }}</span>
                  </li>
                </ul>
              </div>
              <p class="modal-tip-note">
                💡 <strong>{{ t('permanentModalNote') }}</strong>
              </p>
            </div>

            <div class="permanent-modal-footer">
              <button
                type="button"
                class="modal-action-btn"
                :disabled="isSubmitting"
                @click="$emit('switchToPermanent')"
              >
                {{ t('permanentModalCta') }}
              </button>
              <button
                type="button"
                class="modal-ghost-btn"
                @click="$emit('update:showPermanentModal', false)"
              >
                {{ t('modalLater') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { PackageInfo, UpgradeRebateData } from '~/types/payment'
import {
  formatPrice,
  formatDurationLabel,
  isPermanentPackage,
  displayPackageName,
  getOriginalPriceHkd,
  getAppliedDiscountHkd,
  getPayableHkd,
} from '~/composables/usePackageDisplay'
import { useCheckoutI18n } from '~/composables/useCheckoutI18n'

const { t, locale, isEnglish } = useCheckoutI18n()

const props = defineProps<{
  selectedPackage: PackageInfo | null
  email: string
  couponCode: string
  couponDiscount: number
  couponMessage: string
  upgradeRebate: UpgradeRebateData | null
  totalDiscount: number
  benefitState: 'idle' | 'success' | 'warning' | 'error'
  isCheckingCoupon: boolean
  agreedToTerms: boolean
  isSubmitting: boolean
  finalPrice: number
  showPermanentModal?: boolean
  needsPermanentPackage?: boolean
}>()

defineEmits<{
  (e: 'update:email', val: string): void
  (e: 'update:couponCode', val: string): void
  (e: 'update:agreedToTerms', val: boolean): void
  (e: 'update:showPermanentModal', val: boolean): void
  (e: 'checkCoupon'): void
  (e: 'switchPackage'): void
  (e: 'switchToPermanent'): void
  (e: 'submitOrder'): void
}>()

/** 中英文各自的冒号：全角「：」与半角「: 」。 */
const colon = computed(() => (isEnglish.value ? ': ' : '：'))

function displayName(pkg: PackageInfo): string {
  return displayPackageName(pkg, locale.value)
}

/**
 * 应付币种符号。
 *
 * 英文界面只有在套餐配了港币标价、且折算后不低于 HK$15 时才用 HK$，
 * 否则回落 ¥（此时 Step 3 也拿不到 Stripe 入口，符号必须跟着回落）。
 */
const payableHkd = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg || !isEnglish.value) return null
  return getPayableHkd(pkg, props.finalPrice)
})

const canPayHkd = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg || pkg.stripe_enabled === false) return false
  return getPayableHkd(pkg, props.finalPrice) != null
})

const payableSymbol = computed(() => (payableHkd.value != null ? 'HK$' : '¥'))

const payableValueLabel = computed(() => formatPrice(payableHkd.value ?? props.finalPrice))

/** 划线原价：英文按港币标价比例折算并向上取整到整元。 */
const originalPriceLabel = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg) return ''
  if (isEnglish.value) {
    const hkd = getOriginalPriceHkd(pkg)
    return hkd != null ? `${t('originalPricePrefix')}HK$${formatPrice(hkd)}` : ''
  }
  return `${t('originalPricePrefix')}¥${formatPrice(pkg.price)}`
})

/** 折扣金额：英文按港币等值展示，与后端 computeOrderHkdMinor 同口径。 */
const discountLabel = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg) return ''
  if (isEnglish.value) {
    return `HK$${formatPrice(getAppliedDiscountHkd(pkg, props.totalDiscount))}`
  }
  return `¥${formatPrice(props.totalDiscount)}`
})

const showCouponInput = ref(false)

watch(() => props.needsPermanentPackage, (val) => {
  if (val) showCouponInput.value = true
})
</script>

<style scoped>
.order-form-view {
  width: 100%;
}

.order-form-card {
  max-width: 580px;
  margin: 0 auto;
  padding: 40px 36px;
  background-color: #ffffff;
  border: 1.5px solid var(--border-medium);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.order-form-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.order-form-header h2 {
  font-size: 1.55rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px 0;
  letter-spacing: -0.02em;
}

.order-form-header p {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin: 0;
}

/* Selected Plan Pill Row */
.selected-plan-pill-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background-color: var(--bg-subtle);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  margin-bottom: 24px;
  font-size: 0.88rem;
}

.selected-plan-left {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
}

.selected-plan-label {
  color: var(--text-muted);
}

.selected-plan-name {
  color: var(--brand-dark);
  font-weight: 700;
}

.selected-plan-desc {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.switch-pkg-btn {
  background: none;
  border: none;
  color: var(--brand-primary);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.84rem;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  transition: background-color 0.15s;
}

.switch-pkg-btn:hover {
  background-color: var(--brand-light);
  text-decoration: underline;
}

/* Clean Order Form Fields */
.clean-order-form {
  display: grid;
  gap: 20px;
}

.form-item {
  display: grid;
  gap: 6px;
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.form-label small {
  font-weight: 500;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1.5px solid var(--border-medium);
  border-radius: var(--radius-sm);
  background-color: #ffffff;
  color: var(--text-primary);
  font-size: 0.96rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input:focus {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
}

/*
 * 提交中锁定态：请求飞渡期间表单不再接受编辑，必须给出可感知的视觉反馈，
 * 否则用户会误以为是页面卡住而不是正在提交。
 */
.form-input:disabled {
  background-color: #f1f5f9;
  color: var(--text-muted);
  cursor: not-allowed;
}

.switch-pkg-btn:disabled,
.back-link-btn:disabled,
.permanent-inline-btn:disabled,
.modal-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-helper {
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Collapsible Coupon Area */
.coupon-collapsible-area {
  display: flex;
  flex-direction: column;
}

.coupon-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  padding: 4px 0;
  transition: color 0.15s;
}

.coupon-toggle-btn:hover {
  color: var(--brand-primary);
}

.coupon-arrow {
  font-size: 0.72rem;
  color: var(--brand-primary);
  transition: transform 0.2s ease;
}

.coupon-applied-tag {
  font-size: 0.75rem;
  color: var(--brand-primary);
  background-color: var(--brand-light);
  border: 1px solid var(--brand-border);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-weight: 700;
  margin-left: 6px;
}

.coupon-applied-tag--floor {
  color: #b45309;
  background-color: #fffbeb;
  border-color: #fcd34d;
}

.coupon-expand-box {
  margin-top: 8px;
}

.coupon-input-group {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.coupon-input-group .button {
  min-height: 48px;
  padding: 0 16px;
  font-size: 0.88rem;
}

.coupon-feedback {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.4;
}

.coupon-feedback--success {
  color: var(--brand-primary);
}

.coupon-feedback--warning {
  color: #b45309;
}

.coupon-feedback--error {
  color: var(--danger, #dc2626);
}

/* 折叠态下外置的错误提示：与折叠行拉开一点距离，避免贴着点击区域 */
.coupon-feedback--collapsed {
  margin-top: 10px;
}

.upgrade-revoke-notice {
  display: block;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  background: #f8fafc;
  color: var(--text-secondary);
  font-size: 0.76rem;
  line-height: 1.5;
}

.agreement-checkbox-label {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1.45;
}

.agreement-checkbox-label input {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  accent-color: var(--brand-primary);
}

.form-price-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 16px 20px;
  background-color: var(--bg-subtle);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.price-summary-left span {
  font-size: 0.82rem;
  color: var(--text-muted);
  display: block;
}

.price-summary-left .price-original {
  text-decoration: line-through;
  color: var(--text-muted);
}

.price-summary-left .price-discount {
  color: var(--brand-primary);
  font-weight: 700;
  margin: 3px 0;
}

.price-summary-left .price-discount em {
  display: inline-block;
  margin-left: 5px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: #fffbeb;
  color: #b45309;
  font-size: 0.68rem;
  font-style: normal;
}

.price-summary-left strong {
  font-size: 0.98rem;
  color: var(--text-primary);
}

.price-summary-amount {
  font-size: 2.1rem;
  font-weight: 900;
  color: var(--brand-dark);
  letter-spacing: -0.04em;
  line-height: 1;
}

.price-summary-amount small {
  font-size: 1rem;
  font-weight: 700;
}

.back-link-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.86rem;
  cursor: pointer;
  padding: 6px 12px;
  transition: color 0.15s;
}

.back-link-btn:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.stripe-step-hint {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.45;
}

.security-trust-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 4px;
  padding: 10px 8px;
  background-color: var(--bg-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.68rem;
  color: var(--text-muted);
  text-align: center;
}

.security-trust-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  white-space: nowrap;
}

.security-trust-tag svg {
  color: var(--brand-primary);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .order-form-card {
    padding: 24px;
  }

  .security-trust-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Permanent Inline Card */
.permanent-inline-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #fffdfa 0%, #fffbeb 100%);
  border: 1.5px solid #fcd34d;
  border-radius: var(--radius-sm);
  margin-top: 8px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
}

.permanent-inline-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.permanent-inline-icon {
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}

.permanent-inline-info strong {
  display: block;
  font-size: 0.88rem;
  color: #92400e;
  font-weight: 700;
}

.permanent-inline-info p {
  margin: 3px 0 0;
  font-size: 0.78rem;
  color: #b45309;
  line-height: 1.45;
}

.permanent-inline-btn {
  align-self: flex-start;
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #ffffff;
  border: none;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 7px 16px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.permanent-inline-btn:hover {
  background: linear-gradient(135deg, #b45309, #92400e);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(217, 119, 6, 0.35);
}

/* Permanent Modal Dialog */
.permanent-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.permanent-modal-container {
  max-width: 480px;
  width: 100%;
  background: #ffffff;
  border-radius: var(--radius-xl);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.28);
  border: 1.5px solid rgba(245, 158, 11, 0.3);
  position: relative;
  overflow: hidden;
  padding: 32px 28px 28px;
}

.modal-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--radius-full);
  transition: all 0.15s;
  line-height: 1;
}

.modal-close-btn:hover {
  background-color: var(--bg-subtle);
  color: var(--text-primary);
}

.permanent-modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.modal-crown-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #f59e0b;
  margin: 0 auto 12px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
}

.permanent-modal-header h3 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #78350f;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  font-size: 0.86rem;
  color: #92400e;
  margin: 0;
  font-weight: 600;
}

.modal-benefit-box {
  background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
  border: 1.5px solid #fde68a;
  border-radius: var(--radius-md);
  padding: 16px 18px;
  margin-bottom: 14px;
}

.benefit-box-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 10px;
}

.benefit-points-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.benefit-points-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.82rem;
  color: #451a03;
  line-height: 1.45;
}

.benefit-points-list li strong {
  color: #78350f;
}

.point-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #d97706;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 900;
  flex-shrink: 0;
  margin-top: 2px;
}

.modal-tip-note {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0 0 20px;
  text-align: center;
}

.permanent-modal-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-action-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.96rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-action-btn:hover {
  background: linear-gradient(135deg, #b45309, #92400e);
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.45);
}

.modal-ghost-btn {
  width: 100%;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.84rem;
  cursor: pointer;
  padding: 8px 0;
  transition: color 0.15s;
}

.modal-ghost-btn:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

/* Modal Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.animate-modal-scale {
  animation: modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes modalScale {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
