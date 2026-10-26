import type {
  ApiEnvelope,
  CouponValidationData,
  CreateOrderData,
  OrderStatusData,
  PackageInfo,
  StripeCheckoutData,
  UpgradeRebateData,
  UpgradeSourceInput,
} from '~/types/payment'
import { classifyBenefitInput } from '~/utils/licenseFormats'
import { isPermanentPackage, getAppliedDiscountHkd } from '~/composables/usePackageDisplay'
import {
  useCheckoutI18n,
  storeStripeContext,
  readStripeContext,
  clearStripeContext,
  type CheckoutTranslationKey,
} from '~/composables/useCheckoutI18n'

const PRODUCT_CODE = 'tuget'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FAST_POLL_INTERVAL_MS = 1000
const NORMAL_POLL_INTERVAL_MS = 3000
const FAST_POLL_DURATION_MS = 60 * 1000
const RECONCILE_DELAY_MS = 1500
const MAX_POLL_DURATION_MS = 30 * 60 * 1000
const BENEFIT_DEBOUNCE_MS = 350

type TugetWindow = Window & {
  __TUGET_PACKAGES_PROMISE__?: Promise<PackageInfo[] | null>
}

/**
 * 从任意错误对象里取出可展示给用户的信息。
 *
 * fallback 由调用方按当前语言传入：这里是模块级函数，拿不到 composable 里的
 * 响应式 locale，所以把兜底文案作为参数交给调用方决定。
 */
function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const fetchError = error as { data?: { message?: string }, message?: string }
    return fetchError.data?.message || fetchError.message || fallback
  }
  return fallback
}

function extractErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const fetchError = error as { data?: { error_code?: string }, error_code?: string }
    return fetchError.data?.error_code || fetchError.error_code || ''
  }
  return ''
}

function subtractMoney(price: number, discount: number): number {
  return Math.max(0, Math.round((price - discount) * 100) / 100)
}

/**
 * 生成一次「提交意图」的幂等键。
 *
 * 服务端按这个值去重：弱网重试、双击、刷新重放都带同一个值，只会产生一笔订单。
 * crypto.randomUUID 只在安全上下文可用（线上是 https，本地 127.0.0.1 亦可用），
 * 兜底用时间戳 + 随机串，格式同样满足后端的 [A-Za-z0-9_-]{8,64}。
 */
function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 幂等意图的会话存储键，与 Stripe 跳回上下文同属 sessionStorage 的既有约定。 */
const INTENT_STORAGE_KEY = 'tuget_checkout_intent'
/** 与后端 CLIENT_REQUEST_ID_REGEX 保持一致，避免把脏数据当幂等键发出去。 */
const CLIENT_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

/**
 * 读取上一次提交的幂等键。
 *
 * 为什么要落 sessionStorage：用户点完提交等不及按 F5、或请求超时后手动刷新，
 * 内存里的键会随之丢失，重新提交就会被当成全新请求再建一笔订单。
 * 存到会话存储后，只要「套餐 + 邮箱 + 券」这组意图没变，刷新后仍复用同一个键。
 */
function readStoredIntent(): { key: string, intent: string } | null {
  if (!import.meta.client) return null
  try {
    const raw = window.sessionStorage.getItem(INTENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { key?: unknown, intent?: unknown }
    if (typeof parsed?.key !== 'string' || !CLIENT_REQUEST_ID_PATTERN.test(parsed.key)) return null
    if (typeof parsed?.intent !== 'string') return null
    return { key: parsed.key, intent: parsed.intent }
  }
  catch {
    return null
  }
}

function storeIntent(key: string, intent: string): void {
  if (!import.meta.client) return
  try {
    window.sessionStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify({ key, intent }))
  }
  catch {
    // 存储被禁用时退化为内存幂等键，不影响建单
  }
}

function clearStoredIntent(): void {
  if (!import.meta.client) return
  try {
    window.sessionStorage.removeItem(INTENT_STORAGE_KEY)
  }
  catch {
    // 忽略
  }
}

export function useTugetPayment() {
  const config = useRuntimeConfig()
  // 收银台内的所有校验/报错文案都要跟随界面语言，因此这里取响应式的 t 与 locale。
  const { t, locale, isEnglish } = useCheckoutI18n()
  const apiBase = String(config.public.apiBase).replace(/\/$/, '')
  const packages = ref<PackageInfo[]>([])
  const selectedPackageId = ref<number | null>(null)
  const email = ref('')
  // 复用原字段名以保持组件接口稳定；该输入现在同时接受 UPG 券、当图订单号和 PCGP 激活码。
  const couponCode = ref('')
  const couponDiscount = ref(0)
  const upgradeSource = ref<UpgradeSourceInput | null>(null)
  const upgradeRebateData = ref<UpgradeRebateData | null>(null)
  const benefitMessage = ref('')
  /**
   * benefitMessage 的来源描述，见BenefitMessageSource。
   * 切语言时据此重新渲染，不改动已应用的抵扣本身。
   */
  const benefitMessageSource = ref<BenefitMessageSource>(null)
  const showPermanentUpgradeModal = ref(false)
  const needsPermanentPackage = ref(false)
  // 进入下单页时默认勾选协议，减少用户操作成本
  const agreed = ref(true)
  const loadingPackages = ref(true)
  const validatingBenefit = ref(false)
  const creatingOrder = ref(false)
  /**
   * 请求级幂等键：同一次「提交意图」内固定不变，键与意图一起变更或建单成功后作废。
   * 与服务端 orders.client_request_id 唯一约束配合，重试/重放只会得到同一笔订单。
   */
  const clientRequestId = ref('')
  /** 生成 clientRequestId 时使用的意图快照（套餐 + 邮箱 + 券），用于判断是否需要换键。 */
  const clientRequestIntent = ref('')
  const error = ref('')
  const order = ref<CreateOrderData | null>(null)
  const orderStatus = ref<OrderStatusData | null>(null)
  const qrDataUrl = ref('')
  /**
   * 二维码渲染是否失败。
   *
   * 现在二维码在切到支付态之前就已生成，所以「订单有 qr_code 但 qrDataUrl 为空」
   * 只能是渲染异常——必须能被支付页识别，否则界面会退回无限转圈。
   */
  const qrRenderFailed = ref(false)
  const appliedInput = ref('')
  const appliedPackageId = ref<number | null>(null)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let benefitTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 按当前界面语言格式化一个人民币抵扣额。
   *
   * 英文界面全程只显示港币，所以在只显示 HK$ 的页面里绝不能再冒出一个 ¥ 金额。
   * 折算走 getAppliedDiscountHkd——与后端 computeOrderHkdMinor 和 Step 2/3 的
   * 港币展示是同一个函数，因此这里显示的港币与最终实扣一致。
   * 未配置港币标价时回落人民币。
   */
  function formatDiscountForDisplay(packageId: number | null, cnyAmount: number): string {
    if (isEnglish.value && packageId) {
      const pkg = packages.value.find((item) => item.id === packageId)
      if (pkg) return `HK$${getAppliedDiscountHkd(pkg, cnyAmount).toFixed(2)}`
    }
    return `¥${cnyAmount.toFixed(2)}`
  }

  /**
   * 换购/抵扣券错误码 → 词条key。
   *
   * 后端返回的 message 是中文硬编码，直接显示会在英文界面里冒出一整句中文。
   * 所以先按 error_code 映射成词条；映射不到的错误码才回落到后端原文
   * （那种情况至少还有error_code 可查，比一律显示 "request failed" 强）。
   */
  const BENEFIT_ERROR_KEYS: Record<string, CheckoutTranslationKey> = {
    UPGRADE_SOURCE_NOT_FOUND: 'errUpgradeSourceNotFound',
    UPGRADE_ALREADY_USED: 'errUpgradeAlreadyUsed',
    UPGRADE_PERMANENT_TARGET_REQUIRED: 'errUpgradePermanentTargetRequired',
    UPGRADE_SOURCE_INVALID: 'errUpgradeSourceInvalid',
    UPGRADE_SOURCE_CLAIMABLE: 'errUpgradeSourceClaimable',
    UPGRADE_SOURCE_DISABLED: 'errUpgradeSourceDisabled',
    UPGRADE_SOURCE_NOT_PAID: 'errUpgradeSourceNotPaid',
    UPGRADE_SOURCE_CODE_MISSING: 'errUpgradeSourceCodeMissing',
    UPGRADE_PRODUCT_MISMATCH: 'errUpgradeProductMismatch',
    DISCOUNT_CONFLICT: 'errDiscountConflict',
    COUPON_NOT_FOUND: 'errCouponNotFound',
    COUPON_ALREADY_USED: 'errCouponAlreadyUsed',
    COUPON_EXPIRED: 'errCouponExpired',
    COUPON_NOT_ALLOWED: 'errCouponNotAllowed',
    COUPON_PRODUCT_MISMATCH: 'errCouponProductMismatch',
  }

  /**
   * 把抵扣相关的接口错误翻成当前语言的界面文案。
   *
   * 注意：validate-coupon 是 HTTP 200 +valid:false，错误码在响应体里而不是
   * error_code 字段，所以那条路径由调用方直接传 errCode 进来。
   */

  /**
   * 当前提示语的「来源」，而不是提示语本身。
   *
   * 存来源而不是存字符串，是为了让切换语言时能重新渲染：只存文本的话，
   * 用户验证完老码再切 EN，屏幕上留下的还是上一种语言的句子，没法判断
   * 它当初是由哪个分支生成的。
   */
  type BenefitMessageSource
    = | { kind: 'local', key: CheckoutTranslationKey }
      /** 输入格式提示：渲染时按当前语言重跑一次 classify */
      | { kind: 'format' }
      | { kind: 'coupon', packageId: number | null, amount: number }
      | { kind: 'upgrade', quote: UpgradeRebateData, packageId: number | null }
      /** 查不到映射时回落后端原文（至少比 "request failed" 有信息量） */
      | { kind: 'error', code: string, fallback: string }
      | null

  function renderBenefitMessage(): string {
    const src = benefitMessageSource.value
    if (!src) return ''
    switch (src.kind) {
      case 'local':
        return t(src.key)
      case 'format': {
        const parsed = classifyBenefitInput(couponCode.value, locale.value)
        return parsed.message || t('benefitFormatInvalid')
      }
      case 'coupon':
        return `${t('couponAppliedPrefix')}${formatDiscountForDisplay(src.packageId, src.amount)}`
      case 'upgrade':
        return buildUpgradeMessage(src.quote, src.packageId)
      case 'error': {
        const key = BENEFIT_ERROR_KEYS[src.code]
        return key ? t(key) : (src.fallback || t('requestFailed'))
      }
    }
  }

  function setBenefitMessage(src: BenefitMessageSource) {
    benefitMessageSource.value = src
    benefitMessage.value = renderBenefitMessage()
  }

  /** 按界面语言生成换购抵扣成功提示。分支与后端 messageForCalculation 一一对应。 */
  function buildUpgradeMessage(quote: UpgradeRebateData, packageId: number | null): string {
    // 中文态沿用后端原话：它是按人民币口径写的，措辞也已经被用户熟悉，
    // 前端再造一遍只会出现两套措辞漂移。
    if (!isEnglish.value) return quote.message

    const summary = quote.source_summary
    const name = summary.package_name_en || summary.package_name
    const amount = formatDiscountForDisplay(packageId, quote.rebate)

    // 已到期：老用户保底，与是否算过折算无关。
    if (quote.is_expired) return t('upgradeMsgExpired').replace('{amount}', amount)
    // 保底生效：折算值低于 ¥9.90 时按保底给，两个金额都要展示。
    if (quote.floor_applied) {
      return t('upgradeMsgFloor')
        .replace('{name}', name)
        .replace('{computed}', formatDiscountForDisplay(packageId, quote.computed_rebate))
        .replace('{amount}', amount)
    }
    // 永久卡没有到期时间，不提剩余天数。
    if (summary.expires_at == null) {
      return t('upgradeMsgPermanent').replace('{name}', name).replace('{amount}', amount)
    }
    return t('upgradeMsgRemaining')
      .replace('{name}', name)
      .replace('{days}', String(summary.remaining_days))
      .replace('{amount}', amount)
  }
  let pollStartedAt = 0
  let pollInFlight = false
  let benefitRequestVersion = 0
  let qrCodeModulePromise: Promise<typeof import('qrcode')> | null = null

  const selectedPackage = computed(() => packages.value.find(item => item.id === selectedPackageId.value) || null)
  const upgradeDiscount = computed(() => upgradeRebateData.value?.rebate || 0)
  const totalDiscount = computed(() => couponDiscount.value + upgradeDiscount.value)
  const payableAmount = computed(() => subtractMoney(selectedPackage.value?.price || 0, totalDiscount.value))
  const isPaid = computed(() => orderStatus.value?.status === 'paid')
  /**
   * 港币应付金额（元）。
   *
   * 用后端在建单时冻结并下发的 amount_hkd，而不是前端按汇率换算：
   * 展示价必须与 Stripe 实扣价严格一致。
   */
  const hkdAmount = computed(() => {
    const value = order.value?.amount_hkd
    return typeof value === 'number' && value > 0 ? value : null
  })
  /** 是否展示港币切换入口：订单未冻结港币金额时不显示按钮。 */
  const canUseStripe = computed(() => hkdAmount.value !== null)
  /** 跳转 Stripe 期间的防重入标记。 */
  const redirectingStripe = ref(false)
  const couponMessage = benefitMessage
  const validatingCoupon = validatingBenefit
  const benefitState = computed<'idle' | 'success' | 'warning' | 'error'>(() => {
    if (!benefitMessage.value) return 'idle'
    if (couponDiscount.value > 0) return 'success'
    if (upgradeRebateData.value?.floor_applied || upgradeRebateData.value?.is_expired) return 'warning'
    if (upgradeRebateData.value) return 'success'
    return 'error'
  })

  async function request<T>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const response = await $fetch<ApiEnvelope<T>>(`${apiBase}${path}`, options)
    if (!response.success) throw new Error(response.message || response.error_code || t('requestFailed'))
    return response.data
  }

  function clearAppliedBenefit(clearMessage = true) {
    couponDiscount.value = 0
    upgradeSource.value = null
    upgradeRebateData.value = null
    appliedInput.value = ''
    appliedPackageId.value = null
    if (clearMessage) {
      benefitMessageSource.value = null
      benefitMessage.value = ''
      needsPermanentPackage.value = false
    }
  }

  let loadPackagesInFlight: Promise<void> | null = null

  function loadPackages(): Promise<void> {
    if (loadPackagesInFlight) return loadPackagesInFlight
    loadPackagesInFlight = (async () => {
      loadingPackages.value = true
      error.value = ''
      try {
        let prefetchedPackages: PackageInfo[] | null = null
        if (import.meta.client) {
          const browserWindow = window as TugetWindow
          if (browserWindow.__TUGET_PACKAGES_PROMISE__) {
            const pending = browserWindow.__TUGET_PACKAGES_PROMISE__
            delete browserWindow.__TUGET_PACKAGES_PROMISE__
            try {
              const resolved = await pending
              if (Array.isArray(resolved) && resolved.length > 0) {
                prefetchedPackages = resolved
              }
            } catch {
              prefetchedPackages = null
            }
          }
        }

        packages.value = prefetchedPackages?.length
          ? prefetchedPackages
          : await request<PackageInfo[]>('/payment/packages', {
              query: { product: PRODUCT_CODE },
            })
        const preferred = packages.value.find(item => item.recommended) || packages.value[0]
        selectedPackageId.value = preferred?.id || null
      }
      catch (cause) {
        error.value = errorMessage(cause, t('requestFailed'))
      }
      finally {
        loadingPackages.value = false
        loadPackagesInFlight = null
      }
    })()
    return loadPackagesInFlight
  }

  function getQrCodeModule() {
    qrCodeModulePromise ||= import('qrcode')
    return qrCodeModulePromise
  }

  function preloadQrRenderer() {
    if (import.meta.client) void getQrCodeModule()
  }

  function selectPackage(id: number) {
    selectedPackageId.value = id
    couponCode.value = ''
    clearAppliedBenefit()
  }

  function switchToPermanentPackage(): boolean {
    const permanentPkg = packages.value.find(isPermanentPackage)
    if (!permanentPkg) return false
    showPermanentUpgradeModal.value = false
    needsPermanentPackage.value = false
    selectedPackageId.value = permanentPkg.id
    nextTick(() => {
      void validateBenefitInput(true)
    })
    return true
  }

  async function validateBenefitInput(showIncompleteMessage = true): Promise<boolean> {
    if (benefitTimer) clearTimeout(benefitTimer)
    benefitTimer = null

    const parsed = classifyBenefitInput(couponCode.value, locale.value)
    const packageId = selectedPackageId.value
    if (parsed.kind === 'empty') {
      clearAppliedBenefit()
      return true
    }
    if (parsed.kind === 'incomplete') {
      clearAppliedBenefit()
      if (showIncompleteMessage) setBenefitMessage({ kind: 'local', key: 'benefitIncomplete' })
      return false
    }
    if (parsed.kind === 'invalid' || parsed.kind === 'tuget-code') {
      clearAppliedBenefit(false)
      setBenefitMessage({ kind: 'format' })
      return false
    }
    if (!packageId) return false

    if (appliedInput.value === parsed.normalized && appliedPackageId.value === packageId) {
      return couponDiscount.value > 0 || upgradeRebateData.value !== null
    }

    const requestVersion = ++benefitRequestVersion
    clearAppliedBenefit()
    validatingBenefit.value = true
    error.value = ''
    try {
      if (parsed.kind === 'coupon') {
        const validation = await request<CouponValidationData>('/payment/validate-coupon', {
          method: 'POST',
          body: {
            coupon_code: parsed.normalized,
            package_id: packageId,
            email: email.value.trim(),
            product: PRODUCT_CODE,
          },
        })
        if (requestVersion !== benefitRequestVersion) return false
        if (!validation.valid) {
          // validate-coupon 是 HTTP 200 + valid:false，错误码在响应体里，
          // 不走 error_code 字段，所以显式塞进 source 交给渲染层查表。
          setBenefitMessage({
            kind: 'error',
            code: validation.error_code ?? '',
            fallback: validation.message || '',
          })
          return false
        }
        couponDiscount.value = validation.amount
        setBenefitMessage({ kind: 'coupon', packageId, amount: validation.amount })
        needsPermanentPackage.value = false
        showPermanentUpgradeModal.value = false
      }
      else {
        const source: UpgradeSourceInput = {
          source_type: parsed.sourceType!,
          source_value: parsed.normalized,
        }
        const quote = await request<UpgradeRebateData>('/payment/upgrade-rebate', {
          method: 'POST',
          body: {
            ...source,
            package_id: packageId,
            product: PRODUCT_CODE,
          },
        })
        if (requestVersion !== benefitRequestVersion) return false
        upgradeSource.value = source
        upgradeRebateData.value = quote
        setBenefitMessage({ kind: 'upgrade', quote, packageId })
        needsPermanentPackage.value = false
        showPermanentUpgradeModal.value = false
      }
      appliedInput.value = parsed.normalized
      appliedPackageId.value = packageId
      return true
    }
    catch (cause) {
      if (requestVersion === benefitRequestVersion) {
        const errCode = extractErrorCode(cause)
        setBenefitMessage({
          kind: 'error',
          code: errCode,
          fallback: errorMessage(cause, ''),
        })
        // 只认错误码。原实现还兜底匹配中文串'永久当图授权仅支持换购图个吉利永久套餐'，
        // 但服务端实际抛的是'当图永久授权尊享全额保值抵扣升级永久尊享卡，请切换套餐'
        // ——两者根本不相等，那段中文匹配是永不命中的死代码；而且中文文案本身会随
        // 服务端语言变，早就不该作为判断依据。
        if (errCode === 'UPGRADE_PERMANENT_TARGET_REQUIRED') {
          needsPermanentPackage.value = true
          showPermanentUpgradeModal.value = true
        } else {
          needsPermanentPackage.value = false
        }
      }
      return false
    }
    finally {
      if (requestVersion === benefitRequestVersion) validatingBenefit.value = false
    }
  }

  // 保留原方法名，外部组件无需理解输入分流细节。
  const validateCoupon = () => validateBenefitInput(true)

  /**
   * 创建订单。
   *
   * 幂等守卫：提交后必须立刻进入 submitting 态并禁用按钮，覆盖范围包括
   * 优惠券/换购码的网络校验往返。原实现把 creatingOrder 放在券校验之后，
   * 那一段 RTT 里按钮既没有 loading 也可以点，重复点击会并发走到建单接口。
   *
   * 现有 benefitRequestVersion 会让先到的券校验自我作废，但那是校验层的副作用，
   * 不该被当成幂等保证——真正的兜底应由服务端用 request_id 唯一约束实现。
   */
  async function createOrder(): Promise<boolean> {
    if (creatingOrder.value) return false
    creatingOrder.value = true
    error.value = ''
    const normalizedEmail = email.value.trim().toLowerCase()

    try {
      if (!selectedPackageId.value) {
        error.value = t('selectPackage')
        return false
      }
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        error.value = t('emailRequired')
        return false
      }
      if (!agreed.value) {
        error.value = t('agreementRequired')
        return false
      }
      if (!(await validateBenefitInput(true))) return false

      // 幂等键按「提交意图」固定：套餐/邮箱/券都不变时重试复用同一个键（服务端返回同一笔订单），
      // 任一项变了就换新键——否则会把上一笔不同套餐/邮箱的订单当成本次结果返回。
      const intentKey = [
        selectedPackageId.value,
        normalizedEmail,
        couponDiscount.value > 0 ? appliedInput.value : '',
      ].join('|')

      const storedIntent = readStoredIntent()
      if (storedIntent && storedIntent.intent === intentKey) {
        // 刷新/重进页面后恢复同一个键，服务端据此返回上一笔订单而不是新建
        clientRequestId.value = storedIntent.key
        clientRequestIntent.value = storedIntent.intent
      }
      else if (!clientRequestId.value || clientRequestIntent.value !== intentKey) {
        clientRequestId.value = createClientRequestId()
        clientRequestIntent.value = intentKey
        storeIntent(clientRequestId.value, clientRequestIntent.value)
      }

      const createdOrder = await request<CreateOrderData>('/payment/create-order', {
        method: 'POST',
        body: {
          package_id: selectedPackageId.value,
          email: normalizedEmail,
          coupon_code: couponDiscount.value > 0 ? appliedInput.value : undefined,
          client_request_id: clientRequestId.value,
          upgrade_source: upgradeSource.value || undefined,
          product: PRODUCT_CODE,
          // 邮件语言与 Stripe 收银台语言跟随界面语言。
          locale: locale.value,
        },
      })
      order.value = createdOrder
      // 建单成功后清掉任何历史/并发残留的错误，避免支付页头顶挂着一条早已过期的红条。
      error.value = ''
      redirectingStripe.value = false
      email.value = normalizedEmail
      orderStatus.value = { status: 'pending' }
      startPolling()

      // 二维码在返回前同步生成完毕：调用方切到支付态时 qrDataUrl 已就绪，
      // 支付页第一帧就是真实图片，不再出现转圈占位。
      const renderingOrderNo = createdOrder.order_no
      qrRenderFailed.value = false
      // 支付宝降级时 qr_code 可能为空（Stripe 仍可用），此时不渲染二维码。
      if (!createdOrder.qr_code) {
        qrDataUrl.value = ''
        return true
      }

      /*
       * 二维码渲染必须用独立 try/catch 隔离：
       * 订单此时已经入库、优惠券已锁定、轮询已启动，若 Canvas 绘制异常冒泡到
       * 外层 catch，会把 order 置 null 并判失败踢回表单，用户重试就是重复建单。
       * 渲染失败只降级成文字提示，订单生命周期不受影响。
       */
      try {
        const QRCode = await getQrCodeModule()
        const dataUrl = await QRCode.toDataURL(createdOrder.qr_code, {
          // 408 对应 200px 显示尺寸的 2x 视网膜屏，降分辨率会让扫码发虚。
          width: 408,
          margin: 1,
          errorCorrectionLevel: 'M',
        })
        if (order.value?.order_no === renderingOrderNo) qrDataUrl.value = dataUrl
      }
      catch (cause) {
        if (order.value?.order_no === renderingOrderNo) {
          // 标记渲染失败，支付页据此把无限转圈替换为「通道不可用」提示
          qrRenderFailed.value = true
          error.value = `${t('qrRenderFailed')}${errorMessage(cause, t('requestFailed'))}`
        }
      }

      return true
    }
    catch (cause) {
      const errCode = extractErrorCode(cause)
      const errKey = BENEFIT_ERROR_KEYS[errCode]
      error.value = errKey ? t(errKey) : errorMessage(cause, t('requestFailed'))
      order.value = null
      return false
    }
    finally {
      creatingOrder.value = false
    }
  }

  async function refreshOrderStatus() {
    if (!order.value || isPaid.value || pollInFlight) return
    if (Date.now() - pollStartedAt > MAX_POLL_DURATION_MS) {
      stopPolling()
      orderStatus.value = { status: 'failed' }
      error.value = t('pollTimeout')
      return
    }
    pollInFlight = true
    try {
      const elapsedMs = Date.now() - pollStartedAt
      orderStatus.value = await request<OrderStatusData>('/payment/order-status', {
        query: {
          order_no: order.value.order_no,
          // 异步通知是主链路；支付开始 1.5 秒后允许服务端主动查询支付宝，
          // 在通知延迟或丢失时仍能及时、幂等地完成落账和发码。
          reconcile: elapsedMs >= RECONCILE_DELAY_MS ? '1' : undefined,
        },
      })
      if (orderStatus.value.status !== 'pending') stopPolling()
    }
    catch (cause) {
      error.value = errorMessage(cause, t('requestFailed'))
    }
    finally {
      pollInFlight = false
    }
  }

  function startPolling() {
    stopPolling()
    pollStartedAt = Date.now()
    void refreshOrderStatus()
    // 首分钟每秒反馈支付结果，之后降到 3 秒，避免弃单页面长期制造高频请求。
    pollTimer = setInterval(() => {
      const elapsedMs = Date.now() - pollStartedAt
      if (elapsedMs <= FAST_POLL_DURATION_MS || elapsedMs % NORMAL_POLL_INTERVAL_MS < FAST_POLL_INTERVAL_MS) {
        void refreshOrderStatus()
      }
    }, FAST_POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  function resetOrder() {
    stopPolling()
    pollInFlight = false
    redirectingStripe.value = false
    order.value = null
    orderStatus.value = null
    qrDataUrl.value = ''
    qrRenderFailed.value = false
    error.value = ''
    // 用户主动放弃这笔订单后，下一次提交属于新的意图，必须换新的幂等键。
    // 注意建单成功后**不**清空：万一同键请求再次到达，服务端应返回同一笔订单而不是新建。
    clientRequestId.value = ''
    clientRequestIntent.value = ''
    clearStoredIntent()
  }

  /**
   * 切换语言后重渲染已显示的抵扣提示。
   *
   * 只换文案，不动已生效的抵扣：couponDiscount / upgradeRebateData 都保持原值，
   * 重新请求后端只会多一次网络往返且可能因为额度变化导致抵扣突然失效。
   * 提示语来源由 benefitMessageSource 记录，所以换购成功提示会重新折算币种
   * （¥ ↔ HK$），错误提示会按新的语言重查错误码映射。
   */
  watch(locale, () => {
    benefitMessage.value = renderBenefitMessage()
  })

  /**
   * 支付成功后作废持久化的意图键。
   *
   * 不清的话，同一标签页里「再买一单同套餐同邮箱」会被当成同一次意图，
   * 服务端按幂等键返回上一笔已支付订单，用户拿到的是旧激活码。
   * 待支付期间必须保留，否则刷新后重提会再建一笔。
   */
  watch(isPaid, (paid) => {
    if (paid) clearStoredIntent()
  })

  watch([couponCode, selectedPackageId], () => {
    benefitRequestVersion++
    validatingBenefit.value = false
    if (benefitTimer) clearTimeout(benefitTimer)
    benefitTimer = null
    clearAppliedBenefit()

    const parsed = classifyBenefitInput(couponCode.value, locale.value)
    if (parsed.kind === 'empty' || parsed.kind === 'incomplete') return
    if (parsed.kind === 'invalid' || parsed.kind === 'tuget-code') {
      setBenefitMessage({ kind: 'format' })
      return
    }
    if (!selectedPackageId.value) return
    benefitTimer = setTimeout(() => void validateBenefitInput(false), BENEFIT_DEBOUNCE_MS)
  })

  function handlePageShow(event: PageTransitionEvent) {
    if (event.persisted) {
      redirectingStripe.value = false
    }
  }

  // 客户端初始化阶段立即消费 <head> 预取的套餐 Promise，消除等待 onMounted 钩子的调度延迟
  if (import.meta.client) {
    void loadPackages()
  }

  onMounted(() => {
    if (!packages.value.length && !loadPackagesInFlight) {
      void loadPackages()
    }
    void restoreFromStripeReturn()
    window.addEventListener('pageshow', handlePageShow)
  })
  onBeforeUnmount(() => {
    stopPolling()
    if (benefitTimer) clearTimeout(benefitTimer)
    if (import.meta.client) {
      window.removeEventListener('pageshow', handlePageShow)
    }
  })

  /**
   * 为当前订单创建 Stripe 港币结账会话并跳转官方收银台。
   *
   * 跳回时后端只按 order_no 查询、不返回邮箱与金额（PII 保护），所以先把完整订单
   * 暂存到 sessionStorage，跳回或点返回后用它恢复 Step 3 与成功页上下文。
   */
  async function startStripeCheckout() {
    if (!order.value || redirectingStripe.value) return
    redirectingStripe.value = true
    error.value = ''
    try {
      storeStripeContext(order.value.order_no, email.value, order.value)
      const data = await request<StripeCheckoutData>('/payment/stripe-checkout', {
        method: 'POST',
        body: {
          order_no: order.value.order_no,
          locale: locale.value,
        },
      })
      if (!data?.checkout_url) {
        throw new Error(t('stripeLinkMissing'))
      }
      window.location.href = data.checkout_url
    }
    catch (cause) {
      redirectingStripe.value = false
      error.value = errorMessage(cause, t('requestFailed'))
    }
  }

  /**
   * 从 Stripe 跳回后的恢复。
   *
   * URL 带 ?payment_order=TGTU... 时说明用户刚从 Stripe 跳回（可能已付款，也可能点左上角返回）；
   * 优先恢复 sessionStorage 中保存的完整 order（含 amount、amount_hkd、qr_code），
   * 确保未付款点返回时 Step 3 仍能正常展示金额、支付宝二维码和 Stripe 按钮。
   */
  async function restoreFromStripeReturn() {
    if (!import.meta.client) return
    const orderNo = new URLSearchParams(window.location.search).get('payment_order')
    if (!orderNo) return

    redirectingStripe.value = false
    const stored = readStripeContext()
    if (stored?.email) email.value = stored.email

    const restoredOrder: CreateOrderData =
      stored?.order && stored.order.order_no === orderNo
        ? stored.order
        : ({
            order_no: orderNo,
            qr_code: '',
            amount: 0,
            original_amount: null,
            coupon_applied: false,
            coupon_discount: 0,
            upgrade_applied: false,
            upgrade_discount: 0,
          } as CreateOrderData)

    // 先把二维码渲染完再落地 order：order 赋值会触发 PaymentCheckout 切到支付态，
    // 若此刻 dataURL 还没生成，用户从 Stripe 跳回同样要盯一帧空占位。
    // 渲染失败只降级（无 qr_code 时由 CheckoutQrPay 展示通道不可用提示），不阻断恢复。
    let restoredQrDataUrl = ''
    let restoredQrFailed = false
    if (restoredOrder.qr_code) {
      try {
        const QRCode = await getQrCodeModule()
        restoredQrDataUrl = await QRCode.toDataURL(restoredOrder.qr_code, {
          width: 408,
          margin: 1,
          errorCorrectionLevel: 'M',
        })
      }
      catch {
        restoredQrDataUrl = ''
        restoredQrFailed = true
      }
    }

    qrRenderFailed.value = restoredQrFailed

    order.value = restoredOrder
    qrDataUrl.value = restoredQrDataUrl
    orderStatus.value = { status: 'pending' }

    // 清掉 URL 参数，避免刷新时重复走恢复流程。
    const url = new URL(window.location.href)
    url.searchParams.delete('payment_order')
    window.history.replaceState({}, '', url.toString())

    startPolling()
    if (orderStatus.value?.status === 'paid') clearStripeContext()
  }

  return {
    packages,
    selectedPackageId,
    selectedPackage,
    email,
    couponCode,
    couponDiscount,
    couponMessage,
    upgradeSource,
    upgradeRebateData,
    upgradeDiscount,
    totalDiscount,
    benefitState,
    agreed,
    loadingPackages,
    validatingCoupon,
    validatingBenefit,
    creatingOrder,
    redirectingStripe,
    error,
    order,
    orderStatus,
    qrDataUrl,
    qrRenderFailed,
    payableAmount,
    isPaid,
    hkdAmount,
    canUseStripe,
    showPermanentUpgradeModal,
    needsPermanentPackage,
    switchToPermanentPackage,
    preloadQrRenderer,
    loadPackages,
    selectPackage,
    validateCoupon,
    validateBenefitInput,
    createOrder,
    startStripeCheckout,
    resetOrder,
  }
}
