import api from './index'

export type HistorySource = 'downloads' | 'newtab' | 'search' | 'domains' | 'uninstalls' | 'client'
export interface HistoryMetrics { records: number; users: number; events: number; downloads: number }
export interface HistoryResult {
  source: HistorySource
  start: string
  end: string
  cutoff: string
  summary: HistoryMetrics
  daily: Array<HistoryMetrics & { date: string }>
  distributions: Record<string, Array<{ value: string; users: number; records: number; events: number }>>
}
export const getHistoryOptions = () => api.get<{ cutoff: string }>('/analytics-history/options')
export const getAnalyticsHistory = (params: { source: HistorySource; start: string; end: string; product?: string }) =>
  api.get<HistoryResult>('/analytics-history', { params })
