import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, join } from 'path'
import VueDevTools from "vite-plugin-vue-devtools";
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import fs from 'fs'
import { gzipSync } from 'zlib'

// 兜底缺失的 Vue DevTools 源码文件，防止 Source Map 引用引起的 ENOENT 报错
const fallbackMissingDevToolsFiles = () => ({
  name: 'fallback-missing-devtools-files',
  enforce: 'pre' as const,
  async load(id: string) {
    if (id.includes('vite-plugin-vue-devtools') && id.includes('?__vue-devtools-next-resource')) {
      const filename = id.split('?')[0]
      if (!fs.existsSync(filename)) {
        return ''
      }
    }
  }
})

/**
 * 构建完成后为 dist/assets 下的 .js / .css 生成 level-9 .gz 预压缩文件，
 * 配合 Nginx `gzip_static on;` 实现零 CPU 开销的最高压缩比静态直出；
 * 同时执行防回归守门断言：禁止出现未解析组件 (resolveComponent) 及入口包体超标。
 */
const ENTRY_RAW_BUDGET_BYTES = 300 * 1024
const ENTRY_GZIP_BUDGET_BYTES = 100 * 1024

function precompressGzipAssets(): Plugin {
  return {
    name: 'precompress-gzip-assets',
    apply: 'build',
    closeBundle() {
      const assetsDir = resolve(__dirname, 'dist/assets')
      if (!fs.existsSync(assetsDir)) return
      for (const entry of fs.readdirSync(assetsDir)) {
        if (!/\.(js|css)$/.test(entry)) continue
        const fullPath = join(assetsDir, entry)
        const raw = fs.readFileSync(fullPath)
        if (entry.endsWith('.js')) {
          const text = raw.toString('utf-8')
          if (text.includes('resolveComponent(')) {
            throw new Error(
              `[store build guard] 检测到未解析的动态组件调用 resolveComponent() 位于 ${entry}，请检查是否存在未按需引入的模板组件标签。`
            )
          }
        }
        const compressed = gzipSync(raw, { level: 9 })
        if (/^index-.*\.js$/.test(entry)) {
          if (raw.byteLength > ENTRY_RAW_BUDGET_BYTES || compressed.byteLength > ENTRY_GZIP_BUDGET_BYTES) {
            throw new Error(
              `[store build guard] 首屏入口包 ${entry} 超出体积预算 (raw=${(raw.byteLength / 1024).toFixed(1)}KB / gz=${(compressed.byteLength / 1024).toFixed(1)}KB，上限 raw=300KB / gz=100KB)，请检查是否误引入全量组件库。`
            )
          }
        }
        if (raw.byteLength < 1024) continue
        fs.writeFileSync(`${fullPath}.gz`, compressed)
      }
    },
  }
}

/**
 * 开发环境启动时检测后端 API 是否可达
 *
 * 如果后端服务器未启动或端口被其他服务占用，
 * 在终端输出醒目的警告信息，帮助开发者快速定位问题。
 */
function checkApiHealth(apiTarget: string) {
  return {
    name: 'check-api-health',
    apply: 'serve' as const,
    configureServer() {
      const healthUrl = `${apiTarget}/health`
      // 延迟 1 秒检查，避免与 Vite 自身启动竞争
      setTimeout(async () => {
        try {
          const res = await fetch(healthUrl)
          if (!res.ok) {
            console.warn(
              `\n⚠️  [API 健康检查] 后端返回非正常状态码 ${res.status}，请检查 ${apiTarget} 是否为正确的授权服务。\n`
            )
            return
          }
          const body = await res.json().catch(() => null) as { status?: string } | null
          if (body && body.status === 'ok') {
            console.log(`✅ [API 健康检查] 后端授权服务已连接: ${apiTarget}`)
          } else {
            console.warn(
              `\n⚠️  [API 健康检查] ${apiTarget} 返回了响应，但不是预期的授权服务（缺少 status:ok）。\n` +
              `   可能是其他服务占用了该端口，请检查。\n`
            )
          }
        } catch {
          console.warn(
            `\n❌ [API 健康检查] 无法连接后端授权服务: ${apiTarget}\n` +
            `   请确认:\n` +
            `   1. server 项目已启动 (cd server && npm run dev)\n` +
            `   2. 端口未被其他程序占用 (netstat -ano | findstr :3001)\n` +
            `   3. 如需修改端口，请在 store/.env 中设置 VITE_API_TARGET\n`
          )
        }
      }, 1000)
    }
  }
}

export default defineConfig(({ command, mode }) => {
  // 加载 store 目录下的 .env 文件
  const env = loadEnv(mode, process.cwd(), '')

  // 后端 API 地址：优先从环境变量读取，默认 http://127.0.0.1:3001
  // 使用 127.0.0.1 而非 localhost，避免 Windows 上 localhost 解析为 IPv6 ::1 被其他服务劫持
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:3001'

  const autoComponentsPlugin = Components({
    resolvers: [NaiveUiResolver()],
    dts: false,
  })

  return {
    plugins: command === 'serve'
      ? [
          fallbackMissingDevToolsFiles(),
          VueDevTools({
            launchEditor: 'code'  // 指定使用 VSCode 打开文件
          }),
          checkApiHealth(apiTarget),
          vue(),
          autoComponentsPlugin,
        ]
      : [
          vue(),
          autoComponentsPlugin,
          precompressGzipAssets(),
        ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@vue/') || id.includes('node_modules/vue/')) {
              return 'vendor-vue'
            }
          },
        },
      },
    },
    server: {
      host: true,
      port: 5175,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
