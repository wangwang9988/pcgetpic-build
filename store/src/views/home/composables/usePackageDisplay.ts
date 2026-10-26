import { computed } from 'vue'
import type { PackageInfo, CouponStatusData, CouponItemData } from '@/api'
import { COUPON_MIN_PRICE } from '@/api'

// ========== 类型定义 ==========

/** 权益明细项 */
export interface FeatureItem {
  name: string
  included: boolean
  highlight?: boolean
}

// ========== 纯工具函数（无响应式依赖，可独立使用） ==========

/** 格式化价格（最多两位小数，去除多余尾零） */
export function formatPrice(price: number): string {
  return parseFloat(price.toFixed(2)).toString()
}

/** 格式化时长描述 */
/**
 * 格式化套餐时长。
 *
 * locale 缺省中文，保持既有调用方行为不变；英文界面显式传 'en'。
 */
export function formatDuration(pkg: PackageInfo, locale: 'zh-CN' | 'en' = 'zh-CN'): string {
  const en = locale === 'en'
  if (pkg.duration_days === 0 || pkg.duration_type === 4 || pkg.duration_days >= 999999) {
    return en ? 'Lifetime' : '永久'
  }
  if (pkg.duration_days < 30) return en ? `${pkg.duration_days} days` : `${pkg.duration_days}天`
  if (pkg.duration_days < 365) {
    const months = Math.round(pkg.duration_days / 30)
    return en ? `${months} month${months > 1 ? 's' : ''}` : `${months}个月`
  }
  const years = Math.round(pkg.duration_days / 365)
  return en ? `${years} year${years > 1 ? 's' : ''}` : `${years}年`
}

/** 格式化抵扣券倒计时。locale 缺省中文，英文界面显式传 'en'。 */
export function formatCouponCountdown(ms: number, locale: 'zh-CN' | 'en' = 'zh-CN'): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return locale === 'en' ? `${hours}h ${mm}m ${ss}s` : `${hours}小时${mm}分${ss}秒`
}

/** 判断抵扣券是否允许用于该套餐（基于价格阈值，对用户不可见） */
export function isCouponAllowedForPkg(pkg: PackageInfo): boolean {
  return pkg.price >= COUPON_MIN_PRICE
}

/**
 * 港币定价辅助函数。
 *
 * ⚠️ 公式必须与后端 `computeOrderHkdMinor`（server/src/services/stripe.ts）**严格一致**：
 * 折扣按「实付人民币 / 标价人民币」的比例折算港币，再向上取整到整港币元。
 * 两边只要有一处不一致，Step 2 展示的 HK$ 就会和 Stripe 实扣金额对不上，
 * 用户会觉得价格被骗了。
 *
 * MIN_HKD_MINOR = 1500（HK$ 15）与后端同值：折算后低于 15 港币不走 Stripe，
 * 防止扣完 3.9% + HK$2.35 手续费后倒亏。
 */
const MIN_HKD_MINOR = 1500

/** 套餐港币标价（元）；未配置或为 0 时返回 null（前端据此隐藏 Stripe 入口） */
export function getDisplayPriceHkd(pkg: PackageInfo): number | null {
  const hkd = pkg.price_hkd
  return typeof hkd === 'number' && hkd > 0 ? hkd : null
}

/**
 * 港币划线原价。
 *
 * 人民币原价按同比例折算，并向上取整到整港币元，保证卡片视觉层次一致、
 * 绝不出现 HK$ 345.37 这类零头。
 */
export function getOriginalPriceHkd(pkg: PackageInfo): number | null {
  const hkd = getDisplayPriceHkd(pkg)
  if (hkd == null || !pkg.original_price || !(pkg.original_price > 0) || !(pkg.price > 0)) return null
  return Math.ceil(pkg.original_price * (hkd / pkg.price))
}

/**
 * 把一笔人民币折扣折算成等值港币（元），向上取整到整港币元。
 *
 * 用于英文界面展示「Save HK$ xx」；未配置港币价时退化为 0。
 */
export function getAppliedDiscountHkd(pkg: PackageInfo, cnyDiscount: number): number {
  const hkd = getDisplayPriceHkd(pkg)
  if (hkd == null || !(pkg.price > 0) || !(cnyDiscount > 0)) return 0
  const discounted = Math.round(hkd * 100 * (Math.max(0, cnyDiscount) / pkg.price))
  return Math.ceil(discounted / 100)
}

/**
 * 英文界面某套餐的应付港币（元）。
 *
 * 与后端口径一致：比例折算 + 向上取整到整港币元；低于 HK$15 返回 null，
 * 由前端退回支付宝人民币通道。
 */
export function getPayableHkd(pkg: PackageInfo, cnyPayable: number): number | null {
  const hkd = getDisplayPriceHkd(pkg)
  if (hkd == null || !(pkg.price > 0)) return null
  if (cnyPayable >= pkg.price) return hkd
  const discounted = Math.round(hkd * 100 * (Math.max(0, cnyPayable) / pkg.price))
  const rounded = Math.ceil(discounted / 100) * 100
  return rounded >= MIN_HKD_MINOR ? rounded / 100 : null
}

/** 判断套餐是否为永久卡 */
export function isPermanentPackage(pkg: PackageInfo): boolean {
  return pkg.duration_days === 0 || pkg.duration_type === 4 || pkg.duration_days >= 999999
}

/**
 * 收银台卡片角标。
 *
 * 管理后台配置了当前语言的自定义角标时直接返回；未配置返回 null，
 * 由组件走原有的默认角标逻辑（recommended / duration_type === 3），
 * 保证后台不填时页面与改动前完全一致。
 */
export function getPackageBadge(pkg: PackageInfo, locale: 'zh-CN' | 'en' = 'zh-CN'): string | null {
  const custom = locale === 'en' ? pkg.badge_en : pkg.badge
  return typeof custom === 'string' && custom.trim() ? custom.trim() : null
}

/**
 * 从后台下发的自定义卖点生成权益清单。
 *
 * 行首 ★ 或 * 视为「高亮标记」，渲染时去掉前缀；永久卡沿用默认逻辑的视觉层级
 * （前两项与带「终身/VIP/Lifetime」字样的项高亮）。返回 null 表示未配置，
 * 调用方应回退到默认生成逻辑。
 */
function buildCustomFeatures(pkg: PackageInfo, locale: 'zh-CN' | 'en'): FeatureItem[] | null {
  const isPermanent = isPermanentPackage(pkg)
  const custom = locale === 'en' ? pkg.features_en : pkg.features
  if (!Array.isArray(custom) || custom.length === 0) return null

  const lines = custom
    .filter((line): line is string => typeof line === 'string')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) return null

  return lines.map((line, idx) => {
    const starred = /^[★*]\s*/.test(line)
    const highlight = starred || (isPermanent && (idx < 2 || /终身|VIP|Lifetime/i.test(line)))
    return {
      name: line.replace(/^[★*]\s*/, ''),
      included: true,
      highlight,
    }
  })
}

/** 生成每个套餐的专属权益清单 */
/**
 * 套餐权益清单。
 *
 * locale 缺省中文，保持既有调用方行为不变；英文界面显式传 'en'。
 * 英文界面直接用后端派成的 name_en，前端不再各自维护一份套餐名映射。
 *
 * 后台配置了当前语言的自定义卖点时优先渲染；未配置时**完全**执行下面的
 * 默认生成逻辑（与启用本功能前的页面逐像素一致）。
 */
export function getPackageFeatures(pkg: PackageInfo, locale: 'zh-CN' | 'en' = 'zh-CN'): FeatureItem[] {
  const isPermanent = isPermanentPackage(pkg)
  const en = locale === 'en'

  const custom = buildCustomFeatures(pkg, en ? 'en' : 'zh-CN')
  if (custom) return custom

  let durationDesc = ''
  if (isPermanent) {
    durationDesc = en ? 'Validity: lifetime' : '使用有效期：终身永久'
  } else if (pkg.duration_days < 30) {
    durationDesc = en ? `Validity: ${pkg.duration_days} days` : `使用有效期：${pkg.duration_days}天`
  } else if (pkg.duration_days < 365) {
    const months = Math.round(pkg.duration_days / 30)
    durationDesc = en ? `Validity: ${months} months` : `使用有效期：${months}个月`
  } else {
    const years = Math.round(pkg.duration_days / 365)
    durationDesc = en ? `Validity: ${years} year${years > 1 ? 's' : ''}` : `使用有效期：${years}年`
  }

  return [
    {
      name: en
        ? `Activate on ${pkg.max_devices} computers`
        : `授权 ${pkg.max_devices} 台电脑在线`,
      included: true,
      highlight: isPermanent,
    },
    {
      name: durationDesc,
      included: true,
      highlight: isPermanent,
    },
    {
      name: en ? 'Crawls 40+ e-commerce platforms' : '支持 40+ 电商平台抓取',
      included: true,
    },
    {
      name: isPermanent
        ? (en ? 'Free lifetime upgrades, no second charge' : '终身免费升级，拒绝二次收费')
        : (en ? 'Regular updates and maintenance' : '常规版本升级与维护'),
      included: true,
      highlight: isPermanent,
    },
    {
      name: isPermanent
        ? (en ? '24/7 dedicated VIP support' : '24小时专属 VIP 客服通道')
        : (en ? 'Standard customer support' : '标准客户支持'),
      included: true,
      highlight: isPermanent,
    },
  ]
}

/** 英文界面展示后端派生的英文套餐名，缺省回落到中文名 */
export function displayPackageName(pkg: PackageInfo, locale: 'zh-CN' | 'en'): string {
  return locale === 'en' ? (pkg.name_en || pkg.name) : pkg.name
}

// ========== 组合式函数（依赖响应式 props） ==========

/**
 * 套餐展示逻辑 composable
 *
 * 将 PackageSelection 组件中与 props 耦合的计算属性和辅助函数统一提取，
 * 让组件只关注布局和事件绑定。
 */
export function usePackageDisplay(
  props: {
    packages: PackageInfo[]
    couponInfo: CouponStatusData
    selectedCouponCode: string | null
  },
) {
  /** 当前选中的抵扣券 */
  const selectedCoupon = computed<CouponItemData | null>(() => {
    if (!props.selectedCouponCode || !props.couponInfo.coupons?.length) return null
    return props.couponInfo.coupons.find((c) => c.coupon_code === props.selectedCouponCode) ?? null
  })

  /** 选中券的面额 */
  const selectedCouponAmount = computed(() => {
    return selectedCoupon.value?.amount ?? props.couponInfo.amount ?? 0
  })

  /** 获取展示价格（含抵扣券自动减免） */
  function getDisplayPrice(pkg: PackageInfo): number {
    if (props.couponInfo.has_active_coupon && isCouponAllowedForPkg(pkg)) {
      return Math.max(0, pkg.price - selectedCouponAmount.value)
    }
    return pkg.price
  }

  /**
   * 获取基于选中套餐的智能消费提示。
   *
   * locale 缺省中文；英文界面显式传 'en'。券的提示金额在英文界面按港币折算展示，
   * 避免出现「¥」符号破坏英文界面的币种一致性。
   */
  function getDynamicTips(pkg: PackageInfo, locale: 'zh-CN' | 'en' = 'zh-CN'): string {
    const en = locale === 'en'
    const couponAllowed = isCouponAllowedForPkg(pkg)
    const isPermanent = isPermanentPackage(pkg)
    const couponNote =
      couponAllowed && props.couponInfo.has_active_coupon
        ? en
          ? `, plus your ${getAppliedDiscountHkd(pkg, selectedCouponAmount.value)} HKD voucher!`
          : `，可叠加使用 ${selectedCouponAmount.value} 元抵扣券！`
        : ''

    if (pkg.duration_type === 1) {
      return en
        ? '3-day premium trial: every core feature, 72 hours of unlimited downloads, no auto-renewal.'
        : '3天高级体验：支持客户端所有核心功能，72小时无限制下载，到期后绝无自动扣费！'
    }
    if (pkg.duration_type === 2) {
      return en
        ? `Multi-device licence: several computers online at once, smoother multi-threaded downloads${couponNote}`
        : `月度方案支持多设备授权！多台设备同时在线，多线程下载提速更顺畅${couponNote}`
    }
    if (pkg.duration_type === 3) {
      // 检测套餐列表中是否存在永久套餐，并且价格与当前年卡相同
      const hasSamePricePermanent = props.packages.some((p) => {
        return isPermanentPackage(p) && p.price === pkg.price
      })
      if (hasSamePricePermanent) {
        return en
          ? `💡 Strongly recommended: the yearly and lifetime plans cost the same right now — take the lifetime one for HK$0 more, with 10 devices${couponNote}`
          : `💡 强烈推荐：年卡与永久卡目前同价！建议加 0 元直接选择【永久尊享卡】，期限变永久且设备授权增至 10 台${couponNote}`
      }
      return en
        ? `🔥 Multi-device licence — the professional choice${couponNote}`
        : `🔥 多设备授权使用，专业商用首选${couponNote}`
    }
    if (isPermanent) {
      return en
        ? `🏆 Lifetime buyout (same price as one year): permanent free upgrades and 10 devices — best for long-term operation and teams${couponNote}`
        : `🏆 终身无忧买断（年卡同价）：仅需一年费用，尊享永久免费升级与 10 台设备授权，最适合长期运营与团队协作者${couponNote}`
    }
    return en
      ? `You picked the "${displayPackageName(pkg, 'en')}" plan — multi-device licence, activation code delivered instantly${couponNote}`
      : `已选择 "${pkg.name}" 套餐，多设备授权使用，购买后即时自动发放激活码${couponNote}`
  }

  return {
    selectedCoupon,
    selectedCouponAmount,
    getDisplayPrice,
    getDynamicTips,
  }
}
