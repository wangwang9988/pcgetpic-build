export type AnalyticsRange = 'today' | 'yesterday' | '7d' | '30d' | '90d'
export type AnalyticsRangeParam = AnalyticsRange | number

/**
 * 性能契约：fresh=1 会让后端绕过并刷新短缓存，只能用于用户主动点击“刷新”。
 * 首次进入页面、普通路由切换和日期范围切换应保持 forceFresh=false，才能复用
 * 30/60 秒统计缓存；不要为了“确保最新”给所有请求默认附加 fresh=1。
 */
export function analyticsRangeParams(
  range: AnalyticsRangeParam = '30d',
  forceFresh = false,
) {
  const params = typeof range === 'number' ? { days: range } : { range }
  return forceFresh ? { ...params, fresh: 1 } : params
}

export function analyticsFreshParams(forceFresh = false) {
  return forceFresh ? { fresh: 1 } : undefined
}
