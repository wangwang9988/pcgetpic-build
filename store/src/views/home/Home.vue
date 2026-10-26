<template>
  <div class="home-page">
    <!-- 语言切换：始终置顶可见，海外用户进站第一眼就能切到英文 -->
    <div class="lang-switch">
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

    <!-- 状态 1：套餐展示 -->
    <PackageSelection
      v-if="pageState === 'packages'"
      :packages="packages"
      :loading="packagesLoading"
      :selected-package-id="selectedPackageId"
      :coupon-info="couponInfo"
      :selected-coupon-code="selectedCouponCode"
      :coupon-remaining-ms="couponRemainingMs"
      :coupon-remaining-hours="couponRemainingHours"
      @update:selected-package-id="selectedPackageId = $event"
      @select="handleSelectPackage"
      @update:selected-coupon-code="selectedCouponCode = $event"
      @retry="loadPackages"
    />

    <!-- 状态 2：购买表单 -->
    <OrderForm
      v-else-if="pageState === 'form'"
      :selected-package="selectedPackage"
      :coupon-info="couponInfo"
      :selected-coupon-code="selectedCouponCode"
      :initial-email="email"
      @submit="handleOrderCreated"
      @back="navigateBackTo('packages')"
      @email-change="handleEmailChange"
      @update:selected-coupon-code="selectedCouponCode = $event"
      @open-agreement="openAgreementDialog"
    />

    <!-- 状态 3：扫码支付 -->
    <PaymentQRCode
      v-else-if="pageState === 'payment'"
      :order-data="orderData!"
      :redirecting-stripe="stripeRedirecting"
      @paid="handlePaymentPaid"
      @expired="handlePaymentExpired"
      @cancel="handleCancelPayment"
      @pay-stripe="handlePayStripe"
    />

    <!-- 状态 4：支付成功 -->
    <PaymentSuccess
      v-else-if="pageState === 'success'"
      :activation-code="activationCode"
      :email="email"
      @back-home="handleBackToHome"
    />
  </div>

    <!-- 一体化微信客服悬浮舱 (Floating Customer Service Dock) -->
  <div class="floating-control-dock">
    <div
      class="dock-item dock-item--wechat"
      role="button"
      tabindex="0"
      :title="t('contactSupportTitle')"
      @click="openContactModal"
      @keydown.enter.prevent="openContactModal"
      @keydown.space.prevent="openContactModal"
    >
      <div class="dock-icon-box dock-icon-box--wechat">
        <img src="/wechat-icon.png" :alt="t('dockWechat')" class="wechat-dock-icon" />
      </div>
      <div class="dock-text-group">
        <span class="dock-label">{{ t('dockWechat') }}</span>
        <span class="dock-sublabel">{{ t('dockSub') }}</span>
      </div>
    </div>
  </div>

  <!-- 联系客服弹窗 -->
  <n-modal
    v-model:show="showContactModal"
    preset="card"
    :title="t('contactModalTitle')"
    class="contact-modal"
    style="max-width: 430px;"
    :bordered="false"
  >
    <div class="contact-panel">
      <div class="wechat-label">
        <img src="/wechat-icon.png" :alt="t('dockWechat')" class="wechat-tag-icon" />
        <span>{{ t('contactScan') }}</span>
      </div>
      <p class="contact-lead">{{ t('contactLead') }}</p>
      <p class="contact-desc">
        {{ t('contactDesc') }}
      </p>
      <div class="contact-email-row">
        <span>{{ t('contactEmail') }}</span>
        <a href="mailto:service@downpictures.com">service@downpictures.com</a>
      </div>
            <div class="contact-download-row">
        <span>{{ t('contactDownload') }}</span>
        <a
          :href="MICROSOFT_STORE_URL"
          target="_blank"
          rel="noopener"
          referrerpolicy="origin"
        >{{ t('contactStoreLink') }}</a>
        <span class="download-separator">·</span>
        <!-- 点击拦截弹引导；href 保留真实直链供爬虫发现 -->
        <a
          :href="CLIENT_DOWNLOAD_URL"
          target="_blank"
          rel="noopener"
          referrerpolicy="origin"
          @click.prevent="showExeGuide = true"
        >{{ t('contactExeLink') }}</a>
      </div>
      <div class="wechat-qr-card">
        <img src="/Wechat.png" :alt="t('contactScan')" />
      </div>
      <p class="wechat-note">{{ t('contactNote') }}</p>

      <div class="contact-hidden-actions">
        <n-button text size="tiny" class="subtle-more-btn" @click="toggleLegalEntry">
          {{ t('contactMore') }}
        </n-button>
        <transition name="fade-slide">
          <n-button
            v-if="showLegalEntry"
            text
            size="tiny"
            class="legal-info-btn"
            @click="openLegalInfo"
          >
            {{ t('legalInfo') }}
          </n-button>
        </transition>
      </div>
    </div>
  </n-modal>

  <UserAgreementDialog ref="agreementRef" />

  <!-- EXE 下载引导弹窗：引导用户在线安装 -->
  <ExeDownloadGuideModal
    v-model="showExeGuide"
    :store-url="MICROSOFT_STORE_URL"
    @download-exe="handleExeDownload"
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { useMessage, NButton, NModal } from 'naive-ui'
import { CLIENT_DOWNLOAD_URL, MICROSOFT_STORE_URL } from '@/config'
import type { PackageInfo, CreateOrderData, CouponStatusData, CouponItemData } from '@/api'
import { fetchPackages, getCouponStatus, getOrderStatus, createStripeCheckout } from '@/api'
import { useI18n } from '@/i18n'
import {
  storeStripeContext,
  readStripeContext,
} from './composables/useStripeReturn'
import PackageSelection from './components/PackageSelection.vue'

// 非首屏重型组件改为异步按需加载（将 NForm/NInput/NScrollbar/qrcode 等拆离首屏主包）
const loadOrderForm = () => import('./components/OrderForm.vue')
const loadPaymentQRCode = () => import('./components/PaymentQRCode.vue')
const OrderForm = defineAsyncComponent(loadOrderForm)
const PaymentQRCode = defineAsyncComponent(loadPaymentQRCode)
const PaymentSuccess = defineAsyncComponent(() => import('./components/PaymentSuccess.vue'))
const UserAgreementDialog = defineAsyncComponent(() => import('./components/UserAgreementDialog.vue'))
const ExeDownloadGuideModal = defineAsyncComponent(() => import('./components/ExeDownloadGuideModal.vue'))

// ========== EXE 下载引导 ==========
const showExeGuide = ref(false)

// ========== 国际化 ==========
const { isEnglish, setLocale, t, locale } = useI18n()

/** 用户确认仍要下载 EXE */
function handleExeDownload() {
  window.open(CLIENT_DOWNLOAD_URL, '_blank', 'noopener')
}

// ========== 联系客服 ==========
const showContactModal = ref(false)
const showLegalEntry = ref(false)
const agreementRef = ref<{ open: () => void } | null>(null)

function openContactModal() {
  showLegalEntry.value = false
  showContactModal.value = true
}

function toggleLegalEntry() {
  showLegalEntry.value = !showLegalEntry.value
}

async function openLegalInfo() {
  showContactModal.value = false
  await nextTick()
  agreementRef.value?.open()
}

function openAgreementDialog() {
  agreementRef.value?.open()
}

// ========== 消息提示 ==========
const message = useMessage()

// ========== 页面状态 ==========
type PageState = 'packages' | 'form' | 'payment' | 'success'
const pageState = ref<PageState>('packages')

/** 状态回退映射 */
const STATE_BACK_MAP: Record<string, PageState> = {
  form: 'packages',
  payment: 'form',
  success: 'packages',
}

/** 监听浏览器后退按钮 */
function handlePopState() {
  const current = pageState.value
  if (current === 'packages') return
  const backState = STATE_BACK_MAP[current] ?? 'packages'
  // 回退时做必要的清理
  if (current === 'payment') {
    orderData.value = null
  }
  if (current === 'success') {
    activationCode.value = ''
  }
  pageState.value = backState
}

/** 推入浏览器历史并切换页面状态 */
function navigateTo(state: PageState) {
  history.pushState({ pageState: state }, '')
  pageState.value = state
}

/** 回退到指定状态（替换当前历史条目） */
function navigateBackTo(state: PageState) {
  history.replaceState({ pageState: state }, '')
  pageState.value = state
}

// ========== 套餐数据 ==========
const packages = ref<PackageInfo[]>([])
const selectedPackageId = ref<number | null>(null)

const selectedPackage = computed(() => {
  return packages.value.find((p) => p.id === selectedPackageId.value) ?? null
})

// ========== 抵扣券状态 ==========
const couponInfo = ref<CouponStatusData>({ has_active_coupon: false, coupons: [] })
/** 用户当前选中的抵扣券码（null 表示未选中任何券） */
const selectedCouponCode = ref<string | null>(null)
const couponRemainingMs = ref(0)
const couponRemainingHours = computed(() => couponRemainingMs.value / (1000 * 60 * 60))
let couponCountdownTimer: ReturnType<typeof setInterval> | null = null

/** 获取当前选中的券 */
const selectedCoupon = computed<CouponItemData | null>(() => {
  if (!selectedCouponCode.value || !couponInfo.value.coupons?.length) return null
  return couponInfo.value.coupons.find(c => c.coupon_code === selectedCouponCode.value) ?? null
})

function startCouponCountdown() {
  stopCouponCountdown()
  couponCountdownTimer = setInterval(() => {
    // 使用选中券的过期时间做倒计时
    const target = selectedCoupon.value?.expires_at ?? couponInfo.value.expires_at
    if (target) {
      const remaining = target - Date.now()
      couponRemainingMs.value = Math.max(0, remaining)
      if (remaining <= 0) {
        couponInfo.value = { has_active_coupon: false, coupons: [] }
        selectedCouponCode.value = null
        stopCouponCountdown()
      }
    }
  }, 1000)
}

function stopCouponCountdown() {
  if (couponCountdownTimer) {
    clearInterval(couponCountdownTimer)
    couponCountdownTimer = null
  }
}

async function loadCouponStatus(email: string) {
  if (!email) return
  try {
    const data = await getCouponStatus(email)
    couponInfo.value = data
    if (data.has_active_coupon && data.coupons?.length) {
      // 默认选中最大面额券（列表已按面额降序排列，第一张即为最大面额）
      if (!selectedCouponCode.value || !data.coupons.some(c => c.coupon_code === selectedCouponCode.value)) {
        selectedCouponCode.value = data.coupons[0]!.coupon_code
      }
      const targetCoupon = data.coupons.find(c => c.coupon_code === selectedCouponCode.value) ?? data.coupons[0]!
      couponRemainingMs.value = Math.max(0, targetCoupon!.expires_at - Date.now())
      startCouponCountdown()
    } else {
      selectedCouponCode.value = null
      stopCouponCountdown()
    }
  } catch {
    // 查询失败不影响主流程
  }
}

// ========== 表单公共数据 ==========
const email = ref('')

// ========== 订单与支付 ==========
const orderData = ref<CreateOrderData | null>(null)
const activationCode = ref('')
/** 跳转 Stripe 期间的按钮防重入标记。 */
const stripeRedirecting = ref(false)

/** 浏览器从 Stripe 收银台后退（bfcache 恢复）时重置跳转中状态。 */
function handlePageShow(event: PageTransitionEvent) {
  if (event.persisted) {
    stripeRedirecting.value = false
  }
}

// ========== 事件处理 ==========

/** 选择套餐 */
function handleSelectPackage(_pkg: PackageInfo) {
  navigateTo('form')
}

/** 订单创建成功 */
function handleOrderCreated(data: CreateOrderData) {
  stripeRedirecting.value = false
  orderData.value = data
  navigateTo('payment')
}

/** 支付成功 */
function handlePaymentPaid(code: string) {
  activationCode.value = code
  navigateTo('success')
}

/** 支付过期 */
function handlePaymentExpired() {
  orderData.value = null
  navigateBackTo('form')
}

/** 取消支付 */
function handleCancelPayment() {
  stripeRedirecting.value = false
  orderData.value = null
  selectedPackageId.value = null
  navigateBackTo('packages')
}

/** 用户在支付页确认走港币支付：创建 Stripe 会话后跳转官方收银台。 */
async function handlePayStripe() {
  const order = orderData.value
  if (!order) return
  if (stripeRedirecting.value) return

  stripeRedirecting.value = true
  try {
    // 跳回时后端只按 order_no 查询、不返回邮箱与金额（PII 保护），
    // 所以把完整订单上下文先存在 sessionStorage 里备用于恢复（含点返回未付款场景）。
    storeStripeContext(order.order_no, email.value, order.amount, order)
    const { checkout_url } = await createStripeCheckout(order.order_no, locale.value)
    window.location.href = checkout_url
  } catch (err) {
    stripeRedirecting.value = false
    message.error(err instanceof Error ? err.message : t('stripeRedirectFailed'))
  }
}

/**
 * 从 Stripe 跳回后的恢复。
 *
 * Stripe 会带 ?payment_order=PCGP... 回到本页，此时可能刚付完款（Webhook 尚未到达），
 * 也可能是用户在 Stripe 页面点左上角「← 返回」想改扫支付宝。
 * 优先恢复 sessionStorage 中的完整订单快照（含 amount、amount_hkd、qr_code、expired_at），
 * 避免未付款返回时 Step 3 退化成 ¥0 且丢失二维码与 Stripe 按钮。
 */
async function restoreFromStripeReturn() {
  stripeRedirecting.value = false
  const orderNo = new URLSearchParams(window.location.search).get('payment_order')
  if (!orderNo) return

  const stored = readStripeContext()
  if (stored?.email) {
    email.value = stored.email
  }

  orderData.value =
    stored?.order && stored.order.order_no === orderNo
      ? stored.order
      : {
          order_no: orderNo,
          qr_code: '',
          amount: stored?.amount ?? 0,
          original_amount: null,
          coupon_applied: false,
          coupon_discount: 0,
        }
  navigateTo('payment')

  clearStripeQueryParam()

  // 给 Webhook 一点到达时间后再开始轮询，避免刚回来就查不到状态。
  window.setTimeout(async () => {
    try {
      const data = await getOrderStatus(orderNo, { reconcile: true })
      if (data.status === 'paid') {
        handlePaymentPaid(data.code ?? '')
      } else if (data.status === 'failed' || data.status === 'expired') {
        orderData.value = null
        navigateBackTo('form')
      }
    } catch {
      // 网络异常时保留在支付页，用户可手动刷新或稍后重试。
    }
  }, 1500)
}

/** 清理 URL 上的 payment_order，避免刷新时重复触发恢复流程。 */
function clearStripeQueryParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('payment_order')
  window.history.replaceState({}, '', url.toString())
}

/** 邮箱变化 */
function handleEmailChange(newEmail: string) {
  email.value = newEmail
  if (newEmail && newEmail.includes('@')) {
    loadCouponStatus(newEmail)
  }
}

/** 返回首页 */
function handleBackToHome() {
  selectedPackageId.value = null
  orderData.value = null
  activationCode.value = ''
  email.value = ''
  selectedCouponCode.value = null
  navigateBackTo('packages')
}

// ========== 监听邮箱变化（初始加载后自动查券） ==========
watch(() => email.value, (newEmail) => {
  if (newEmail && newEmail.includes('@')) {
    loadCouponStatus(newEmail)
  }
})

// ========== 加载套餐列表（setup 阶段立即消费 <head> 预取 Promise，无需等 onMounted） ==========
const packagesLoading = ref(true)
let packagesLoadingPromise: Promise<void> | null = null
function loadPackages(): Promise<void> {
  if (packagesLoadingPromise) return packagesLoadingPromise
  packagesLoading.value = true
  packagesLoadingPromise = (async () => {
    try {
      const data = await fetchPackages()
      packages.value = data
    } catch (err) {
      console.error(t('loadPackagesFailed') + ':', err)
      message.error(t('loadPackagesRetry'))
    } finally {
      packagesLoading.value = false
      packagesLoadingPromise = null
    }
  })()
  return packagesLoadingPromise
}

// 在组件 setup 阶段立即触发，消除等待 DOM 挂载的调度空窗
void loadPackages()

// ========== 生命周期 ==========
onMounted(() => {
  if (packages.value.length === 0) {
    void loadPackages()
  }
  // 首屏完成挂载后，利用浏览器空闲时间静默预热 Step 2 / Step 3 异步 chunk，确保点击套餐零卡顿
  const warmupNextSteps = () => {
    void loadOrderForm()
    void loadPaymentQRCode()
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(warmupNextSteps, { timeout: 1500 })
  } else {
    window.setTimeout(warmupNextSteps, 600)
  }

  // 尝试从 URL 参数读取 email（客户端跳转时可能携带）
  const urlParams = new URLSearchParams(window.location.search)
  const emailParam = urlParams.get('email')
  if (emailParam) {
    email.value = emailParam
    loadCouponStatus(emailParam)
  }
  // 从 Stripe 跳回（?payment_order=...）时恢复订单并主动对账
  void restoreFromStripeReturn()
  // 监听浏览器后退按钮
  window.addEventListener('popstate', handlePopState)
  window.addEventListener('pageshow', handlePageShow)
})

onUnmounted(() => {
  stopCouponCountdown()
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('pageshow', handlePageShow)
})
</script>

<style scoped>
/* ========== 页面容器 ========== */
.home-page {
  max-width: 1300px;
  margin: 0 auto;
  padding: 40px 20px 60px;
  min-height: 100vh;
}

/* 语言切换胶囊：与主内容视觉权重相当，但不抢转化按钮的注意力 */
.lang-switch {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 16px;
}

.lang-option {
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.lang-option:hover {
  color: #1677ff;
}

.lang-option-active {
  color: #1677ff;
  font-weight: 600;
}

.lang-divider {
  color: #d1d5db;
  font-size: 13px;
}

/* 一体化微信客服悬浮舱 */
.floating-control-dock {
  position: fixed;
  right: 28px;
  bottom: 28px;
  display: flex;
  align-items: center;
  padding: 5px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-control-dock:hover {
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
  background: #ffffff;
}

.dock-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px 6px 8px;
  border-radius: 999px;
  text-decoration: none;
  color: #1d1d1f;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.dock-item--wechat:hover {
  background: rgba(7, 193, 96, 0.08);
}

.dock-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  transition: all 0.25s ease;
}

.dock-icon-box--wechat {
  background: rgba(7, 193, 96, 0.1);
}

.wechat-dock-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dock-item--wechat:hover .wechat-dock-icon {
  transform: scale(1.1);
}

.dock-text-group {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.dock-label {
  font-size: 13.5px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: 0.2px;
}

.dock-sublabel {
  font-size: 11px;
  color: #86868b;
  margin-top: 1px;
}

.contact-panel {
  text-align: center;
  color: var(--text-primary);
}

.wechat-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 28px;
  padding: 2px 12px 2px 8px;
  border-radius: 999px;
  background: rgba(7, 193, 96, 0.1);
  color: #07a854;
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: 12px;
}

.wechat-tag-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: inline-block;
}

.contact-lead {
  margin: 0 0 10px;
  font-size: 18px;
  line-height: 1.45;
  font-weight: 700;
  color: var(--text-primary);
}

.contact-desc {
  margin: 0 auto;
  max-width: 350px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.75;
}

.contact-email-row,
.contact-download-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px auto 0;
  font-size: 14px;
  line-height: 1.45;
}

.contact-email-row span,
.contact-download-row span {
  color: var(--text-secondary);
}

.contact-email-row a,
.contact-download-row a {
  color: #0071e3;
  font-weight: 600;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.contact-email-row a:hover,
.contact-download-row a:hover {
  text-decoration: underline;
}

.download-separator {
  color: var(--text-secondary);
  opacity: 0.5;
}

.wechat-qr-card {
  width: 252px;
  height: 252px;
  margin: 18px auto 10px;
  padding: 10px;
  border: 1px solid rgba(7, 193, 96, 0.18);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(7, 193, 96, 0.06), rgba(255, 255, 255, 0.9));
  box-shadow: 0 10px 30px rgba(29, 29, 31, 0.08);
}

.wechat-qr-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 10px;
  background: #fff;
}

.wechat-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.contact-hidden-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 28px;
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid rgba(29, 29, 31, 0.08);
  opacity: 0.45;
  transition: opacity 0.2s ease;
}

.contact-hidden-actions:hover {
  opacity: 0.85;
}

.subtle-more-btn,
.legal-info-btn {
  font-size: 12px;
  color: var(--text-secondary);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.16s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 640px) {
  .home-page {
    padding-bottom: 96px;
  }

  .contact-cs-btn {
    right: 16px;
    bottom: 18px;
    padding: 9px 14px 9px 11px;
    font-size: 13px;
  }

  .wechat-qr-card {
    width: min(68vw, 240px);
    height: min(68vw, 240px);
  }

  .contact-desc {
    max-width: 100%;
  }
}
</style>
