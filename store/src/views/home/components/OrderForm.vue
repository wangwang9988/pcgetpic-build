<template>
  <div class="state-form animate-fade-in-up">
    <div class="form-container glass-card">
      <h2 class="form-title">{{ t('confirmTitle') }}</h2>

      <!-- 已选套餐 -->
      <div class="selected-package">
        <span class="label">{{ t('selectedPlan') }}：</span>
        <span class="value">{{ displayName(selectedPackage) }}</span>
        <n-button
          v-if="selectedPackage && !isPermanentPackage(selectedPackage)"
          text
          type="primary"
          size="small"
          @click="emit('back')"
        >
          {{ t('switchPlan') }}
        </n-button>
      </div>

      <!--
        金额：与 Step 1 同一套币种双轨规则。
        英文界面显示港币，且应付金额用与后端 computeOrderHkdMinor 一致的
        比例折算 + 向上取整，保证 Step 2 看到的 HK$ 与 Stripe 实扣分毫不差。
      -->
      <div class="amount-display">
        <span class="label">{{ t('payAmount') }}：</span>
        <span v-if="appliedCouponDiscount > 0" class="amount-original">{{ originalPriceLabel }}</span>
        <span class="amount-value" :class="{ 'amount-value--discount': appliedCouponDiscount > 0 }">{{ payableLabel }}</span>
        <span v-if="appliedCouponDiscount > 0" class="amount-save">{{ savedLabel }}</span>
      </div>

      <!-- 邮箱输入 -->
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="top">
        <n-form-item :label="t('emailLabel')" path="email">
          <n-input
            v-model:value="formData.email"
            :placeholder="t('emailPlaceholder')"
            size="large"
            clearable
          />
        </n-form-item>
      </n-form>

      <!-- 自动匹配抵扣券提示区域 -->
      <transition name="fade-slide">
        <div v-if="autoCouponApplied" class="auto-coupon-section">
          <!-- 横幅提示 -->
          <div class="auto-coupon-banner">
            <span class="auto-coupon-icon">🎁</span>
            <span class="auto-coupon-text">
              {{ t('autoCouponPrefix') }}<strong>{{ availableCoupons.length }}{{ t('couponCountSuffix') }}</strong>{{ t('autoCouponSuffix') }}
            </span>
          </div>
          <!-- 多券选择列表 -->
          <div v-if="availableCoupons.length > 1" class="coupon-list">
            <div
              v-for="coupon in availableCoupons"
              :key="coupon.coupon_code"
              class="coupon-list-item"
              :class="{ 'coupon-list-item--selected': selectedCouponCode === coupon.coupon_code }"
              @click="handleSelectCoupon(coupon.coupon_code)"
            >
              <div class="coupon-list-item-left">
                <span class="coupon-list-radio" :class="{ 'coupon-list-radio--checked': selectedCouponCode === coupon.coupon_code }">
                  <svg v-if="selectedCouponCode === coupon.coupon_code" viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="10" fill="#FF9500"/></svg>
                </span>
                <span class="coupon-list-amount">{{ couponAmountLabel(coupon) }}</span>
              </div>
              <div class="coupon-list-item-right">
                <span v-if="getCouponRemainingMs(coupon) <= 12 * 3600 * 1000" class="coupon-list-urgent">
                  ⏰ {{ formatCouponCountdown(getCouponRemainingMs(coupon), locale) }}
                </span>
                <span v-else class="coupon-list-time">
                  {{ t('couponRemainingPrefix') }} {{ formatCouponCountdown(getCouponRemainingMs(coupon), locale) }}
                </span>
              </div>
            </div>
          </div>
          <!-- 只有一张券时显示简洁倒计时 -->
          <div v-if="availableCoupons.length === 1 && availableCoupons[0]" class="auto-coupon-countdown">
            {{ t('couponRemainingPrefix') }} {{ formatCouponCountdown(getCouponRemainingMs(availableCoupons[0]), locale) }}
          </div>
        </div>
      </transition>

      <!-- 手动输入抵扣券（仅年卡和永久卡可用） -->
      <div v-if="selectedPackage && isCouponAllowedForPkg(selectedPackage)" class="coupon-input-area">
        <div class="coupon-toggle" @click="showCouponInput = !showCouponInput">
          <span>{{ showCouponInput ? '▼' : '▶' }} {{ t('couponToggleHas') }}</span>
        </div>
        <transition name="fade-slide">
          <div v-if="showCouponInput" class="coupon-input-row">
            <n-input
              v-model:value="couponCodeInput"
              :placeholder="t('couponCodePlaceholder')"
              size="large"
              clearable
              :disabled="couponValidating || couponValid"
              class="coupon-input"
            />
            <n-button
              size="large"
              :type="couponValid ? 'success' : 'primary'"
              :loading="couponValidating"
              :disabled="!couponCodeInput || couponValid"
              @click="handleValidateCoupon"
            >
              {{ couponValid ? t('couponVerified') : t('couponValidate') }}
            </n-button>
            <n-button v-if="couponValid" text type="error" size="small" @click="handleRemoveCoupon">
              {{ t('couponRemove') }}
            </n-button>
          </div>
        </transition>
        <transition name="fade-slide">
          <div v-if="couponValidationError" class="coupon-error">
            {{ couponValidationError }}
          </div>
        </transition>
        <transition name="fade-slide">
          <div v-if="couponValid" class="coupon-success">
            ✅ {{ t('couponValidMsg') }}{{ discountAmountLabel }}
          </div>
        </transition>
      </div>

      <div class="agreement-confirm-row">
        <n-checkbox v-model:checked="agreementAccepted" size="small">
          <span class="agreement-copy">
            {{ t('agreementBody') }}
            <button type="button" class="agreement-link" @click.stop.prevent="emit('open-agreement')">
              {{ t('agreementDoc') }}
            </button>{{ t('agreementTail') }}
          </span>
        </n-checkbox>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <n-button
          type="primary"
          block
          size="large"
          :loading="submitting"
          :disabled="!agreementAccepted"
          @click="handleSubmitOrder"
        >
          {{ t('submitPay') }}
        </n-button>
        <p v-if="!isEnglish && canPayHkd" class="stripe-step-hint">
          {{ t('stripeStepHint') }}
        </p>
        <n-button
          v-if="selectedPackage && !isPermanentPackage(selectedPackage)"
          text
          class="back-link"
          @click="emit('back')"
        >
          {{ t('backToPlans') }}
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useMessage, NForm, NFormItem, NInput, NCheckbox, NButton } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import {
  createOrder,
  validateCoupon,
  COUPON_MIN_PRICE,
  type PackageInfo,
  type CouponStatusData,
  type CouponItemData,
  type CreateOrderData,
} from '@/api'
import {
  isPermanentPackage,
  displayPackageName,
  getOriginalPriceHkd,
  getPayableHkd,
  getAppliedDiscountHkd,
} from '../composables/usePackageDisplay'
import { useLocale, t, type TranslationKey } from '@/i18n'

/** 响应式 locale：切换语言时模板会重新求值 */
const locale = useLocale()
const isEnglish = computed(() => locale.value === 'en')

function formatHkd(v: number): string {
  return v.toFixed(2).replace(/\.00$/, '')
}

/** 划线原价标签（含币种符号） */
const originalPriceLabel = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg) return ''
  if (isEnglish.value) {
    const hkd = getOriginalPriceHkd(pkg)
    if (hkd != null) return `HK$${formatHkd(hkd)}`
  }
  return `¥${formatPrice(pkg.price)}`
})

/**
 * 应付金额标签。
 *
 * 英文界面用 getPayableHkd（与后端同公式）折算；若折算后低于 HK$15 下限，
 * 该函数返回 null，此时退回人民币展示——因为后端同样不会给这类订单开 Stripe。
 */
const payableLabel = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg) return ''
  if (isEnglish.value) {
    const hkd = getPayableHkd(pkg, getDisplayPrice(pkg))
    if (hkd != null) return `HK$${formatHkd(hkd)}`
  }
  return `¥${formatPrice(getDisplayPrice(pkg))}`
})

const canPayHkd = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg || pkg.stripe_enabled === false) return false
  return getPayableHkd(pkg, getDisplayPrice(pkg)) != null
})

/** 已省金额标签 */
const savedLabel = computed(() => {
  const pkg = props.selectedPackage
  if (!pkg) return ''
  if (isEnglish.value) {
    return `${t('savedPrefix')}HK$${formatHkd(getAppliedDiscountHkd(pkg, appliedCouponDiscount.value))}`
  }
  return `${t('savedPrefix')}¥${formatPrice(appliedCouponDiscount.value)}`
})

/** 英文界面用后端派生的英文套餐名 */
function displayName(pkg: PackageInfo | null): string {
  return pkg ? displayPackageName(pkg, locale.value) : ''
}

const props = defineProps<{
  selectedPackage: PackageInfo | null
  couponInfo: CouponStatusData
  selectedCouponCode: string | null
  initialEmail: string
}>()

const emit = defineEmits<{
  (e: 'submit', orderData: CreateOrderData): void
  (e: 'back'): void
  (e: 'email-change', email: string): void
  (e: 'update:selectedCouponCode', code: string | null): void
  (e: 'open-agreement'): void
}>()

const message = useMessage()

// ========== 表单数据 ==========
const formRef = ref<FormInst | null>(null)
const formData = reactive({ email: props.initialEmail })
const submitting = ref(false)
const agreementAccepted = ref(true)

/**
 * 校验提示随语言实时切换。
 *
 * naive-ui 的FormRules 只接受静态对象，这里直接用 t()（内部读响应式 locale），
 * 切换语言时因为规则对象在渲染期被重新读取，提示文案会跟着变。
 */
const formRules: FormRules = {
  email: [
    { required: true, message: t('emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('emailInvalid'), trigger: 'blur' },
  ],
}

// ========== 抵扣券输入 ==========
const showCouponInput = ref(false)
const couponCodeInput = ref('')
const couponValidating = ref(false)
const couponValid = ref(false)
const couponValidationError = ref('')
const manualDiscountRef = ref(0)

/** 可用的抵扣券列表（来自邮箱自动匹配） */
const availableCoupons = computed<CouponItemData[]>(() => {
  return props.couponInfo.coupons ?? []
})

/** 当前选中的自动匹配券 */
const selectedAutoCoupon = computed<CouponItemData | null>(() => {
  if (!props.selectedCouponCode || !availableCoupons.value.length) return null
  return availableCoupons.value.find(c => c.coupon_code === props.selectedCouponCode) ?? null
})

/** 是否自动应用了抵扣券（邮箱匹配到的，非手动输入的） */
const autoCouponApplied = computed(() => {
  if (!props.selectedPackage || !isCouponAllowedForPkg(props.selectedPackage)) return false
  if (couponValid.value) return false // 手动输入的券不算自动应用
  return props.couponInfo.has_active_coupon && availableCoupons.value.length > 0
})

/** 判断抵扣券是否允许用于该套餐（基于价格阈值，对用户不可见） */
function isCouponAllowedForPkg(pkg: PackageInfo): boolean {
  return pkg.price >= COUPON_MIN_PRICE
}

/** 动态计算当前生效的抵扣金额（统一管理手动券 + 自动匹配券） */
const appliedCouponDiscount = computed(() => {
  if (!props.selectedPackage || !isCouponAllowedForPkg(props.selectedPackage)) {
    return 0
  }
  if (couponValid.value) {
    return manualDiscountRef.value
  }
  if (selectedAutoCoupon.value) {
    return selectedAutoCoupon.value.amount
  }
  return 0
})

/** 格式化价格 */
function formatPrice(price: number): string {
  return parseFloat(price.toFixed(2)).toString()
}

/** 格式化抵扣券倒计时（locale 缺省中文，英文界面显式传 'en'） */
function formatCouponCountdown(ms: number, lang: 'zh-CN' | 'en' = 'zh-CN'): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (lang === 'en') {
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }
  if (hours > 0) return `${hours}小时${minutes}分`
  if (minutes > 0) return `${minutes}分${seconds}秒`
  return `${seconds}秒`
}

/**
 * 抵扣券面额标签。
 *
 * 英文界面把人民币面额按套餐比例折成港币等值（与 getAppliedDiscountHkd 同口径），
 * 否则会在只显示 HK$ 的界面上冒出一个 ¥ 面额。
 */
function couponAmountLabel(coupon: CouponItemData): string {
  const pkg = props.selectedPackage
  if (isEnglish.value && pkg) {
    return `HK$${formatHkd(getAppliedDiscountHkd(pkg, coupon.amount))}`
  }
  return `¥${formatPrice(coupon.amount)}`
}

/** 当前生效抵扣的金额标签（币种跟随界面）。 */
const discountAmountLabel = computed(() => {
  const pkg = props.selectedPackage
  if (isEnglish.value && pkg) {
    return `HK$${formatHkd(getAppliedDiscountHkd(pkg, appliedCouponDiscount.value))}`
  }
  return `¥${formatPrice(appliedCouponDiscount.value)}`
})

/** 获取某张券的剩余毫秒数 */
function getCouponRemainingMs(coupon: CouponItemData): number {
  return Math.max(0, coupon.expires_at - Date.now())
}

/** 获取展示价格 */
function getDisplayPrice(pkg: PackageInfo | null): number {
  if (!pkg) return 0
  const discount = appliedCouponDiscount.value
  if (discount > 0 && isCouponAllowedForPkg(pkg)) {
    return Math.max(0, pkg.price - discount)
  }
  return pkg.price
}

/** 选择抵扣券 */
function handleSelectCoupon(code: string) {
  emit('update:selectedCouponCode', code)
}

/**
 * 抵扣券错误码 → 词条key。
 *
 * validate-coupon 是 HTTP 200 + valid:false，错误码在响应体的 error_code 里，
 * 后端配的 message 是中文硬编码，所以界面按错误码自己出文案。
 */
const COUPON_ERROR_KEYS: Record<string, TranslationKey> = {
  COUPON_NOT_FOUND: 'errCouponNotFound',
  COUPON_ALREADY_USED: 'errCouponAlreadyUsed',
  COUPON_EXPIRED: 'errCouponExpired',
  COUPON_NOT_ALLOWED: 'errCouponNotAllowed',
  COUPON_PRODUCT_MISMATCH: 'errCouponProductMismatch',
}

/**
 * 记录当前报错是「哪个错误码 + 后端原文」产生的。
 *
 * 存来源而不是只存文案：用户在中文下验证失败、再切到 EN 时，
 * 屏幕上不能留着上一种语言的句子。
 */
const couponErrorSource = ref<{ code: string, fallback: string } | null>(null)

function renderCouponError(): string {
  const src = couponErrorSource.value
  if (!src) return ''
  const key = COUPON_ERROR_KEYS[src.code]
  return key ? t(key) : (src.fallback || t('couponUnavailable'))
}

/** 切语言时重渲染已显示的抵扣券报错（只换文案，不动已生效的抵扣）。 */
watch(locale, () => {
  if (couponErrorSource.value) couponValidationError.value = renderCouponError()
})

/** 手动验证抵扣券 */
async function handleValidateCoupon() {
  if (!couponCodeInput.value || !props.selectedPackage) return
  couponValidating.value = true
  couponErrorSource.value = null
  couponValidationError.value = ''

  try {
    const result = await validateCoupon(couponCodeInput.value, props.selectedPackage.id)
    if (result.valid) {
      couponValid.value = true
      manualDiscountRef.value = result.amount
      couponErrorSource.value = null
      couponValidationError.value = ''
    } else {
      couponValid.value = false
      manualDiscountRef.value = 0
      // 后端返回的 message 是中文硬编码，英文界面必须按 error_code 自己映射，
      // 否则会在英文界面里冒出一整句中文。查不到映射时才回落到后端原文。
      couponErrorSource.value = {
        code: result.error_code ?? '',
        fallback: result.message ?? '',
      }
      couponValidationError.value = renderCouponError()
    }
  } catch (err: any) {
    couponValid.value = false
    manualDiscountRef.value = 0
    couponErrorSource.value = { code: err?.error_code ?? '', fallback: err?.message ?? '' }
    couponValidationError.value = renderCouponError()
  } finally {
    couponValidating.value = false
  }
}

/** 移除抵扣券 */
function handleRemoveCoupon() {
  couponValid.value = false
  manualDiscountRef.value = 0
  couponCodeInput.value = ''
  couponErrorSource.value = null
  couponValidationError.value = ''
}

/** 提交订单 */
async function handleSubmitOrder() {
  if (!agreementAccepted.value) {
    message.warning(t('agreementRequired'))
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (!props.selectedPackage) return

  submitting.value = true
  try {
    // 判定最终生效的优惠券码：优先使用用户手动输入并校验的，其次使用用户选中的自动匹配券
    let finalCouponCode: string | undefined = undefined
    if (couponValid.value) {
      finalCouponCode = couponCodeInput.value
    } else if (props.selectedCouponCode && isCouponAllowedForPkg(props.selectedPackage)) {
      finalCouponCode = props.selectedCouponCode
    }

    const data = await createOrder({
      package_id: props.selectedPackage.id,
      email: formData.email,
      coupon_code: finalCouponCode,
      // 必须传 locale：后端据此决定激活码邮件语言与 Stripe 收银台语言。
      // 漏传会让英文界面下单的用户收到中文邮件、Stripe 收银台显示中文。
      locale: locale.value,
    })
    emit('submit', data)
  } catch (err: any) {
    const errKey = err?.error_code ? COUPON_ERROR_KEYS[err.error_code] : undefined
    const errorMsg = errKey ? t(errKey) : (err instanceof Error ? err.message : t('createOrderFailed'))
    message.error(errorMsg)
  } finally {
    submitting.value = false
  }
}

// ========== 监听邮箱变化，通知父组件查询抵扣券 ==========
watch(() => formData.email, (newEmail) => {
  emit('email-change', newEmail)
})
</script>

<style scoped>
/* ========== 状态 2：购买表单 ========== */
.state-form {
  display: flex;
  justify-content: center;
  padding-top: 60px;
}

.form-container {
  width: 100%;
  max-width: 520px;
  padding: 40px 36px;
}

.form-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 28px;
}

.selected-package,
.amount-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 15px;
  flex-wrap: wrap;
}

.selected-package .label,
.amount-display .label { color: var(--text-secondary); }

.selected-package .value { color: var(--text-primary); font-weight: 600; }

.amount-original {
  color: #86868b;
  text-decoration: line-through;
  font-size: 14px;
}

.amount-value {
  color: var(--color-primary);
  font-size: 22px;
  font-weight: 700;
}

.amount-value--discount { color: #FF6B00; }

.amount-save {
  font-size: 13px;
  color: #FF9500;
  font-weight: 600;
  background: rgba(255, 149, 0, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
}

/* 自动抵扣券区域 */
.auto-coupon-section {
  margin-bottom: 16px;
}

.auto-coupon-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #FFF8F0, #FFF2E5);
  border: 1.5px solid #FF9500;
  border-radius: 10px 10px 0 0;
}

.auto-coupon-banner:has(+ .coupon-list) {
  border-radius: 10px 10px 0 0;
}

.auto-coupon-banner:has(+ .auto-coupon-countdown) {
  border-radius: 10px;
}

.auto-coupon-section > .auto-coupon-banner:first-child:last-child {
  border-radius: 10px;
}

.auto-coupon-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.auto-coupon-text {
  font-size: 13.5px;
  color: #1d1d1f;
  font-weight: 500;
  line-height: 1.4;
}

.auto-coupon-text strong {
  color: #FF6B00;
  font-weight: 700;
}

.auto-coupon-countdown {
  font-size: 12px;
  color: #FF9500;
  font-weight: 600;
  padding: 6px 14px 8px;
  background: linear-gradient(135deg, #FFF8F0, #FFF2E5);
  border: 1.5px solid #FF9500;
  border-top: none;
  border-radius: 0 0 10px 10px;
}

/* 多券选择列表 */
.coupon-list {
  border: 1.5px solid #FF9500;
  border-top: none;
  border-radius: 0 0 10px 10px;
  overflow: hidden;
}

.coupon-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s ease;
  background: linear-gradient(135deg, #FFFCF7, #FFF8F0);
}

.coupon-list-item:not(:last-child) {
  border-bottom: 1px solid rgba(255, 149, 0, 0.2);
}

.coupon-list-item:hover {
  background: linear-gradient(135deg, #FFF5E8, #FFEEDD);
}

.coupon-list-item--selected {
  background: linear-gradient(135deg, #FFF0DD, #FFE8CC);
}

.coupon-list-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.coupon-list-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.coupon-list-radio--checked {
  border-color: #FF9500;
}

.coupon-list-amount {
  font-size: 16px;
  font-weight: 700;
  color: #FF6B00;
}

.coupon-list-item-right {
  display: flex;
  align-items: center;
}

.coupon-list-time {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
}

.coupon-list-urgent {
  font-size: 12px;
  color: #FF3B30;
  font-weight: 600;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 抵扣券输入区域 */
.coupon-input-area {
  margin-bottom: 16px;
}

.coupon-toggle {
  cursor: pointer;
  font-size: 13px;
  color: var(--color-primary);
  user-select: none;
  padding: 4px 0;
}

.coupon-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.coupon-input { flex: 1; }

.coupon-error {
  font-size: 13px;
  color: #ff453a;
  padding: 6px 10px;
  background: rgba(255, 69, 58, 0.08);
  border-radius: 6px;
  margin-top: 6px;
}

.coupon-success {
  font-size: 13px;
  color: #30d158;
  padding: 6px 10px;
  background: rgba(48, 209, 88, 0.08);
  border-radius: 6px;
  margin-top: 6px;
}

.agreement-confirm-row {
  margin-top: 18px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.agreement-copy {
  color: var(--text-secondary);
}

.agreement-link {
  appearance: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  cursor: pointer;
}

.agreement-link:hover {
  text-decoration: underline;
}

.form-actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.stripe-step-hint {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.5;
}

.back-link {
  color: var(--text-secondary) !important;
  font-size: 14px;
}

.back-link:hover { color: var(--color-primary) !important; }

/* ========== 过渡动画 ========== */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(-10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(10px); }

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
