import api from './index'
import {
  analyticsFreshParams,
  analyticsRangeParams,
  type AnalyticsRangeParam,
} from './analyticsRange'

export interface PluginNewtabSummary {
  today_dau: number
  yesterday_dau: number
  total_users: number
  today_reports: number
  wau: number
  mau: number
  today_new_dau: number
  yesterday_new_dau: number
}

export interface NewtabDailyAnalytics {
  date: string
  dau: number
  reports: number
  new_dau: number
}

export interface NewtabVersionAnalytics {
  version: string
  user_count: number
  report_events: number
}

export interface NewtabBrowserAnalytics {
  browser: string
  user_count: number
  report_events: number
}

export interface NewtabOsAnalytics {
  os: string
  user_count: number
  report_events: number
}

export interface NewtabLanguageAnalytics {
  language: string
  user_count: number
  report_events: number
}

export function getPluginNewtabSummary(forceFresh = false) {
  return api.get<PluginNewtabSummary>('/plugin-newtab/summary', {
    params: analyticsFreshParams(forceFresh),
  })
}

export function getPluginNewtabDaily(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<NewtabDailyAnalytics[]>('/plugin-newtab/daily', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginNewtabVersions(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<NewtabVersionAnalytics[]>('/plugin-newtab/versions', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginNewtabBrowsers(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<NewtabBrowserAnalytics[]>('/plugin-newtab/browsers', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginNewtabOs(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<NewtabOsAnalytics[]>('/plugin-newtab/os', { params: analyticsRangeParams(range, forceFresh) })
}

export function getPluginNewtabLanguages(range: AnalyticsRangeParam = '30d', forceFresh = false) {
  return api.get<NewtabLanguageAnalytics[]>('/plugin-newtab/languages', { params: analyticsRangeParams(range, forceFresh) })
}
