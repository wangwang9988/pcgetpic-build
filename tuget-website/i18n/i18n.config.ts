import { DEFAULT_LOCALE, FALLBACK_LOCALE } from '../app/config/i18n'

export default defineI18nConfig(() => ({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  fallbackWarn: false,
  missingWarn: false,
  fallbackRoot: true,
  sync: true,
  missing(this: { messages?: Record<string, unknown> }, locale: string, key: string): string {
    if (import.meta.dev) {
      console.debug(`[i18n-missing] Missing translation: "${key}" for locale "${locale}"`)
    }

    const fbMsgs = this.messages?.[FALLBACK_LOCALE]
    if (!fbMsgs || typeof fbMsgs !== 'object') return key
    const keys = key.split('.')
    let result: unknown = fbMsgs
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      if (k && result && typeof result === 'object' && k in result) {
        result = (result as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    if (typeof result === 'string' && result.trim()) return result
    return key
  },
}))
