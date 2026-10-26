import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 每日循环倒计时 composable
 *
 * 计算距离当天 23:59:59 的剩余时间，次日自动重置。
 * 纯前端计算，无 localStorage / 后端依赖。
 *
 * @returns remainingMs - 剩余毫秒数
 * @returns formatted   - 格式化字符串 HH:MM:SS
 * @returns isUrgent    - 是否进入紧急状态（≤1小时）
 */
export function useDailyCountdown() {
  const remainingMs = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  /** 获取今日 23:59:59.999 的时间戳 */
  function getEndOfToday(): number {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
  }

  function tick() {
    remainingMs.value = Math.max(0, getEndOfToday() - Date.now())
  }

  /** 格式化为 HH:MM:SS */
  const formatted = computed(() => {
    const totalSeconds = Math.floor(remainingMs.value / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  /** 是否进入紧急状态（剩余 ≤ 1 小时） */
  const isUrgent = computed(() => remainingMs.value <= 60 * 60 * 1000)

  onMounted(() => {
    tick()
    timer = setInterval(tick, 1000)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return { remainingMs, formatted, isUrgent }
}
