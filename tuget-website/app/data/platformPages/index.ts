import type { PlatformPageContent } from '~/components/PlatformLandingPage.vue'
import { PLATFORM_PAGES_ZH_CN, type PlatformSlug } from './zh-CN'
import { PLATFORM_PAGES_ZH_TW } from './zh-TW'
import { PLATFORM_PAGES_EN_US } from './en-US'

export type { PlatformSlug }

export function getPlatformPageContent(slug: PlatformSlug, locale: string): PlatformPageContent {
  if (locale === 'en-US') {
    return PLATFORM_PAGES_EN_US[slug]
  }
  if (locale === 'zh-TW') {
    return PLATFORM_PAGES_ZH_TW[slug]
  }
  return PLATFORM_PAGES_ZH_CN[slug]
}
