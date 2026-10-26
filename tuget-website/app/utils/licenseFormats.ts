import type { UpgradeSourceType } from '~/types/payment'

const CROCKFORD = '0-9ABCDEFGHJKMNPQRSTVWXYZ'
const COUPON_CHARS = 'A-HJKMNP-Z2-9'

export const DANGTU_CODE_RE = new RegExp(`^PCGP-[${CROCKFORD}]{5}(?:-[${CROCKFORD}]{5}){3}$`)
export const DANGTU_ORDER_RE = /^PCGP\d{13}[0-9A-F]{8}$/
export const UPGRADE_COUPON_RE = new RegExp(`^UPG-[${COUPON_CHARS}]{6}-[${COUPON_CHARS}]{6}$`)

export type BenefitInputKind = 'empty' | 'coupon' | 'upgrade' | 'tuget-code' | 'incomplete' | 'invalid'

export interface BenefitInputResult {
  kind: BenefitInputKind
  normalized: string
  sourceType?: UpgradeSourceType
  message?: string
}

export function normalizeBenefitInput(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[－—–]/g, '-')
    .toUpperCase()
}

/** 凭证预检提示的语言。省略时按中文，保持既有调用方行为不变。 */
export type BenefitInputLang = 'zh-CN' | 'en'

/**
 * 只做编码结构预检，不判断凭证是否存在或是否已使用。
 * 无效输入会在浏览器本地拦截，不向低配支付服务发请求。
 *
 * lang 决定 message 的语言。这里保持纯函数、不引Vue 依赖，方便单测直接断言文案；
 * 调用方（useTugetPayment）传入响应式 locale 的当前值即可。
 */
export function classifyBenefitInput(
  value: string,
  lang: BenefitInputLang = 'zh-CN',
): BenefitInputResult {
  const normalized = normalizeBenefitInput(value)
  if (!normalized) return { kind: 'empty', normalized }

  if (UPGRADE_COUPON_RE.test(normalized)) {
    return { kind: 'coupon', normalized }
  }
  if (DANGTU_CODE_RE.test(normalized)) {
    return { kind: 'upgrade', normalized, sourceType: 'code' }
  }
  if (DANGTU_ORDER_RE.test(normalized)) {
    return { kind: 'upgrade', normalized, sourceType: 'order' }
  }
  const isIncomplete = (
    (normalized.startsWith('PCGP-') && normalized.length < 29)
    || (normalized.startsWith('PCGP') && !normalized.includes('-') && normalized.length < 25)
    || (normalized.startsWith('UPG') && normalized.length < 17)
    || (normalized.startsWith('TGTU') && normalized.length < 29)
    || ['P', 'PC', 'PCG', 'U', 'UP', 'T', 'TG', 'TGT'].includes(normalized)
  )
  if (isIncomplete) {
    return { kind: 'incomplete', normalized }
  }

  const en = lang === 'en'
  if (normalized.startsWith('TGTU-')) {
    return {
      kind: 'tuget-code',
      normalized,
      message: en
        ? 'This is a TuGet activation code — there is nothing to redeem here'
        : '这是图个吉利激活码，无需在换购入口核销',
    }
  }

  const message = normalized.startsWith('PCGP-')
    ? (en
      ? 'Invalid PCGetPic activation code. Expected PCGP-XXXXX-XXXXX-XXXXX-XXXXX (digits 0/1 only — no letters O/I/L/U)'
      : '当图激活码格式不正确，应为 PCGP-XXXXX-XXXXX-XXXXX-XXXXX；编码使用数字 0/1，不使用字母 O/I/L/U')
    : normalized.startsWith('PCGP')
      ? (en
        ? 'Invalid PCGetPic order number. Please check it and try again'
        : '当图订单号格式不正确，请核对后重新输入')
      : normalized.startsWith('UPG-')
        ? (en
          ? 'Invalid voucher code. Expected UPG-XXXXXX-XXXXXX'
          : '优惠券码格式不正确，应为 UPG-XXXXXX-XXXXXX')
        : (en
          ? 'Enter a PCGetPic order number, a PCGP activation code, or a UPG voucher'
          : '请输入当图订单号、PCGP 激活码或 UPG 抵扣券')

  return { kind: 'invalid', normalized, message }
}
