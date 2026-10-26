import api from './index'

/** 订单状态枚举 */
export enum OrderStatus {
  /** 待支付 */
  Pending = 'pending',
  /** 已支付 */
  Paid = 'paid',
  /** 失败 */
  Failed = 'failed',
  /** 已过期 */
  Expired = 'expired',
  /** 已关闭 */
  Closed = 'closed',
  /** 已退款 */
  Refunded = 'refunded',
}

/** 订单记录 */
export interface OrderRecord {
  id: number
  product: string
  order_no: string
  trade_no: string | null
  payment_channel: string | null
  email: string
  original_email?: string        // 新增：原始邮箱（修改前）
  is_email_modified?: number     // 新增：邮箱是否被修改过 (0=未修改, 1=已修改)
  has_coupon?: number            // 新增：是否包含抵扣券 (0=无, 1=有)
  coupon_expired?: number        // 新增：抵扣券是否已过期 (0=未过期, 1=已过期)
  code_expired?: number          // 新增：激活码是否已过期 (0=未过期, 1=已过期)
  coupon_count?: number          // 累计发放的优惠券总张数
  latest_coupon_status?: string  // 最新优惠券的状态 ('active' | 'expired' | 'used')
  package_name: string
  amount: number
  /** 建单时冻结的港币应付金额（港币分）；非港币订单为 null */
  amount_hkd_minor?: number | null
  /** 实际结算币种（'cny' | 'hkd'）；未落账时为 null */
  settlement_currency?: 'cny' | 'hkd' | null
  /** 实际结算金额（结算币种的最小单位，港币即港币分） */
  settlement_amount_minor?: number | null
  /** 下单时的界面语言，决定发货邮件语言 */
  locale?: string | null
  status: OrderStatus | string
  activation_code: string
  paid_at: string | null
  created_at: string
  admin_remark?: string          // 管理员备注
  upgrade_source_type?: 'order' | 'code' | null
  upgrade_source_input?: string | null
  upgrade_source_order_no?: string | null
  upgrade_source_paid_amount?: number | null
  upgrade_source_package_name?: string | null
  upgrade_source_code?: string | null
  upgrade_source_code_status?: number | null
  upgrade_source_duration_type?: number | null
  upgrade_source_duration_days?: number | null
  upgrade_source_activated_at?: number | null
  upgrade_discount?: number | null
  upgrade_snapshot?: string | null
  upgrade_used_at?: number | null
}

/** 优惠券详情 */
export interface CouponDetail {
  id: number
  code: string
  amount: number
  status: string              // 'active' | 'used' | 'expired'
  revoked?: number            // 1=被管理员作废（未超期但被标记为expired），0=自然过期
  created_at: number          // 创建时间戳（毫秒）
  expires_at: number          // 过期时间戳（毫秒）
  used_at: number | null      // 使用时间戳（毫秒），未使用为 null
  used_order_no: string | null // 使用该券的订单号，未使用为 null
}

/** 订单分页列表参数 */
export interface OrderListParams {
  page: number
  pageSize: number
  status?: OrderStatus | ''
  orderNo?: string
  tradeNo?: string
  email?: string
  packageId?: number | null
  amount?: number | null
  activationCode?: string
  paidAtStart?: number
  paidAtEnd?: number
  createdAtStart?: number
  createdAtEnd?: number
  upgrade?: 1
}

/** 分页响应（复用 codes.ts 中同结构，此处独立声明避免循环依赖） */
export interface OrderPaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 获取订单分页列表 */
export function getOrders(params: OrderListParams) {
  return api.get<OrderPaginatedResult<OrderRecord>>('/orders', { params })
}

/** 获取订单详情 */
export function getOrderDetail(id: number) {
  return api.get<OrderRecord>(`/orders/${id}`)
}

/** 重发邮件 */
export function resendEmail(id: number) {
  return api.post(`/orders/${id}/resend-email`)
}

/** 修改订单邮箱 */
export function updateOrderEmail(id: number, email: string) {
  return api.put(`/orders/${id}/email`, { email })
}

/** 重发抵扣券邮件 */
export function resendCoupon(id: number) {
  return api.post(`/orders/${id}/resend-coupon`)
}

/** 为订单创建新抵扣券 */
export function createCoupon(id: number, amount: number, expiresDays: number) {
  return api.post(`/orders/${id}/create-coupon`, { amount, expiresDays })
}

/** 查询订单关联的所有抵扣券 */
export function getCouponList(orderId: number) {
  return api.get<CouponDetail[]>(`/orders/${orderId}/coupons`)
}

/** 导出订单 CSV */
export function exportOrders(params: Partial<OrderListParams>) {
  return api.get('/orders/export', {
    params,
    responseType: 'blob',
  })
}

/** 管理员主动退款（全额退款） */
export function refundOrder(id: number) {
  return api.post<{ success: boolean; message: string }>(`/orders/${id}/refund`)
}

/** 修改订单备注 */
export function updateOrderRemark(id: number, remark: string) {
  return api.put<{ success: boolean; message: string }>(`/orders/${id}/remark`, { remark })
}
