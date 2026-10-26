import { DEFAULT_LOCALE } from '~/config/i18n'

export function useSiteSeo() {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || 'https://tuget.yueding168.com').replace(/\/$/, '')
  const { locale } = useI18n()

  /**
   * 严格按照 Nuxt trailingSlash: 'append' 与多语言路由规范生成标准 canonical 绝对地址
   * - 默认语言 (zh-CN): / 或 /client/
   * - 繁体中文 (zh-TW): /zh-TW/ 或 /zh-TW/client/
   * - 英文 (en-US): /en-US/ 或 /en-US/client/
   */
  const getCanonicalUrl = (path = '/') => {
    const cleanPath = path.replace(/^\//, '').replace(/\/$/, '')
    const currentLocale = locale.value || DEFAULT_LOCALE

    if (currentLocale === DEFAULT_LOCALE) {
      return cleanPath ? `${siteUrl}/${cleanPath}/` : `${siteUrl}/`
    }

    return cleanPath ? `${siteUrl}/${currentLocale}/${cleanPath}/` : `${siteUrl}/${currentLocale}/`
  }

  /**
   * 生成供 Google/Bing 等出海搜索引擎识别的 hreflang 多语言 alternates 标签（含 x-default）
   */
  const buildHreflangLinks = (path = '/') => {
    const cleanPath = path.replace(/^\//, '').replace(/\/$/, '')
    const suffix = cleanPath ? `${cleanPath}/` : ''

    return [
      { rel: 'alternate' as const, hreflang: 'zh-CN', href: `${siteUrl}/${suffix}` },
      { rel: 'alternate' as const, hreflang: 'zh-TW', href: `${siteUrl}/zh-TW/${suffix}` },
      { rel: 'alternate' as const, hreflang: 'en-US', href: `${siteUrl}/en-US/${suffix}` },
      { rel: 'alternate' as const, hreflang: 'x-default', href: `${siteUrl}/${suffix}` },
    ]
  }

  /**
   * 获取购买页链接（/buy/ 不参与 @nuxtjs/i18n 多语言路由生成，英文界面通过 ?lang=en 衔接）
   */
  const getBuyUrl = () => {
    return locale.value === 'en-US' ? '/buy/?lang=en' : '/buy/'
  }

  return {
    siteUrl,
    getCanonicalUrl,
    buildHreflangLinks,
    getBuyUrl,
  }
}
