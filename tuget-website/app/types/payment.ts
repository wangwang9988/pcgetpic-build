export interface PackageInfo {
  id: number
  name: string
  /** 后端统一派生的英文套餐名 */
  name_en: string
  duration_type: number
  duration_days: number
  price: number
  /** 港币售价（元）；未配置时为 null */
  price_hkd?: number | null
  /** 是否可走港币支付；false 时前端隐藏切换入口 */
  stripe_enabled?: boolean
  original_price?: number | null
  max_devices: number
  is_trial?: boolean
  recommended?: boolean
  /** 后台配置的卡片角标（中文）；未配置为 null，走默认角标逻辑 */
  badge?: string | null
  /** 后台配置的卡片角标（英文）；未配置为 null，走默认角标逻辑 */
  badge_en?: string | null
  /** 后台配置的自定义卖点（中文，每行一条）；未配置为 null，走默认权益逻辑 */
  features?: string[] | null
  /** 后台配置的自定义卖点（英文，每行一条）；未配置为 null，走默认权益逻辑 */
  features_en?: string[] | null
}

export interface CreateOrderData {
  order_no: string
  qr_code: string
  pay_url?: string
  amount: number
  original_amount: number | null
  coupon_applied: boolean
  coupon_discount: number
  upgrade_applied: boolean
  upgrade_discount: number
  /** 建单时冻结的港币应付金额（元）；为 null 表示该订单不支持 Stripe */
  amount_hkd?: number | null
  /** 订单过期时间（毫秒时间戳），前端倒计时以它为准 */
  expired_at?: number
}

/**
 * 订单状态。
 *
 * 与服务端 ORDER_STATUS 对齐：expired / closed 是真实存在的终态，
 * 漏掉会让前端在超时后仍停在等待页。
 */
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'closed' | 'refunded'

export interface OrderStatusData {
  status: OrderStatus
  code?: string
  expires_at?: number
  duration_type?: number
}

/** Stripe 结账跳转地址 */
export interface StripeCheckoutData {
  checkout_url: string
  reused: boolean
}

export interface CouponValidationData {
  valid: boolean
  error_code: string | null
  message: string | null
  amount: number
}

export type UpgradeSourceType = 'order' | 'code'

export interface UpgradeSourceInput {
  source_type: UpgradeSourceType
  source_value: string
}

export interface UpgradeSourceSummary {
  package_name: string
  /** 来源套餐英文名；老套餐未回填时为 null，界面应回落到 package_name */
  package_name_en: string | null
  duration_type: number
  duration_days: number
  elapsed_days: number
  remaining_days: number
  paid_amount: number
  activated_at: number | null
  expires_at: number | null
}

export interface UpgradeRebateData {
  valid: true
  rebate: number
  computed_rebate: number
  raw_rebate: number
  floor_applied: boolean
  is_care_applied: boolean
  is_expired: boolean
  source_type: UpgradeSourceType
  source_summary: UpgradeSourceSummary
  message: string
}

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
  error_code?: string
}
