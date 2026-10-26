/**
 * 微软必应 (Bing) IndexNow 即时收录推送脚本
 *
 * IndexNow 是微软必应主导的开放协议（Bing / Yandex / Seznam 等引擎共同支持），
 * 站点在页面发布后主动推送 URL，搜索引擎可在分钟级上门抓取，无需等待自然爬取。
 *
 * 使用方法：
 *   1. 先生成 URL 清单：
 *      node scripts/generate-urls.mjs
 *
 *   2. 预览模式（不发请求，检查待推送 URL）：
 *      node scripts/bing-indexnow.mjs --dry-run
 *
 *   3. 正式推送（key 已内置仓库预置密钥，无需额外配置）：
 *      node scripts/bing-indexnow.mjs
 *      或: npm run push:indexnow
 *
 * 密钥机制：
 *   - IndexNow 要求站点托管一个密钥文件：https://<host>/<key>.txt，文件内容为该 key 本身；
 *   - 仓库已在 public/ 目录预置 b3a82f4c9d1e4a7f8c2d5e6a9b0c3d4e.txt，
 *     构建后会随静态产物一起发布到线上，密钥校验自动生效；
 *   - 如需更换密钥：修改本脚本默认值 + public/<新key>.txt（删除旧文件） + .env.example 中的
 *     NUXT_PUBLIC_INDEXNOW_KEY，并重新执行 npm run build 发布。
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

function loadDotEnv() {
  const envPath = resolve(PROJECT_ROOT, '.env')
  if (!existsSync(envPath)) return
  for (const rawLine of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue
    const key = line.slice(0, eqIdx).trim()
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}

loadDotEnv()

const SITE_URL = (process.env.NUXT_PUBLIC_SITE_URL || 'https://tuget.yueding168.com').replace(/\/+$/, '')
const BING_API_KEY = process.env.BING_API_KEY?.trim() || ''

// 与 public/<key>.txt 文件名保持一致的 IndexNow 密钥（可用 INDEXNOW_KEY 环境变量覆盖）。
const KEY = process.env.INDEXNOW_KEY?.trim()
  || process.env.NUXT_PUBLIC_INDEXNOW_KEY?.trim()
  || 'b3a82f4c9d1e4a7f8c2d5e6a9b0c3d4e'

const isDryRun = process.argv.includes('--dry-run')

const keyFilePath = resolve(PROJECT_ROOT, `public/${KEY}.txt`)
if (!existsSync(keyFilePath)) {
  console.error(`❌ 未找到 IndexNow 密钥文件 public/${KEY}.txt。`)
  console.error('请确认密钥与文件同名，或修改脚本默认密钥后重新生成密钥文件。')
  process.exit(1)
}

const keyFileContent = readFileSync(keyFilePath, 'utf-8').trim()
if (keyFileContent !== KEY) {
  console.error(`❌ 密钥文件内容与密钥不一致：public/${KEY}.txt`)
  console.error(`   文件内容: ${keyFileContent}`)
  console.error(`   期望内容: ${KEY}`)
  process.exit(1)
}

const urlsPath = resolve(PROJECT_ROOT, 'public/urls.txt')
if (!existsSync(urlsPath)) {
  console.error('❌ 未找到 public/urls.txt，请先运行: node scripts/generate-urls.mjs')
  process.exit(1)
}

const urls = readFileSync(urlsPath, 'utf-8')
  .split('\n')
  .map(u => u.trim())
  .filter(Boolean)

if (urls.length === 0) {
  console.error('❌ public/urls.txt 中没有任何 URL')
  process.exit(1)
}

console.log(`\n📋 [IndexNow] 准备推送 ${urls.length} 条 URL（host=${new URL(SITE_URL).hostname}）...`)
urls.forEach(url => console.log(` - ${url}`))

if (isDryRun) {
  console.log('\n🔍 [预览模式] 未发送真实网络请求。移除 --dry-run 即可正式推送。\n')
  process.exit(0)
}

if (BING_API_KEY) {
  const base = 'https://ssl.bing.com/webmaster/api.svc/json'
  const siteUrlSlash = `${SITE_URL}/`
  const sitemapUrl = `${SITE_URL}/sitemap.xml`
  try {
    const feedRes = await fetch(`${base}/SubmitFeed?apikey=${BING_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ siteUrl: siteUrlSlash, feedUrl: sitemapUrl }),
    })
    console.log(`\n✅ [Bing Webmaster SubmitFeed] ${sitemapUrl} -> HTTP ${feedRes.status}`)

    const quotaRes = await fetch(`${base}/GetUrlSubmissionQuota?apikey=${BING_API_KEY}&siteUrl=${encodeURIComponent(siteUrlSlash)}`)
    const quotaJson = await quotaRes.json()
    const dailyQuota = quotaJson?.d?.DailyQuota ?? 0
    console.log(`📊 [Bing Webmaster Quota] 当前剩余日配额: ${dailyQuota}（月配额: ${quotaJson?.d?.MonthlyQuota ?? 0}）`)

    if (dailyQuota > 0) {
      const batchUrls = urls.slice(0, dailyQuota)
      const batchRes = await fetch(`${base}/SubmitUrlBatch?apikey=${BING_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ siteUrl: siteUrlSlash, urlList: batchUrls }),
      })
      console.log(`✅ [Bing Webmaster SubmitUrlBatch] 已推送 ${batchUrls.length} 条 URL -> HTTP ${batchRes.status}`)
    }
  } catch (err) {
    console.error(`⚠️ [Bing Webmaster API 异常]: ${err.message}`)
  }
}

const payload = {
  host: new URL(SITE_URL).hostname,
  key: KEY,
  keyLocation: `${SITE_URL}/${KEY}.txt`,
  urlList: urls,
}

console.log('\n🚀 [IndexNow] 正在向 https://api.indexnow.org/IndexNow 发送推送请求...')

try {
  const response = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  })

  // IndexNow 成功返回 200/202 且响应体通常为空；失败时返回带 message 的 JSON。
  const rawText = await response.text()

  if (response.ok || response.status === 202) {
    console.log(`\n✅ [IndexNow 推送成功] HTTP ${response.status}`)
    console.log(' - Bing / Yandex 等引擎将在分钟级感知 URL 变更并安排抓取')
    console.log(` - 密钥校验地址: ${payload.keyLocation}`)
    console.log('\n💡 提示: 首次使用请先在 Bing 站长工具 (bing.com/webmasters) 验证站点；')
    console.log('   已接入 IndexNow 的站点可在后台「IndexNow」页面查看推送状态。\n')
  } else {
    console.error(`\n❌ [IndexNow 推送失败] HTTP ${response.status}`)
    if (rawText) {
      try {
        const result = JSON.parse(rawText)
        console.error(` - ${result.message || JSON.stringify(result)}`)
      } catch {
        console.error(` - ${rawText}`)
      }
    } else {
      console.error(` - ${describeHttpStatus(response.status)}`)
    }
    console.error('')
    process.exit(1)
  }
} catch (error) {
  console.error(`\n❌ [IndexNow 推送网络异常]: ${error.message}`)
  console.error('请检查网络连通性后重试。\n')
  process.exit(1)
}

function describeHttpStatus(status) {
  const map = {
    400: '请求体格式错误（host / key / urlList 不合法）',
    403: '密钥校验失败（请确认 https://<host>/<key>.txt 已随站点发布且内容正确）',
    422: 'URL 列表不合法（存在非本站或格式错误的 URL）',
    429: '请求过于频繁，请稍后重试',
  }
  return map[status] || '未预期的状态码'
}
