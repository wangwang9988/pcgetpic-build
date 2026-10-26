/**
 * 让 Nuxt DevTools 的组件检查器保持与 TuGet-Client 一致的交互：
 * 启用检查器后，点击页面元素便直接在 VS Code 中打开对应源码。
 *
 * Nuxt DevTools 3.4 默认只显示选中信息面板，需要再点一次 Open；
 * 这里复用其已经启用的 vue-tracer，并调用 Vite 的本机开发端点。
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) return

  let active = true
  let stopListening: (() => void) | undefined

  void import('vite-plugin-vue-tracer/client/overlay').then(({ events }) => {
    if (!active) return

    stopListening = events.on('click', (info) => {
      const url = new URL('/__open-in-editor', window.location.origin)
      url.searchParams.set('file', info.fullpath)

      void fetch(url).then((response) => {
        if (!response.ok) {
          console.error(`[component-inspector] Open in editor failed: ${response.status}`)
        }
      }).catch((error) => {
        console.error('[component-inspector] Open in editor failed:', error)
      })
    })
  })

  import.meta.hot?.dispose(() => {
    active = false
    stopListening?.()
  })
})
