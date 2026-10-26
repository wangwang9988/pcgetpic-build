import { computed, onMounted, ref } from 'vue'

const STORAGE_KEY = 'tuget_checkout_locale'

/** 收银台支持的语言。 */
export type Locale = 'zh-CN' | 'en'

/**
 * /buy/ 收银台语言。
 *
 * 与 store 的关键差异：**locale 初始值在 SSR 与客户端首次渲染时固定为
 * 'zh-CN'**，只有 onMounted 之后才按 URL / localStorage / 浏览器语言切换。
 *
 * 原因：/buy/ 是 SSG 预渲染页面。如果在 setup 阶段就读 localStorage 或
 * navigator.language，海外用户拿到的静态 HTML（中文）与客户端首帧（英文）
 * 不一致，Vue 会报 hydration mismatch，轻则闪烁、重则整块内容错位。
 * 固定初始值 + 挂载后切换，是预渲染站点做语言适配的标准做法。
 */
const locale = ref<Locale>('zh-CN')
const localeReady = ref(false)

const dict = {
  'zh-CN': {
    switchToEnglish: 'EN',
    langLabel: '语言',

    selectTitle: '挑选授权方案',
    recommended: '推荐',
    trial: '体验',
    devices: '台设备',
    devicesText: '支持',

    headerTitle: 'TuGet（图个吉利）客户端',
    headerSubtitle: '网页多媒体与电商素材批量采集电脑桌面端',
    headerBadge: '官方正版授权',
    headerTagline: '正版企业直营 · 支付宝官方安全结算 · 购买后即时自动发卡至网页及邮箱 · 多设备并发支持',
    stepSelect: '挑选授权方案',
    stepConfirm: '确认订单',
    stepPay: '扫码支付',
    stepDone: '完成',
    stepsNavLabel: '购买流程导航',

    confirmTitle: '确认订单',
    emailLabel: '接收激活码的邮箱',
    emailPlaceholder: '请输入邮箱',
    couponLabel: '抵扣券码（可选）',
    couponPlaceholder: '如有抵扣券请输入',
    couponAvailable: '有可用抵扣券',
    submitOrder: '确认下单',
    submitting: '正在创建订单…',

    alipayTitle: '扫码安全付款',
    alipayBrand: '支付宝',
    securityPay: '安全支付',
    amountDue: '应付金额',
    amountNote: '请核对金额后使用支付宝付款',
    scanTip: '打开支付宝 App，扫一扫完成支付',
    // 支付宝通道降级（后端未下发 qr_code）时的占位文案，替代无限转圈。
    qrUnavailable: '支付宝扫码通道暂时不可用，请改用其他支付方式完成付款。',
    alipayOfficial: '支付宝 · 官方安全收银台',
    rsa2Security: 'RSA2 金融安全',
    countdownHint: '（支付状态秒级同步）',
    countdownExpired: '支付已超时，请返回重新发起订单',
    trustDirect: '支付宝官方直连通道',
    trustAuto: '付款后秒级自动发卡',
    merchantOrderNo: '商户订单号',
    cannotScan: '无法扫码？在电脑浏览器打开支付宝收银台',
    qrValidity: '二维码有效期',
    qrExpired: '订单已过期，请重新下单',
    orderNo: '订单号',
    accountPay: '无法扫码？使用支付宝账号登录支付',

    formTitle: '确认订单并支付',
    formTagline: '正规商业授权 · 支付宝官方安全担保结算 · 秒级自动发卡',
    selectedPlan: '已选方案：',
    emailHint: '用于查收授权码及售后凭证',
    emailHelper: '支付成功后系统将在网页直接显示激活码，并同步发送备份至此邮箱。',
    couponToggle: '有抵扣券，或购买过当图客户端？',
    floorApplied: '老用户保底',
    permanentUpgradeTitle: '历史永久授权升级抵扣',
    permanentUpgradeDesc: '已识别您的当图历史永久授权记录，实付金额可折算抵扣，请切换至永久套餐完成升级。',
    upgradeRevokeNotice: '换购支付成功后，原当图激活码将立即失效，并为您签发新的 TGTU 激活码。',
    benefitHelper: '支持使用当图历史订单号或 PCGP 格式激活码折算抵扣；优惠券与历史订单抵扣不可叠加。',
    termsLink: '《用户协议与购买条款》',
    privacyLink: '《隐私政策》',
    payableAmount: '实付结算金额',
    zeroFee: '官方直连 · 0 手续费',
    submitPay: '确认订单并前往支付',
    submitPayEn: '继续前往支付',
    stripeStepHint: '支持支付宝扫码 · 海外及外币卡用户可在下一步选择 Stripe 港币支付',
    originalPricePrefix: '原价 ',
    discountAppliedPrefix: '已抵扣 −',
    discountLabelUpgrade: '当图换购抵扣',
    discountLabelCoupon: '优惠券抵扣',
    emailPlaceholderFull: '请输入您的常用邮箱 (如 name@example.com)',
    couponPlaceholderLegacy: 'UPG 抵扣券 / 当图订单号 / PCGP 激活码',
    backToPlans: '← 返回重新选择套餐',
    closeLabel: '关闭',
    modalLater: '稍后再说（留在当前页）',
    agreePrefix: '我已阅读并同意',
    switchToStripe: '我是海外用户 / 我有外币银行卡来支付 →',
    dualHeaderEyebrow: '两种支付方式',
    dualHeaderTitle: '选择支付方式',
    dualHintNote: '两条通道对应同一笔订单，支付任意一种即可完成付款。',
    stripeCardTitle: 'Stripe · 国际银行卡与钱包',
    stripeSslBadge: 'SSL 安全加密',
    stripePayCta: '使用 Stripe 支付',
    alipayCardTitle: '支付宝 · 二维码支付',
    alipayCnyNote: '按对应人民币（CNY）金额结算',
    stripeTitle: 'Stripe 国际安全支付',
    stripeAmountDue: '应付金额（港币）',
    stripeNote: '账单金额锁定港币，汇兑由您的发卡行或钱包处理',
    stripeMethods: '支持 Visa / Mastercard / Amex / Apple Pay / Google Pay / Link',
    goStripe: '前往 Stripe 安全支付',
    backToAlipay: '← 返回使用支付宝扫码',
    stripeRedirecting: '正在跳转 Stripe…',

    resultTitle: '支付成功！正版授权已开通',
    resultCodeBadge: '您的专属客户端授权激活码 (TGTU 格式)',
    resultHowTo: '如何激活客户端？',
    resultHowToBody: '打开【TuGet（图个吉利）客户端】→ 点击右上角【授权激活】→ 粘贴上述激活码即可解锁全部无损采集与下载权益。',
    resultCopy: '一键复制激活码',
    resultCopied: '已成功复制激活码',
    resultInstallGuide: '查看客户端安装指南',
    pkgBadgeBest: '性价比之王',
    pkgBadgeOfficial: '官方推荐',
    pkgBuyNow: '立即购买',
    pkgPermanentTitle: '终身买断授权：',
    pkgPermanentDesc: '一次性付费，享受持续软件版本升级与多设备并发。',
    pkgFeaturesTitle: '核心功能与商用权益',
    switchPlan: '切换套餐 →',
    couponChecking: '核销中...',
    couponApply: '应用抵扣',
    switchToPermanentApply: '切换至永久套餐以应用抵扣 →',
    agreeBody: '我已阅读并完全同意',
    agreeAnd: '与',
    floorAppliedShort: '老用户保底',
    trustDirectSign: '官方直签',
    trustRsa2: 'RSA2 加密',
    trustAutoCard: '自动发卡',
    trustInvoice: '增票支持',
    permanentModalTitle: '历史永久授权升级抵扣',
    permanentModalSubtitle: '已识别您的当图历史永久授权凭证',
    permanentModalIntro: '历史永久授权升级说明',
    permanentItem1Title: '实付金额折算抵扣',
    permanentItem1Body: '历史当图实付金额直接抵减当前订单应付金额',
    permanentItem2Title: 'TuGet 永久买断授权',
    permanentItem2Body: '升级为 TuGet（图个吉利）永久套餐，持续享有桌面客户端授权',
    permanentItem3Title: '多设备并发在线',
    permanentItem3Body: '支持约定台数电脑同时在线与灵活换机解绑',
    permanentItem4Title: '软件持续维护',
    permanentItem4Body: '媒体提取能力与桌面端版本将随产品迭代持续更新',
    permanentModalNote: '历史永久授权需对应换购至 TuGet 永久套餐完成折算抵扣。换购成功后将为您签发新版 TGTU 激活码，原当图激活码将同步失效。',
    permanentModalCta: '切换为永久套餐并应用抵扣',
    cancelPay: '← 取消支付，返回重新选择套餐',
    footerCopyright: '客户端 · 运营主体：',
    footerSupport: '客服邮箱：',
    footerTerms: '用户协议与购买条款',
    footerPrivacy: '隐私政策',
    csLabel: '微信客服',
    csSub: '开票与咨询',
    csModalTitle: '官方客服与售后咨询',
    csScan: '微信扫码联系官方客服',
    csLead: '购买、激活码未收到或开具增值税发票，客服可协助。',
    csDockTitle: '联系官方客服 / 发票申请',
    csQrHint: '打开手机微信扫一扫，添加客服留言即可（工作日 9:00 - 18:00）。',
    csSupportEmail: '客服邮箱：',
    csInvoiceTitle: '发票开具：',
    csInvoiceBody: '付款后将支付宝订单号及开票抬头发送至客服邮箱即可办理。',
    resultSubtitle: '激活码已同步发送至您的邮箱',
    resultBuyAnother: '返回继续购买其他套餐',
    successTitle: '支付成功',
    successSubtitle: '激活码已发送到您的邮箱',
    activationCode: '激活码',
    copyCode: '复制',
    copied: '已复制',
    downloadClient: '下载客户端',
    backHome: '返回首页',

    supportEmail: '客服邮箱',
    contactSupport: '联系客服',
    cancel: '取消支付',
    orderFailed: '支付失败，请重新下单',

    // 支付流程内的校验与报错（useTugetPayment 直接写入 error / benefitMessage）
    requestFailed: '请求失败，请稍后重试',
    benefitIncomplete: '请完整输入抵扣凭证后再试',
    benefitFormatInvalid: '抵扣凭证格式不正确',
    couponUnavailable: '该抵扣券不可用',
    couponAppliedPrefix: '抵扣券已生效，立减 ',
    selectPackage: '请选择套餐',
    emailRequired: '请输入有效的接收激活码邮箱',
    agreementRequired: '请先阅读并同意用户协议与隐私政策',
    qrRenderFailed: '订单已创建，但二维码显示失败：',
    pollTimeout: '订单已超过支付时限，请重新创建订单',
    stripeLinkMissing: '未获取到港币支付链接',

    /**
     * 老当图换购抵扣成功提示。
     *
     * 后端 quote.message 是硬编码中文 + 人民币符号，英文界面不能直接透出，
     * 所以英文态由前端按这四个模板重新拼——分支与后端 messageForCalculation
     * 一一对应。占位符：{name} 来源套餐名、{days} 剩余天数、
     * {computed} 折算价值、{amount} 实际抵扣额（已按界面币种格式化）。
     */
    upgradeMsgExpired:
      '您的当图授权已到期。但您是我们的老用户，本次仍为您保底抵扣 {amount}',
    upgradeMsgFloor:
      '已识别当图【{name}】，剩余价值折算 {computed}；按老用户权益，已保底抵扣 {amount}',
    upgradeMsgPermanent: '已识别当图【{name}】，可抵扣 {amount}',
    upgradeMsgRemaining: '已识别当图【{name}】，剩余 {days} 天，可抵扣 {amount}',

    /**
     * 换购/抵扣券错误码 → 界面文案。
     *
     * 后端返回的 message 是中文硬编码，英文界面必须按error_code 自己映射，
     * 否则会在英文界面里冒出一整句中文。
     */
    errUpgradeSourceNotFound: '找不到这个当图激活码或订单号',
    errUpgradeAlreadyUsed: '该当图授权已完成换购抵扣或正被待支付订单占用，无法重复使用',
    errUpgradePermanentTargetRequired:
      '当图永久授权仅支持换购图个吉利永久套餐，请先切换套餐',
    errUpgradeSourceInvalid: '请输入正确的当图订单号或激活码',
    errUpgradeSourceClaimable: '该当图授权正被另一笔待支付订单占用',
    errUpgradeSourceDisabled: '该当图激活码已被停用，无法参与抵扣，请联系客服',
    errUpgradeSourceNotPaid: '该凭证没有对应的已支付当图订单，无法参与抵扣',
    errUpgradeSourceCodeMissing: '该订单缺少可核销的当图激活码，请联系客服处理',
    errUpgradeProductMismatch: '该凭证不属于当图客户端，仅支持当图升级到图个吉利',
    errDiscountConflict: '抵扣券与当图换购抵扣不可同时使用',
    errCouponNotFound: '该抵扣券不存在',
    errCouponAlreadyUsed: '该抵扣券已被使用',
    errCouponExpired: '该抵扣券已过期',
    errCouponNotAllowed: '该套餐不支持使用抵扣券',
    errCouponProductMismatch: '该抵扣券不适用于当前产品',
    close: '关闭',
  },
  'en': {
    switchToEnglish: '中文',
    langLabel: 'Language',

    headerTitle: 'TuGet Desktop Client',
    headerSubtitle: 'Bulk capture of web media and e-commerce assets, on your desktop',
    headerBadge: 'Official licence',
    headerTagline: 'Direct from the developer · Secure Alipay checkout · Instant delivery by email · Multi-device support',
    stepSelect: 'Choose a plan',
    stepConfirm: 'Confirm order',
    stepPay: 'Scan to pay',
    stepDone: 'Done',
    stepsNavLabel: 'Checkout progress',

    selectTitle: 'Choose a plan',
    recommended: 'Recommended',
    trial: 'Trial',
    devices: 'devices',
    devicesText: 'Supports',

    confirmTitle: 'Confirm your order',
    emailLabel: 'Email for your activation code',
    emailPlaceholder: 'Enter your email address',
    couponLabel: 'Voucher code (optional)',
    couponPlaceholder: 'Enter code if you have one',
    couponAvailable: 'Voucher available',
    submitOrder: 'Place order',
    submitting: 'Creating order…',

    alipayTitle: 'Scan to pay securely',
    alipayBrand: 'Alipay',
    securityPay: 'Secure payment',
    amountDue: 'Amount due',
    amountNote: 'Please verify the amount before paying with Alipay',
    scanTip: 'Open the Alipay app and scan this QR code',
    qrUnavailable: 'Alipay QR payment is temporarily unavailable. Please use another payment method.',
    alipayOfficial: 'Alipay · Official secure checkout',
    rsa2Security: 'RSA2 financial-grade security',
    countdownHint: '(payment status syncs in real time)',
    countdownExpired: 'This payment timed out. Please go back and place a new order.',
    trustDirect: 'Direct Alipay channel',
    trustAuto: 'Activation code delivered instantly',
    merchantOrderNo: 'Order number',
    cannotScan: 'Cannot scan? Open the Alipay checkout in your desktop browser',
    qrValidity: 'QR code valid for',
    qrExpired: 'This order has expired. Please place a new order.',
    orderNo: 'Order number',
    accountPay: 'Cannot scan? Pay with your Alipay account',

    formTitle: 'Confirm and pay',
    formTagline: 'Genuine commercial licence · Secure Alipay checkout · Instant delivery',
    selectedPlan: 'Selected plan:',
    emailHint: 'Used to receive your licence code and after-sales records',
    emailHelper: 'Your activation code will be shown on this page and emailed to you as a backup.',
    couponToggle: 'Have a voucher, or bought DownPictures before?',
    floorApplied: 'Loyalty floor',
    permanentUpgradeTitle: 'Upgrade credit from a lifetime licence',
    permanentUpgradeDesc:
      "We recognised your previous DownPictures lifetime licence. Its paid amount can offset this order — switch to the lifetime plan to upgrade.",
    upgradeRevokeNotice:
      'After a successful upgrade payment, your previous DownPictures code is deactivated immediately and a new TGTU code is issued.',
    benefitHelper:
      'You can use a previous DownPictures order number or a PCGP-format code as credit. Vouchers and order credit cannot be combined.',
    termsLink: 'Terms of Service & Purchase Terms',
    privacyLink: 'Privacy Policy',
    payableAmount: 'Amount due',
    zeroFee: 'Direct channel · 0 fee',
    submitPay: 'Pay securely with Alipay',
    submitPayEn: 'Continue to payment',
    stripeStepHint: '',
    originalPricePrefix: 'Was ',
    discountAppliedPrefix: 'Applied −',
    discountLabelUpgrade: 'Lifetime upgrade credit',
    discountLabelCoupon: 'Voucher discount',
    emailPlaceholderFull: 'Enter your email (e.g. name@example.com)',
    couponPlaceholderLegacy: 'UPG voucher / DownPictures order no. / PCGP code',
    backToPlans: '← Go back and choose another plan',
    closeLabel: 'Close',
    modalLater: 'Maybe later (stay on this page)',
    agreePrefix: 'I have read and agree to the',
    switchToStripe: 'International user? Pay with foreign card / Apple Pay →',
    dualHeaderEyebrow: 'Two ways to pay',
    dualHeaderTitle: 'Choose how to pay',
    dualHintNote: 'Both options settle the same order — pay with either one.',
    stripeCardTitle: 'Stripe · International card & wallet',
    stripeSslBadge: 'SSL secured',
    stripePayCta: 'Pay with Stripe',
    alipayCardTitle: 'Alipay · QR code payment',
    alipayCnyNote: 'Settled in RMB (CNY) via Alipay',
    stripeTitle: 'Secure international payment',
    stripeAmountDue: 'Amount due (HKD)',
    stripeNote: 'The billing amount is locked in HKD; your bank or wallet handles the conversion',
    stripeMethods: 'Supports Visa / Mastercard / Amex / Apple Pay / Google Pay / Link',
    goStripe: 'Continue to Stripe Checkout',
    backToAlipay: '← Back to Alipay QR payment',
    stripeRedirecting: 'Redirecting to Stripe…',

    resultTitle: 'Payment successful — your licence is active',
    resultCodeBadge: 'Your personal activation code (TGTU format)',
    resultHowTo: 'How to activate the client',
    resultHowToBody:
      'Open the TuGet desktop client → click Activate in the top-right corner → paste the code above to unlock every capture and download feature.',
    resultCopy: 'Copy activation code',
    resultCopied: 'Activation code copied',
    resultInstallGuide: 'View the installation guide',
    pkgBadgeBest: 'Best value',
    pkgBadgeOfficial: 'Official pick',
    pkgBuyNow: 'Buy now',
    pkgPermanentTitle: 'Lifetime licence:',
    pkgPermanentDesc: 'One payment, ongoing version upgrades and multi-device concurrency.',
    pkgFeaturesTitle: 'Core features & commercial rights',
    switchPlan: 'Change plan →',
    couponChecking: 'Checking…',
    couponApply: 'Apply credit',
    switchToPermanentApply: 'Switch to the lifetime plan to apply credit →',
    agreeBody: 'I have read and fully agree to the',
    agreeAnd: 'and',
    floorAppliedShort: 'Loyalty floor',
    trustDirectSign: 'Direct contract',
    trustRsa2: 'RSA2 encryption',
    trustAutoCard: 'Instant delivery',
    trustInvoice: 'VAT invoices',
    permanentModalTitle: 'Upgrade credit from a lifetime licence',
    permanentModalSubtitle: 'We recognised your previous DownPictures lifetime licence',
    permanentModalIntro: 'How the lifetime upgrade works',
    permanentItem1Title: 'Paid amount becomes credit',
    permanentItem1Body: 'What you paid for DownPictures is deducted directly from this order.',
    permanentItem2Title: 'TuGet lifetime licence',
    permanentItem2Body: 'Upgrade to the TuGet lifetime plan and keep your desktop client licensed.',
    permanentItem3Title: 'Multi-device concurrency',
    permanentItem3Body: 'Run the agreed number of computers online and rebind devices flexibly.',
    permanentItem4Title: 'Ongoing maintenance',
    permanentItem4Body: 'Media extraction and the desktop client keep improving with each release.',
    permanentModalNote:
      'A previous lifetime licence must be upgraded to the TuGet lifetime plan for the credit to apply. After a successful upgrade we issue a new TGTU code and your old DownPictures code is deactivated.',
    permanentModalCta: 'Switch to the lifetime plan and apply credit',
    cancelPay: '← Cancel payment and choose another plan',
    footerCopyright: 'Desktop client · Operated by',
    footerSupport: 'Support email:',
    footerTerms: 'Terms of Service & Purchase Terms',
    footerPrivacy: 'Privacy Policy',
    csLabel: 'WeChat support',
    csSub: 'Invoicing & enquiries',
    csModalTitle: 'Official support & after-sales',
    csScan: 'Scan to reach official support on WeChat',
    csLead: 'For purchases, missing activation codes or VAT invoices, our support team can help.',
    csDockTitle: 'Contact official support / VAT invoices',
    csQrHint: 'Open WeChat on your phone, scan the code, add us and leave a message (Mon-Fri, 9:00-18:00).',
    csSupportEmail: 'Support email: ',
    csInvoiceTitle: 'VAT invoices: ',
    csInvoiceBody: 'After payment, email us your Alipay order number and the invoice title, and we will issue it.',
    resultSubtitle: 'The activation code has also been emailed to you',
    resultBuyAnother: 'Buy another plan',
    successTitle: 'Payment successful',
    successSubtitle: "We've emailed your activation code",
    activationCode: 'Activation code',
    copyCode: 'Copy',
    copied: 'Copied',
    downloadClient: 'Download the app',
    backHome: 'Back to home',

    supportEmail: 'Support email',
    contactSupport: 'Contact support',
    cancel: 'Cancel payment',
    orderFailed: 'Payment failed. Please place a new order.',

    // In-checkout validation and error copy (written straight into error / benefitMessage)
    requestFailed: 'Request failed. Please try again later.',
    benefitIncomplete: 'Enter the complete voucher code and try again',
    benefitFormatInvalid: 'That voucher code format is not valid',
    couponUnavailable: 'This voucher cannot be used',
    couponAppliedPrefix: 'Voucher applied — you saved ',
    selectPackage: 'Please choose a plan',
    emailRequired: 'Please enter a valid email to receive your activation code',
    agreementRequired: 'Please read and accept the Terms of Service and Privacy Policy',
    qrRenderFailed: 'The order was created but the QR code could not be displayed: ',
    pollTimeout: 'This order has exceeded its payment window. Please place a new order.',
    stripeLinkMissing: 'Could not obtain the HKD checkout link',

    // Trade-in discount confirmation (PCGetPic activation code / order number).
    // The backend quote.message is hard-coded Chinese + RMB, so the English UI
    // rebuilds it from these four templates. Branches mirror messageForCalculation
    // on the server. Placeholders: {name} source plan, {days} days left,
    // {computed} computed value, {amount} discount actually applied.
    upgradeMsgExpired:
      'Your PCGetPic licence has expired. As a returning customer you still get a guaranteed {amount} trade-in discount.',
    upgradeMsgFloor:
      'PCGetPic licence “{name}” recognised — remaining value {computed}; as a returning customer you get a guaranteed {amount} trade-in discount.',
    upgradeMsgPermanent:
      'PCGetPic licence “{name}” recognised — {amount} trade-in discount applied.',
    upgradeMsgRemaining:
      'PCGetPic licence “{name}” recognised ({days} days left) — {amount} trade-in discount applied.',

    // Trade-in / voucher error codes → UI copy.
    // The backend message is hard-coded Chinese, so the English UI maps by
    // error_code instead of showing it verbatim.
    errUpgradeSourceNotFound: 'That PCGetPic activation code or order number was not found',
    errUpgradeAlreadyUsed: 'This PCGetPic licence has already been used or is reserved by a pending order',
    errUpgradePermanentTargetRequired:
      'A PCGetPic perpetual licence can only be traded in for the TuGet perpetual plan — please switch plans first',
    errUpgradeSourceInvalid: 'Please enter a valid PCGetPic order number or activation code',
    errUpgradeSourceClaimable: 'That PCGetPic licence is reserved by another pending order',
    errUpgradeSourceDisabled: 'This PCGetPic activation code has been disabled and cannot be used for trade-in',
    errUpgradeSourceNotPaid: 'No paid PCGetPic order was found for this credential, so it is not eligible for trade-in',
    errUpgradeSourceCodeMissing: 'No redeemable PCGetPic activation code is linked to this order — please contact support',
    errUpgradeProductMismatch: 'This credential does not belong to PCGetPic',
    errDiscountConflict: 'Vouchers and PCGetPic trade-in discounts cannot be combined',
    errCouponNotFound: 'That voucher does not exist',
    errCouponAlreadyUsed: 'That voucher has already been used',
    errCouponExpired: 'That voucher has expired',
    errCouponNotAllowed: 'This plan cannot be purchased with a voucher',
    errCouponProductMismatch: 'That voucher does not apply to this product',
    close: 'Close',
  },
} as const

export type CheckoutTranslationKey = keyof typeof dict['zh-CN']

/**
 * 收银台专用的共享单例。/buy/ 全流程组件都从这里取词条。
 */
const state = {
  locale,
  localeReady,
}

/**
 * 取词条。
 *
 * 显式按 Locale 索引而不是用 t[key]，让"某个 key 在英文表里漏了"这件事
 * 在类型检查期就暴露成 TS7056，而不是运行时悄悄显示 undefined。
 */
function translate(lang: Locale, key: CheckoutTranslationKey): string {
  const table: Record<Locale, Record<CheckoutTranslationKey, string>> = dict
  return table[lang]?.[key] ?? key
}

export function useCheckoutI18n() {
  onMounted(() => {
    if (state.localeReady.value) return

    let resolved: Locale = 'zh-CN'
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (fromUrl === 'en' || fromUrl === 'zh-CN') {
      resolved = fromUrl
    } else {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored === 'en' || stored === 'zh-CN') {
          resolved = stored
        } else {
          resolved = navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
        }
      } catch {
        resolved = 'zh-CN'
      }
    }

    state.locale.value = resolved
    document.documentElement.lang = resolved
    state.localeReady.value = true
  })

  function setLocale(next: Locale): void {
    state.locale.value = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 存储失败不影响本次会话切换。
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
    }
  }

  function toggleLocale(): void {
    setLocale(state.locale.value === 'zh-CN' ? 'en' : 'zh-CN')
  }

  function t(key: CheckoutTranslationKey): string {
    return translate(state.locale.value, key)
  }

  return {
    locale: state.locale,
    localeReady: state.localeReady,
    isEnglish: computed(() => state.locale.value === 'en'),
    t,
    setLocale,
    toggleLocale,
  }
}

/** Stripe 跳回上下文暂存键。 */
export const STRIPE_RETURN_KEY = 'tuget_stripe_return'

export interface StripeReturnContext {
  orderNo: string
  email: string
  order?: import('~/types/payment').CreateOrderData
  savedAt: number
}

/**
 * 跳 Stripe 前暂存上下文。
 *
 * order-status 接口不返回邮箱与金额（PII 保护），跳回或点返回后靠 sessionStorage 恢复完整 Step 3 状态。
 */
export function storeStripeContext(
  orderNo: string,
  email: string,
  order?: import('~/types/payment').CreateOrderData,
): void {
  try {
    window.sessionStorage.setItem(
      STRIPE_RETURN_KEY,
      JSON.stringify({ orderNo, email, order, savedAt: Date.now() } satisfies StripeReturnContext)
    )
  } catch {
    // 忽略：不影响支付主流程。
  }
}

export function readStripeContext(): StripeReturnContext | null {
  try {
    const raw = window.sessionStorage.getItem(STRIPE_RETURN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StripeReturnContext
    if (!parsed?.orderNo) return null
    // 2 小时前的上下文视为过期，避免用陈旧数据恢复页面。
    if (Date.now() - (parsed.savedAt ?? 0) > 2 * 60 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export function clearStripeContext(): void {
  try {
    window.sessionStorage.removeItem(STRIPE_RETURN_KEY)
  } catch {
    // 忽略
  }
}