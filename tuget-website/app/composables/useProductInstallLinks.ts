const HTTPS_PROTOCOL = 'https:'
const MICROSOFT_STORE_PROTOCOL = 'ms-windows-store:'

/**
 * 只接受适合公开安装入口的绝对地址，避免错误环境变量生成 javascript:、
 * 相对路径或空链接。Microsoft Store 额外允许官方客户端深链协议。
 */
function normalizeInstallUrl(value: unknown, allowMicrosoftStoreProtocol = false): string {
  const candidate = String(value || '').trim()
  if (!candidate) return ''

  try {
    const url = new URL(candidate)
    const protocolAllowed = url.protocol === HTTPS_PROTOCOL
      || (allowMicrosoftStoreProtocol && url.protocol === MICROSOFT_STORE_PROTOCOL)
    return protocolAllowed ? url.toString() : ''
  } catch {
    return ''
  }
}

export function useProductInstallLinks() {
  const config = useRuntimeConfig()
  const route = useRoute()
  const microsoftStoreUrl = computed(() => normalizeInstallUrl(config.public.microsoftStoreUrl, true))
  const exeDownloadUrl = computed(() => normalizeInstallUrl(config.public.exeDownloadUrl))

  function trackStoreClick(locationTag = 'general') {
    if (typeof window !== 'undefined') {
      const pagePath = route?.path || window.location.pathname || '/'
      const label = `${pagePath}:${locationTag}`
      const win = window as any
      win._hmt = win._hmt || []
      win._hmt.push(['_trackEvent', 'microsoft_store_install', 'click', label])
    }
  }

  function trackExeClick(locationTag = 'general') {
    if (typeof window !== 'undefined') {
      const pagePath = route?.path || window.location.pathname || '/'
      const label = `${pagePath}:${locationTag}`
      const win = window as any
      win._hmt = win._hmt || []
      win._hmt.push(['_trackEvent', 'exe_download', 'click', label])
    }
  }

  return {
    microsoftStoreUrl,
    exeDownloadUrl,
    trackStoreClick,
    trackExeClick,
  }
}
