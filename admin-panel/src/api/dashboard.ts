import api from './index'

export interface DashboardCountTrend {
  date: string
  count: number
}

export interface DashboardAmountTrend {
  date: string
  amount: number
}

export interface DashboardStatusBreakdown {
  unused: number
  activated: number
  disabled: number
}

export interface DashboardPackageDistribution {
  name: string
  duration_type: number
  total: number
  activated_count: number
}

/** 仪表盘统计数据 */
export interface DashboardStats {
  total_codes: number
  activated_devices: number
  today_activations: number
  usage_rate: number
  /** 总销售额：仅统计 paid 订单，已排除本地状态为 refunded 的全额退款订单 */
  total_sales: number
  total_orders: number
  today_sales: number
  yesterday_sales: number
  today_orders: number
  yesterday_orders: number
  total_refunds: number
  today_refunds: number
  yesterday_refunds: number
  last_7_days_refunds: number
  last_30_days_sales: number
  last_30_days_orders: number
  last_30_days_refunds: number
  today_activated_devices: number
  yesterday_activated_devices: number
  /**
   * Stripe 港币实收（港币分）。与上面的人民币口径严格分轨，不做汇率换算。
   *
   * 所有时间维度都返回，值为 0 时也返回——看板要常驻展示港币行，
   * 若后端在无数据时省略字段，前端就没法区分「今天没港币单」和「港币没接通」。
   */
  stripe_hkd_sales_minor: number
  stripe_hkd_order_count: number
  today_stripe_hkd_sales_minor: number
  today_stripe_hkd_orders: number
  yesterday_stripe_hkd_sales_minor: number
  yesterday_stripe_hkd_orders: number
  last_7_days_stripe_hkd_sales_minor: number
  last_7_days_stripe_hkd_orders: number
  last_30_days_stripe_hkd_sales_minor: number
  last_30_days_stripe_hkd_orders: number
  /** 港币退款（港币分），同样按结算币种与人民币退款隔离。 */
  stripe_hkd_refunds_minor: number
  stripe_hkd_refund_order_count: number
  today_stripe_hkd_refunds_minor: number
  today_stripe_hkd_refund_orders: number
  sales_trend: DashboardAmountTrend[]
  orders_trend: DashboardCountTrend[]
  device_trend: DashboardCountTrend[]
  activatedCodes: number
  disabledCodes: number
  statusBreakdown: DashboardStatusBreakdown
  packageDistribution: DashboardPackageDistribution[]
  dailyTrend: DashboardCountTrend[]
}

/** 获取仪表盘统计数据 */
export function getDashboardStats(forceFresh = false) {
  return api.get<DashboardStats>('/dashboard/stats', {
    params: forceFresh ? { fresh: 1 } : undefined,
  })
}
