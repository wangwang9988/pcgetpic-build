import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { RANK_LIST_CONFIG, RANK_POOL } from './src/config/rankConfig'
import VueDevTools from "vite-plugin-vue-devtools";

// 在 dev server 启动时输出所有对外接口 URL 到终端，并提供 1~8 映射可视化写回接口
function printInterfacesOnStart(): Plugin {
  const rankConfigPath = path.resolve(__dirname, './src/config/rankConfig.ts')
  let lastSelfWriteTime = 0

  return {
    name: 'print-interfaces',
    configureServer(server) {
      server.middlewares.use('/__dev/rank-mapping', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let rawBody = ''
        req.on('data', (chunk) => {
          rawBody += String(chunk)
        })

        req.on('end', () => {
          try {
            const payload = JSON.parse(rawBody || '{}') as {
              mapping?: Record<string, string>
            }
            const incoming = payload.mapping
            if (!incoming || typeof incoming !== 'object') {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, message: '无效的 mapping 参数' }))
              return
            }

            const fileContent = fs.readFileSync(rankConfigPath, 'utf-8')
            const blockRegex = /(export\s+const\s+RANK_MAPPING\s*:[^=]*=\s*\{)([\s\S]*?)(\};)/
            const match = fileContent.match(blockRegex)
            if (!match) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, message: '未找到 RANK_MAPPING 配置块' }))
              return
            }

            let mappingBody = match[2] ?? ''
            const summaryParts: string[] = []

            for (const slot of ['1', '2', '3', '4', '5', '6', '7', '8']) {
              const targetKey = incoming[slot]
              if (!targetKey) continue
              if (!(targetKey in RANK_POOL)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, message: `未知的资源池编号: ${targetKey}` }))
                return
              }

              const slotRegex = new RegExp(
                `(^\\s*['"]${slot}['"]\\s*:\\s*['"])[A-Za-z0-9_-]+(['"]\\s*,?)`,
                'm',
              )
              mappingBody = mappingBody.replace(slotRegex, `$1${targetKey}$2`)
              summaryParts.push(`#${slot}→${targetKey}`)
            }

            const updatedContent = fileContent.replace(
              blockRegex,
              `$1${mappingBody}$3`,
            )

            lastSelfWriteTime = Date.now()
            fs.writeFileSync(rankConfigPath, updatedContent, 'utf-8')
            console.log(`✅ [rankConfig] 已更新 1~8 映射: ${summaryParts.join(', ')}`)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true, updatedAt: lastSelfWriteTime }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                ok: false,
                message: error instanceof Error ? error.message : '写入配置文件失败',
              }),
            )
          }
        })
      })

      server.httpServer?.once('listening', () => {
        const address = server.httpServer!.address()
        const port = typeof address === 'string' ? address : (address?.port ?? 5188)
        const baseUrl = `http://localhost:${port}`

        console.log('\n🚀 所有对外接口 URL 汇总：\n')
        console.log(`📄 文档模式: ${baseUrl}?mode=docs\n`)

        for (const [key, config] of Object.entries(RANK_LIST_CONFIG)) {
          console.log(`  #${key}  ${config.name}  →  ${baseUrl}?rankType=${key}`)
        }
        console.log('\n')
      })
    },
    handleHotUpdate(ctx) {
      if (
        path.normalize(ctx.file) === path.normalize(rankConfigPath) &&
        Date.now() - lastSelfWriteTime < 1500
      ) {
        for (const mod of ctx.modules) {
          ctx.server.moduleGraph.invalidateModule(mod)
        }
        return []
      }
      return undefined
    },
  }
}

export default defineConfig({
  plugins: [
    process.env.NODE_ENV !== 'production' && VueDevTools({
      launchEditor: 'code'  // 指定使用 VSCode 打开文件
    }),
    vue(),
    printInterfacesOnStart()
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5188,
    open: '/?mode=docs',
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    pure: process.env.NODE_ENV === 'production' ? ['console.log'] : [],
  },
})
