import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve, relative, join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'

/**
 * ============================================================
 * 代码规模控制红线规范自动巡检脚本 (check-file-lines.mjs)
 *
 * 【红线分级标准】（边界统一为「达到即超标」）
 * 1. 目标线：<= 500 行 (健康标准)
 * 2. 关注提示线：501 ~ 799 行 (建议关注，暂不视为违规)
 * 3. 预警警戒线（黄线）：800 ~ 1199 行 (必须规划拆分)
 * 4. 强制重构线（红线）：1200 ~ 1499 行 (违规，strict 模式阻断)
 * 5. 严重事故告警（深红）：>= 1500 行 (严重债务，立即整改)
 *
 * 【排除规则】
 * 默认排除测试代码：目录 __tests__ / __test__ / test / tests / testdata / e2e，
 * 文件名 *.test.* / *.spec.* / *_test.* / test_* / test.* / tests.*。
 * 需要连测试文件一起复查时加 --include-tests。
 *
 * 【子项目按需巡检（--scope / 直接传子项目名）】
 * 支持只检查单个或多个子项目（支持目录原名、英文简写、中文别名及组合别名）：
 *   npm run check:lines                         # 全量检查所有子项目
 *   npm run check:lines:client                  # 只检查当图客户端 (client)
 *   npm run check:lines:tuget                   # 只检查图个吉利客户端 (TuGet-Client)
 *   npm run check:lines:oneget                  # 只检查一得浏览器插件 (next-GetPic)
 *   npm run check:lines -- <子项目名或别名>     # 按需检查任意子项目或组合
 * ============================================================
 */

const ROOT_DIR = resolve(import.meta.dirname, '..')
const BASELINE_PATH = resolve(ROOT_DIR, '.cache/check-file-lines/baseline.json')
const BASELINE_VERSION = 1

// 忽略目录与生成产物、第三方参考副本（所有以 . 开头的隐藏目录也会自动跳过）
const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'dist-scripts', 'target', 'bin', 'release', 'output',
  'deploy', 'coverage', 'chromium', 'extensions', 'reference', 'upstream',
  'temp-scratch', 'scratch', '_probe_serde', 'docs', 'tmp', 'Assets',
])
const IGNORE_PATH_PREFIXES = ['TuGet-Client/src/assets/']
const TARGET_EXTS = new Set(['.vue', '.ts', '.tsx', '.rs', '.js', '.mjs', '.cjs'])

// 子项目定义与别名映射
const SUBPROJECTS = [
  { id: 'client', label: '当图桌面客户端', aliases: ['client', 'dangtu', 'dangtu-client', '当图', '当图客户端'] },
  { id: 'TuGet-Client', label: '图个吉利桌面客户端', aliases: ['tuget-client', 'tuget', '图个吉利', '图个吉利客户端'] },
  { id: 'next-GetPic', label: '一得 (OneGet) 浏览器插件', aliases: ['next-getpic', 'oneget', '一得', '一得插件', '一得浏览器插件'] },
  { id: 'GetPic', label: '当图浏览器插件', aliases: ['getpic', 'downpictures', '当图插件', '当图浏览器插件'] },
  { id: 'Pro-GetPic', label: '图个吉利浏览器插件', aliases: ['pro-getpic', 'pro', '图个吉利插件', '图个吉利浏览器插件'] },
  { id: 'browser', label: 'TuGet 浏览器引擎', aliases: ['browser', 'tuget-browser'] },
  { id: 'tuget-native-host', label: 'TuGet Native Messaging 桥', aliases: ['tuget-native-host', 'native-host'] },
  { id: 'tuget-protocol', label: 'TuGet 共享通信协议', aliases: ['tuget-protocol', 'protocol'] },
  { id: 'server', label: '业务授权后端服务', aliases: ['server', 'api', '后端'] },
  { id: 'cps-server', label: '广告服务后端', aliases: ['cps-server', 'cps'] },
  { id: 'admin-panel', label: '管理后台前端', aliases: ['admin-panel', 'admin', '管理后台'] },
  { id: 'store', label: '购买收银台前端', aliases: ['store', '收银台'] },
  { id: 'website', label: '当图主官网', aliases: ['website', '当图官网'] },
  { id: 'tuget-website', label: '图个吉利官网', aliases: ['tuget-website', '图个吉利官网'] },
  { id: 'oneget-website', label: '一得插件独立官网', aliases: ['oneget-website', '一得官网'] },
  { id: 'tools', label: '官方工具目录与教程站', aliases: ['tools', '工具站'] },
  { id: 'ec-nuxt', label: '导购搜索站', aliases: ['ec-nuxt'] },
  { id: 'scripts', label: '工作区级公共脚本', aliases: ['scripts'] },
]

// 组合别名（一次检查同一业务域的多个子项目）
const GROUP_ALIASES = {
  clients: ['client', 'TuGet-Client'],
  plugins: ['GetPic', 'Pro-GetPic', 'next-GetPic'],
  extensions: ['GetPic', 'Pro-GetPic', 'next-GetPic'],
  'tuget-suite': ['TuGet-Client', 'browser', 'tuget-native-host', 'tuget-protocol', 'Pro-GetPic'],
  'tuget-all': ['TuGet-Client', 'browser', 'tuget-native-host', 'tuget-protocol', 'Pro-GetPic'],
  websites: ['website', 'tuget-website', 'oneget-website', 'tools', 'ec-nuxt', 'store', 'admin-panel'],
  backends: ['server', 'cps-server'],
}

const SCAN_ROOTS = SUBPROJECTS.map((item) => item.id)
const SUBPROJECT_META_BY_ID = new Map(SUBPROJECTS.map((item) => [item.id, item]))
const ALIAS_TO_IDS = new Map()
for (const item of SUBPROJECTS) {
  ALIAS_TO_IDS.set(item.id.toLowerCase(), [item.id])
  for (const alias of item.aliases) ALIAS_TO_IDS.set(alias.toLowerCase(), [item.id])
}
for (const [groupName, ids] of Object.entries(GROUP_ALIASES)) {
  ALIAS_TO_IDS.set(groupName.toLowerCase(), ids)
}

const TEST_EXCLUDE_DIRS = new Set(['__tests__', '__test__', 'test', 'tests', 'testdata', 'e2e'])
const TEST_FILE_PATTERNS = [/\.(test|spec)\./, /_test\./, /^test_/, /^tests?\./]

const THRESHOLDS = { TARGET: 500, NOTICE: 800, YELLOW: 1200, RED: 1500 }
const NEAR_LIMIT_LINE = 400
const NEAR_TOP_LIMIT = 10
const DEFAULT_GROWTH_TOP = 5
const DEFAULT_MIN_GROWTH = 20
const VIOLATION_LEVELS = new Set(['red', 'critical'])

const LEVEL_META = {
  target: { icon: '🟢', label: '目标线内 (<=500)' },
  notice: { icon: '🔵', label: '关注提示 (501~799)' },
  yellow: { icon: '🟡', label: '警戒黄线 (800~1199)' },
  red: { icon: '🔴', label: '强制重构红线 (1200~1499)' },
  critical: { icon: '🚨', label: '严重事故 (>=1500)' },
}

const USAGE = `代码规模红线巡检 (PcGetPic Workspace)

用法：
  node scripts/check-file-lines.mjs [子项目名/别名...] [选项]

快捷示例：
  npm run check:lines                         # 全量检查所有子项目
  npm run check:lines:client                  # 只检查当图客户端 (client)
  npm run check:lines:tuget                   # 只检查图个吉利客户端 (TuGet-Client)
  npm run check:lines:oneget                  # 只检查一得浏览器插件 (next-GetPic)
  npm run check:lines:getpic                  # 只检查当图浏览器插件 (GetPic)
  npm run check:lines:pro-getpic              # 只检查图个吉利浏览器插件 (Pro-GetPic)
  npm run check:lines -- <子项目名或别名>     # 按需检查任意子项目（如 website / server / plugins）

子项目范围：
  --scope, -s <a,b>        只扫描指定子项目（支持逗号分隔或直接位置参数传入）
  --list-scopes            列出所有支持的子项目目录名、中文别名与组合别名

输出模式：
  （默认） / --full        输出完整巡检报告
  --dev-summary            摘要模式：首次输出完整报告并建立基线，之后只报变化
  --json                   以 JSON 输出结果

判定范围：
  --strict                 命中红线（>=1200 行）时以 exit 1 退出
  --changed <ref>          只判定 git 相对 <ref> 的新增/变更文件（兼容根仓库与各独立子仓库）
  --files <a,b,c>          只判定逗号分隔的文件列表
  --include-tests          连测试文件一起扫描/判定（默认排除测试目录与测试文件）

基线：
  --reset-baseline         丢弃旧基线，重建（下次运行为「首次」）
  --save-baseline          把当前全量行数写入基线
  --no-baseline            完全不读写基线，做一次性巡检
  --top <n>                摘要模式增长榜条数（默认 ${DEFAULT_GROWTH_TOP}）
  --min-growth <n>         计入增长榜的最小行数变化（默认 ${DEFAULT_MIN_GROWTH}）

其他：
  -h, --help               显示本帮助
`

function printScopesHelp() {
  console.log('\n📦 支持的子项目范围（可用于 --scope <名称> 或直接作为参数传入）：\n')
  for (const item of SUBPROJECTS) {
    console.log(`  - ${item.id.padEnd(20)} ${item.label.padEnd(18)} 别名: ${item.aliases.join(', ')}`)
  }
  console.log('\n🔗 组合别名（一次检查多个关联子项目）：\n')
  for (const [group, ids] of Object.entries(GROUP_ALIASES)) {
    console.log(`  - ${group.padEnd(20)} -> ${ids.join(', ')}`)
  }
  console.log('')
}

function resolveScopes(rawInputs) {
  const resolved = new Set()
  const tokens = rawInputs.flatMap((input) => input.split(',')).map((s) => s.trim()).filter(Boolean)
  for (const token of tokens) {
    const normalized = token.replace(/^[./\\]+|[./\\]+$/g, '').toLowerCase()
    const matched = ALIAS_TO_IDS.get(normalized)
    if (!matched) {
      const supported = SUBPROJECTS.map((s) => `${s.id}(${s.label})`).join('、')
      throw new Error(
        `未知子项目范围 "${token}"。\n支持的子项目：${supported}\n也可运行 --list-scopes 查看全部别名。`,
      )
    }
    for (const id of matched) resolved.add(id)
  }
  return [...resolved]
}

function parsePositiveInt(val, flagName, allowZero = false) {
  const n = Number.parseInt(val, 10)
  if (!Number.isInteger(n) || (allowZero ? n < 0 : n <= 0)) {
    throw new Error(`${flagName} 需要${allowZero ? '非负' : '正'}整数`)
  }
  return n
}

function parseArgs(argv) {
  const options = {
    strict: false, json: false, full: false, devSummary: false,
    noBaseline: false, resetBaseline: false, saveBaseline: false,
    ref: null, files: null, scopes: [], includeTests: false,
    top: DEFAULT_GROWTH_TOP, minGrowth: DEFAULT_MIN_GROWTH,
  }
  const rawScopes = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    // 兼容 Windows CMD 直接复制粘贴带 `# 注释` 的整行命令：遇到 `#` 即视为行尾注释并忽略后续内容
    if (arg === '#' || arg.startsWith('#')) break
    if (arg === '--strict') options.strict = true
    else if (arg === '--json') options.json = true
    else if (arg === '--include-tests') options.includeTests = true
    else if (arg === '--full') options.full = true
    else if (arg === '--dev-summary' || arg === '--dev') options.devSummary = true
    else if (arg === '--no-baseline') options.noBaseline = true
    else if (arg === '--reset-baseline') options.resetBaseline = true
    else if (arg === '--save-baseline') options.saveBaseline = true
    else if (arg === '--list-scopes') { printScopesHelp(); process.exit(0) }
    else if (arg === '--scope' || arg === '--project' || arg === '-s') {
      const val = argv[++i]
      if (!val) throw new Error(`${arg} 需要提供子项目名称，例如 --scope client`)
      rawScopes.push(val)
    } else if (arg.startsWith('--scope=') || arg.startsWith('--project=')) {
      const val = arg.slice(arg.indexOf('=') + 1)
      if (!val) throw new Error(`${arg} 需要提供子项目名称，例如 --scope=client`)
      rawScopes.push(val)
    } else if (arg === '--top') options.top = parsePositiveInt(argv[++i], '--top')
    else if (arg.startsWith('--top=')) options.top = parsePositiveInt(arg.slice(6), '--top')
    else if (arg === '--min-growth') options.minGrowth = parsePositiveInt(argv[++i], '--min-growth', true)
    else if (arg.startsWith('--min-growth=')) options.minGrowth = parsePositiveInt(arg.slice(13), '--min-growth', true)
    else if (arg === '--changed') {
      options.ref = argv[++i]
      if (!options.ref) throw new Error('--changed 需要提供 git ref，例如 --changed HEAD')
    } else if (arg.startsWith('--changed=')) {
      options.ref = arg.slice(10)
      if (!options.ref) throw new Error('--changed 需要提供 git ref，例如 --changed=HEAD')
    } else if (arg === '--files') {
      options.files = argv[++i]
      if (!options.files) throw new Error('--files 需要提供文件列表，例如 --files client/src/App.vue')
    } else if (arg.startsWith('--files=')) {
      options.files = arg.slice(8)
      if (!options.files) throw new Error('--files 需要提供文件列表，例如 --files=client/src/App.vue')
    } else if (arg === '-h' || arg === '--help') {
      process.stdout.write(USAGE)
      process.exit(0)
    } else if (!arg.startsWith('-')) {
      rawScopes.push(arg)
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }

  if (rawScopes.length > 0) options.scopes = resolveScopes(rawScopes)
  return options
}

const toPosix = (p) => p.replace(/\\/g, '/')
const isIgnoredPrefix = (relPath) => IGNORE_PATH_PREFIXES.some((prefix) => relPath.startsWith(prefix))

function scanFiles(dirPath, fileList = []) {
  try {
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !IGNORE_DIRS.has(entry.name)) {
          scanFiles(join(dirPath, entry.name), fileList)
        }
      } else if (entry.isFile()) {
        const dotIndex = entry.name.lastIndexOf('.')
        if (dotIndex === -1) continue
        const ext = entry.name.slice(dotIndex).toLowerCase()
        if (TARGET_EXTS.has(ext) && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.min.js')) {
          const fullPath = join(dirPath, entry.name)
          if (!isIgnoredPrefix(toPosix(relative(ROOT_DIR, fullPath)))) fileList.push(fullPath)
        }
      }
    }
  } catch { /* 忽略不存在或无法访问的目录 */ }
  return fileList
}

function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    if (!content) return 0
    const lines = content.replace(/\r\n?/g, '\n').split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    return lines.length
  } catch { return 0 }
}

function levelOf(lines) {
  if (lines >= THRESHOLDS.RED) return 'critical'
  if (lines >= THRESHOLDS.YELLOW) return 'red'
  if (lines >= THRESHOLDS.NOTICE) return 'yellow'
  if (lines > THRESHOLDS.TARGET) return 'notice'
  return 'target'
}

function isTestPath(relPath) {
  const segments = relPath.split('/')
  if (segments.slice(0, -1).some((seg) => TEST_EXCLUDE_DIRS.has(seg))) return true
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(segments[segments.length - 1]))
}

function collectFilesForRoots(roots) {
  const allFiles = []
  for (const root of roots) scanFiles(join(ROOT_DIR, root), allFiles)
  return allFiles
}

function gitPathsInDir(cwd, args) {
  const out = execFileSync('git', ['--no-pager', ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  })
  return out.split('\n').map((line) => line.trim()).filter(Boolean)
}

function resolveScopeFromGit(ref, activeRoots) {
  const paths = new Set()
  let succeededRepos = 0
  let lastError = null
  const rootManaged = []

  for (const root of activeRoots) {
    const subDir = join(ROOT_DIR, root)
    if (!existsSync(subDir)) continue
    if (existsSync(join(subDir, '.git'))) {
      try {
        for (const p of gitPathsInDir(subDir, ['diff', '--name-only', '--diff-filter=ACMR', ref])) {
          paths.add(`${root}/${toPosix(p)}`)
        }
        for (const p of gitPathsInDir(subDir, ['ls-files', '--others', '--exclude-standard'])) {
          paths.add(`${root}/${toPosix(p)}`)
        }
        succeededRepos += 1
      } catch (err) { lastError = err }
    } else {
      rootManaged.push(root)
    }
  }

  if (rootManaged.length > 0 && existsSync(join(ROOT_DIR, '.git'))) {
    try {
      const rootSet = new Set(rootManaged)
      const collectRootGit = (gitArgs) => {
        for (const p of gitPathsInDir(ROOT_DIR, gitArgs)) {
          const posixPath = toPosix(p)
          if (rootSet.has(posixPath.split('/')[0])) paths.add(posixPath)
        }
      }
      collectRootGit(['diff', '--name-only', '--diff-filter=ACMR', ref])
      collectRootGit(['ls-files', '--others', '--exclude-standard'])
      succeededRepos += 1
    } catch (err) { lastError = err }
  }

  if (succeededRepos === 0 && lastError) {
    throw new Error(`无法通过 git 解析变更范围 (${ref})：${lastError.message}`)
  }
  return paths
}

function readBaseline() {
  try {
    const raw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    if (raw && raw.version === BASELINE_VERSION && raw.files && typeof raw.files === 'object') {
      return raw.files
    }
  } catch { /* 无基线或损坏 */ }
  return null
}

function writeBaseline(records) {
  try {
    mkdirSync(dirname(BASELINE_PATH), { recursive: true })
    const files = {}
    for (const item of records) files[item.path] = item.lines
    writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify({ version: BASELINE_VERSION, updatedAt: new Date().toISOString(), total: records.length, files }, null, 2)}\n`,
      'utf8',
    )
  } catch { /* 基线写入失败不影响巡检结果 */ }
}

function formatActiveRootsLabel(activeRoots, hasCustomProjectScope) {
  if (!hasCustomProjectScope) return `全工作区 (${activeRoots.length} 个子项目)`
  return activeRoots
    .map((id) => {
      const meta = SUBPROJECT_META_BY_ID.get(id)
      return meta ? `${id} (${meta.label})` : id
    })
    .join(' / ')
}

function printFullReport(result) {
  const {
    activeRoots, hasCustomProjectScope, scopeMode, scanned, checked,
    excluded, scopeSkipped, excludedFromScope, groups, nearTop, violations, strict,
  } = result
  const line = '='.repeat(76)

  console.log(
    `\n${line}\n` +
      `📋 [代码规模红线巡检] 单文件规模规范报告${strict ? '（strict 严格模式）' : '（仅提醒，不阻断构建）'}\n` +
      `   扫描范围: ${formatActiveRootsLabel(activeRoots, hasCustomProjectScope)}\n` +
      `   扫描文件: ${scanned} 个${excluded > 0 ? `｜已排除测试文件: ${excluded} 个` : ''}${scopeMode ? `｜纳入判定: ${checked} 个` : '｜纳入判定: 全部'}\n` +
      line,
  )

  if (scopeSkipped.length > 0) {
    console.log(
      `\n⚠️ 【以下 ${scopeSkipped.length} 个路径不在巡检范围内，未参与判定，请检查路径是否正确】：\n` +
        scopeSkipped.map((p) => `   - ${p}`).join('\n'),
    )
  }
  if (excludedFromScope.length > 0) {
    console.log(
      `\nℹ️ 【以下 ${excludedFromScope.length} 个路径是测试文件，已按默认规则排除，未参与判定（如需检查请加 --include-tests）】：\n` +
        excludedFromScope.map((p) => `   - ${p}`).join('\n'),
    )
  }

  const order = ['critical', 'red', 'yellow', 'notice']
  const advice = { critical: '建议立即整改', red: '建议停止堆叠', yellow: '必须规划拆分', notice: '暂不违规，建议保持关注' }
  let hasAny = false

  for (const level of order) {
    const items = groups[level]
    if (items.length === 0) continue
    hasAny = true
    const meta = LEVEL_META[level]
    const suffix = VIOLATION_LEVELS.has(level) && strict ? '　← strict 阻断项' : ''
    console.log(`\n${meta.icon} 【${meta.label}，共 ${items.length} 个】${advice[level]}${suffix}：`)
    for (const item of items) console.log(`   - ${item.path.padEnd(60)} : ${item.lines} 行`)
  }

  if (nearTop.total > 0) {
    const truncated = nearTop.total > nearTop.shown.length ? `，仅展示前 ${nearTop.shown.length} 个` : ''
    console.log(`\n📈 【接近目标上限（> ${NEAR_LIMIT_LINE} 行，共 ${nearTop.total} 个${truncated}）】优先留意膨胀趋势：`)
    for (const item of nearTop.shown) console.log(`   - ${item.path.padEnd(60)} : ${item.lines} 行`)
    hasAny = true
  }

  if (!hasAny) {
    console.log(`\n✅ 巡检结果：${scopeMode ? '参与判定的' : '扫描范围内所有'}源文件均处于目标线内（<= 500 行）。\n`)
  } else {
    console.log(`\n💡 提示：单文件建议控制在 500 行以内；可用 --scope <子项目> 单独检查某项目，或用 --strict --changed HEAD 只卡本次变更。\n${line}\n`)
  }

  if (strict && violations.length > 0) {
    console.error(
      `\n❌ [strict 阻断] ${violations.length} 个文件突破 1200 行红线，禁止继续追加逻辑：\n` +
        violations.map((item) => `   - ${item.path} : ${item.lines} 行`).join('\n') + '\n',
    )
  } else if (strict) {
    console.log('✅ [strict 校验通过] 参与判定的文件均未突破 1200 行红线。\n')
  }
}

function printSummaryReport(result, baseline, options) {
  const { scanned, excluded, records, checkedPaths } = result
  const overThreshold = THRESHOLDS.NOTICE
  const currentOver = records.filter((r) => r.lines >= overThreshold)
  const violations = currentOver.filter((r) => VIOLATION_LEVELS.has(r.level))

  const growth = []
  const newOver = []
  for (const item of currentOver) {
    const before = baseline[item.path]
    if (before === undefined) newOver.push({ ...item, before: null })
    else if (item.lines - before >= options.minGrowth) growth.push({ ...item, before, delta: item.lines - before })
  }
  for (const item of records) {
    if (item.lines >= overThreshold) continue
    const before = baseline[item.path]
    if (before !== undefined && item.lines - before >= options.minGrowth) {
      growth.push({ ...item, before, delta: item.lines - before })
    }
  }

  const beforeOverCount = Object.entries(baseline).filter(
    ([path, lines]) => lines >= overThreshold && checkedPaths.has(path),
  ).length

  newOver.sort((a, b) => b.lines - a.lines)
  growth.sort((a, b) => b.delta - a.delta)
  violations.sort((a, b) => b.lines - a.lines)

  const trend = currentOver.length - beforeOverCount
  const trendText = trend > 0 ? `较上次 +${trend} ⚠️` : trend < 0 ? `较上次 ${trend} ✅` : '较上次持平'

  console.log('\n' + '-'.repeat(76))
  console.log(
    `📋 [代码规模巡检] 扫描 ${scanned} 个源文件` +
      (excluded > 0 ? `（已排除 ${excluded} 个测试文件）` : '') +
      '（只提示变化，完整报告见 npm run check:lines）',
  )

  if (violations.length > 0) {
    console.log(`🚨 红线存量 ${violations.length} 个（>= 1200 行），最该拆分：${violations[0].path} (${violations[0].lines} 行)`)
    for (const item of violations.slice(1, 3)) console.log(`   - ${item.path} : ${item.lines} 行`)
    if (violations.length > 3) console.log(`   - 其余 ${violations.length - 3} 个见 npm run check:lines`)
  } else {
    console.log('✅ 无红线文件（>= 1200 行）')
  }

  if (newOver.length > 0) {
    console.log(`\n🆕 本次新增超标 ${newOver.length} 个（首次进入 >= ${overThreshold} 行档）：`)
    for (const item of newOver.slice(0, 5)) {
      console.log(`   - ${item.path.padEnd(54)} : ${item.lines} 行（${item.before === null ? '新文件' : `${item.before} 行`}）`)
    }
    if (newOver.length > 5) console.log(`   - 其余 ${newOver.length - 5} 个见 npm run check:lines`)
  } else {
    console.log('🆕 本次新增超标 0 个')
  }

  if (growth.length > 0) {
    console.log(`\n📈 本次增长最多 TOP ${Math.min(options.top, growth.length)}（>= ${options.minGrowth} 行）：`)
    for (const item of growth.slice(0, options.top)) {
      console.log(`   - ${item.path.padEnd(54)} : ${item.before} → ${item.lines} 行（+${item.delta}）`)
    }
  } else {
    console.log(`📈 本次无明显增长（阈值 >= ${options.minGrowth} 行）`)
  }

  console.log(`   汇总：>= ${overThreshold} 行超标 ${currentOver.length} 个（${trendText}）`)
  console.log('-'.repeat(76) + '\n')
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const hasCustomProjectScope = options.scopes.length > 0
  const activeRoots = hasCustomProjectScope ? options.scopes : SCAN_ROOTS
  const allFiles = collectFilesForRoots(activeRoots)

  let scopeSet = null
  let scopeMode = false
  if (options.ref) {
    scopeSet = resolveScopeFromGit(options.ref, activeRoots)
    scopeMode = true
  } else if (options.files) {
    scopeSet = new Set(options.files.split(',').map((p) => toPosix(p.trim())).filter(Boolean))
    scopeMode = true
  }

  const records = []
  const knownPaths = new Set()
  const excludedPaths = new Set()
  for (const file of allFiles) {
    const relPath = toPosix(relative(ROOT_DIR, file))
    knownPaths.add(relPath)
    if (!options.includeTests && isTestPath(relPath)) {
      excludedPaths.add(relPath)
      continue
    }
    const lines = countLines(file)
    records.push({ path: relPath, lines, level: levelOf(lines) })
  }

  const scopeSkipped = scopeSet ? [...scopeSet].filter((p) => !knownPaths.has(p)).sort() : []
  const excludedFromScope = scopeSet && !options.includeTests ? [...scopeSet].filter((p) => excludedPaths.has(p)).sort() : []
  const checkedRecords = scopeMode ? records.filter((r) => scopeSet.has(r.path)) : records

  const groups = { critical: [], red: [], yellow: [], notice: [] }
  const nearAll = []
  for (const item of checkedRecords) {
    if (groups[item.level]) groups[item.level].push(item)
    if (item.level === 'target' && item.lines > NEAR_LIMIT_LINE) nearAll.push(item)
  }
  for (const level of Object.keys(groups)) groups[level].sort((a, b) => b.lines - a.lines)
  nearAll.sort((a, b) => b.lines - a.lines)

  const violations = checkedRecords.filter((r) => VIOLATION_LEVELS.has(r.level))
  const result = {
    activeRoots, hasCustomProjectScope, scopeMode, strict: options.strict,
    scanned: records.length, checked: checkedRecords.length, excluded: excludedPaths.size,
    excludedTestPaths: excludedPaths, scopeSkipped, excludedFromScope, groups,
    nearTop: { total: nearAll.length, shown: nearAll.slice(0, NEAR_TOP_LIMIT) },
    violations, records, knownPaths, checkedPaths: new Set(records.map((r) => r.path)),
  }

  if (options.json) {
    console.log(
      JSON.stringify({
        mode: options.strict ? 'strict' : 'warn',
        projects: activeRoots,
        scope: options.ref ? `changed:${options.ref}` : options.files ? 'files' : 'all',
        includeTests: options.includeTests,
        scanned: result.scanned, checked: result.checked, excluded: result.excluded,
        scopeSkipped: result.scopeSkipped, excludedFromScope: result.excludedFromScope,
        violations: violations.map(({ path, lines, level }) => ({ path, lines, level })),
        findings: [...groups.critical, ...groups.red, ...groups.yellow, ...groups.notice].map(
          ({ path, lines, level }) => ({ path, lines, level }),
        ),
      }, null, 2),
    )
  } else {
    let baseline = null
    if (options.resetBaseline) {
      try { rmSync(BASELINE_PATH, { force: true }) } catch { /* ignore */ }
    } else if (!options.noBaseline) {
      baseline = readBaseline()
    }

    const summaryWanted = options.devSummary && !options.full && !scopeMode && !hasCustomProjectScope
    if (summaryWanted && baseline) {
      printSummaryReport(result, baseline, options)
    } else {
      printFullReport(result)
      if (summaryWanted && !options.noBaseline) {
        console.log('📌 已建立基线（.cache/check-file-lines/baseline.json）；下次启动只提示新增超标与增长变化。\n')
      }
    }

    if (!options.noBaseline && !scopeMode && !hasCustomProjectScope && (options.devSummary || options.saveBaseline)) {
      writeBaseline(records)
    }
  }

  if (options.strict && violations.length > 0) process.exit(1)
  process.exit(0)
}

try {
  main()
} catch (error) {
  console.error(`❌ [巡检失败] ${error.message}`)
  console.error(USAGE)
  process.exit(2)
}
