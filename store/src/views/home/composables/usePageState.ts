import { ref, onMounted, onUnmounted } from 'vue'

/** 页面状态类型 */
export type PageState = 'packages' | 'form' | 'payment' | 'success'

/** 状态回退映射：popstate 时根据当前状态决定回退到哪个状态 */
const STATE_BACK_MAP: Record<string, PageState> = {
  form: 'packages',
  payment: 'form',
  success: 'packages',
}

/**
 * 页面状态管理 composable
 *
 * 负责：
 * - 维护当前页面状态（packages → form → payment → success）
 * - 浏览器后退按钮（popstate）拦截
 * - 导航方法（前进推历史 / 后退替换历史）
 */
export function usePageState() {
  const pageState = ref<PageState>('packages')

  /** 清理回调，由各子组件注册 */
  const cleanupCallbacks: Array<(from: PageState, to: PageState) => void> = []

  /** 注册状态切换时的清理回调 */
  function onStateLeave(cb: (from: PageState, to: PageState) => void) {
    cleanupCallbacks.push(cb)
  }

  /** 监听浏览器后退按钮 */
  function handlePopState() {
    const current = pageState.value
    if (current === 'packages') return
    const backState = STATE_BACK_MAP[current] ?? 'packages'
    // 依次执行清理回调
    cleanupCallbacks.forEach((cb) => cb(current, backState))
    pageState.value = backState
  }

  /** 前进：推入浏览器历史并切换页面状态 */
  function navigateTo(state: PageState) {
    history.pushState({ pageState: state }, '')
    pageState.value = state
  }

  /** 后退：替换当前历史条目（不新增历史记录） */
  function navigateBackTo(state: PageState) {
    history.replaceState({ pageState: state }, '')
    pageState.value = state
  }

  onMounted(() => {
    window.addEventListener('popstate', handlePopState)
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', handlePopState)
  })

  return {
    pageState,
    navigateTo,
    navigateBackTo,
    onStateLeave,
  }
}
