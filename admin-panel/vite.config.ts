import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'
import VueDevTools from 'vite-plugin-vue-devtools'
import fs from 'fs'

// 在 DevTools 初始化前设置编辑器启动命令，确保"在编辑器中打开"功能生效
process.env.LAUNCH_EDITOR = 'code'

const projectRoot = process.cwd()

/**
 * 兜底缺失的 Vue DevTools 源码文件
 *
 * 解决 Windows 环境下 vite-plugin-vue-devtools 因 Source Map 文件缺失
 * 导致 ENOENT 报错，dev 服务器启动受阻的问题。
 */
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

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:3001'

  return {
    root: projectRoot,
    plugins: [
      // 仅在开发模式 (serve) 启用 DevTools 及其兜底插件，避免打包进生产环境
      command === 'serve'
        ? [
            fallbackMissingDevToolsFiles(),
            VueDevTools({
              launchEditor: 'code',
            }),
          ]
        : [],
      vue(),
      Components({
        dts: false,
        resolvers: [NaiveUiResolver()],
      }),
    ].flat(),
    resolve: {
      preserveSymlinks: true,
      alias: {
        '@': resolve(projectRoot, 'src'),
      },
    },
    server: {
      port: 5174,
      open: '/dashboard',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})

