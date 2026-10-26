import { computed, ref } from 'vue'

export type Locale = 'zh-CN' | 'en'

const STORAGE_KEY = 'store_locale'

/**
 * 收银台语言。
 *
 * 优先级：URL ?lang= > localStorage > 浏览器语言。
 * store 是纯客户端应用（无 SSR），所以可以在模块初始化时直接读 navigator，
 * 不存在 hydration 不一致问题。
 */
const locale = ref<Locale>(detectInitialLocale())

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN'

  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (fromUrl === 'en' || fromUrl === 'zh-CN') return fromUrl

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'zh-CN') return stored
  } catch {
    // 隐私模式下 localStorage 可能抛异常，忽略并退回浏览器语言。
  }

  // 非中文浏览器一律默认英文：海外用户看到中文界面只会直接放弃。
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function getLocale(): Locale {
  return locale.value
}

/**
 * 响应式 locale。
 *
 * ⚠️ 子组件里**不要**写 `const locale = getLocale()`：那样只会在 setup 阶段
 * 求值一次拿到普通字符串，之后点「EN」切换语言时，套餐名、权益清单、价格币种
 * 全都不会重渲染。模板里要用这个 ref（或基于它的 computed），依赖才会被收集。
 */
export function useLocale() {
  return locale
}

export function setLocale(next: Locale): void {
  locale.value = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 存储失败不影响本次会话的语言切换。
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next
  }
}

export function toggleLocale(): void {
  setLocale(locale.value === 'zh-CN' ? 'en' : 'zh-CN')
}

export function isEnglish(): boolean {
  return locale.value === 'en'
}

const dict = {
  'zh-CN': {
    langLabel: '语言',
    switchToEnglish: 'EN',
    switchToChinese: '中文',

    // 套餐选择
    selectTitle: '选择套餐',
    recommended: '推荐',
    trial: '体验',
    devices: '台设备',

    // 品牌区
    brandTitle: '当图客户端',
    brandSubtitle: '专业电商图片下载工具',
    brandNote: '多设备授权，购买后即时发送激活码到邮箱',
    downloadClient: '下载客户端',
    microsoftStore: '微软商店',
    exeFallbackTitle: '无法访问微软商店？',
    exeFallbackDesc: '当图客户端 EXE 独立安装包直接下载',
    exeDownloadLink: '下载独立 EXE 安装包 (64位)',

    // 抵扣券横幅
    couponBannerPrefix: '检测到您的',
    couponBannerMid: '元升级抵扣券，将自动减免！剩余：',
    couponBannerSuffix: '元升级抵扣券，将自动减免！剩余：',

    // 套餐卡片
    bestValue: '性价比之王',
    recommendedPlan: '推荐方案',
    selectedBadge: '已选',
    autoDiscounted: '已自动抵扣',
    yuanUnit: '元',
    autoDiscountedEn: 'Auto-applied: HK$ ',
    permanentCountdownLabel: '限时特惠仅剩',
    exeGuideTitle: '推荐从 Microsoft Store 获取',
    exeGuideDesc: '通过浏览器直接下载 EXE 安装包时，Windows 可能会弹出安全提示。为了获得更安全、流畅的安装体验，建议从 Microsoft Store 获取。',
    exeGuideRecommended: '推荐',
    exeGuideFallback: '备选',
    exeGuideDirectTitle: '直接下载 EXE',
    exeStoreVerified: '已通过微软安全验证，无安全提示',
    exeStoreAutoUpdate: '安装后自动更新，始终使用最新版',
    exeStoreMultiDevice: '支持微软账号管理，多设备同步',
    exeStoreCta: '从 Microsoft Store 获取',
    exeDirectSecurity: '可能触发 Windows 安全提示拦截',
    exeDirectManualUpdate: '需手动检查更新',
    exeDirectCta: '仍要下载 EXE',
    installFromStore: '从微软商店安装（推荐）',
    codeCopied: '激活码已复制到剪贴板',
    contactSupportTitle: '联系官方微信客服（开票与售后咨询）',
    legalInfo: '法律信息',
    stripeRedirectFailed: '港币支付跳转失败，请稍后重试',
    loadPackagesFailed: '加载套餐失败',
    loadPackagesRetry: '加载套餐列表失败，请刷新页面重试',
    storeRecommended: '推荐',
    permanentBannerTitle: '年卡同价！',
    permanentBannerBody: '仅需 1 年费用即享终身无限下载！包含未来所有核心升级，拒绝二次收费。',
    featuresTitle: '核心功能',
    benefitListTitle: '核心功能',
    permanentMathTitle: '永久卡算账',
    permanentMathBody: '年卡同价！年费用即享终身无限下载！包含未来所有核心升级，拒绝二次收费。',
    buyNow: '立即购买',
    choosePlan: '选择套餐',
    benefits: {
      batchImages: '批量下载商品图片',
      platformSupport: '40+ 电商平台支持',
      batchVideo: '视频批量下载',
      originalQuality: '原图还原（去缩略图后缀）',
      skuImages: 'SKU 图片下载',
      parallelFetch: '多 Worker 并行抓取',
      autoReferrer: '自动防盗链代理',
      multiDevice: '多设备授权使用',
    },

    // 订单确认
    couponToggleHas: '有其他抵扣券？',
    couponVerified: '已验证',
    couponValidate: '验证',
    couponRemove: '移除',
    couponValidMsg: '抵扣券有效，可抵扣',
    couponCodePlaceholder: '输入抵扣券码，如 UPG-XXXXXX-XXXXXX',
    couponRemainingPrefix: '剩余',
    autoCouponPrefix: '检测到该邮箱有',
    couponCountSuffix: ' 张',
    autoCouponSuffix: '可用抵扣券，已自动为您减免！',
    emailRequired: '请输入邮箱地址',
    emailInvalid: '请输入正确的邮箱格式',
    couponUnavailable: '抵扣券不可用',
    couponValidateFailed: '验证失败',
    agreementRequired: '请先阅读并同意用户服务协议',
    createOrderFailed: '创建订单失败，请稍后重试',

    // 抵扣券错误码 → 界面文案（后端 message 是中文硬编码，英文界面按码自己出文案）
    errCouponNotFound: '该抵扣券不存在',
    errCouponAlreadyUsed: '该抵扣券已被使用',
    errCouponExpired: '该抵扣券已过期',
    errCouponNotAllowed: '该抵扣券仅限购买指定套餐时使用',
    errCouponProductMismatch: '该抵扣券不适用于当前产品',
    agreementBody: '我已阅读并同意',
    agreementDoc: '《用户服务协议、合规使用条款与免责声明》',
    agreementTail: '，其中包含免责、责任限制、用户赔偿与合规使用条款。',
    submitPay: '确认支付',
    stripeStepHint: '支持支付宝扫码 · 海外及外币卡用户可在下一步选择 Stripe 港币支付',
    backToPlans: '← 返回套餐选择',
    selectedPlan: '已选套餐',
    switchPlan: '切换套餐',
    payAmount: '支付金额',
    savedPrefix: '已省',
    agreePrefix: '我已阅读并同意',
    confirmTitle: '确认订单',
    emailLabel: '接收激活码的邮箱',
    emailPlaceholder: '请输入邮箱',
    couponLabel: '抵扣券码（可选）',
    couponPlaceholder: '如有抵扣券请输入',
    couponAvailable: '有可用抵扣券',
    upgradeRebateTitle: '旧授权换购抵扣',
    submitOrder: '确认下单',
    submitting: '正在创建订单…',

    // 支付页
    alipayTitle: '扫码安全付款',
    alipayBrand: '支付宝',
    securityPay: '安全支付',
    amountDue: '应付金额',
    amountNote: '请核对金额后使用支付宝付款',
    scanTip: '打开支付宝 App，扫一扫完成支付',
    qrValidity: '二维码有效期',
    qrExpired: '订单已过期，请重新下单',
    payChannel: '支付宝支付通道',
    autoConfirm: '付款后自动确认',
    orderNo: '订单号',
    accountPay: '无法扫码？使用支付宝账号登录支付',

    // Stripe 切换
    switchToStripe: '我是海外用户 / 我有外币银行卡来支付 →',
    stripeEntrySub: 'Visa / Mastercard / Amex / Apple Pay / Google Pay · 按港币结算',
    stripeTitle: 'Stripe 国际安全支付',
    stripeAmountDue: '应付金额（港币）',
    stripeNote: '账单金额锁定港币，汇兑由您的发卡行或钱包处理',
    stripeMethods: '支持 Visa / Mastercard / Amex / Apple Pay / Google Pay / Link',
    goStripe: '前往 Stripe 安全支付',
    backToAlipay: '← 返回使用支付宝扫码',
    stripeRedirecting: '正在跳转 Stripe…',

    // 英文左右双栏收银
    dualHeaderEyebrow: '两种支付方式',
    dualHeaderTitle: '选择支付方式',
    dualHintNote: '两条通道对应同一笔订单，支付任意一种即可完成付款。',
    stripeCardTitle: 'Stripe · 国际银行卡与钱包',
    stripeSslBadge: 'SSL 安全加密',
    stripePayCta: '使用 Stripe 支付',
    alipayCardTitle: '支付宝 · 二维码支付',
    alipayCnyNote: '按对应人民币（CNY）金额结算',
    qrGenerateFailed: '二维码生成失败',
    paySucceeded: '支付成功！',

    // 成功页
    successTitle: '支付成功',
    successSubtitle: '激活码已发送到您的邮箱',
    activationCode: '激活码',
    copyCode: '复制',
    copied: '已复制',
    backHome: '返回首页',

    // 激活步骤
    activationStepsTitle: '激活步骤',
    activationStep1: '打开当图客户端',
    activationStep2: '在激活弹窗中输入激活码',
    activationStep3: '点击"立即激活"',
    activationStep4: '开始使用全部功能',
    notInstalled: '还没有安装客户端？立即下载：',

    // 客服
    supportEmail: '客服邮箱',
    contactSupport: '联系客服',
    dockWechat: '微信客服',
    dockSub: '开票与咨询',
    contactModalTitle: '微信客服',
    contactScan: '微信扫码添加客服',
    contactLead: '购买或激活问题，微信客服可协助。',
    contactDesc: '如未收到激活码邮件、邮箱填写有误、付款后状态未更新，或需要确认订单信息，请扫码添加微信并说明情况。建议同时提供订单邮箱或支付截图，便于快速处理。',
    contactEmail: '客服邮箱',
    contactDownload: '软件下载',
    contactStoreLink: '微软商店安装（推荐）',
    contactExeLink: 'EXE 直链下载',
    contactNote: '打开微信扫一扫，添加后留言即可。',
    contactMore: '更多',
    customerService: '微信客服',
    invoiceConsult: '开票与咨询',

    // 通用
    cancel: '取消支付',
    orderFailed: '支付失败，请重新下单',
    retry: '重试',
    close: '关闭',
    agree: '同意',
    terms: '用户协议',
    privacy: '隐私政策',
  },
  'en': {
    langLabel: 'Language',
    switchToEnglish: '中文',
    switchToChinese: 'EN',

    selectTitle: 'Choose a plan',
    recommended: 'Recommended',
    trial: 'Trial',
    devices: 'devices',

    // Brand area
    brandTitle: 'DownPictures Client',
    brandSubtitle: 'Professional bulk downloader for product images',
    brandNote: 'Multi-device licence — your activation code is emailed instantly after purchase',
    downloadClient: 'Download the app',
    microsoftStore: 'Microsoft Store',
    exeFallbackTitle: 'Cannot access the Microsoft Store?',
    exeFallbackDesc: 'Download the standalone DownPictures EXE installer directly',
    exeDownloadLink: 'Download standalone EXE installer (64-bit)',

    // Voucher banner
    couponBannerPrefix: "We found your",
    couponBannerMid: 'upgrade voucher — it will be applied automatically. Time left:',
    couponBannerSuffix: 'upgrade voucher — it will be applied automatically. Time left:',

    // Package card
    bestValue: 'Best value',
    recommendedPlan: 'Recommended',
    selectedBadge: 'Selected',
    autoDiscounted: 'Auto-applied',
    yuanUnit: '',
    autoDiscountedEn: 'Auto-applied: HK$ ',
    permanentCountdownLabel: 'Limited-time offer ends in',
    exeGuideTitle: 'Get it from the Microsoft Store',
    exeGuideDesc:
      'Windows may show a security warning when you download the EXE directly from a browser. For a safer and smoother install, we recommend the Microsoft Store.',
    exeGuideRecommended: 'Recommended',
    exeGuideFallback: 'Alternative',
    exeGuideDirectTitle: 'Download EXE directly',
    exeStoreVerified: 'Verified by Microsoft — no security warnings',
    exeStoreAutoUpdate: 'Updates automatically, always on the latest version',
    exeStoreMultiDevice: 'Managed through your Microsoft account, synced across devices',
    exeStoreCta: 'Get it from the Microsoft Store',
    exeDirectSecurity: 'May trigger a Windows security warning',
    exeDirectManualUpdate: 'Updates must be checked manually',
    exeDirectCta: 'Download the EXE anyway',
    installFromStore: 'Install from the Microsoft Store (recommended)',
    codeCopied: 'Activation code copied to clipboard',
    contactSupportTitle: 'Contact official WeChat support (invoicing & after-sales)',
    legalInfo: 'Legal information',
    stripeRedirectFailed: 'Could not open the HKD checkout. Please try again later.',
    loadPackagesFailed: 'Failed to load plans',
    loadPackagesRetry: 'Could not load the plan list. Please refresh the page.',
    storeRecommended: 'Recommended',
    permanentBannerTitle: 'Lifetime for the price of one year!',
    permanentBannerBody:
      'One year of cost buys lifetime unlimited downloads. Includes every future core upgrade — no second charge.',
    featuresTitle: 'Core features',
    benefitListTitle: 'Core features',
    permanentMathTitle: 'Why lifetime pays off',
    permanentMathBody:
      'Same price as one year — but yours forever. Includes all future core upgrades, no second charge.',
    buyNow: 'Buy now',
    choosePlan: 'Choose plan',
    benefits: {
      batchImages: 'Bulk download product images',
      platformSupport: 'Support for 40+ e-commerce platforms',
      batchVideo: 'Bulk download videos',
      originalQuality: 'Original quality (strip thumbnail suffixes)',
      skuImages: 'SKU image downloads',
      parallelFetch: 'Parallel fetching with multiple workers',
      autoReferrer: 'Automatic referrer proxy',
      multiDevice: 'Multi-device licence',
    },

    couponToggleHas: 'Have another voucher?',
    couponVerified: 'Verified',
    couponValidate: 'Apply',
    couponRemove: 'Remove',
    couponValidMsg: 'Voucher valid — saves',
    couponCodePlaceholder: 'Enter your voucher code, e.g. UPG-XXXXXX-XXXXXX',
    couponRemainingPrefix: 'Time left',
    autoCouponPrefix: 'We found',
    couponCountSuffix: ' vouchers for this address',
    autoCouponSuffix: ' — the best one has been applied automatically!',
    emailRequired: 'Please enter your email address',
    emailInvalid: 'Please enter a valid email address',
    couponUnavailable: 'This voucher cannot be used',
    couponValidateFailed: 'Validation failed',
    agreementRequired: 'Please read and accept the Terms of Service first',
    createOrderFailed: 'Could not create the order. Please try again later.',

    // Voucher error codes → UI copy (the backend message is hard-coded Chinese,
    // so the English UI produces its own wording from the code)
    errCouponNotFound: 'That voucher does not exist',
    errCouponAlreadyUsed: 'That voucher has already been used',
    errCouponExpired: 'That voucher has expired',
    errCouponNotAllowed: 'That voucher can only be used on eligible plans',
    errCouponProductMismatch: 'That voucher does not apply to this product',
    agreementBody: 'I have read and agree to the',
    agreementDoc: 'Terms of Service, Compliant-Use Terms and Disclaimer',
    agreementTail: ', which cover disclaimers, liability limits, user indemnity and compliant use.',
    submitPay: 'Pay now',
    stripeStepHint: '',
    backToPlans: '← Back to plans',
    selectedPlan: 'Selected plan',
    switchPlan: 'Change plan',
    payAmount: 'Amount due',
    savedPrefix: 'You save ',
    agreePrefix: 'I have read and agree to the',
    confirmTitle: 'Confirm your order',
    emailLabel: 'Email for your activation code',
    emailPlaceholder: 'Enter your email address',
    couponLabel: 'Voucher code (optional)',
    couponPlaceholder: 'Enter code if you have one',
    couponAvailable: 'Voucher available',
    upgradeRebateTitle: 'Upgrade credit from a previous license',
    submitOrder: 'Place order',
    submitting: 'Creating order…',

    alipayTitle: 'Scan to pay securely',
    alipayBrand: 'Alipay',
    securityPay: 'Secure payment',
    amountDue: 'Amount due',
    amountNote: 'Please verify the amount before paying with Alipay',
    scanTip: 'Open the Alipay app and scan this QR code',
    qrValidity: 'QR code valid for',
    qrExpired: 'This order has expired. Please place a new order.',
    payChannel: 'Alipay payment channel',
    autoConfirm: 'Auto-confirmed after payment',
    orderNo: 'Order number',
    accountPay: 'Cannot scan? Pay with your Alipay account',

    switchToStripe: 'International user? Pay with a foreign bank card or Apple Pay →',
    stripeEntrySub: 'Visa / Mastercard / Amex / Apple Pay / Google Pay — settled in HKD',
    stripeTitle: 'Secure international payment',
    stripeAmountDue: 'Amount due (HKD)',
    stripeNote: 'The billing amount is locked in HKD; your bank or wallet handles the conversion',
    stripeMethods: 'Supports Visa / Mastercard / Amex / Apple Pay / Google Pay / Link',
    goStripe: 'Continue to Stripe Checkout',
    backToAlipay: '← Back to Alipay QR payment',
    stripeRedirecting: 'Redirecting to Stripe…',

    // English side-by-side checkout
    dualHeaderEyebrow: 'Two ways to pay',
    dualHeaderTitle: 'Choose how to pay',
    dualHintNote: 'Both options settle the same order — pay with either one.',
    stripeCardTitle: 'Stripe · International card & wallet',
    stripeSslBadge: 'SSL secured',
    stripePayCta: 'Pay with Stripe',
    alipayCardTitle: 'Alipay · QR code payment',
    alipayCnyNote: 'Settled in RMB (CNY) via Alipay',
    qrGenerateFailed: 'Could not generate the QR code',
    paySucceeded: 'Payment successful',

    successTitle: 'Payment successful',
    successSubtitle: "We've emailed your activation code",
    activationCode: 'Activation code',
    copyCode: 'Copy',
    copied: 'Copied',
    backHome: 'Back to home',

    supportEmail: 'Support email',
    contactSupport: 'Contact support',
    dockWechat: 'WeChat support',
    dockSub: 'Invoicing & enquiries',
    contactModalTitle: 'WeChat support',
    contactScan: 'Scan to add support on WeChat',
    contactLead: 'Questions about buying or activating? Our WeChat support can help.',
    contactDesc:
      "If you haven't received your activation email, entered a wrong address, or your payment status hasn't updated, scan the code and describe the issue. Including your order email or a payment screenshot helps us resolve it faster.",
    contactEmail: 'Support email',
    contactDownload: 'Downloads',
    contactStoreLink: 'Microsoft Store (recommended)',
    contactExeLink: 'Direct EXE download',
    contactNote: 'Open WeChat, scan the code, and leave a message after adding us.',
    contactMore: 'More',
    customerService: 'WeChat support',
    invoiceConsult: 'Invoicing & enquiries',

    cancel: 'Cancel payment',
    orderFailed: 'Payment failed. Please place a new order.',
    retry: 'Retry',
    close: 'Close',
    agree: 'Agree',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',

    // Activation steps
    activationStepsTitle: 'How to activate',
    activationStep1: 'Open the DownPictures client',
    activationStep2: 'Enter the activation code in the dialog',
    activationStep3: 'Click "Activate now"',
    activationStep4: 'Start using every feature',
    notInstalled: "Haven't installed the client yet? Download it now:",
  },
} as const

/**
 * 可翻译的顶层文案键。
 *
 * 显式排除 benefits：它是嵌套对象而不是字符串，混进来会让 t() 的返回类型
 * 变成 string | {...}，所有模板调用都会报 TS2322。
 */
export type TranslationKey = Exclude<keyof typeof dict['zh-CN'], 'benefits'>
export type BenefitKey = keyof typeof dict['zh-CN']['benefits']

/** 翻译函数。未登记的 key 直接返回 key 本身，避免界面出现空白。 */
export function t(key: TranslationKey): string {
  return dict[locale.value][key] ?? key
}

/** 功能清单条目翻译。 */
export function tBenefit(key: BenefitKey): string {
  return dict[locale.value].benefits[key] ?? key
}

/** 供模板使用的语言判定与切换。 */
export function useI18n() {
  return {
    locale,
    isEnglish: computed(isEnglish),
    t,
    setLocale,
    toggleLocale,
  }
}