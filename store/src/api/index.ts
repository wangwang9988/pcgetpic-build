import axios from 'axios'

// 创建 axios 实例
const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

// 响应拦截器：统一解包后端 { success, data, message } 结构
http.interceptors.response.use(
  (response) => {
    // blob 类型的响应不解包，直接返回
    if (response.config.responseType === 'blob') {
      return response
    }

    // 后端统一返回 { success: boolean, data: T, message?: string } 结构
    // 在拦截器中解包，让 response.data 直接是业务数据
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      // success 为 false 时视为业务错误
      if (response.data.success === false) {
        const errMsg = response.data.message || response.data.error_code || '请求失败'
        const err = new Error(errMsg) as Error & { error_code?: string }
        err.error_code = response.data.error_code
        return Promise.reject(err)
      }
      // 解包：将 response.data.data 提升为 response.data
      response.data = response.data.data
    }

    // 兜底：确保 data 字段至少为 null 而非 undefined
    if (response.data === undefined) {
      response.data = null
    }
    return response
  },
  (error) => {
    // 后端把可展示给用户的文案放在 response.data.message（例如港币支付未配置时
    // 的「港币支付暂未开放，请使用支付宝支付」）。直接 reject 原始 AxiosError 会让
    // 所有 4xx/5xx 都退化成 Axios 自带的英文 'Request failed with status code XXX'，
    // 用户既看不到真实原因，也在一堆中文界面里看到英文报错。
    //
    // 这里统一包装成 Error(message)：调用方本来就只用 err.message 展示提示，
    // 换成 Error 不会破坏现有逻辑，但需要 err.response / err.status 的地方请改用
    // 下面的 attachErrorContext 补齐。
    const backendMessage = error?.response?.data?.message
    const enriched = backendMessage
      ? new Error(backendMessage)
      : new Error(error?.message || '请求失败')

    attachErrorContext(enriched, error)
    console.error('请求失败:', enriched.message)
    return Promise.reject(enriched)
  },
)

/**
 * 把原始 AxiosError 上常用的诊断字段挂到包装后的 Error 上。
 *
 * 目前没有调用方读取，但保留 status / error_code / response，
 * 以后要做「503 就隐藏港币按钮」这类分流时不必再回头改拦截器。
 */
function attachErrorContext(target: Error, source: unknown): void {
  const src = source as {
    code?: string
    response?: { status?: number, data?: { error_code?: string } }
  }
  if (!src) return
  const context = target as Error & {
    status?: number
    error_code?: string
    errorCode?: string
    response?: unknown
  }
  context.status = src.response?.status
  context.error_code = src.response?.data?.error_code
  context.errorCode = src.response?.data?.error_code
  context.response = src.response
}

// ========== 业务常量 ==========

/**
 * 抵扣券允许使用的最低套餐价格阈值（元）
 *
 * 与后端 constants.ts 中 UPGRADE_COUPON_MIN_PRICE 保持同步。
 * 套餐售价 >= 此值时，前端展示抵扣券相关提示；后端做最终校验。
 */
export const COUPON_MIN_PRICE = 50

// ========== 类型定义 ==========

/** 套餐信息 */
export interface PackageInfo {
  id: number
  name: string
  /** 后端统一派生的英文套餐名，英文界面直接用 */
  name_en: string
  duration_type: number
  duration_days: number
  price: number
  /** 港币售价（元）；未配置时为 null */
  price_hkd?: number | null
  /** 该套餐是否可走港币支付；false 时前端隐藏切换入口 */
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

/** 创建订单请求 */
export interface CreateOrderRequest {
  package_id: number
  email: string
  coupon_code?: string
  /** 界面语言，决定发货邮件语言与 Stripe 收银台语言 */
  locale?: 'zh-CN' | 'en'
}

/** 创建订单响应数据 */
export interface CreateOrderData {
  order_no: string
  qr_code: string
  pay_url?: string  // 支付宝电脑网站支付链接
  amount: number
  original_amount: number | null
  coupon_applied: boolean
  coupon_discount: number
  /** 建单时冻结的港币应付金额（元）；为 null 表示该订单不支持 Stripe */
  amount_hkd?: number | null
  /** 订单过期时间（毫秒时间戳），前端倒计时以它为准 */
  expired_at?: number
}

/** 订单状态 */
/**
 * 订单状态。
 *
 * 与服务端 ORDER_STATUS 对齐：除了 pending/paid/failed，还会有 expired（超时）
 * 与 closed（预下单失败被关闭）。缺了后两种会让前端的终态判断漏分支。
 */
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'closed'

/** 订单状态响应数据 */
export interface OrderStatusData {
  status: OrderStatus
  code?: string
  expires_at?: number
  duration_type?: number
}

/** 单张抵扣券摘要信息 */
export interface CouponItemData {
  coupon_code: string
  amount: number
  expires_at: number
  allowed_duration_types: number[]
}

/** 抵扣券状态响应数据 */
export interface CouponStatusData {
  has_active_coupon: boolean
  /** 所有可用抵扣券列表，按面额降序排列（面额相同按过期时间升序） */
  coupons: CouponItemData[]
  // 以下字段保持向后兼容，取 coupons[0] 的值（即最大面额券）
  coupon_code?: string
  amount?: number
  expires_at?: number | null
  allowed_duration_types?: number[]
}

/** 抵扣券校验响应数据 */
export interface CouponValidationData {
  valid: boolean
  error_code: string | null
  message: string | null
  amount: number
}

// ========== API 函数 ==========

declare global {
  interface Window {
    __STORE_PACKAGES_PROMISE__?: Promise<{ success?: boolean; data?: PackageInfo[] } | null>
  }
}

/** 获取套餐列表（优先消费 index.html <head> 发起的零延迟预取 Promise，异常时无缝回退） */
export async function fetchPackages(): Promise<PackageInfo[]> {
  if (typeof window !== 'undefined' && window.__STORE_PACKAGES_PROMISE__) {
    const prefetchedPromise = window.__STORE_PACKAGES_PROMISE__
    delete window.__STORE_PACKAGES_PROMISE__
    try {
      const payload = await prefetchedPromise
      if (payload && payload.success !== false && Array.isArray(payload.data) && payload.data.length > 0) {
        return payload.data
      }
      if (import.meta.env.DEV) {
        console.warn('[store] <head> 套餐预取返回为空或非预期结构，已回退至常规请求', payload)
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[store] <head> 套餐预取异常，已回退至常规请求', err)
      }
    }
  }
  const { data } = await http.get<PackageInfo[]>('/payment/packages', {
    params: { product: 'dangtu' },
  })
  return Array.isArray(data) ? data : []
}

/** 创建订单 */
export async function createOrder(params: CreateOrderRequest): Promise<CreateOrderData> {
  const { data } = await http.post<CreateOrderData>('/payment/create-order', params)
  return data!
}

/**
 * 查询订单状态。
 *
 * reconcile=1 让服务端主动向支付网关核对。开发构建总是带上（本地收不到公网
 * 回调）；生产环境在从 Stripe 跳回时也必须带上——浏览器跳回往往早于 Webhook
 * 抵达，不主动对账用户会一直停在等待页。
 */
export async function getOrderStatus(
  orderNo: string,
  options: { reconcile?: boolean } = {}
): Promise<OrderStatusData> {
  const shouldReconcile = options.reconcile ?? import.meta.env.DEV
  const { data } = await http.get<OrderStatusData>('/payment/order-status', {
    params: {
      order_no: orderNo,
      reconcile: shouldReconcile ? '1' : undefined,
    },
  })
  return data!
}

/** 查询抵扣券状态 */
export async function getCouponStatus(email: string): Promise<CouponStatusData> {
  const { data } = await http.get<CouponStatusData>('/payment/coupon-status', {
    params: { email },
  })
  return data!
}

/** 校验抵扣券 */
export async function validateCoupon(couponCode: string, packageId: number): Promise<CouponValidationData> {
  const { data } = await http.post<CouponValidationData>('/payment/validate-coupon', {
    coupon_code: couponCode,
    package_id: packageId,
  })
  return data!
}

/** 港币结账跳转地址 */
export interface StripeCheckoutData {
  checkout_url: string
  reused: boolean
}

/**
 * 为既有待支付订单创建 Stripe 港币结账会话。
 *
 * 跳去 Stripe 前先把订单号与邮箱存入 sessionStorage：跳回时后端只按 order_no
 * 查询，不返回邮箱，页面需要靠这份暂存恢复上下文。
 */
export async function createStripeCheckout(
  orderNo: string,
  locale: 'zh-CN' | 'en' = 'zh-CN'
): Promise<StripeCheckoutData> {
  const { data } = await http.post<StripeCheckoutData>('/payment/stripe-checkout', {
    order_no: orderNo,
    locale,
  })
  if (!data?.checkout_url) {
    throw new Error('未获取到港币支付链接')
  }
  return data
}
