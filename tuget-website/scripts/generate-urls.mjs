/**
 * 百度站长平台 URL 列表与百度专属 Sitemap 生成脚本
 * 构建后自动运行或手动运行：
 * 1. 生成 public/urls.txt 供 IndexNow 与百度 API 推送使用；
 * 2. 生成 public/sitemap-baidu.xml（仅含 11 条高价值简体中文 SEO 页面 + <lastmod>，隔离繁/英与协议页）。
 */

import { writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const SITE_URL = (process.env.NUXT_PUBLIC_SITE_URL || 'https://tuget.yueding168.com').replace(/\/+$/, '')
const LASTMOD = '2026-10-22'

const I18N_BASE_ROUTES = [
  '/',
  '/client/',
  '/download/',
  // 电商平台与高频场景专题落地页（长尾流量矩阵）
  '/platforms/1688/',
  '/platforms/taobao/',
  '/platforms/jd/',
  '/platforms/vip/',
  '/platforms/pdd/',
  '/scenarios/media-sniffer/',
  '/solutions/ecommerce-designer/',
  '/terms/',
  '/privacy/',
]

const BAIDU_CORE_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/client/', priority: '0.9', changefreq: 'weekly' },
  { path: '/download/', priority: '0.9', changefreq: 'weekly' },
  { path: '/buy/', priority: '0.8', changefreq: 'weekly' },
  { path: '/platforms/1688/', priority: '0.9', changefreq: 'weekly' },
  { path: '/platforms/taobao/', priority: '0.9', changefreq: 'weekly' },
  { path: '/platforms/jd/', priority: '0.9', changefreq: 'weekly' },
  { path: '/platforms/vip/', priority: '0.8', changefreq: 'weekly' },
  { path: '/platforms/pdd/', priority: '0.8', changefreq: 'weekly' },
  { path: '/scenarios/media-sniffer/', priority: '0.9', changefreq: 'weekly' },
  { path: '/solutions/ecommerce-designer/', priority: '0.8', changefreq: 'weekly' },
]

const LOCALES = ['zh-CN', 'zh-TW', 'en-US']

const ROUTES = [
  ...LOCALES.flatMap(locale =>
    I18N_BASE_ROUTES.map((route) => {
      if (locale === 'zh-CN') return route
      return route === '/' ? `/${locale}/` : `/${locale}${route}`
    })
  ),
  '/buy/',
]

const urls = ROUTES.map(route => {
  const normalized = route.startsWith('/') ? route : `/${route}`
  const withTrailing = normalized.endsWith('/') ? normalized : `${normalized}/`
  return `${SITE_URL}${withTrailing}`
})

const outputContent = urls.join('\n') + '\n'

const baiduSitemapLines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  '  <!-- 百度专属防守型 Sitemap：仅包含简体中文高价值 SEO 页面（11 条），隔离繁体/英文镜像及低价值协议页 -->',
  ...BAIDU_CORE_ROUTES.flatMap(({ path, priority, changefreq }) => [
    '  <url>',
    `    <loc>${SITE_URL}${path}</loc>`,
    `    <lastmod>${LASTMOD}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]),
  '</urlset>',
  '',
]
const baiduSitemapContent = baiduSitemapLines.join('\n')

// 输出到 public/urls.txt 与 public/sitemap-baidu.xml
const publicUrlsPath = resolve(PROJECT_ROOT, 'public/urls.txt')
writeFileSync(publicUrlsPath, outputContent, 'utf-8')
console.log(`[URLs 生成] 已写入 ${urls.length} 条 URL 到 ${publicUrlsPath}`)

const publicBaiduSitemapPath = resolve(PROJECT_ROOT, 'public/sitemap-baidu.xml')
writeFileSync(publicBaiduSitemapPath, baiduSitemapContent, 'utf-8')
console.log(`[Baidu Sitemap 生成] 已写入 ${BAIDU_CORE_ROUTES.length} 条简中核心 URL 到 ${publicBaiduSitemapPath}`)

const distPublicDir = resolve(PROJECT_ROOT, '.output/public')
if (existsSync(distPublicDir)) {
  const distUrlsPath = resolve(distPublicDir, 'urls.txt')
  writeFileSync(distUrlsPath, outputContent, 'utf-8')
  const distBaiduSitemapPath = resolve(distPublicDir, 'sitemap-baidu.xml')
  writeFileSync(distBaiduSitemapPath, baiduSitemapContent, 'utf-8')
  console.log(`[产物同步] 已同步 urls.txt 与 sitemap-baidu.xml 到 ${distPublicDir}`)
}

console.log('\n生成的 URL 清单：')
urls.forEach(url => console.log(` - ${url}`))
