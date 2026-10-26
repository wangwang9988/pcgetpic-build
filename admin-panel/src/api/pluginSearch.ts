import api from './index'
import {
  analyticsFreshParams,
  analyticsRangeParams,
  type AnalyticsRangeParam,
} from './analyticsRange'

export interface PluginSearchSummary {
  today_users: number
  today_new_users: number
  yesterday_new_users: number
  yesterday_users: number
  last7_users: number
  last30_users: number
  total_users: number
}

export interface SearchDailyAnalytics {
  date: string
  user_count: number
  new_user_count: number
}

export function getPluginSearchSummary(forceFresh = false) {
  return api.get<PluginSearchSummary>('/plugin-search/summary', {
    params: analyticsFreshParams(forceFresh),
  })
}

export function getPluginSearchDaily(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<SearchDailyAnalytics[]>('/plugin-search/daily', { params: analyticsRangeParams(range, forceFresh) })
}
