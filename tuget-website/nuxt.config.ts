import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import './scripts/reserve-api-port.mjs'
import { DEFAULT_LOCALE, I18N_BASE_ROUTES, locales } from './app/config/i18n'

/**
 * 校验语言包 JSON 是否包含需要运行时 Message Compiler 的语法（{...} 插值、| 复数、@: 链接）。
 * 因为开启了 bundle.dropMessageCompiler = true，一旦词条引入动态语法必须在构建期直接拦截报错。
 */
function assertStaticI18nMessages(node: unknown, filePath: string, keyPath = ''): void {
  if (typeof node === 'string') {
    if (/\{[^}]+\}|\s\|\s|@:[a-zA-Z0-9_.-]+/.test(node)) {
      throw new Error(
        `[tuget i18n guard] 语言包 ${filePath} 的词条 "${keyPath}" 含动态编译语法 (${node})，与 dropMessageCompiler: true 冲突。`
      )
    }
    return
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      assertStaticI18nMessages(v, filePath, keyPath ? `${keyPath}.${k}` : k)
    }
  }
}

/**
 * 与 @nuxtjs/i18n computeLocaleHashes 保持一致的 8 位 SHA-256 摘要计算，
 * 用于在 SSG 预渲染期向 HTML <head> 注入当前语言 messages.json 的零延迟并行预取。
 */
const i18nLocaleHash = (() => {
  const hasher = createHash('sha256')
  const localeFiles = locales.map(l => resolve(process.cwd(), 'i18n/locales', l.file))
  for (const localeFile of localeFiles) {
    const rawJson = readFileSync(localeFile, 'utf-8')
    assertStaticI18nMessages(JSON.parse(rawJson), localeFile)
  }
  const files = [
    ...localeFiles,
    resolve(process.cwd(), 'i18n/i18n.config.ts'),
  ].sort()
  for (const file of files) {
    hasher.update(readFileSync(file))
  }
  return hasher.digest('hex').substring(0, 8)
})()

// 固定 Nuxt DevTools “Open in editor” 使用的编辑器为 VS Code。
//
// Nuxt DevTools 的检查器（组件检查 / 面板上的 Open 按钮）最终通过 launch-editor 打开文件，
// 而 launch-editor 在未指定编辑器时会扫描当前运行的进程来“猜”编辑器：只要机器上同时开着
// 多个编辑器（Antigravity、Trae、Cursor、VS Code…），就会猜到非预期的那个，表现为
// “点了没反应”或“打开的不是 VS Code”。这里显式指定 VS Code，与 TuGet-Client 的
// vite-plugin-vue-devtools({ launchEditor: 'code' }) 保持一致。
// 需要临时换个编辑器的同学，启动 dev 前自行设置 LAUNCH_EDITOR 即可覆盖默认值。
process.env.LAUNCH_EDITOR ||= 'code'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://tuget.yueding168.com'

const i18nRouteMeta: Array<{ path: (typeof I18N_BASE_ROUTES)[number], priority: 1.0 | 0.9 | 0.8 | 0.4, changefreq: 'daily' | 'weekly' | 'monthly' }> = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/client/', priority: 0.9, changefreq: 'weekly' },
  { path: '/download/', priority: 0.9, changefreq: 'weekly' },
  { path: '/platforms/1688/', priority: 0.9, changefreq: 'weekly' },
  { path: '/platforms/taobao/', priority: 0.9, changefreq: 'weekly' },
  { path: '/platforms/jd/', priority: 0.9, changefreq: 'weekly' },
  { path: '/platforms/vip/', priority: 0.8, changefreq: 'weekly' },
  { path: '/platforms/pdd/', priority: 0.8, changefreq: 'weekly' },
  { path: '/scenarios/media-sniffer/', priority: 0.9, changefreq: 'weekly' },
  { path: '/solutions/ecommerce-designer/', priority: 0.8, changefreq: 'weekly' },
  { path: '/terms/', priority: 0.4, changefreq: 'monthly' },
  { path: '/privacy/', priority: 0.4, changefreq: 'monthly' },
]

const buildLocalizedPath = (basePath: string, code: string) => {
  if (code === DEFAULT_LOCALE) return basePath
  return basePath === '/' ? `/${code}/` : `/${code}${basePath}`
}

const sitemapLastmod = '2026-10-22'

const sitemapUrls = [
  ...i18nRouteMeta.flatMap(({ path, priority, changefreq }) => {
    const alternatives = [
      ...locales.map(l => ({
        hreflang: l.language,
        href: buildLocalizedPath(path, l.code),
      })),
      {
        hreflang: 'x-default',
        href: path,
      },
    ]
    return locales.map(l => ({
      loc: buildLocalizedPath(path, l.code),
      lastmod: sitemapLastmod,
      priority,
      changefreq,
      alternatives,
    }))
  }),
  // /buy/ 独立语言体系，不生成 /zh-TW/buy/ 与 /en-US/buy/
  { loc: '/buy/', lastmod: sitemapLastmod, priority: 0.8 as const, changefreq: 'weekly' as const },
]

const prerenderRoutes = [
  ...I18N_BASE_ROUTES.flatMap(path => locales.map(l => buildLocalizedPath(path, l.code))),
  '/buy/',
  '/robots.txt',
  '/sitemap.xml',
]
const apiTarget = process.env.NUXT_API_TARGET || 'http://127.0.0.1:3001'
// 百度统计站点 ID（hm.js? 后面的那串），留空则不注入统计代码。
const baiduHmId = process.env.NUXT_PUBLIC_BAIDU_HM_ID?.trim() || '9fc9f7d6002f1d84c5d0798062ffdf7f'
// Google Search Console 站长验证码（GSC 后台「设置 → 所有权验证 → HTML 标记」中 content 的值）。
const googleSiteVerification = process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || ''
// Bing 站长工具验证码（msvalidate.01 的 content 值）。
const bingSiteVerification = process.env.NUXT_PUBLIC_BING_SITE_VERIFICATION?.trim() || ''
// IndexNow 协议密钥（同时需在 public/ 目录放置同名 <key>.txt 文件，内容为该密钥）。
const indexNowKey = process.env.NUXT_PUBLIC_INDEXNOW_KEY?.trim() || ''

const baiduAnalyticsScript = (id: string) => ({
  innerHTML: `var _hmt = _hmt || [];
window.addEventListener('load', function() {
  var loadHm = function() {
    var hm = document.createElement("script");
    hm.async = true;
    hm.src = "https://hm.baidu.com/hm.js?${id}";
    document.head.appendChild(hm);
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(loadHm, { timeout: 2000 });
  } else {
    setTimeout(loadHm, 200);
  }
}, { once: true });`,
})

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  // 该开发服务器只监听 127.0.0.1。关闭 Nuxt DevTools 3.4+ 新增的写操作授权，
  // 避免组件检查器在面板收起时因授权弹窗无法聚焦而中断 Open in editor。
  devtools: {
    enabled: true,
    disableAuthorization: true,
  },
  ssr: true,

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      siteUrl,
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api/v1',
      // TuGet（图个吉利）客户端专属微软商店地址 (9N5Q5LHZ5R8H)
      microsoftStoreUrl: process.env.NUXT_PUBLIC_MICROSOFT_STORE_URL?.trim() || 'https://apps.microsoft.com/detail/9N5Q5LHZ5R8H',
      // TuGet（图个吉利）客户端官网 EXE 直链（备用渠道）
      exeDownloadUrl: process.env.NUXT_PUBLIC_EXE_DOWNLOAD_URL?.trim() || 'https://dl.webtongbu.com/TuGet-Client/TuGet-Setup.exe',
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL || 'service@yueding168.com',
      operatorName: process.env.NUXT_PUBLIC_OPERATOR_NAME?.trim() || '上海跃町网络科技有限公司',
      icpNumber: process.env.NUXT_PUBLIC_ICP_NUMBER?.trim() || '沪ICP备16021076号-3',
      icpUrl: 'https://beian.miit.gov.cn/',
      // Google Search Console 站长验证码（留空则不输出验证标签）
      googleSiteVerification,
      // Bing 站长工具验证码（留空则不输出验证标签）
      bingSiteVerification,
      // IndexNow 协议密钥（留空则不输出密钥 meta，构建推送脚本亦会跳过）
      indexNowKey,
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: {
        lang: 'zh-CN',
      },
      meta: [
        { name: 'theme-color', content: '#ffffff' },
        { name: 'referrer', content: 'origin-when-cross-origin' },
        { name: 'author', content: '上海跃町网络科技有限公司' },
        { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
        { name: 'baidu-site-verification', content: 'codeva-Nw7hXFGwvZ' },
        // Google Search Console 与 Bing 站长验证（仅在配置了对应环境变量时输出）
        ...(googleSiteVerification ? [{ name: 'google-site-verification', content: googleSiteVerification }] : []),
        ...(bingSiteVerification ? [{ name: 'msvalidate.01', content: bingSiteVerification }] : []),
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/tuget-icon.svg' },
        { rel: 'icon', type: 'image/png', href: '/tuget-icon.png' },
        { rel: 'preconnect', href: 'https://openapi.alipay.com' },
      ],
      script: baiduHmId ? [baiduAnalyticsScript(baiduHmId)] : [],
    },
  },

  modules: ['@nuxtjs/i18n', '@nuxtjs/sitemap', '@nuxtjs/robots'],

  i18n: {
    baseUrl: siteUrl,
    locales: [...locales],
    defaultLocale: DEFAULT_LOCALE,
    langDir: 'locales/',
    strategy: 'prefix_except_default',
    trailingSlash: true,
    detectBrowserLanguage: false,
    vueI18n: 'i18n.config.ts',
    customRoutes: 'config',
    pages: {
      buy: false,
    },
    bundle: {
      dropMessageCompiler: true,
      runtimeOnly: true,
    },
  },

  site: {
    url: siteUrl,
    trailingSlash: true,
  },

  sitemap: {
    autoI18n: false,
    urls: sitemapUrls,
  },

  robots: {
    sitemap: [`${siteUrl}/sitemap-baidu.xml`, `${siteUrl}/sitemap.xml`],
    groups: [
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: ['/zh-TW/', '/en-US/'],
        _skipI18n: true,
      },
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },

  devServer: {
    host: '127.0.0.1',
    port: 3020,
  },

  nitro: {
    devProxy: {
      '/api/v1': {
        target: `${apiTarget}/api/v1`,
        changeOrigin: true,
      },
    },
    prerender: {
      crawlLinks: true,
      routes: prerenderRoutes,
      failOnError: true,
    },
    compressPublicAssets: true,
    externals: {
      inline: ['@nuxt/nitro-server'],
    },
    routeRules: {
      '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
      '/_i18n/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
      '/**': { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } },
    },
  },

  hooks: {
    'nitro:init'(nitro) {
      let didPrerenderHtml = false
      nitro.hooks.hook('prerender:generate', (route) => {
        if (!route.contents || typeof route.contents !== 'string' || !route.contents.includes('<head>')) {
          return
        }
        didPrerenderHtml = true
        const matchedLocale = locales.find(l => l.code !== DEFAULT_LOCALE && (route.route === `/${l.code}` || route.route.startsWith(`/${l.code}/`)))
        const localeCode = matchedLocale ? matchedLocale.code : DEFAULT_LOCALE
        const i18nMessagesUrl = `/_i18n/${i18nLocaleHash}/${localeCode}/messages.json`
        // 仅针对 SSG 预渲染 HTML：在 <head> 最前部发起当前语言包并行请求并单次复用 Response，
        // 消费一次后立即还原原生 window.fetch，且在回退分支使用外层保存的入参 a。
        // 注意：若未来升级 @nuxtjs/i18n 导致 /_i18n/<hash>/<locale>/messages.json 路径格式变更，需同步调整此处。
        const bootstrapI18nScript = `<script>(function(){try{var u=${JSON.stringify(i18nMessagesUrl)},f=window.fetch;if(!f)return;var p=f(u,{credentials:"same-origin",headers:{Accept:"application/json"}});var w=function(i){var a=arguments,s=typeof i==="string"?i:(i&&i.url)||"";if(p&&s.indexOf(u)!==-1){var c=p;p=null;if(window.fetch===w)window.fetch=f;return c.then(function(r){return r&&r.ok?r:f.apply(window,a)}).catch(function(){return f.apply(window,a)})}return f.apply(window,a)};window.fetch=w}catch(e){}})();</script>`
        route.contents = route.contents.replace('<head>', `<head>${bootstrapI18nScript}`)
      })

      nitro.hooks.hook('close', () => {
        if (!didPrerenderHtml) return
        for (const l of locales) {
          const expectedFile = resolve(nitro.options.output.publicDir, '_i18n', i18nLocaleHash, l.code, 'messages.json')
          if (!existsSync(expectedFile)) {
            throw new Error(
              `[tuget i18n guard] 预渲染产物缺失预期的语言包文件: ${expectedFile}，说明 i18nLocaleHash (${i18nLocaleHash}) 与 @nuxtjs/i18n 内部哈希不一致！`
            )
          }
        }
      })
    },
  },

  experimental: {
    appManifest: false,
    defaults: {
      nuxtLink: { trailingSlash: 'append' },
    },
  },
})
