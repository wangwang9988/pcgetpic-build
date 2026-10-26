/**
 * TuGet 官网国际化（i18n）集中配置
 *
 * 对齐 website / oneget-website 的三语架构：
 * - 默认语言：zh-CN（无 URL 前缀，保持根路径及各落地页路径不变）
 * - 繁体中文：zh-TW（带 /zh-TW/ 前缀）
 * - 英文：en-US（带 /en-US/ 前缀）
 * - 购买页 /buy/ 单独豁免多语言路由生成，避免触碰收银台代码
 */

export const DEFAULT_LOCALE = 'zh-CN'
export const FALLBACK_LOCALE = 'en-US'

export const CORE_LOCALES = [
  'zh-CN',
  'zh-TW',
  'en-US',
] as const

export type LocaleCode = (typeof CORE_LOCALES)[number]

export type SiteLocale = {
  code: LocaleCode
  language: string
  file: string
  name: string
  shortName: string
}

export const locales: readonly SiteLocale[] = [
  {
    code: 'zh-CN',
    language: 'zh-CN',
    file: 'zh-CN.json',
    name: '简体中文',
    shortName: '简',
  },
  {
    code: 'zh-TW',
    language: 'zh-TW',
    file: 'zh-TW.json',
    name: '繁體中文',
    shortName: '繁',
  },
  {
    code: 'en-US',
    language: 'en-US',
    file: 'en-US.json',
    name: 'English',
    shortName: 'EN',
  },
] as const

/**
 * 参与三语静态预渲染的 12 个基础路由（不含 /buy/，/buy/ 保持单路由豁免）
 */
export const I18N_BASE_ROUTES = [
  '/',
  '/client/',
  '/download/',
  '/platforms/1688/',
  '/platforms/taobao/',
  '/platforms/jd/',
  '/platforms/vip/',
  '/platforms/pdd/',
  '/scenarios/media-sniffer/',
  '/solutions/ecommerce-designer/',
  '/terms/',
  '/privacy/',
] as const
