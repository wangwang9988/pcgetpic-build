import api from './index'
import {
  analyticsFreshParams,
  analyticsRangeParams,
  type AnalyticsRangeParam,
} from './analyticsRange'

export interface PluginAnalyticsSummary {
  today_dau: number
  yesterday_dau: number
  today_new_users: number
  yesterday_new_users: number
  total_users: number
  today_downloads: number
  wau: number
  mau: number
  inactive_30d_users: number
  inactive_180d_users: number
}

export interface DailyAnalytics {
  date: string
  dau: number
  downloads: number
  new_users: number
}

export interface VersionAnalytics {
  version: string
  user_count: number
  download_events: number
}

export interface BrowserAnalytics {
  browser: string
  user_count: number
  download_events: number
}

export interface DomainAnalytics {
  site_domain: string
  user_count: number
  download_events: number
}

export interface DomainDownloadAnalytics {
  site_domain: string
  unique_users: number
  download_count: number
}

export interface DownloadTypeAnalytics {
  download_type: string
  user_count: number
  download_events: number
}

export function getPluginAnalyticsSummary(forceFresh = false) {
  return api.get<PluginAnalyticsSummary>('/plugin-analytics/summary', {
    params: analyticsFreshParams(forceFresh),
  })
}

export function getPluginAnalyticsDaily(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<DailyAnalytics[]>('/plugin-analytics/daily', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginAnalyticsVersions(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<VersionAnalytics[]>('/plugin-analytics/versions', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginAnalyticsBrowsers(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<BrowserAnalytics[]>('/plugin-analytics/browsers', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginAnalyticsDomains(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<DomainAnalytics[]>('/plugin-analytics/domains', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginAnalyticsDomainDownloadStats(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<DomainDownloadAnalytics[]>('/plugin-analytics/domain-download-stats', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginAnalyticsDownloadTypes(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<DownloadTypeAnalytics[]>('/plugin-analytics/download-types', { params: analyticsRangeParams(range, forceFresh) })
}
