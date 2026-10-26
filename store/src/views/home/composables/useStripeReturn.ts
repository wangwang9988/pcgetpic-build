/**
 * Stripe 跳回上下文暂存。
 *
 * 跳去 Stripe 前把订单号与邮箱写入 sessionStorage，跳回后恢复：
 * 后端的 order-status 接口刻意不返回邮箱（PII 保护），页面只能靠这份暂存
 * 还原用户上下文。用 sessionStorage 而非 localStorage，关掉标签页即失效。
 */

const STORAGE_KEY = 'store_stripe_return'

export interface StripeReturnContext {
  orderNo: string
  email: string
  amount: number
  order?: import('@/api').CreateOrderData
  savedAt: number
}

/** 上下文最长保留 2 小时，超过即视为无效，避免用陈旧数据恢复页面。 */
const MAX_AGE_MS = 2 * 60 * 60 * 1000

export function storeStripeContext(
  orderNo: string,
  email: string,
  amount = 0,
  order?: import('@/api').CreateOrderData,
): void {
  try {
    const payload: StripeReturnContext = {
      orderNo,
      email,
      amount,
      order,
      savedAt: Date.now(),
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 隐私模式或存储配额用尽时静默失败：不影响支付本身，
    // 只是跳回后需要用户手动重新填邮箱。
  }
}

export function readStripeContext(): StripeReturnContext | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StripeReturnContext
    if (!parsed?.orderNo) return null
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearStripeContext(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 忽略：清理失败不影响主流程。
  }
}