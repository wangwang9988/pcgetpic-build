/**
 * 百度搜索资源平台「普通收录 - API 推送」主动推送脚本
 *
 * 使用方法：
 *   1. 本地生成 URL 列表：
 *      node scripts/generate-urls.mjs
 *
 *   2. 预览模式（不发请求，检查待推送 URL）：
 *      node scripts/baidu-push.mjs --dry-run
 *
 *   3. 真实推送（需要设置环境变量）：
 *      $env:BAIDU_PUSH_TOKEN = '你的百度准入密钥'
 *      node scripts/baidu-push.mjs
 *
 *   4. 新站首发模式（配额防御，仅推送 6 个核心路由）：
 *      $env:BAIDU_PUSH_TOKEN = '你的百度准入密钥'
 *      node scripts/baidu-push.mjs --top
 *      或: npm run push:baidu -- --top
 *
 * 说明：
 *   - 百度资源平台登记的站点地址一般为不带协议的域名（如 tuget.yueding168.com），
 *     脚本默认取 NUXT_PUBLIC_SITE_URL 的 hostname 作为 site 参数；
 *     如站长平台登记的是其他形态（如 www 域名），可用 BAIDU_PUSH_SITE 覆盖。
 *   - 百度对单站点每日推送额度有限制（新站通常为 10 条/天，随站点权重提升），
 *     接口返回体中 remain 字段为当日剩余额度。新站首日建议使用 --top 模式
 *     仅推送 6 个核心路由，避免一次性提交全量 URL 触发 over quota。
 *   - 可与 --dry-run 组合使用：node scripts/baidu-push.mjs --top --dry-run
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

function loadEnvFile() {
  const file = resolve(PROJECT_ROOT, '.env')
  if (!existsSync(file)) return
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile()

const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://tuget.yueding168.com'
const tokenArg = process.argv.slice(2).find(a => a.startsWith('--token='))
const TOKEN = (tokenArg ? tokenArg.split('=')[1] : process.env.BAIDU_PUSH_TOKEN || '').trim()
const isDryRun = process.argv.includes('--dry-run')
// 新站首发模式：仅推送最高权重的 6 个核心路由，避免百度新站每日 10 条配额被一次性耗尽。
const topOnly = process.argv.includes('--top')

// 首发核心路由（站内相对路径，与 SITE_URL 前缀无关，任意域名下均生效）。
// 选取依据：首页与客户端功能页是转化主路径，1688/淘宝/京东是搜索量最大的
// 三个平台专题，视频嗅探覆盖 m3u8 长尾。其余页面留待次日或权重提升后推送。
const TOP_ROUTES = [
  '/',
  '/client/',
  '/platforms/1688/',
  '/platforms/taobao/',
  '/platforms/jd/',
  '/scenarios/media-sniffer/',
]

// site 参数默认取 hostname，可通过 BAIDU_PUSH_SITE 覆盖以对齐站长平台登记形态。
const SITE_PARAM = process.env.BAIDU_PUSH_SITE?.trim() || new URL(SITE_URL).hostname

const urlsPath = resolve(PROJECT_ROOT, 'public/urls.txt')
if (!existsSync(urlsPath)) {
  console.error('❌ 未找到 public/urls.txt，请先运行: node scripts/generate-urls.mjs')
  process.exit(1)
}

let urls = readFileSync(urlsPath, 'utf-8')
  .split('\n')
  .map(u => u.trim())
  .filter(Boolean)
  // 百度推送仅推送默认简体中文高价值 SEO 路由，过滤 /zh-TW/、/en-US/ 多语言前缀以及 /terms/、/privacy/ 协议页，避免消耗百度每日配额
  .filter((url) => {
    try {
      const pathname = new URL(url).pathname
      return (
        !pathname.startsWith('/zh-TW/') &&
        !pathname.startsWith('/en-US/') &&
        pathname !== '/terms/' &&
        pathname !== '/privacy/'
      )
    } catch {
      return false
    }
  })

if (urls.length === 0) {
  console.error('❌ public/urls.txt 中没有任何可推送的简体中文 URL')
  process.exit(1)
}

if (topOnly) {
  const before = urls.length
  urls = urls.filter((url) => {
    try {
      return TOP_ROUTES.includes(new URL(url).pathname)
    } catch {
      return false
    }
  })
  if (urls.length === 0) {
    console.error('❌ --top 模式未能从 public/urls.txt 匹配到核心路由，请检查 urls.txt 与 TOP_ROUTES。')
    process.exit(1)
  }
  console.log(`\n📋 [百度推送 · 新站首发模式] 从 ${before} 条 URL 中筛选 ${urls.length} 条核心路由（配额防御）`)
} else {
  // 全量模式下优先将 TOP_ROUTES 排在前面，确保在每日配额受限时优先推送最高权重页面
  urls.sort((a, b) => {
    const idxA = TOP_ROUTES.indexOf(new URL(a).pathname)
    const idxB = TOP_ROUTES.indexOf(new URL(b).pathname)
    const rankA = idxA === -1 ? 999 : idxA
    const rankB = idxB === -1 ? 999 : idxB
    return rankA - rankB
  })
  console.log(`\n📋 [百度推送 · 全量模式] 准备推送 ${urls.length} 条 URL 到百度站长平台（site=${SITE_PARAM}）...`)
}
urls.forEach(url => console.log(` - ${url}`))

if (isDryRun) {
  console.log('\n🔍 [预览模式] 未发送真实网络请求。配置 BAIDU_PUSH_TOKEN 后移除 --dry-run 即可正式推送。\n')
  process.exit(0)
}

if (!TOKEN) {
  console.error('\n❌ 缺少 BAIDU_PUSH_TOKEN 环境变量。')
  console.error('请在 .env 中配置 BAIDU_PUSH_TOKEN，或在 PowerShell 中执行: $env:BAIDU_PUSH_TOKEN = "你的准入密钥"')
  console.error('然后再运行此脚本。\n')
  process.exit(1)
}

const apiUrl = `http://data.zz.baidu.com/urls?site=${SITE_PARAM}&token=${TOKEN}`
const isOverQuota = (data) => data && data.error === 400 && data.message === 'over quota'

console.log(`\n🚀 [百度推送] 正在向百度普通收录 API 分批发送推送请求（自适应配额收缩）...`)

let BATCH_SIZE = 10
let totalSuccess = 0
let remain = '未知'
let cursor = 0
let batchNo = 0
let quotaExhausted = false

try {
  while (cursor < urls.length) {
    const size = Math.min(BATCH_SIZE, urls.length - cursor)
    const batch = urls.slice(cursor, cursor + size)
    batchNo += 1
    const label = `[第 ${batchNo} 批] (${batch.length} 条)`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: batch.join('\n'),
    })

    const rawText = await response.text()
    let result = null
    try {
      result = rawText ? JSON.parse(rawText) : null
    } catch {
      result = null
    }

    if (response.ok && result && result.success > 0) {
      totalSuccess += result.success
      remain = result.remain
      cursor += batch.length
      console.log(` ✅ ${label} 成功推送 ${result.success} 条，今日剩余额度 (remain): ${result.remain}`)
      if (result.not_same_site?.length) {
        console.warn(`    ⚠️ 非本站 URL: ${result.not_same_site.join(', ')}`)
      }
      if (result.not_valid?.length) {
        console.warn(`    ⚠️ 不合法 URL: ${result.not_valid.join(', ')}`)
      }
      if (Number(result.remain) === 0 && cursor < urls.length) {
        quotaExhausted = true
        console.log(`\nℹ️ 今日剩余配额已归零 (remain=0)，停止后续批次推送。`)
        break
      }
      continue
    }

    if (isOverQuota(result) && batch.length > 1) {
      BATCH_SIZE = Math.max(1, Math.floor(batch.length / 2))
      console.log(` ⚠️ ${label} 超出当日剩余配额 (over quota)，自动收缩批大小至 ${BATCH_SIZE} 条重试...`)
      continue
    }

    if (isOverQuota(result)) {
      quotaExhausted = true
      console.log(`\nℹ️ ${label} 当日推送配额已用尽 (over quota)，停止推送。`)
      break
    }

    console.error(`\n❌ [百度推送失败] ${label} HTTP ${response.status}`)
    if (result?.error) {
      console.error(` - 错误码: ${result.error} (${result.message || '无 message'}) - ${describeBaiduError(result.error, result.message)}`)
    } else {
      console.error(` - 响应内容: ${rawText || '(空)'}`)
      if (!response.ok) {
        console.error(` - 状态说明: ${describeHttpStatus(response.status)}`)
      }
    }
    console.error('')
    process.exit(1)
  }

  console.log(`\n✅ [百度推送完成] 共成功推送 ${totalSuccess}/${urls.length} 条，今日剩余额度 (remain): ${remain}`)
  if (quotaExhausted || totalSuccess < urls.length) {
    console.log(`💡 注意: 新站每日配额有限（通常 10 条/天），未推送的 ${urls.length - totalSuccess} 条可在次日继续补推。`)
  }
  console.log('💡 提示: 可在百度搜索资源平台「普通收录 → API 推送 → 推送记录」查看提交明细。\n')
} catch (error) {
  console.error(`\n❌ [百度推送网络异常]: ${error.message}`)
  console.error('请检查网络连通性后重试；如持续失败，可改用百度资源平台后台的手动提交入口。\n')
  process.exit(1)
}

/**
 * 百度普通收录 API 常见错误码说明（见百度资源平台文档）。
 */
function describeBaiduError(code, message) {
  if (code === 400 && message === 'over quota') {
    return '超出当日剩余推送配额（over quota）'
  }
  const map = {
    400: '请求参数错误（site / token 缺失或格式不正确）',
    401: 'token 错误（准入密钥不正确，请重新在站长平台获取）',
    403: '域名未验证或站点不属于该账号（请先在站长平台完成站点验证）',
    500: '百度服务端内部错误（可稍后重试）',
  }
  return map[code] || '未知错误码，请对照百度搜索资源平台文档排查'
}

function describeHttpStatus(status) {
  const map = {
    400: '请求参数错误',
    401: '未授权（token 错误）',
    403: '禁止访问（站点未验证或不属于当前账号）',
    404: '接口地址不存在',
    429: '请求过于频繁，请稍后重试',
    500: '服务端内部错误',
    502: '网关错误',
    503: '服务不可用',
  }
  return map[status] || '未预期的状态码'
}
