import api from './index'
import {
  analyticsFreshParams,
  analyticsRangeParams,
  type AnalyticsRangeParam,
} from './analyticsRange'

export interface PluginUninstallSummary {
  today_uninstalls: number
  yesterday_uninstalls: number
  last7d_uninstalls: number
  last30d_uninstalls: number
  total_uninstalls: number
  avg_install_days: number
  uninstall_rate_7d: number
  uninstall_rate_30d: number
  top_uninstall_version: string
}

export interface DailyUninstall {
  date: string
  uninstalls: number
  avg_install_days: number
}

export interface UninstallDistribution {
  name: string
  uninstall_count: number
  avg_install_days: number
}

export interface UninstallRetention {
  bucket: string
  uninstall_count: number
}

export interface UninstallRecord {
  id: number
  uuid: string
  report_date: string
  version: string
  browser: string
  os: string
  arch: string
  lang: string
  tz: number
  install_days: number
  downloads: number
  last_active: number
  client_ts: number
  created_at: number
  updated_at: number
}

export interface UninstallRecentResponse {
  total: number
  page: number
  pageSize: number
  items: UninstallRecord[]
}

export function getPluginUninstallSummary(forceFresh = false) {
  return api.get<PluginUninstallSummary>('/plugin-uninstall/summary', {
    params: analyticsFreshParams(forceFresh),
  })
}

export function getPluginUninstallDaily(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<DailyUninstall[]>('/plugin-uninstall/daily', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginUninstallVersions(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<UninstallDistribution[]>('/plugin-uninstall/versions', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginUninstallBrowsers(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<UninstallDistribution[]>('/plugin-uninstall/browsers', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginUninstallOs(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<UninstallDistribution[]>('/plugin-uninstall/os', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginUninstallRetention(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<UninstallRetention[]>('/plugin-uninstall/retention', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginUninstallRecent(page = 1, pageSize = 20, forceFresh = false) {
  return api.get<UninstallRecentResponse>('/plugin-uninstall/recent', {
    params: { page, pageSize, ...(forceFresh ? { fresh: 1 } : {}) },
  })
}
