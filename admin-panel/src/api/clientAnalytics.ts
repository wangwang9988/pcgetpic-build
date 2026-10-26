import api from './index'
import {
  analyticsFreshParams,
  analyticsRangeParams,
  type AnalyticsRangeParam,
} from './analyticsRange'

export interface ClientAnalyticsSummary {
  today_dau: number
  yesterday_dau: number
  today_activated: number
  today_inactive: number
  today_expired: number
  today_revoked: number
  total_known_devices: number
  activated_devices: number
  activation_rate: number
  today_downloads: number
  today_download_batches: number
  wau: number
  mau: number
  inactive_30d_devices: number
  inactive_180d_devices: number
  today_new_devices: number
  today_new_activated: number
}

export interface ClientDailyAnalytics {
  date: string
  dau: number
  activated: number
  inactive: number
  expired: number
  revoked: number
  downloads: number
  download_batches: number
  new_devices: number
  new_activated: number
}

export interface ClientVersionAnalytics {
  version: string
  user_count: number
  activated_count: number
  inactive_count: number
  expired_count: number
  revoked_count: number
}

export interface ClientActivationAnalytics {
  activation_status: string
  user_count: number
}

export interface ClientOsAnalytics {
  os_type: string
  user_count: number
}

export interface ClientDomainAnalytics {
  site_domain: string
  user_count: number
  batch_count: number
  download_count: number
}

export interface ClientDownloadTypeAnalytics {
  download_type: string
  user_count: number
  batch_count: number
  download_count: number
}

export function getClientAnalyticsSummary(forceFresh = false) {
  return api.get<ClientAnalyticsSummary>('/client-analytics/summary', {
    params: analyticsFreshParams(forceFresh),
  })
}

export function getClientAnalyticsDaily(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<ClientDailyAnalytics[]>('/client-analytics/daily', { params: analyticsRangeParams(range, forceFresh) })
}

export function getClientAnalyticsVersions(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<ClientVersionAnalytics[]>('/client-analytics/versions', { params: analyticsRangeParams(range, forceFresh) })
}

export function getClientAnalyticsActivation(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<ClientActivationAnalytics[]>('/client-analytics/activation', { params: analyticsRangeParams(range, forceFresh) })
}

export function getClientAnalyticsOs(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<ClientOsAnalytics[]>('/client-analytics/os', { params: analyticsRangeParams(range, forceFresh) })
}

export function getClientAnalyticsDomains(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<ClientDomainAnalytics[]>('/client-analytics/domains', { params: analyticsRangeParams(range, forceFresh) })
}

export function getClientAnalyticsDownloadTypes(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<ClientDownloadTypeAnalytics[]>('/client-analytics/download-types', { params: analyticsRangeParams(range, forceFresh) })
}
