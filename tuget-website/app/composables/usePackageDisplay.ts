import type { PackageInfo } from '~/types/payment'
import type { Locale } from '~/composables/useCheckoutI18n'

export interface PackageFeatureItem {
  name: string
  included: boolean
  highlight?: boolean
}

/** 格式化价格 */
export function formatPrice(price: number): string {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

/** 判断是否为永久买断卡 */
export function isPermanentPackage(pkg: PackageInfo): boolean {
  return pkg.duration_days === 0 || pkg.duration_type === 4 || pkg.duration_days >= 999999
}

/**
 * 收银台卡片角标。
 *
 * 管理后台配置了当前语言的自定义角标时直接返回；未配置返回 null，
 * 由组件走原有的默认角标逻辑（recommended || isPermanentPackage），
 * 保证后台不填时页面与改动前完全一致。
 */
export function getPackageBadge(pkg: PackageInfo, locale: Locale = 'zh-CN'): string | null {
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
function buildCustomFeatures(pkg: PackageInfo, locale: Locale): PackageFeatureItem[] | null {
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

/**
 * 英文界面的套餐名。
 *
 * 统一走后端派成的 name_en，前端不再各自维护一份套餐名映射；
 * 后端没给英文名时回落到中文名，避免界面出现空白。
 */
export function displayPackageName(pkg: PackageInfo, locale: Locale = 'zh-CN'): string {
  return locale === 'en' ? (pkg.name_en || pkg.name) : pkg.name
}

// ========== 港币定价辅助 ==========

/**
 * 港币定价阈值，单位「港币分」。与后端 stripe.ts 同值，改动必须两边同步。
 *
 * - MIN_CONFIG_PRICE_HKD_MINOR：后台配置的套餐港币标价下限，低于 HK$4 不收款
 *   （Stripe 香港账户的最低收款门槛就是 HK$4）；
 * - MIN_HKD_MINOR：折扣折算后实际发起 Stripe 的下限 HK$15，低于它倒亏
 *   （手续费 3.9% + HK$2.35），宁可不给 Stripe 入口。
 */
const MIN_CONFIG_PRICE_HKD_MINOR = 400
const MIN_HKD_MINOR = 1500

/**
 * 套餐港币标价（元）；未配置或低于收款门槛时返回 null（前端据此隐藏 Stripe 入口）。
 */
export function getDisplayPriceHkd(pkg: PackageInfo): number | null {
  const hkd = pkg.price_hkd
  if (typeof hkd !== 'number' || !(hkd > 0)) return null
  return Math.round(hkd * 100) < MIN_CONFIG_PRICE_HKD_MINOR ? null : hkd
}

/**
 * 港币划线原价。
 *
 * 人民币原价按「港币标价 / 人民币标价」同比例折算，并向上取整到整港币元，
 * 保证卡片视觉层次一致，绝不出现 HK$ 345.37 这类零头。
 */
export function getOriginalPriceHkd(pkg: PackageInfo): number | null {
  const hkd = getDisplayPriceHkd(pkg)
  if (hkd == null || !pkg.original_price || !(pkg.original_price > 0) || !(pkg.price > 0)) return null
  return Math.ceil(pkg.original_price * (hkd / pkg.price))
}

/**
 * 把一笔人民币折扣折算成等值港币（元），向上取整到整港币元。
 *
 * 与后端 computeOrderHkdMinor 的折扣分支同口径，仅用于前端展示「Save HK$ xx」；
 * 未配置港币价时退化为 0。
 */
export function getAppliedDiscountHkd(pkg: PackageInfo, cnyDiscount: number): number {
  const hkd = getDisplayPriceHkd(pkg)
  if (hkd == null || !(pkg.price > 0) || !(cnyDiscount > 0)) return 0
  const discounted = Math.round(hkd * 100 * (Math.max(0, cnyDiscount) / pkg.price))
  return Math.ceil(discounted / 100)
}

/**
 * 英文界面某订单的应付港币（元）。
 *
 * 与后端 computeOrderHkdMinor **逐步对齐**：无折扣直接取港币标价；折扣单按
 * 「实付人民币 / 标价人民币」比例折算后向上取整到整港币元；低于 HK$15 返回 null，
 * 由前端退回支付宝人民币通道。
 *
 * 两边只要有一处不一致，用户在 Step 2 看到的 HK$ 就会和 Stripe 实扣金额对不上。
 */
export function getPayableHkd(pkg: PackageInfo, cnyPayable: number): number | null {
  const hkd = getDisplayPriceHkd(pkg)
  if (hkd == null || !(pkg.price > 0)) return null
  if (cnyPayable >= pkg.price) return hkd
  const ratio = Math.max(0, cnyPayable) / pkg.price
  const discounted = Math.round(hkd * 100 * ratio)
  // 只对非整港币元的部分向上进位，避免把 HK$ 49 变成 HK$ 49.01。
  const roundedToWhole = Math.ceil(discounted / 100) * 100
  return roundedToWhole >= MIN_HKD_MINOR ? roundedToWhole / 100 : null
}

/**
 * 格式化时长描述。
 *
 * locale 缺省为中文，保持既有调用方行为不变；英文界面显式传 'en'。
 */
export function formatDurationLabel(pkg: PackageInfo, locale: Locale = 'zh-CN'): string {
  const en = locale === 'en'
  if (isPermanentPackage(pkg)) return en ? 'Lifetime licence' : '终身永久授权'
  if (pkg.duration_type === 1 || pkg.duration_days < 30) {
    return en ? `${pkg.duration_days}-day trial` : `${pkg.duration_days} 天体验授权`
  }
  if (pkg.duration_days >= 365) {
    const years = Math.round(pkg.duration_days / 365)
    return en ? `${years}-year licence` : `${years} 年正式授权`
  }
  if (pkg.duration_days >= 30) {
    const months = Math.round(pkg.duration_days / 30)
    return en ? `${months}-month licence` : `${months} 个月正式授权`
  }
  return en ? `${pkg.duration_days}-day licence` : `${pkg.duration_days} 天正式授权`
}

/**
 * 获取套餐卡片专属精炼权益清单（简洁明了，杜绝冗长文本，不展示内部 A/B/C 代号）
 *
 * locale 缺省为中文；英文界面传 'en' 走右侧英文文案。
 *
 * 后台配置了当前语言的自定义卖点时优先渲染；未配置时**完全**执行下面的
 * 默认生成逻辑（与启用本功能前的页面一致）。
 */
export function getPackageFeatures(pkg: PackageInfo, locale: Locale = 'zh-CN'): PackageFeatureItem[] {
  const isPermanent = isPermanentPackage(pkg)
  const en = locale === 'en'

  const custom = buildCustomFeatures(pkg, en ? 'en' : 'zh-CN')
  if (custom) return custom

  let durationText = ''
  if (isPermanent) {
    durationText = en ? 'Lifetime licence — pay once, use forever' : '终身永久买断，一次付费终身使用'
  } else if (pkg.duration_days < 30) {
    durationText = en ? `Full features for ${pkg.duration_days} days` : `全功能 ${pkg.duration_days} 天完整体验`
  } else if (pkg.duration_days < 365) {
    const months = Math.round(pkg.duration_days / 30)
    durationText = en ? `${months}-month commercial licence` : `${months} 个月正式商用授权`
  } else {
    const years = Math.round(pkg.duration_days / 365)
    durationText = en ? `${years}-year commercial licence` : `${years} 年正式商用授权`
  }

  return [
    {
      name: en
        ? `Activate on ${pkg.max_devices} computers at once (transferable anytime)`
        : `授权 ${pkg.max_devices} 台电脑同时在线 (支持随时换机)`,
      included: true,
      highlight: isPermanent || pkg.max_devices > 1,
    },
    {
      name: durationText,
      included: true,
      highlight: isPermanent,
    },
    {
      name: en
        ? 'Lossless parsing of main images, SKUs and detail pages across 40+ platforms'
        : '40+ 主流电商平台主图/SKU/详情原图无损解析',
      included: true,
    },
    {
      name: en
        ? 'Deep sniffing of media and design assets on any webpage'
        : '全网任意网页媒体与设计素材深度嗅探',
      included: true,
    },
    {
      name: isPermanent
        ? (en ? 'Lifetime software use and ongoing upgrades' : '终身软件使用与版本持续升级')
        : (en ? 'Software use and maintenance during the licence period' : '授权期内软件使用与版本持续维护'),
      included: true,
      highlight: isPermanent,
    },
    {
      name: isPermanent
        ? (en ? 'Dedicated support and device-transfer assistance' : '专属客户技术支持与换机协助')
        : (en ? 'Standard customer support' : '官方标准客户技术支持'),
      included: true,
      highlight: isPermanent,
    },
  ]
}

/** 收银台底部「核心功能与商用权益」网格文案。 */
export function getCoreFeatures(locale: Locale = 'zh-CN'): string[] {
  if (locale === 'en') {
    return [
      'Bulk download of high-resolution product images',
      'Support for 40+ mainstream e-commerce platforms',
      'Media and asset sniffing on any webpage',
      'Lossless parsing of main images, SKUs and detail pages',
      'Parallel crawling with multiple tasks and threads',
      'Smart restoration of original, full-resolution images',
      'Local offline asset storage (privacy-friendly)',
      'Multi-device licence (transferable at any time)',
    ]
  }
  return [
    '批量下载商品高清原图',
    '40+ 主流电商平台支持',
    '全网音视频多媒体嗅探提取',
    '主图 / SKU / 详情无损解析',
    '多任务多线程并行采集',
    '智能原图还原与高清解析',
    '素材本地离线存储（保护隐私）',
    '多设备授权使用（支持换机）',
  ]
}

/** 智能提示的标签 + 正文。 */
export interface DynamicTip {
  tag: string
  text: string
}

/**
 * 选中套餐的智能比价与推荐提示。
 *
 * 直接返回 `{ tag, text }` 结构而不是拼好的字符串：调用方需要用不同颜色的
 * 小标签渲染前缀，如果靠 `indexOf('：')` 去切中文字符串，英文分支一旦换分隔符
 * 就会静默退化成「整段都是正文」。
 */
export function getDynamicTip(pkg: PackageInfo, allPackages: PackageInfo[], locale: Locale = 'zh-CN'): DynamicTip {
  const en = locale === 'en'
  const name = displayPackageName(pkg, locale)

  // 1. 终身买断套餐优先判定
  if (isPermanentPackage(pkg)) {
    return en
      ? {
          tag: 'Lifetime licence',
          text: `One payment, use it forever — ongoing version maintenance and dedicated support, with up to ${pkg.max_devices} devices online at once.`,
        }
      : {
          tag: '终身买断授权',
          text: `一次付费终身使用，享持续版本维护与专属售后，支持多达 ${pkg.max_devices} 台设备同时在线。`,
        }
  }

  // 2. 短期体验卡 (≤ 7 天)
  if (pkg.duration_days > 0 && (pkg.duration_type === 1 || pkg.duration_days <= 7)) {
    return en
      ? {
          tag: 'Short-term trial',
          text: 'Every core TuGet feature and lossless image parsing across the web — no auto-renewal, it simply ends when it is used up.',
        }
      : {
          tag: '短期体验授权',
          text: '支持 TuGet 客户端全部核心功能与全网原图解析，无自动扣费，用完即止。',
        }
  }

  // 3. 6个月 / 半年进阶卡 (150 ~ 210 天，或名称含 "6个月" / "半年")
  const isHalfYear = (pkg.duration_days >= 150 && pkg.duration_days <= 210)
    || pkg.name.includes('6个月')
    || pkg.name.includes('半年')
  if (isHalfYear) {
    return en
      ? {
          tag: '6-month plan',
          text: `Covers big-sale preparation and deep quarterly operations — ${pkg.max_devices} devices online at once, balancing flexibility and value.`,
        }
      : {
          tag: '6个月进阶套餐',
          text: `覆盖大促筹备与季度深度运营，支持 ${pkg.max_devices} 台设备同时在线，兼顾灵活性与性价比。`,
        }
  }

  // 4. 月度专业卡 (25 ~ 45 天，或名称含 "月度" 且 < 60 天)
  const isMonthly = (pkg.duration_days >= 25 && pkg.duration_days <= 45)
    || pkg.name.includes('月度')
    || pkg.duration_type === 2
  if (isMonthly && pkg.duration_days < 60) {
    return en
      ? {
          tag: 'Monthly plan',
          text: `Ideal for month-to-month buying and short sprint tasks — ${pkg.max_devices} devices online at once, and it never renews automatically.`,
        }
      : {
          tag: '月度专业套餐',
          text: `适合按月采买与短期任务冲刺，支持 ${pkg.max_devices} 台设备同时在线，到期不自动续费。`,
        }
  }

  // 5. 其他阶段性月度套餐 (45 ~ 299 天)
  if (pkg.duration_days > 45 && pkg.duration_days < 300) {
    const months = Math.round(pkg.duration_days / 30)
    return en
      ? {
          tag: `${months}-month plan`,
          text: `Suited to phased business rollouts — ${pkg.max_devices} devices online at once, with stable high-concurrency crawling.`,
        }
      : {
          tag: `${months}个月专业套餐`,
          text: `适合阶段性业务推进，支持 ${pkg.max_devices} 台设备同时在线，高并发多任务稳定抓取。`,
        }
  }

  // 6. 年度专业套餐 (>= 300 天)
  if (pkg.duration_days >= 300) {
    const permanentPkg = allPackages.find((p) => isPermanentPackage(p))
    if (permanentPkg) {
      const diff = permanentPkg.price - pkg.price
      if (diff <= 0) {
        return en
          ? {
              tag: 'Our pick',
              text: `The lifetime plan costs the same as this one — take "${displayPackageName(permanentPkg, locale)}" for permanent use with up to ${permanentPkg.max_devices} devices.`,
            }
          : {
              tag: '选型建议',
              text: `当前终身卡与年卡同价，推荐直接选购“${displayPackageName(permanentPkg, locale)}”，立享终身使用与多达 ${permanentPkg.max_devices} 台设备支持。`,
            }
      }
      if (diff <= 30) {
        // 英文界面全程只出现 HK$，差价也按港币标价相减，不混出 ¥ 符号。
        if (en) {
          const diffHkd = (getDisplayPriceHkd(permanentPkg) ?? 0) - (getDisplayPriceHkd(pkg) ?? 0)
          return {
            tag: 'Our pick',
            text: `Add only HK$ ${diffHkd} to upgrade to "${displayPackageName(permanentPkg, locale)}" — a lifetime licence with up to ${permanentPkg.max_devices} devices.`,
          }
        }
        const diffFormatted = diff.toFixed(1).replace(/\.0$/, '')
        return {
          tag: '选型建议',
          text: `仅需加 ¥${diffFormatted} 即可升级为“${displayPackageName(permanentPkg, locale)}”，立享终身永久买断与多达 ${permanentPkg.max_devices} 台设备支持。`,
        }
      }
    }
    return en
      ? {
          tag: 'Annual plan',
          text: `Built for e-commerce teams and long-term operations — ${pkg.max_devices} computers online at once, far more efficient for bulk crawling.`,
        }
      : {
          tag: '年度专业套餐',
          text: `适合电商团队与长期运营，支持 ${pkg.max_devices} 台电脑同时在线，高并发批量采集更高效。`,
        }
  }

  return en
    ? {
        tag: 'Selected',
        text: `"${name}" — licensed for ${pkg.max_devices} devices. Your activation code is delivered automatically after payment.`,
      }
    : {
        tag: '已选择',
        text: `“${name}”，支持 ${pkg.max_devices} 台设备授权，付款后系统自动派发激活码。`,
      }
}

/**
 * 拼接成纯文本的智能提示（兼容只需要字符串的调用方）。
 *
 * 中文用全角「：」，英文用「: 」，两者都是各自语言的自然标点。
 */
export function getDynamicTips(pkg: PackageInfo, allPackages: PackageInfo[], locale: Locale = 'zh-CN'): string {
  const tip = getDynamicTip(pkg, allPackages, locale)
  if (!tip.tag) return tip.text
  return locale === 'en' ? `${tip.tag}: ${tip.text}` : `${tip.tag}：${tip.text}`
}
